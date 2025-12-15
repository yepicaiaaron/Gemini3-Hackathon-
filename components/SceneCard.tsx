
import React, { useEffect, useState } from 'react';
import { Scene, PipelineStep, AssetStatus } from '../types';
import { Clock, Film, Sparkles, Move, Search, Cpu, Edit2, PlayCircle, Mic, MonitorPlay, ExternalLink, Link2, FileSearch, Image as ImageIcon, Video as VideoIcon, AlertTriangle, Trophy, BrainCircuit, CheckCircle2, Loader2, XCircle, RefreshCw, Globe, Layers, Zap } from 'lucide-react';

interface SceneCardProps {
  scene: Scene;
  index: number;
  status?: PipelineStep;
  userLinks?: string[]; 
  onClick: () => void;
  onViewResearch: (e: React.MouseEvent) => void;
  onEditScript: (e: React.MouseEvent) => void;
  onRetryAsset?: (sceneId: string, type: 'audio' | 'image' | 'video') => void;
}

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

const StatusRow = ({ label, status, onRetry, icon }: { label: string, status: AssetStatus, onRetry: () => void, icon: React.ReactNode }) => {
    return (
        <div className="flex items-center justify-between py-2 border-b border-zinc-800/50 last:border-0">
            <div className="flex items-center gap-2 text-sm text-zinc-400">
                {icon}
                <span>{label}</span>
            </div>
            <div className="flex items-center gap-2">
                {status === 'loading' && <Loader2 size={16} className="text-blue-500 animate-spin" />}
                {status === 'success' && <CheckCircle2 size={16} className="text-green-500" />}
                {status === 'error' && (
                    <div className="flex items-center gap-2">
                        <XCircle size={16} className="text-red-500" />
                        <button onClick={onRetry} className="p-1 hover:bg-zinc-800 rounded transition-colors text-zinc-500 hover:text-zinc-300">
                            <RefreshCw size={12} />
                        </button>
                    </div>
                )}
                {status === 'idle' && <div className="w-4 h-4 rounded-full border border-zinc-700" />}
            </div>
        </div>
    );
};

