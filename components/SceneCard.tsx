
import React, { useState } from 'react';
import { Scene, PipelineStep, AssetStatus, TransitionType } from '../types';
import { Clock, Film, Search, Mic, Image as ImageIcon, Video as VideoIcon, CheckCircle2, Loader2, XCircle, Layout, Binary, Sparkles, ArrowRight, SplitSquareHorizontal } from 'lucide-react';

interface SceneCardProps {
  scene: Scene;
  index: number;
  status?: PipelineStep;
  onViewResearch: (e: React.MouseEvent) => void;
  onEditScript: (e: React.MouseEvent) => void;
  onUpdateTransition: (id: string, type: 'in' | 'mid', transition: TransitionType) => void;
}

const TRANSITIONS: TransitionType[] = ['FADE', 'CUT', 'DISSOLVE', 'SLIDE_LEFT', 'SLIDE_RIGHT', 'ZOOM_IN', 'GLITCH', 'WIPE'];

interface StatusIndicatorProps {
    label: string;
    status: AssetStatus;
    icon: React.ReactNode;
    previewUrl?: string;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ label, status, icon, previewUrl }) => {
    const [isHovered, setIsHovered] = useState(false);
    const showPreview = status === 'success' && previewUrl && isHovered;

    return (
        <div 
            className="relative"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="flex items-center justify-between py-1.5 px-3 bg-black/20 rounded-lg border border-white/5 cursor-default hover:bg-black/40 transition-colors">
                <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                    {icon} {label}
                </div>
                {status === 'loading' ? <Loader2 size={12} className="text-blue-500 animate-spin" /> : 
                 status === 'success' ? <CheckCircle2 size={12} className="text-green-500" /> :
                 status === 'error' ? <XCircle size={12} className="text-red-500" /> :
                 <div className="w-3 h-3 rounded-full border border-zinc-700" />}
            </div>

            {/* Hover Preview Tooltip */}
            {showPreview && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none">
                    <div className="w-32 h-32 bg-black border border-white/20 rounded-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        {previewUrl.match(/\.(mp4|webm)|blob:/) && !previewUrl.includes('image') ? (
                            <video src={previewUrl} className="w-full h-full object-cover" autoPlay muted loop />
                        ) : (
                            <img src={previewUrl} className="w-full h-full object-cover" alt="Preview" />
                        )}
                        <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-lg" />
                    </div>
                    {/* Arrow */}
                    <div className="w-2 h-2 bg-black border-r border-b border-white/20 transform rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1" />
                </div>
            )}
        </div>
    );
};

const TransitionSelect = ({ value, onChange, label }: { value: TransitionType, onChange: (v: TransitionType) => void, label: string }) => (
    <div className="flex items-center gap-2 bg-black/40 rounded-lg px-2 py-1 border border-white/5">
        <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest">{label}</span>
        <select 
            value={value} 
            onChange={(e) => onChange(e.target.value as TransitionType)}
            className="bg-transparent text-[10px] font-bold text-blue-400 uppercase outline-none cursor-pointer"
        >
            {TRANSITIONS.map(t => <option key={t} value={t} className="bg-zinc-900 text-zinc-300">{t}</option>)}
        </select>
    </div>
);

