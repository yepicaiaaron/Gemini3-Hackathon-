import React from 'react';
import { X, Globe, Search, ExternalLink, Image as ImageIcon, LayoutDashboard } from 'lucide-react';
import { Scene, GroundingChunk } from '../types';

interface ResearchPopupProps {
  scene: Scene;
  onClose: () => void;
}

export const ResearchPopup: React.FC<ResearchPopupProps> = ({ scene, onClose }) => {
  const chunks = scene.groundingChunks || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in zoom-in-95 duration-200">
      <div className="w-full max-w-4xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800 bg-zinc-950">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-zinc-900 rounded-full flex items-center justify-center border border-zinc-800">
                 <LayoutDashboard className="text-blue-400" size={20} />
             </div>
             <div>
                <h3 className="font-bold text-lg tracking-tight text-white">Concept Board /// {scene.id}</h3>
                <p className="text-xs text-zinc-500 uppercase tracking-widest">Research & Ideation</p>
             </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Grid */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               
               {/* Left Column: Visualization */}
               <div className="space-y-6">
                  <div className="space-y-2">
                      <h4 className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-wider">
                          <ImageIcon size={14} /> Generated Visualization
                      </h4>
                      <div className="aspect-video w-full bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 relative group">
                          {scene.imageUrl ? (
                              <img src={scene.imageUrl} alt="concept" className="w-full h-full object-cover" />
                          ) : (
                              <div className="flex items-center justify-center h-full text-zinc-700">Pending...</div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                              <p className="text-white text-xs font-mono">{scene.imagePrompt}</p>
                          </div>
                      </div>
                  </div>

                  <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
                      <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Narrative Script</h4>
                      <p className="text-zinc-300 font-serif italic text-lg leading-relaxed">"{scene.script}"</p>
                  </div>
               </div>

               {/* Right Column: Research Sources */}
               <div className="space-y-4">
                  <h4 className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-wider">
                      <Search size={14} /> Grounding Sources
                  </h4>
                  
                  {chunks.length === 0 ? (
                    <div className="p-8 text-center border-2 border-dashed border-zinc-800 rounded-xl bg-zinc-900/30">
                       <Globe size={24} className="mx-auto text-zinc-700 mb-2" />
                       <p className="text-zinc-500 text-sm">No specific web sources found for this generation.</p>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                       {chunks.map((chunk, i) => (
                          <div key={i} className="flex flex-col p-4 bg-zinc-900 rounded-xl border border-zinc-800 hover:border-blue-500/50 transition-all group">
                             <div className="flex items-start justify-between mb-2">
                                <Globe size={16} className="text-blue-500" />
                                <a 
                                  href={chunk.web?.uri} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-1 rounded hover:text-white transition-colors"
                                >
                                   OPEN LINK <ExternalLink size={8} className="inline ml-1" />
                                </a>
                             </div>
                             <h5 className="text-sm font-semibold text-zinc-200 line-clamp-1 mb-1">
                               {chunk.web?.title || 'Unknown Source'}
                            </h5>
                             <p className="text-xs text-zinc-500 font-mono truncate">{chunk.web?.uri}</p>
                          </div>
                       ))}
                    </div>
                  )}
               </div>

           </div>
        </div>
      </div>
    </div>
  );
};