export const SceneCard: React.FC<SceneCardProps> = ({ scene, index, status, userLinks = [], onClick, onViewResearch, onEditScript, onRetryAsset }) => {
  const isReviewMode = status === PipelineStep.REVIEW || status === PipelineStep.RESEARCHING;
  const isProduction = status === PipelineStep.ASSET_GENERATION || status === PipelineStep.COMPLETE;
  const isResearching = scene.isResearching;
  
  // Calculate Research Score based on FetchedAssets
  // Rules: 0.5 per text, 1 per image, 2 per video
  const assets = scene.fetchedAssets || [];
  const textCount = assets.filter(a => a.type === 'text' || a.type === undefined).length;
  const imageCount = assets.filter(a => a.type === 'image').length;
  const videoCount = assets.filter(a => a.type === 'video').length;
  
  const researchScore = (textCount * 0.5) + (imageCount * 1) + (videoCount * 2);
  const isLowIntel = researchScore < 2;

  const needsVideo = scene.useVeo || scene.type === 'split_screen' || scene.visualEffect === 'ZOOM_BLUR';

  return (
    <div 
      onClick={onClick}
      className={`group relative w-full bg-zinc-900/40 backdrop-blur-sm border border-zinc-800 rounded-3xl overflow-hidden transition-all duration-500 hover:border-zinc-700
        ${isReviewMode ? 'hover:shadow-[0_0_40px_rgba(0,0,0,0.5)]' : ''}
        ${isResearching ? 'border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.1)]' : ''}
      `}
    >
      <div className="flex flex-col lg:flex-row h-auto lg:h-[600px]">
          
          {/* LEFT: VISUAL CANVAS */}
          <div className="lg:w-7/12 relative h-[300px] lg:h-full bg-black border-b lg:border-b-0 lg:border-r border-zinc-800 group-hover:border-zinc-700 transition-colors flex flex-col">
              <div className="relative flex-1 overflow-hidden">
                {scene.imageUrl ? (
                    <div className="w-full h-full relative group/image">
                        <img 
                        src={scene.imageUrl} 
                        alt={scene.imagePrompt} 
                        className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 ${scene.statusImage === 'loading' ? 'blur-sm' : ''}`}
                        />
                        {scene.videoUrl && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
                            <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-xl group-hover/image:scale-110 transition-transform">
                                    <PlayCircle size={32} className="text-white fill-white/20" />
                            </div>
                            </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
                        <div className="absolute top-4 left-4 flex gap-2 flex-wrap">
                            <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur border border-white/10 text-[10px] font-bold text-zinc-300 uppercase tracking-wider">
                                {scene.type.replace('_', ' ')}
                            </span>
                            {scene.useVeo && (
                                <span className="px-3 py-1 rounded-full bg-red-900/60 backdrop-blur border border-red-500/30 text-[10px] font-bold text-red-300 uppercase tracking-wider flex items-center gap-1 animate-pulse">
                                    <VideoIcon size={10} /> VEO 3 ACTIVE
                                </span>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-zinc-700 gap-4 bg-zinc-950">
                        {scene.statusImage === 'loading' ? (
                            <div className="flex flex-col items-center gap-4">
                                <Loader2 size={48} className="animate-spin text-blue-500" />
                                <p className="text-xs font-mono uppercase tracking-widest text-blue-400">Generating Visuals...</p>
                            </div>
                        ) : (
                            <>
                                <Film size={48} className="opacity-20" />
                                <p className="text-xs font-mono uppercase tracking-widest opacity-40">Visual Placeholder</p>
                            </>
                        )}
                    </div>
                )}
              </div>
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
                  <div className={`flex items-center gap-2 px-3 py-1 rounded-full border transition-all ${isResearching ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : isLowIntel ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-green-500/10 border-green-500/20 text-green-400'}`}>
                      {isResearching ? <Loader2 size={12} className="animate-spin" /> : isLowIntel ? <AlertTriangle size={12} /> : <Trophy size={12} />}
                      <span className="text-[10px] font-bold tracking-wider">
                          {isResearching ? 'RESEARCHING...' : `INTEL: ${researchScore}PTS`}
                      </span>
                  </div>
              </div>

              <div className="flex-1 p-6 flex flex-col space-y-6 overflow-y-auto">
                  
                  {/* Script Section */}
                  <div>
                      <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                              <Mic size={14} /> Voiceover Script
                          </span>
                          {isReviewMode && (
                            <button onClick={onEditScript} className="text-zinc-600 hover:text-white transition-colors">
                                <Edit2 size={12} />
                            </button>
                          )}
                      </div>
                      <p className="text-lg font-serif leading-relaxed text-zinc-200">
                          "{scene.script}"
                      </p>
                  </div>

                  {/* Research Dock - Phase 1.5 UI */}
                  <div className="bg-black/40 rounded-xl border border-white/5 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                              <Search size={14} /> Research Assets
                          </span>
                          <button 
                            onClick={onViewResearch}
                            className="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-1 rounded flex items-center gap-1 transition-colors"
                          >
                             <Layers size={10} /> VIEW ALL
                          </button>
                      </div>
                      
                      {isResearching ? (
                          <div className="flex items-center gap-3 py-2 text-blue-400">
                              <Loader2 size={16} className="animate-spin" />
                              <span className="text-xs font-mono animate-pulse">Scanning knowledge base...</span>
                          </div>
                      ) : assets.length > 0 ? (
                          <div className="grid grid-cols-4 gap-2">
                              {assets.slice(0, 4).map((asset, i) => (
                                  <div key={i} className="aspect-square bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800 relative group/asset cursor-help" title={asset.title}>
                                      {asset.type === 'image' ? (
                                          <img src={asset.url} className="w-full h-full object-cover opacity-70 group-hover/asset:opacity-100 transition-opacity" />
                                      ) : asset.type === 'video' ? (
                                          <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-purple-500">
                                              <VideoIcon size={16} />
                                          </div>
                                      ) : (
                                          <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-blue-500">
                                              <FileSearch size={16} />
                                          </div>
                                      )}
                                      
                                      {/* Tiny type badge */}
                                      <div className={`absolute bottom-0 right-0 p-0.5 rounded-tl bg-black/80 text-[8px] font-bold ${asset.type === 'video' ? 'text-purple-400' : asset.type === 'image' ? 'text-green-400' : 'text-blue-400'}`}>
                                          {asset.type === 'video' ? '2.0' : asset.type === 'image' ? '1.0' : '0.5'}
                                      </div>
                                  </div>
                              ))}
                          </div>
                      ) : (
                          <div className="py-2 text-xs text-zinc-600 font-mono text-center border border-dashed border-zinc-800 rounded">
                              Waiting for research phase...
                          </div>
                      )}
                  </div>

                  <div className="flex-1" />

                  {/* Production Status */}
                  {isProduction && (
                      <div className="space-y-1 bg-zinc-950/50 rounded-xl p-4 border border-zinc-800/50">
                          <StatusRow 
                            label="Neural Voice" 
                            status={scene.statusAudio} 
                            onRetry={() => onRetryAsset?.(scene.id, 'audio')}
                            icon={<Mic size={14} />} 
                          />
                          <StatusRow 
                            label="Scene Composition" 
                            status={scene.statusImage} 
                            onRetry={() => onRetryAsset?.(scene.id, 'image')}
                            icon={<ImageIcon size={14} />} 
                          />
                          {needsVideo && (
                            <StatusRow 
                                label="Veo Motion" 
                                status={scene.statusVideo} 
                                onRetry={() => onRetryAsset?.(scene.id, 'video')}
                                icon={<VideoIcon size={14} />} 
                            />
                          )}
                      </div>
                  )}

                  {/* Visual Plan */}
                  <div className="space-y-2">
                       <h5 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                          <Move size={14} /> Motion & Effect
                       </h5>
                       <div className="flex flex-wrap gap-2">
                           {scene.visualEffect !== 'NONE' && (
                               <span className="px-2 py-1 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] font-bold uppercase flex items-center gap-1">
                                   <Cpu size={10} /> {scene.visualEffect}
                               </span>
                           )}
                           {scene.motionIntent?.map((intent, i) => (
                               <span key={i} className="px-2 py-1 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 text-[10px] font-bold uppercase">
                                   {intent}
                               </span>
                           ))}
                       </div>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};