export const SceneCard: React.FC<SceneCardProps> = ({ scene, index, status, onViewResearch, onEditScript, onUpdateTransition }) => {
  const isProduction = status === PipelineStep.ASSET_GENERATION || status === PipelineStep.COMPLETE;
  
  return (
    <div className="w-full bg-zinc-900/60 border border-zinc-800 rounded-3xl overflow-hidden hover:border-zinc-700 transition-colors">
      <div className="flex flex-col lg:flex-row h-auto lg:min-h-[420px]">
          <div className="lg:w-1/2 relative h-[240px] lg:h-auto bg-black border-r border-zinc-800 flex items-center justify-center overflow-hidden">
                {scene.imageUrl1 ? (
                    <div className="w-full h-full flex relative">
                        <img src={scene.imageUrl1} className="w-1/2 h-full object-cover border-r border-white/10" alt="Set A" />
                        {scene.imageUrl2 ? <img src={scene.imageUrl2} className="w-1/2 h-full object-cover" alt="Set B" /> : <div className="w-1/2 h-full bg-zinc-950 flex items-center justify-center text-zinc-800"><ImageIcon size={40} /></div>}
                        
                        {/* Mid-Clip Transition Control Overlay */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                             <div className="bg-black/80 backdrop-blur border border-white/10 rounded-full px-3 py-1 shadow-2xl flex items-center gap-2 group cursor-pointer hover:bg-black hover:border-blue-500/50 transition-all">
                                 <SplitSquareHorizontal size={12} className="text-zinc-500 group-hover:text-blue-400" />
                                 <select 
                                    value={scene.transitionMid} 
                                    onChange={(e) => onUpdateTransition(scene.id, 'mid', e.target.value as TransitionType)}
                                    className="bg-transparent text-[9px] font-mono text-zinc-400 group-hover:text-white uppercase outline-none cursor-pointer w-16 text-center appearance-none"
                                 >
                                    {TRANSITIONS.map(t => <option key={t} value={t}>{t}</option>)}
                                 </select>
                             </div>
                        </div>
                        
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                    </div>
                ) : scene.previewUrl ? (
                    <div className="w-full h-full relative group">
                        <img src={scene.previewUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Concept Preview" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60" />
                        <div className="absolute bottom-4 left-4 flex items-center gap-2">
                             <div className="px-2 py-1 bg-black/60 backdrop-blur-md rounded border border-white/10 flex items-center gap-2">
                                <Sparkles size={10} className="text-yellow-400" />
                                <span className="text-white font-mono text-[9px] uppercase tracking-widest">Concept Generated</span>
                             </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-3 text-zinc-800">
                        {scene.statusPreview === 'loading' ? <Loader2 size={40} className="animate-spin text-blue-500/50" /> : <Binary size={40} />}
                        <span className="text-[10px] font-mono uppercase tracking-[0.2em]">Processing Visuals...</span>
                    </div>
                )}
                <div className="absolute top-4 left-4 flex gap-2">
                    <span className="px-3 py-1 rounded-full bg-black/80 border border-white/10 text-[9px] font-bold text-zinc-400 uppercase tracking-widest">PHASE: {isProduction ? 'PRODUCTION' : 'CONCEPT'}</span>
                </div>
          </div>
          <div className="lg:w-1/2 p-8 flex flex-col justify-between bg-gradient-to-br from-zinc-900/50 to-black">
              <div>
                  <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-4">
                          <span className="text-4xl font-black text-white/10">{String(index + 1).padStart(2, '0')}</span>
                          <div className="h-6 w-[1px] bg-white/10" />
                          <div className="flex items-center gap-2 text-zinc-500 font-mono text-xs">
                             <Clock size={12} /> {scene.duration}s
                          </div>
                      </div>
                      <div className="flex gap-2">
                          <button onClick={onViewResearch} className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-400 transition-colors"><Search size={14}/></button>
                          <button onClick={onEditScript} className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-400 transition-colors"><Mic size={14}/></button>
                      </div>
                  </div>
                  <p className="text-xl font-serif text-zinc-200 leading-relaxed italic mb-8">"{scene.script}"</p>
                  
                  {/* Internal Controls */}
                  <div className="flex gap-2 mb-6 flex-wrap">
                      <TransitionSelect value={scene.transitionIn} onChange={(v) => onUpdateTransition(scene.id, 'in', v)} label="Entry FX" />
                  </div>
              </div>
              
              {isProduction && (
                  <div className="grid grid-cols-2 gap-3">
                      <StatusIndicator label="Voiceover" status={scene.statusAudio} icon={<Mic size={10} />} previewUrl={undefined} />
                      <StatusIndicator label="Topology" status={'success'} icon={<Layout size={10} />} previewUrl={undefined} />
                      <StatusIndicator label="Visual A" status={scene.statusImage1} icon={<ImageIcon size={10} />} previewUrl={scene.imageUrl1} />
                      <StatusIndicator label="Visual B" status={scene.statusImage2} icon={<ImageIcon size={10} />} previewUrl={scene.imageUrl2} />
                      {scene.useVeo && <StatusIndicator label="Motion A" status={scene.statusVideo1} icon={<VideoIcon size={10} />} previewUrl={scene.videoUrl1} />}
                      {scene.useVeo && <StatusIndicator label="Motion B" status={scene.statusVideo2} icon={<VideoIcon size={10} />} previewUrl={scene.videoUrl2} />}
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};
