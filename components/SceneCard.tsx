import React, { useEffect, useState } from 'react';
import { Scene, PipelineStep } from '../types';
import { Clock, Film, Sparkles, Move, Search, Cpu, Edit2, PlayCircle, Mic, MonitorPlay, ExternalLink, Link2, FileSearch, Image as ImageIcon, Video as VideoIcon, AlertTriangle, Trophy, BrainCircuit } from 'lucide-react';

interface SceneCardProps {
  scene: Scene;
  index: number;
  status?: PipelineStep;
  onClick: () => void;
  onViewResearch: (e: React.MouseEvent) => void;
  onEditScript: (e: React.MouseEvent) => void;
}

// Simple Typewriter component for the reasoning text
const Typewriter = ({ text, delay = 10 }: { text: string, delay?: number }) => {
    const [displayedText, setDisplayedText] = useState('');
    
    useEffect(() => {
        let i = 0;
        const timer = setInterval(() => {
            if (i < text.length) {
                setDisplayedText(prev => prev + text.charAt(i));
                i++;
            } else {
                clearInterval(timer);
            }
        }, delay);
        return () => clearInterval(timer);
    }, [text, delay]);

    return <span>{displayedText}</span>;
};

export const SceneCard: React.FC<SceneCardProps> = ({ scene, index, status, onClick, onViewResearch, onEditScript }) => {
  const hasGrounding = scene.groundingChunks && scene.groundingChunks.length > 0;
  const hasUserLinks = scene.referenceLinks && scene.referenceLinks.length > 0;
  const isReviewMode = status === PipelineStep.REVIEW;
  // Only show loading overlay if specifically in Asset Generation phase AND the scene is incomplete
  const isGenerating = status === PipelineStep.ASSET_GENERATION && (!scene.imageUrl || !scene.audioUrl || (scene.useVeo && !scene.videoUrl));

  // Calculate Research Score
  const imageCount = scene.referenceLinks?.filter(l => l.match(/\.(jpeg|jpg|gif|png|webp)$/i))?.length || 0;
  const videoCount = scene.referenceLinks?.filter(l => l.match(/\.(mp4|mov|webm)$/i))?.length || 0;
  const webCount = scene.groundingChunks?.length || 0;
  
  // Basic heuristic: Web results count as 1 point (potential images), direct Images 1, Videos 3.
  const researchScore = (imageCount * 1) + (videoCount * 3) + (webCount * 1);
  const isLowIntel = researchScore < 2;

  return (
    <div 
      onClick={onClick}
      className={`group relative w-full bg-zinc-900/40 backdrop-blur-sm border border-zinc-800 rounded-3xl overflow-hidden transition-all duration-500 hover:border-zinc-700
        ${isReviewMode ? 'hover:shadow-[0_0_40px_rgba(0,0,0,0.5)]' : ''}
      `}
    >
      <div className="flex flex-col lg:flex-row h-auto lg:h-[600px]">
          
          {/* LEFT: VISUAL CANVAS */}
          <div className="lg:w-7/12 relative h-[300px] lg:h-full bg-black border-b lg:border-b-0 lg:border-r border-zinc-800 group-hover:border-zinc-700 transition-colors flex flex-col">
              
              {/* Main Visual Area */}
              <div className="relative flex-1 overflow-hidden">
                {/* Status Overlay - Only during production */}
                {isGenerating ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm z-20">
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            <p className="text-xs text-blue-400 font-mono animate-pulse tracking-widest">RENDERING ASSET...</p>
                        </div>
                    </div>
                ) : null}

                {/* Main Visual */}
                {scene.imageUrl ? (
                    <div className="w-full h-full relative group/image">
                        <img 
                        src={scene.imageUrl} 
                        alt={scene.imagePrompt} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        {scene.videoUrl && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
                            <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-xl group-hover/image:scale-110 transition-transform">
                                    <PlayCircle size={32} className="text-white fill-white/20" />
                            </div>
                            </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
                        
                        {/* Visual Config Badges */}
                        <div className="absolute top-4 left-4 flex gap-2 flex-wrap">
                            <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur border border-white/10 text-[10px] font-bold text-zinc-300 uppercase tracking-wider">
                                {scene.type.replace('_', ' ')}
                            </span>
                            {scene.visualEffect !== 'NONE' && (
                                <span className="px-3 py-1 rounded-full bg-purple-900/60 backdrop-blur border border-purple-500/30 text-[10px] font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1">
                                    <Cpu size={10} /> {scene.visualEffect}
                                </span>
                            )}
                            {scene.useVeo && (
                                <span className="px-3 py-1 rounded-full bg-red-900/60 backdrop-blur border border-red-500/30 text-[10px] font-bold text-red-300 uppercase tracking-wider flex items-center gap-1 animate-pulse">
                                    <VideoIcon size={10} /> VEO 3 ACTIVE
                                </span>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-zinc-700 gap-4 bg-zinc-950">
                        <Film size={48} className="opacity-20" />
                        <p className="text-xs font-mono uppercase tracking-widest opacity-40">Visual Placeholder</p>
                    </div>
                )}
              </div>

              {/* Reasoning Section (New) */}
              <div className="bg-zinc-950/80 p-6 border-t border-zinc-800">
                  <div className="flex items-center gap-2 mb-2 text-blue-400 text-xs font-bold uppercase tracking-wider">
                      <BrainCircuit size={14} /> Agent Reasoning
                  </div>
                  <p className="text-sm text-zinc-300 font-mono leading-relaxed opacity-90 min-h-[3em]">
                      {scene.reasoning ? <Typewriter text={scene.reasoning} /> : <span className="text-zinc-600">Analyzing narrative requirements...</span>}
                  </p>
              </div>
          </div>

          {/* RIGHT: NARRATIVE & RESEARCH DOCK */}
          <div className="lg:w-5/12 flex flex-col bg-zinc-900/50">
              
              {/* Scene Number & Timing */}
              <div className="px-6 py-6 border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <span className="text-4xl font-black text-white/10">{String(index + 1).padStart(2, '0')}</span>
                     <div className="h-8 w-[1px] bg-white/10" />
                     <div className="flex items-center gap-2 text-zinc-500">
                        <Clock size={14} />
                        <span className="text-xs font-mono">{scene.duration}s</span>
                     </div>
                  </div>
                  
                  {/* Research Score Badge */}
                  <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${isLowIntel ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-green-500/10 border-green-500/20 text-green-400'}`}>
                      {isLowIntel ? <AlertTriangle size={12} /> : <Trophy size={12} />}
                      <span className="text-[10px] font-bold uppercase tracking-wide">
                          Score: {researchScore}
                      </span>
                  </div>

                  {isReviewMode && (
                      <button onClick={onEditScript} className="p-2 hover:bg-white/5 rounded-full text-zinc-500 hover:text-white transition-colors">
                          <Edit2 size={16} />
                      </button>
                  )}
              </div>

              {/* Script Section */}
              <div className="flex-1 p-8 overflow-y-auto">
                  <label className="text-xs font-bold text-zinc-600 uppercase tracking-widest mb-4 block flex items-center gap-2">
                     <Mic size={12} /> Voiceover
                  </label>
                  <p className="text-xl md:text-2xl font-serif text-zinc-200 leading-relaxed">
                     "{scene.script}"
                  </p>
              </div>

              {/* Research Assets Dock - Upgraded */}
              <div className="p-6 bg-black/20 border-t border-white/5">
                  <div className="flex items-center justify-between mb-4">
                     <label className="text-[10px] font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2">
                        <Search size={12} /> Reference Intelligence
                     </label>
                     <button onClick={onViewResearch} className="text-[10px] text-zinc-500 hover:text-white underline decoration-zinc-700 underline-offset-4">
                         VIEW ALL ASSETS
                     </button>
                  </div>
                  
                  {(!hasGrounding && !hasUserLinks) ? (
                      <div className="p-3 rounded-lg border border-dashed border-red-500/20 bg-red-500/5 text-center flex items-center justify-center gap-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                          <p className="text-xs text-red-400 font-medium">Researching assets...</p>
                      </div>
                  ) : (
                      <div className="grid grid-cols-2 gap-3">
                          {/* User Links */}
                          {scene.referenceLinks?.map((link, i) => (
                              <button 
                                  key={`user-${i}`}
                                  onClick={onViewResearch}
                                  className="flex items-center gap-3 p-3 rounded-xl bg-green-900/10 border border-green-500/20 hover:bg-green-900/20 hover:border-green-500/40 transition-all group/link text-left w-full"
                              >
                                  <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center text-green-400 shrink-0">
                                      {link.match(/\.(jpeg|jpg|gif|png)$/) ? <ImageIcon size={14} /> : <VideoIcon size={14} />}
                                  </div>
                                  <div className="overflow-hidden">
                                      <p className="text-[10px] text-green-400 font-bold uppercase tracking-wider mb-0.5">User Asset</p>
                                      <p className="text-xs text-zinc-400 truncate group-hover/link:text-zinc-200">{new URL(link).hostname}</p>
                                  </div>
                              </button>
                          ))}

                          {/* Grounding Links */}
                          {scene.groundingChunks?.slice(0, 4).map((chunk, i) => (
                              <button 
                                  key={`grounding-${i}`}
                                  onClick={onViewResearch}
                                  className="flex items-center gap-3 p-3 rounded-xl bg-blue-900/10 border border-blue-500/20 hover:bg-blue-900/20 hover:border-blue-500/40 transition-all group/link text-left w-full"
                              >
                                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0">
                                      <ExternalLink size={14} />
                                  </div>
                                  <div className="overflow-hidden">
                                      <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider mb-0.5">Research</p>
                                      <p className="text-xs text-zinc-400 truncate group-hover/link:text-zinc-200">{chunk.web?.title || 'Web Source'}</p>
                                  </div>
                              </button>
                          ))}
                      </div>
                  )}
                  
                  {/* Visual Research Plan Text */}
                  {scene.visualResearchPlan && (
                      <div className="mt-4 pt-4 border-t border-white/5">
                          <p className="text-[10px] text-zinc-500 font-mono leading-relaxed">
                              <span className="text-zinc-400 font-bold">PLAN:</span> {scene.visualResearchPlan}
                          </p>
                      </div>
                  )}
              </div>
          </div>
      </div>
    </div>
  );
};
