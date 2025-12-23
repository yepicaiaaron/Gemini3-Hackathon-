
import React from 'react';
import { Scene, PipelineStep, AssetStatus } from '../types';
import { Clock, Film, Search, Mic, Image as ImageIcon, Video as VideoIcon, CheckCircle2, Loader2, XCircle, Activity, Layout } from 'lucide-react';

interface SceneCardProps {
  scene: Scene;
  index: number;
  status?: PipelineStep;
  onViewResearch: (e: React.MouseEvent) => void;
  onEditScript: (e: React.MouseEvent) => void;
}

const StatusIndicator = ({ label, status, icon }: { label: string, status: AssetStatus, icon: React.ReactNode }) => (
    <div className="flex items-center justify-between py-1.5 px-3 bg-black/20 rounded-lg border border-white/5">
        <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
            {icon} {label}
        </div>
        {status === 'loading' ? <Loader2 size={12} className="text-blue-500 animate-spin" /> : 
         status === 'success' ? <CheckCircle2 size={12} className="text-green-500" /> :
         status === 'error' ? <XCircle size={12} className="text-red-500" /> :
         <div className="w-3 h-3 rounded-full border border-zinc-700" />}
    </div>
);

export const SceneCard: React.FC<SceneCardProps> = ({ scene, index, status, onViewResearch, onEditScript }) => {
  const isProduction = status === PipelineStep.ASSET_GENERATION || status === PipelineStep.COMPLETE;
  
  return (
    <div className="w-full bg-zinc-900/60 border border-zinc-800 rounded-3xl overflow-hidden hover:border-zinc-700 transition-colors">
      <div className="flex flex-col lg:flex-row h-auto lg:h-[420px]">
          <div className="lg:w-1/2 relative h-[240px] lg:h-full bg-black border-r border-zinc-800 flex items-center justify-center overflow-hidden">
                {scene.imageUrl1 ? (
                    <div className="w-full h-full flex">
                        <img src={scene.imageUrl1} className="w-1/2 h-full object-cover border-r border-white/10" />
                        {scene.imageUrl2 ? <img src={scene.imageUrl2} className="w-1/2 h-full object-cover" /> : <div className="w-1/2 h-full bg-zinc-950 flex items-center justify-center text-zinc-800"><ImageIcon size={40} /></div>}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-3 text-zinc-800">
                        {scene.statusImage1 === 'loading' ? <Loader2 size={40} className="animate-spin text-blue-500" /> : <Film size={40} />}
                        <span className="text-[10px] font-mono uppercase tracking-[0.2em]">Visual Pipeline Initializing</span>
                    </div>
                )}
                <div className="absolute top-4 left-4 flex gap-2">
                    <span className="px-3 py-1 rounded-full bg-black/60 border border-white/10 text-[9px] font-bold text-zinc-400 uppercase tracking-widest">DUAL ASSET SCENE</span>
                </div>
          </div>
          <div className="lg:w-1/2 p-8 flex flex-col justify-between">
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
              </div>
              
              {isProduction && (
                  <div className="grid grid-cols-2 gap-3">
                      <StatusIndicator label="Voice" status={scene.statusAudio} icon={<Mic size={10} />} />
                      <StatusIndicator label="Layout" status={'success'} icon={<Layout size={10} />} />
                      <StatusIndicator label="Visual 1" status={scene.statusImage1} icon={<ImageIcon size={10} />} />
                      <StatusIndicator label="Visual 2" status={scene.statusImage2} icon={<ImageIcon size={10} />} />
                      {scene.useVeo && <StatusIndicator label="Motion 1" status={scene.statusVideo1} icon={<VideoIcon size={10} />} />}
                      {scene.useVeo && <StatusIndicator label="Motion 2" status={scene.statusVideo2} icon={<VideoIcon size={10} />} />}
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};
