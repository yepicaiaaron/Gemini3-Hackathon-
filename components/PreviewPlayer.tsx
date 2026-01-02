
import React, { useState, useEffect, useRef } from 'react';
import { Scene, VisualEffect } from '../types';
import { X, Play, Pause, Volume2, VolumeX, Cpu, Video, Image as ImageIcon, Layers, Loader2 } from 'lucide-react';

interface PreviewPlayerProps {
  scenes: Scene[];
  onClose: () => void;
}

const CROSSFADE_DURATION = 800; // ms

export const PreviewPlayer: React.FC<PreviewPlayerProps> = ({ scenes, onClose }) => {
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [visualSlot, setVisualSlot] = useState<1 | 2>(1);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastUpdateRef = useRef<number>(Date.now());
  const timerRef = useRef<number>(0);

  const currentScene = scenes[currentSceneIndex];
  
  // Audio handling
  useEffect(() => {
    if (audioRef.current) audioRef.current.pause();
    if (currentScene.audioUrl) {
      const a = new Audio(currentScene.audioUrl);
      a.volume = isMuted ? 0 : 1;
      audioRef.current = a;
      if (isPlaying) a.play().catch(()=>{});
    }
    return () => { if(audioRef.current) audioRef.current.pause(); };
  }, [currentSceneIndex, currentScene.audioUrl]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = isMuted ? 0 : 1;
  }, [isMuted]);

  useEffect(() => {
    if (audioRef.current) {
        if (isPlaying) audioRef.current.play().catch(()=>{});
        else audioRef.current.pause();
    }
  }, [isPlaying]);

  // Main playback timer
  useEffect(() => {
    if (!isPlaying) return;
    
    lastUpdateRef.current = Date.now();
    const tick = () => {
      const now = Date.now();
      const delta = now - lastUpdateRef.current;
      lastUpdateRef.current = now;

      setProgress(prev => {
        const increment = (delta / (currentScene.duration * 1000)) * 100;
        const next = prev + increment;

        // Visual Slot Transition (A -> B at 50%)
        if (prev < 50 && next >= 50 && !isTransitioning) {
            triggerTransition(2);
        }

        // Scene Transition (End of Scene)
        if (next >= 100) {
          if (currentSceneIndex < scenes.length - 1) {
             triggerSceneTransition();
             return 0;
          } else {
             setIsPlaying(false);
             return 100;
          }
        }
        return next;
      });
      timerRef.current = requestAnimationFrame(tick);
    };

    timerRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(timerRef.current);
  }, [isPlaying, currentSceneIndex, currentScene.duration, isTransitioning]);

  const triggerTransition = (targetSlot: 1 | 2) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setVisualSlot(targetSlot);
      setIsTransitioning(false);
    }, CROSSFADE_DURATION / 2);
  };

  const triggerSceneTransition = () => {
      setIsTransitioning(true);
      setTimeout(() => {
          setCurrentSceneIndex(prev => prev + 1);
          setVisualSlot(1);
          setProgress(0);
          setIsTransitioning(false);
      }, CROSSFADE_DURATION / 2);
  };

  const renderAsset = (slot: 1 | 2) => {
      const img = slot === 1 ? currentScene.imageUrl1 : currentScene.imageUrl2;
      const vid = slot === 1 ? currentScene.videoUrl1 : currentScene.videoUrl2;

      if (vid) {
          return (
              <video 
                src={vid} 
                className="w-full h-full object-cover" 
                autoPlay 
                muted 
                loop 
                playsInline 
              />
          );
      }
      if (img) {
          return (
              <img 
                src={img} 
                className="w-full h-full object-cover transition-transform duration-[10000ms] scale-100 hover:scale-110" 
                alt="Scene visual" 
              />
          );
      }
      return (
          <div className="w-full h-full flex items-center justify-center bg-zinc-900">
              <Loader2 className="text-zinc-700 animate-spin" size={48} />
          </div>
      );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/98 p-4 md:p-12 animate-in fade-in duration-500 backdrop-blur-3xl">
      <div className="relative w-full max-w-6xl aspect-video bg-black rounded-3xl overflow-hidden shadow-[0_0_100px_rgba(0,0,0,1)] border border-white/5 flex flex-col group">
        
        {/* Top Overlay */}
        <div className="absolute top-0 left-0 right-0 z-30 p-6 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
           <div className="flex items-center gap-4">
              <div className="px-3 py-1 bg-blue-600 rounded-md font-mono text-[10px] font-black uppercase tracking-widest text-white">MASTER PREVIEW</div>
              <h3 className="font-mono text-xs text-zinc-400 uppercase tracking-tighter">NODE: {currentScene.id} // SEQUENCE: {currentSceneIndex + 1}/{scenes.length}</h3>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-colors"><X size={24} /></button>
        </div>

        {/* Seamless Asset Layer System */}
        <div className="flex-1 relative overflow-hidden">
            {/* Base Layer */}
            <div className={`absolute inset-0 z-0 transition-opacity duration-${CROSSFADE_DURATION} ${isTransitioning ? 'opacity-30' : 'opacity-100'}`}>
                {renderAsset(visualSlot)}
            </div>

            {/* Subtitle / Script Layer */}
            <div className="absolute bottom-16 left-0 right-0 z-20 text-center px-16 pointer-events-none">
                <div className="inline-block px-10 py-5 bg-black/80 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-2xl animate-in slide-in-from-bottom-4 duration-700">
                    <p className="text-white text-2xl font-serif italic leading-relaxed tracking-tight max-w-4xl mx-auto">
                        {currentScene.script}
                    </p>
                </div>
            </div>

            {/* Effects Overlay (Optional: VHS, Glitch via CSS filters if requested) */}
            <div className={`absolute inset-0 z-10 pointer-events-none bg-blue-500/5 mix-blend-overlay ${currentScene.visualEffect === 'VHS' ? 'animate-scanline' : ''}`} />
        </div>

        {/* Progress Control Bar */}
        <div className="h-1.5 w-full bg-zinc-900/50 relative z-30">
            <div className="h-full bg-blue-500 transition-all duration-300 ease-linear shadow-[0_0_15px_rgba(59,130,246,0.5)]" style={{ width: `${progress}%` }} />
            
            {/* Play/Pause Center Button (Visible on Hover) */}
            <div className="absolute inset-0 -top-[400px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <button onClick={() => setIsPlaying(!isPlaying)} className="p-10 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full text-white pointer-events-auto hover:scale-110 transition-transform shadow-2xl">
                    {isPlaying ? <Pause size={48} fill="white" /> : <Play size={48} fill="white" />}
                </button>
            </div>
        </div>

        {/* Footer Controls */}
        <div className="p-6 bg-zinc-950 flex items-center justify-between relative z-30">
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                    <button onClick={() => setIsMuted(!isMuted)} className="text-zinc-500 hover:text-white transition-colors">
                        {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    </button>
                    <div className="w-24 h-1 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-zinc-400" style={{ width: isMuted ? '0%' : '80%' }} />
                    </div>
                </div>
                <div className="h-4 w-[1px] bg-zinc-800" />
                <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">FPS: 24 // BUFFER: SYNCED</span>
            </div>
            
            <div className="flex items-center gap-4">
               <span className="text-[10px] font-mono text-blue-500 uppercase tracking-[0.2em] animate-pulse">Live Playback Intelligence</span>
               <div className="flex gap-1">
                   <div className="w-1 h-1 rounded-full bg-blue-500" />
                   <div className="w-1 h-1 rounded-full bg-blue-500/50" />
                   <div className="w-1 h-1 rounded-full bg-blue-500/20" />
               </div>
            </div>
        </div>
      </div>
    </div>
  );
};
