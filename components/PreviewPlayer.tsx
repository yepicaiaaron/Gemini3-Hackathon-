import React, { useState, useEffect, useRef } from 'react';
import { Scene, VisualEffect } from '../types';
import { X, Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Sparkles, Cpu, Layers } from 'lucide-react';

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

// Advanced Fragment Shader containing all requested effects
const FRAGMENT_SHADER = `
  precision mediump float;
  varying vec2 vUv;
  uniform sampler2D uTexture;
  uniform float uTime;
  uniform vec2 uResolution;
  uniform int uEffectType; 

  // --- Utility Functions ---
  float random(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
  }
  float noise(vec2 st) {
      vec2 i = floor(st);
      vec2 f = fract(st);
      float a = random(i);
      float b = random(i + vec2(1.0, 0.0));
      float c = random(i + vec2(0.0, 1.0));
      float d = random(i + vec2(1.0, 1.0));
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }

  // --- Effects ---

  // 1: VHS
  vec4 effectVHS(vec2 uv) {
      float y = uv.y * uResolution.y;
      float scanline = sin(y * 0.5 + uTime * 10.0);
      vec2 offset = vec2(0.005 * sin(uTime * 20.0 + y * 0.1), 0.0);
      vec4 r = texture2D(uTexture, uv + offset);
      vec4 g = texture2D(uTexture, uv);
      vec4 b = texture2D(uTexture, uv - offset);
      // Desaturate slightly and add noise
      vec4 col = vec4(r.r, g.g, b.b, 1.0) * (0.9 + 0.1 * scanline);
      return col;
  }

  // 2: Glitch
  vec4 effectGlitch(vec2 uv) {
      float split = 0.02 * sin(uTime * 20.0);
      float block = step(0.90, random(vec2(floor(uv.y * 20.0), floor(uTime * 15.0))));
      vec2 disp = vec2(block * 0.1 * sin(uTime), 0.0);
      return texture2D(uTexture, uv + disp + vec2(split, 0.0));
  }

  // 3: Zoom Blur
  vec4 effectZoom(vec2 uv) {
      vec2 center = vec2(0.5, 0.5);
      vec4 color = vec4(0.0);
      float total = 0.0;
      vec2 toCenter = center - uv;
      float offset = random(vec2(uTime)) * 0.02; 
      for (float t = 0.0; t <= 20.0; t++) {
          float percent = (t + offset) / 20.0;
          float weight = 2.0 * (percent - percent * percent);
          color += texture2D(uTexture, uv + toCenter * percent * 0.3) * weight;
          total += weight;
      }
      return color / total;
  }

  // 4: Pixelate
  vec4 effectPixelate(vec2 uv) {
      float pixels = 50.0 + 40.0 * sin(uTime);
      vec2 puv = floor(uv * pixels) / pixels;
      return texture2D(uTexture, puv);
  }

  // 5: RGB Shift
  vec4 effectRGBShift(vec2 uv) {
      float amt = 0.03 * sin(uTime * 5.0);
      vec4 r = texture2D(uTexture, uv + vec2(amt, 0.0));
      vec4 g = texture2D(uTexture, uv);
      vec4 b = texture2D(uTexture, uv - vec2(amt, 0.0));
      return vec4(r.r, g.g, b.b, 1.0);
  }

  // 6: CRT
  vec4 effectCRT(vec2 uv) {
      vec2 centered = uv - 0.5;
      float dist = length(centered);
      uv = 0.5 + centered * (1.0 + dist * dist * 0.1); 
      if(uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return vec4(0.0, 0.0, 0.0, 1.0);
      float scan = 0.5 + 0.5 * sin(uv.y * uResolution.y * 3.0 + uTime * 10.0);
      vec4 color = texture2D(uTexture, uv);
      return color * vec4(1.0, 1.0, 1.0, 1.0) * (0.7 + 0.3 * scan);
  }

  // 7: Film Grain
  vec4 effectFilmGrain(vec2 uv) {
      vec4 col = texture2D(uTexture, uv);
      float g = noise(uv * 100.0 + uTime * 10.0);
      return mix(col, vec4(g,g,g,1.0), 0.15);
  }

  // 8: Shake
  vec4 effectShake(vec2 uv) {
      vec2 offset = vec2(0.02 * sin(uTime * 30.0), 0.02 * cos(uTime * 25.0));
      return texture2D(uTexture, uv + offset);
  }

  // 9: Vignette
  vec4 effectVignette(vec2 uv) {
      vec4 col = texture2D(uTexture, uv);
      float d = length(uv - 0.5);
      float v = smoothstep(0.8, 0.3, d);
      return col * v;
  }

  // 10: Meme Fusion (Deep Fry)
  vec4 effectMemeFusion(vec2 uv) {
      vec4 col = texture2D(uTexture, uv);
      // High contrast and saturation
      vec3 gray = vec3(dot(col.rgb, vec3(0.299, 0.587, 0.114)));
      col.rgb = mix(gray, col.rgb, 3.0); // Saturation
      col.rgb = (col.rgb - 0.5) * 2.5 + 0.5; // Contrast
      // Add sharpening/noise artifacts
      float n = noise(uv * 50.0);
      col.rgb += n * 0.2;
      return clamp(col, 0.0, 1.0);
  }

  void main() {
    vec2 uv = vUv;
    vec4 color = vec4(0.0);

    // Switch case simulation (WebGL 1.0 limitation)
    if (uEffectType == 1) color = effectVHS(uv);
    else if (uEffectType == 2) color = effectGlitch(uv);
    else if (uEffectType == 3) color = effectZoom(uv);
    else if (uEffectType == 4) color = effectPixelate(uv);
    else if (uEffectType == 5) color = effectRGBShift(uv);
    else if (uEffectType == 6) color = effectCRT(uv);
    else if (uEffectType == 7) color = effectFilmGrain(uv);
    else if (uEffectType == 8) color = effectShake(uv);
    else if (uEffectType == 9) color = effectVignette(uv);
    else if (uEffectType == 10) color = effectMemeFusion(uv);
    else color = texture2D(uTexture, uv);

    gl_FragColor = color;
  }
`;

