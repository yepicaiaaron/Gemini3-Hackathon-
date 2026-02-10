
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Scene, TransitionType, HookStyle } from '../types';
import { X, Play, Pause, Volume2, VolumeX, SkipForward, SkipBack, Zap, Newspaper, Type } from 'lucide-react';

interface PreviewPlayerProps {
  scenes: Scene[];
  hookStyle?: HookStyle;
  onClose: () => void;
}

// Extracted for performance to prevent re-creation on every render tick
const AssetView = React.memo(({ url, isActive, hookStyle, isSlotB, videoRef }: { 
    url?: string; 
    isActive: boolean; 
    hookStyle: HookStyle; 
    isSlotB: boolean;
    videoRef: React.RefObject<HTMLVideoElement | null> | null;
}) => {
    if (!url) return <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-zinc-800">NO ASSET</div>;
    const isVideo = url.match(/\.(mp4|webm)|blob:http/);
    
    // Ken Burns Effect Logic
    const kbClass = isActive && hookStyle !== 'ARTICLE_HIGHLIGHT' ? 
        (isSlotB ? 'animate-ken-burns-out' : 'animate-ken-burns-in') : '';
    
    const fastCutClass = hookStyle === 'FAST_CUT' ? 'scale-[1.02]' : '';
    
    // PERFORMANCE: Force GPU acceleration
    const hardwareAccelClass = "will-change-transform [backface-visibility:hidden] [transform:translateZ(0)]";

    return (
        <div className={`w-full h-full overflow-hidden ${kbClass} ${fastCutClass} ${hardwareAccelClass} transition-transform duration-[10s]`}>
            {isVideo ? (
                <video 
                    src={url} 
                    autoPlay 
                    muted 
                    loop 
                    playsInline 
                    className="w-full h-full object-cover" 
                    ref={videoRef} 
                />
            ) : (
                <img src={url} className="w-full h-full object-cover" alt="asset" />
            )}
        </div>
    );
});

