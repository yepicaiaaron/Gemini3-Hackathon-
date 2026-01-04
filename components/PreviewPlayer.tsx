
import React, { useState, useEffect, useRef } from 'react';
import { Scene, VisualEffect } from '../types';
import { X, Play, Pause, Volume2, VolumeX, Cpu, Video, Image as ImageIcon, Layers, Loader2 } from 'lucide-react';

interface PreviewPlayerProps {
  scenes: Scene[];
  onClose: () => void;
}

const CROSSFADE_DURATION = 1200; // ms for smoother transitions

export const PreviewPlayer: React.FC<PreviewPlayerProps> = ({ scenes, onClose }) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [activeState, setActiveState] = useState({ index: 0, slot: 1 });
  const [bufferState, setBufferState] = useState<{ index: number, slot: number } | null>(null);
  const [crossfadeOpacity, setCrossfadeOpacity] = useState(0); // 0 = Show Active, 1 = Show Buffer (which becomes Active)
  const [progress, setProgress] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<number>(0);
  const lastUpdateRef = useRef<number>(Date.now());
  const transitionRef = useRef<boolean>(false);

  const currentScene = scenes[activeState.index];

  // Helper to get asset URL for a specific state
  const getAssetUrl = (idx: number, slot: number) => {
    if (idx >= scenes.length) return null;
    const s = scenes[idx];
    if (slot === 1) return s.videoUrl1 || s.imageUrl1 || s.previewUrl;
    return s.videoUrl2 || s.imageUrl2 || s.videoUrl1 || s.imageUrl1 || s.previewUrl;
  };

  const getScript = (idx: number) => scenes[idx]?.script || "";

  // Audio Engine
  useEffect(() => {
    if (audioRef.current) audioRef.current.pause();
    if (currentScene.audioUrl) {
      const a = new Audio(currentScene.audioUrl);
      a.volume = isMuted ? 0 : 1;
      audioRef.current = a;
      if (isPlaying && !transitionRef.current) a.play().catch(()=>{});
    }
  }, [activeState.index, currentScene.audioUrl]); // Only change audio when scene index changes

  useEffect(() => {
      if (audioRef.current) {
          if (isPlaying) audioRef.current.play().catch(()=>{});
          else audioRef.current.pause();
      }
  }, [isPlaying]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = isMuted ? 0 : 1;
  }, [isMuted]);

  // Transition Logic
  const triggerTransition = (nextIndex: number, nextSlot: number) => {
      if (transitionRef.current) return;
      transitionRef.current = true;
      
      // Load next asset into buffer
      setBufferState({ index: nextIndex, slot: nextSlot });
      
      // Animate Crossfade
      let start = Date.now();
      const fade = () => {
          const now = Date.now();
          const elapsed = now - start;
          const t = Math.min(1, elapsed / CROSSFADE_DURATION);
          
          setCrossfadeOpacity(t);
          
          if (t < 1) {
              requestAnimationFrame(fade);
          } else {
              // Transition Complete: Swap Buffer to Active
              setActiveState({ index: nextIndex, slot: nextSlot });
              setBufferState(null);
              setCrossfadeOpacity(0);
              transitionRef.current = false;
          }
      };
      requestAnimationFrame(fade);
  };

  // Main Loop
  useEffect(() => {
    if (!isPlaying) return;
    lastUpdateRef.current = Date.now();

    const tick = () => {
      const now = Date.now();
      const delta = now - lastUpdateRef.current;
      lastUpdateRef.current = now;

      setProgress(prev => {
        // Calculate progress increment based on current scene duration
        // Note: We use the active scene's duration.
        const duration = scenes[activeState.index].duration || 5;
        const increment = (delta / (duration * 1000)) * 100;
        const nextProgress = prev + increment;

        // Visual Slot Transition (A -> B at 50%)
        if (activeState.slot === 1 && nextProgress > 50 && !transitionRef.current) {
             triggerTransition(activeState.index, 2);
        }

        // Scene Transition (End of Scene)
        if (nextProgress >= 100 && !transitionRef.current) {
             if (activeState.index < scenes.length - 1) {
                 triggerTransition(activeState.index + 1, 1);
                 return 0; 
             } else {
                 setIsPlaying(false);
                 return 100;
             }
        }
        return nextProgress;
      });

      timerRef.current = requestAnimationFrame(tick);
    };

    timerRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(timerRef.current);
  }, [isPlaying, activeState, scenes]);

  const RenderLayer = ({ url, opacity, zIndex }: { url: string | null | undefined, opacity: number, zIndex: number }) => {
      if (!url) return null;
      const isVideo = url.match(/\.(mp4|webm)|blob:http/); // Simple check, ideally check type from scene
      
      return (
          <div 
            className="absolute inset-0 w-full h-full transition-opacity ease-linear will-change-opacity"
            style={{ opacity, zIndex }}
          >
              {isVideo ? (
                  <video src={url} className="w-full h-full object-cover" autoPlay muted loop playsInline />
              ) : (
                  <img src={url} className="w-full h-full object-cover" alt="" />
              )}
              {/* Cinematic Vignette Overlay to blend edges */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)] pointer-events-none" />
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
              <h3 className="font-mono text-xs text-zinc-400 uppercase tracking-tighter">
                  SCENE {activeState.index + 1} / {scenes.length} • SLOT {activeState.slot === 1 ? 'A' : 'B'}
              </h3>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-colors"><X size={24} /></button>
        </div>

        {/* Double-Buffered Rendering Engine */}
        <div className="flex-1 relative overflow-hidden bg-zinc-900">
            {/* Active Layer (Fades Out if crossfading is implemented as Reveal, or stays if we fade Buffer IN) */}
            {/* We will fade Buffer IN over Active */}
            
            <RenderLayer 
                url={getAssetUrl(activeState.index, activeState.slot)} 
                opacity={1} // Active layer always opaque at bottom
                zIndex={0} 
            />
            
            {/* Buffer Layer (Fades In) */}
            {bufferState && (
                <RenderLayer 
                    url={getAssetUrl(bufferState.index, bufferState.slot)} 
                    opacity={crossfadeOpacity} 
                    zIndex={10} 
                />
            )}

            {/* Script Overlay */}
            <div className="absolute bottom-16 left-0 right-0 z-40 text-center px-16 pointer-events-none">
                <div className="inline-block px-10 py-5 bg-black/60 backdrop-blur-xl rounded-2xl border border-white/5 shadow-2xl transition-all duration-700 transform translate-y-0">
                    <p className="text-white text-xl md:text-2xl font-serif italic leading-relaxed tracking-tight max-w-4xl mx-auto drop-shadow-lg">
                        {getScript(activeState.index)}
                    </p>
                </div>
            </div>
        </div>

        {/* Progress Control Bar */}
        <div className="h-1.5 w-full bg-zinc-900/50 relative z-30">
            <div className="h-full bg-blue-500 transition-all duration-100 ease-linear shadow-[0_0_15px_rgba(59,130,246,0.5)]" style={{ width: `${progress}%` }} />
            
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