export const PreviewPlayer: React.FC<PreviewPlayerProps> = ({ scenes, onClose }) => {
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationRef = useRef<number>(0);
  const startTimeRef = useRef<number>(Date.now());
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const textureRef = useRef<WebGLTexture | null>(null);
  const positionBufferRef = useRef<WebGLBuffer | null>(null);
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());

  const currentScene = scenes[currentSceneIndex];
  const isVideoScene = !!currentScene.videoUrl;

  const getEffectId = (effect: VisualEffect) => {
    switch(effect) {
      case 'VHS': return 1;
      case 'GLITCH': return 2;
      case 'ZOOM_BLUR': return 3;
      case 'PIXELATE': return 4;
      case 'RGB_SHIFT': return 5;
      case 'CRT': return 6;
      case 'FILM_GRAIN': return 7;
      case 'SHAKE': return 8;
      case 'VIGNETTE': return 9;
      case 'MEME_FUSION': return 10;
      default: return 0;
    }
  };

  // --- WebGL Setup ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl') as WebGLRenderingContext;
    if (!gl) return;
    glRef.current = gl;

    const createShader = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return null;
      return shader;
    };

    const vert = createShader(gl.VERTEX_SHADER, VERTEX_SHADER);
    const frag = createShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vert || !frag) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);
    programRef.current = program;

    const positionBuffer = gl.createBuffer();
    if (positionBuffer) {
        positionBufferRef.current = positionBuffer;
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
    }

    const texture = gl.createTexture();
    if (texture) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        textureRef.current = texture;
    }
  }, []);

  // --- Render Loop (WebGL) ---
  useEffect(() => {
    // Only run WebGL loop if NOT a video scene (or if we wanted to process video frames, but sticking to basic implementation for now)
    // Actually, let's process video frames via WebGL if possible, but simplest is to switch display mode.
    // For simplicity: If videoUrl exists, we hide canvas and show video element. If not, we show canvas.
    if (isVideoScene) return;

    if (!isPlaying || !glRef.current || !programRef.current) return;
    const gl = glRef.current;
    const program = programRef.current;
    const posLoc = gl.getAttribLocation(program, 'position');
    const timeLoc = gl.getUniformLocation(program, 'uTime');
    const resLoc = gl.getUniformLocation(program, 'uResolution');
    const effectLoc = gl.getUniformLocation(program, 'uEffectType');

    // Preload image
    const imgUrl = currentScene.imageUrl;
    if (imgUrl && !imageCache.current.has(imgUrl)) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = imgUrl;
      img.onload = () => imageCache.current.set(imgUrl, img);
    }

    const render = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
      }
      gl.useProgram(program);
      gl.enableVertexAttribArray(posLoc);
      
      // Use the pre-created buffer instead of creating a new one each frame
      if (positionBufferRef.current) {
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBufferRef.current);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
      }

      const img = imageCache.current.get(currentScene.imageUrl || '');
      if (img) {
         gl.activeTexture(gl.TEXTURE0);
         gl.bindTexture(gl.TEXTURE_2D, textureRef.current);
         gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      } else {
         gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0,0,0,255]));
      }

      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      gl.uniform1f(timeLoc, elapsed);
      if (canvas) gl.uniform2f(resLoc, canvas.width, canvas.height);
      gl.uniform1i(effectLoc, getEffectId(currentScene.visualEffect));
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animationRef.current = requestAnimationFrame(render);
    };
    render();
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [isPlaying, currentSceneIndex, currentScene, isVideoScene]);

  // --- Video Logic ---
  useEffect(() => {
    if (isVideoScene && videoRef.current) {
        videoRef.current.src = currentScene.videoUrl!;
        if (isPlaying) videoRef.current.play().catch(() => {});
        else videoRef.current.pause();
    }
  }, [isVideoScene, currentScene.videoUrl, isPlaying]);

  // --- Audio Logic ---
  useEffect(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    // Play audio only if it's NOT a video scene (assuming video has audio, or if audioUrl is separate VO)
    // Actually, usually Veo is silent. So we play generated VO on top.
    if (currentScene.audioUrl) {
        const audio = new Audio(currentScene.audioUrl);
        audio.volume = isMuted ? 0 : 1;
        audioRef.current = audio;
        if (isPlaying) audio.play().catch(e => console.warn("Autoplay blocked", e));
    }
  }, [currentSceneIndex, currentScene.audioUrl]);

  useEffect(() => { 
      if(audioRef.current) audioRef.current.volume = isMuted ? 0 : 1; 
      if(videoRef.current) videoRef.current.muted = isMuted;
  }, [isMuted]);
  
  useEffect(() => { 
      if(audioRef.current) isPlaying ? audioRef.current.play().catch(()=>{}) : audioRef.current.pause(); 
      if(videoRef.current) isPlaying ? videoRef.current.play().catch(()=>{}) : videoRef.current.pause();
  }, [isPlaying]);

  // --- Timer ---
  useEffect(() => {
    if (!isPlaying) return;
    const durationMs = currentScene.duration * 1000;
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          if (currentSceneIndex < scenes.length - 1) {
            setCurrentSceneIndex(i => i + 1);
            return 0;
          } else {
            setIsPlaying(false);
            return 100;
          }
        }
        return p + (100 / (durationMs / 50));
      });
    }, 50);
    return () => clearInterval(interval);
  }, [currentSceneIndex, isPlaying, scenes.length, currentScene.duration]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="relative w-full max-w-5xl bg-zinc-950 rounded-2xl overflow-hidden shadow-2xl border border-zinc-800 flex flex-col">
        
        {/* Top Bar */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/50">
           <div className="flex items-center gap-3">
             <h3 className="font-mono text-sm text-zinc-400">PREVIEW /// {currentScene.id}</h3>
             <div className="flex items-center gap-2">
                {currentScene.visualEffect !== 'NONE' && (
                     <span className="text-[10px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded flex items-center gap-1 font-mono border border-purple-500/30">
                        <Cpu size={10} /> {currentScene.visualEffect}
                    </span>
                )}
                {isVideoScene ? (
                    <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded flex items-center gap-1 font-mono border border-red-500/30">
                        VEO VIDEO
                    </span>
                ) : (
                    <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded flex items-center gap-1 font-mono border border-green-500/30">
                        WEBGL
                    </span>
                )}
             </div>
           </div>
           <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
             <X size={20} />
           </button>
        </div>

        {/* Viewport */}
        <div className="relative aspect-video w-full bg-black overflow-hidden group">
           {isVideoScene ? (
               <video 
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  loop
               />
           ) : (
               <canvas 
                 ref={canvasRef} 
                 className="w-full h-full object-contain"
               />
           )}

           {/* FFMPEG Badge */}
           <div className="absolute top-4 right-4 bg-black/80 text-zinc-400 text-[10px] px-2 py-1 rounded font-mono border border-zinc-800 backdrop-blur pointer-events-none">
             FFMPEG RENDER: SIMULATED
           </div>

           {/* Subtitles */}
           <div className="absolute bottom-12 left-0 right-0 text-center px-12 pointer-events-none z-10">
             <span className="inline-block bg-black/60 text-white px-4 py-2 rounded-lg text-lg font-medium backdrop-blur-md shadow-lg leading-relaxed max-w-3xl border border-white/5">
                {currentScene.script}
             </span>
           </div>

           {/* Controls */}
           <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 duration-300 z-20">
              <div className="flex gap-4">
                 <button onClick={() => { setCurrentSceneIndex(Math.max(0, currentSceneIndex - 1)); setProgress(0); }} className="p-3 bg-black/50 rounded-full hover:bg-white/20 backdrop-blur text-white"><SkipBack size={24} /></button>
                 <button onClick={() => setIsPlaying(!isPlaying)} className="p-4 bg-white text-black rounded-full hover:scale-105 transition-transform">{isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}</button>
                 <button onClick={() => { setCurrentSceneIndex(Math.min(scenes.length - 1, currentSceneIndex + 1)); setProgress(0); }} className="p-3 bg-black/50 rounded-full hover:bg-white/20 backdrop-blur text-white"><SkipForward size={24} /></button>
                 <button onClick={() => setIsMuted(!isMuted)} className="p-3 bg-black/50 rounded-full hover:bg-white/20 backdrop-blur text-white ml-2">{isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}</button>
              </div>
           </div>
           
           <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-800 z-20">
              <div className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{ width: `${progress}%` }} />
           </div>
        </div>
      </div>
    </div>
  );
};