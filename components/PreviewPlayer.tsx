
import React, { useState, useEffect, useRef } from 'react';
import { Scene, VisualEffect } from '../types';
import { X, Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Cpu, Video, Image as ImageIcon, Layers } from 'lucide-react';

interface PreviewPlayerProps {
  scenes: Scene[];
  onClose: () => void;
}

const VERTEX_SHADER = `
  attribute vec2 position;
  varying vec2 vUv;
  void main() {
    vUv = position * 0.5 + 0.5;
    vUv.y = 1.0 - vUv.y; 
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  precision mediump float;
  varying vec2 vUv;
  uniform sampler2D uTexture;
  uniform float uTime;
  uniform vec2 uResolution;
  uniform int uEffectType; 

  float random(vec2 st) { return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123); }

  void main() {
    vec2 uv = vUv;
    if (uEffectType == 1) { // VHS
       float y = uv.y * uResolution.y;
       float scanline = sin(y * 0.5 + uTime * 10.0);
       vec2 offset = vec2(0.005 * sin(uTime * 20.0 + y * 0.1), 0.0);
       vec4 r = texture2D(uTexture, uv + offset);
       vec4 g = texture2D(uTexture, uv);
       vec4 b = texture2D(uTexture, uv - offset);
       gl_FragColor = vec4(r.r, g.g, b.b, 1.0) * (0.9 + 0.1 * scanline);
    } else if (uEffectType == 2) { // GLITCH
       float split = 0.02 * sin(uTime * 20.0);
       vec2 disp = vec2(step(0.95, random(vec2(floor(uv.y * 10.0), floor(uTime * 15.0)))) * 0.1, 0.0);
       gl_FragColor = texture2D(uTexture, uv + disp + vec2(split, 0.0));
    } else {
       gl_FragColor = texture2D(uTexture, uv);
    }
  }
`;

export const PreviewPlayer: React.FC<PreviewPlayerProps> = ({ scenes, onClose }) => {
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [visualSlot, setVisualSlot] = useState<1 | 2>(1);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationRef = useRef<number>(0);
  const startTimeRef = useRef<number>(Date.now());
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const textureRef = useRef<WebGLTexture | null>(null);
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());

  const currentScene = scenes[currentSceneIndex];
  const isVideo = (visualSlot === 1 && !!currentScene.videoUrl1) || (visualSlot === 2 && !!currentScene.videoUrl2);

  useEffect(() => {
    const gl = canvasRef.current?.getContext('webgl');
    if (!gl) return;
    glRef.current = gl;

    const createShader = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };

    const program = gl.createProgram()!;
    gl.attachShader(program, createShader(gl.VERTEX_SHADER, VERTEX_SHADER));
    gl.attachShader(program, createShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER));
    gl.linkProgram(program);
    programRef.current = program;

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);

    textureRef.current = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, textureRef.current);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  }, []);

  useEffect(() => {
    if (isVideo || !isPlaying || !glRef.current) return;
    const gl = glRef.current;
    const program = programRef.current!;
    const imgUrl = visualSlot === 1 ? currentScene.imageUrl1 : currentScene.imageUrl2;
    
    if (imgUrl && !imageCache.current.has(imgUrl)) {
      const i = new Image(); i.crossOrigin = "anonymous"; i.src = imgUrl; i.onload = () => imageCache.current.set(imgUrl, i);
    }

    const render = () => {
      if (!canvasRef.current) return;
      gl.viewport(0, 0, canvasRef.current.width = canvasRef.current.clientWidth, canvasRef.current.height = canvasRef.current.clientHeight);
      gl.useProgram(program);
      const img = imageCache.current.get(imgUrl || '');
      gl.bindTexture(gl.TEXTURE_2D, textureRef.current);
      if (img) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0,0,0,255]));
      
      gl.uniform1f(gl.getUniformLocation(program, 'uTime'), (Date.now() - startTimeRef.current)/1000);
      gl.uniform2f(gl.getUniformLocation(program, 'uResolution'), canvasRef.current.width, canvasRef.current.height);
      gl.uniform1i(gl.getUniformLocation(program, 'uEffectType'), currentScene.visualEffect === 'VHS' ? 1 : currentScene.visualEffect === 'GLITCH' ? 2 : 0);
      
      const pos = gl.getAttribLocation(program, 'position');
      gl.enableVertexAttribArray(pos);
      gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animationRef.current = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(animationRef.current);
  }, [isPlaying, currentSceneIndex, visualSlot, isVideo]);

  useEffect(() => {
    if (isVideo && videoRef.current) {
        videoRef.current.src = (visualSlot === 1 ? currentScene.videoUrl1 : currentScene.videoUrl2) || '';
        if (isPlaying) videoRef.current.play().catch(() => {});
    }
  }, [isVideo, visualSlot, currentSceneIndex, isPlaying]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.pause();
    if (currentScene.audioUrl) {
      const a = new Audio(currentScene.audioUrl); a.volume = isMuted ? 0 : 1; audioRef.current = a;
      if (isPlaying) a.play().catch(()=>{});
    }
  }, [currentSceneIndex, currentScene.audioUrl]);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          if (currentSceneIndex < scenes.length - 1) { setCurrentSceneIndex(i => i + 1); setVisualSlot(1); return 0; }
          setIsPlaying(false); return 100;
        }
        if (p > 50 && visualSlot === 1) setVisualSlot(2);
        return p + (100 / (currentScene.duration * 20));
      });
    }, 50);
    return () => clearInterval(interval);
  }, [currentSceneIndex, isPlaying, visualSlot]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 animate-in fade-in duration-300">
      <div className="relative w-full max-w-5xl bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-800 flex flex-col">
        <div className="flex items-center justify-between p-4 bg-zinc-900/50">
           <h3 className="font-mono text-sm text-zinc-400">PROJECT PLAYER /// {currentScene.id} [ASSET {visualSlot}/2]</h3>
           <button onClick={onClose} className="text-zinc-400 hover:text-white"><X size={20} /></button>
        </div>
        <div className="relative aspect-video bg-black overflow-hidden group">
           {isVideo ? <video ref={videoRef} className="w-full h-full object-cover" muted={isMuted} playsInline /> : <canvas ref={canvasRef} className="w-full h-full object-contain" />}
           <div className="absolute bottom-12 left-0 right-0 text-center px-12 z-10">
             <span className="inline-block bg-black/70 text-white px-6 py-3 rounded-xl text-xl font-bold backdrop-blur-md border border-white/10">{currentScene.script}</span>
           </div>
           <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
              <button onClick={() => setIsPlaying(!isPlaying)} className="p-6 bg-white text-black rounded-full">{isPlaying ? <Pause size={32} /> : <Play size={32} />}</button>
           </div>
           <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-800"><div className="h-full bg-blue-500" style={{ width: `${progress}%` }} /></div>
        </div>
      </div>
    </div>
  );
};