export const PreviewPlayer: React.FC<PreviewPlayerProps> = ({ scenes, hookStyle = 'AI_SELECTED', onClose }) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0); // Audio duration
  const [isMuted, setIsMuted] = useState(false);
  
  // Transition State
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoARef = useRef<HTMLVideoElement | null>(null);
  const videoBRef = useRef<HTMLVideoElement | null>(null);

  const currentScene = scenes[currentSceneIndex];
  // Calculate if we should show Asset A or B based on time split
  const isSlotB = currentTime > (duration / 2);
  
  // Apply Speed modifiers based on hook style
  const playbackSpeed = hookStyle === 'FAST_CUT' ? 1.25 : 1.0;

  // Determine active transition style
  const activeTransitionStyle = isTransitioning 
    ? getTransitionStyle(currentScene.transitionIn) 
    : {};

  useEffect(() => {
    // Reset state for new scene
    setCurrentTime(0);
    setDuration(0);
    setIsTransitioning(true); // Start "Transition In"
    
    // Play audio
    if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
    }
    
    if (currentScene.audioUrl) {
        const audio = new Audio(currentScene.audioUrl);
        audio.volume = isMuted ? 0 : 1;
        audio.playbackRate = playbackSpeed;
        audioRef.current = audio;
        
        audio.onloadedmetadata = () => {
            if(Number.isFinite(audio.duration)) setDuration(audio.duration);
        };
        
        audio.ontimeupdate = () => {
            setCurrentTime(audio.currentTime);
        };
        
        audio.onended = () => {
             if (currentSceneIndex < scenes.length - 1) {
                 setCurrentSceneIndex(prev => prev + 1);
             } else {
                 setIsPlaying(false);
             }
        };

        if (isPlaying) {
             const playPromise = audio.play();
             playPromise.catch(() => console.log("Audio autoplay blocked"));
        }
    } else {
        // Fallback if no audio (mock timer)
        const mockDuration = currentScene.duration || 5;
        setDuration(mockDuration);
        const start = Date.now();
        const timer = setInterval(() => {
            if(!isPlaying) return;
            const elapsed = ((Date.now() - start) / 1000) * playbackSpeed;
            setCurrentTime(elapsed);
            if(elapsed >= mockDuration) {
                clearInterval(timer);
                if (currentSceneIndex < scenes.length - 1) {
                     setCurrentSceneIndex(prev => prev + 1);
                 } else {
                     setIsPlaying(false);
                 }
            }
        }, 100);
        return () => clearInterval(timer);
    }
    
    // End "Transition In" after delay (shorter for Fast Cut)
    const transitionTime = hookStyle === 'FAST_CUT' ? 400 : 800;
    const t = setTimeout(() => setIsTransitioning(false), transitionTime);
    return () => clearTimeout(t);

  }, [currentSceneIndex, scenes, isPlaying, playbackSpeed, hookStyle]); 

  useEffect(() => {
     if(audioRef.current) {
         if(isPlaying) audioRef.current.play().catch(()=>{});
         else audioRef.current.pause();
     }
     // Also handle video refs if they exist
     if(videoARef.current) isPlaying ? videoARef.current.play() : videoARef.current.pause();
     if(videoBRef.current) isPlaying ? videoBRef.current.play() : videoBRef.current.pause();

  }, [isPlaying]);

  useEffect(() => {
     if(audioRef.current) audioRef.current.volume = isMuted ? 0 : 1;
  }, [isMuted]);

  // Asset Resolvers
  const getAssetA = () => currentScene.videoUrl1 || currentScene.imageUrl1 || currentScene.previewUrl;
  const getAssetB = () => currentScene.videoUrl2 || currentScene.imageUrl2 || getAssetA();
  
  function getTransitionStyle(type: TransitionType): React.CSSProperties {
      switch(type) {
          case 'FADE': return { opacity: 0 };
          case 'DISSOLVE': return { filter: 'blur(20px)', opacity: 0 };
          case 'ZOOM_IN': return { transform: 'scale(1.5)', opacity: 0 };
          case 'SLIDE_LEFT': return { transform: 'translateX(100%)' };
          case 'SLIDE_RIGHT': return { transform: 'translateX(-100%)' };
          case 'GLITCH': return { filter: 'invert(1)', opacity: 0.5 };
          case 'CUT': return {}; 
          default: return { opacity: 0 };
      }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/98 p-4 md:p-12 animate-in fade-in duration-300 backdrop-blur-3xl">
      <style>{`
        @keyframes ken-burns-in {
          0% { transform: scale(1) translateZ(0); }
          100% { transform: scale(1.15) translateZ(0); }
        }
        @keyframes ken-burns-out {
          0% { transform: scale(1.15) translateZ(0); }
          100% { transform: scale(1) translateZ(0); }
        }
        .animate-ken-burns-in { animation: ken-burns-in 20s ease-out forwards; will-change: transform; }
        .animate-ken-burns-out { animation: ken-burns-out 20s ease-out forwards; will-change: transform; }
      `}</style>
      <div className="relative w-full max-w-6xl aspect-video bg-black rounded-3xl overflow-hidden shadow-[0_0_100px_rgba(0,0,0,1)] border border-white/5 flex flex-col group">
        
        {/* Top Controls */}
        <div className="absolute top-0 left-0 right-0 z-30 p-6 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
           <div className="flex items-center gap-4">
              <div className={`px-3 py-1 rounded-md font-mono text-[10px] font-black uppercase tracking-widest text-white flex items-center gap-2 ${
                  hookStyle === 'FAST_CUT' ? 'bg-red-600' : 
                  hookStyle === 'ARTICLE_HIGHLIGHT' ? 'bg-yellow-600' : 
                  hookStyle === 'TEXT_MATCH' ? 'bg-blue-600' : 'bg-zinc-600'
              }`}>
                  {hookStyle === 'FAST_CUT' && <Zap size={10} />}
                  {hookStyle === 'ARTICLE_HIGHLIGHT' && <Newspaper size={10} />}
                  {hookStyle === 'TEXT_MATCH' && <Type size={10} />}
                  {hookStyle.replace('_', ' ')} MODE
              </div>
              <h3 className="font-mono text-xs text-zinc-400 uppercase tracking-tighter">
                  SCENE {currentSceneIndex + 1} / {scenes.length} • {isSlotB ? 'CLIP B' : 'CLIP A'}
              </h3>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-colors"><X size={24} /></button>
        </div>

        {/* Viewport */}
        <div className="flex-1 relative overflow-hidden bg-zinc-950">
            {/* The Asset Render */}
            <div 
                key={`${currentScene.id}-${isSlotB ? 'B' : 'A'}`} 
                className="absolute inset-0 w-full h-full transition-all duration-300 ease-out"
                style={{
                   ...(isTransitioning ? activeTransitionStyle : { opacity: 1, transform: 'none', filter: 'none' }),
                   animation: isSlotB && currentScene.transitionMid === 'GLITCH' ? 'pulse 0.1s 3' : 'none' 
                }}
            >
                {hookStyle === 'ARTICLE_HIGHLIGHT' ? (
                    <div className="flex w-full h-full bg-zinc-900">
                        <div className="w-1/2 h-full relative border-r border-white/10">
                            <div className="absolute inset-0 bg-black/50 z-10" />
                            <AssetView 
                                url={isSlotB ? getAssetB() : getAssetA()} 
                                isActive={true} 
                                hookStyle={hookStyle}
                                isSlotB={isSlotB}
                                videoRef={isSlotB ? videoBRef : videoARef}
                            />
                        </div>
                        <div className="w-1/2 h-full p-12 flex flex-col justify-center bg-white text-black">
                            <div className="w-12 h-1 bg-black mb-6" />
                            <h3 className="text-sm font-bold uppercase tracking-widest mb-4 text-zinc-500">Key Insight</h3>
                            <p className="text-2xl md:text-3xl font-serif font-bold leading-tight">"{currentScene.script}"</p>
                        </div>
                    </div>
                ) : hookStyle === 'TEXT_MATCH' ? (
                    <div className="w-full h-full relative">
                        <div className="absolute inset-0 opacity-40 mix-blend-multiply">
                            <AssetView 
                                url={isSlotB ? getAssetB() : getAssetA()} 
                                isActive={true} 
                                hookStyle={hookStyle}
                                isSlotB={isSlotB}
                                videoRef={isSlotB ? videoBRef : videoARef}
                            />
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center p-12">
                             <h2 className="text-4xl md:text-6xl font-black text-white text-center uppercase tracking-tighter leading-none animate-in zoom-in-50 duration-300 drop-shadow-[0_10px_10px_rgba(0,0,0,0.8)]">
                                 {currentScene.script}
                             </h2>
                        </div>
                    </div>
                ) : (
                    <div className="w-full h-full relative">
                        <AssetView 
                            url={isSlotB ? getAssetB() : getAssetA()} 
                            isActive={true} 
                            hookStyle={hookStyle}
                            isSlotB={isSlotB}
                            videoRef={isSlotB ? videoBRef : videoARef}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />
                        <div className="absolute bottom-16 left-0 right-0 z-40 text-center px-16 pointer-events-none">
                            <div className="inline-block px-8 py-4 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 transition-all duration-300">
                                <p className="text-white/90 text-lg md:text-xl font-medium leading-relaxed max-w-4xl mx-auto shadow-black drop-shadow-md">
                                    {currentScene.script}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* Progress Bar */}
        <div className="h-1.5 w-full bg-zinc-900/50 relative z-30">
            <div 
                className="h-full bg-blue-500 transition-all duration-100 ease-linear shadow-[0_0_15px_rgba(59,130,246,0.5)]" 
                style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }} 
            />
            {/* Hover Play Controls */}
            <div className="absolute inset-0 -top-[400px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <button onClick={() => setIsPlaying(!isPlaying)} className="p-8 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full text-white pointer-events-auto hover:scale-110 transition-transform shadow-2xl">
                    {isPlaying ? <Pause size={40} fill="white" /> : <Play size={40} fill="white" />}
                </button>
            </div>
        </div>
        
        {/* Footer */}
        <div className="p-4 bg-zinc-950 flex items-center justify-between relative z-30">
             <div className="flex items-center gap-4">
                 <button onClick={() => setCurrentSceneIndex(Math.max(0, currentSceneIndex - 1))} className="text-zinc-500 hover:text-white"><SkipBack size={20} /></button>
                 <button onClick={() => setIsPlaying(!isPlaying)} className="text-white hover:text-blue-400">{isPlaying ? <Pause size={20} /> : <Play size={20} />}</button>
                 <button onClick={() => setCurrentSceneIndex(Math.min(scenes.length - 1, currentSceneIndex + 1))} className="text-zinc-500 hover:text-white"><SkipForward size={20} /></button>
                 
                 <div className="w-[1px] h-6 bg-zinc-800 mx-2" />
                 
                 <button onClick={() => setIsMuted(!isMuted)} className="text-zinc-500 hover:text-white transition-colors">
                        {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                 </button>
             </div>
             <div className="font-mono text-[10px] text-zinc-600 uppercase tracking-widest">
                 AUDIO DRIVEN PLAYBACK • {currentTime.toFixed(1)}s / {duration.toFixed(1)}s ({playbackSpeed}x)
             </div>
        </div>

      </div>
    </div>
  );
};
