import React, { useState } from 'react';
import { X, Globe, Search, ExternalLink, Image as ImageIcon, LayoutDashboard, Video, FileText, AlertTriangle, CheckCircle, Clock, Blend, Loader2 } from 'lucide-react';
import { Scene } from '../types';

interface ResearchPopupProps {
  scene: Scene;
  onClose: () => void;
  onMixAssets: (assetA: string, assetB: string) => Promise<void>;
}

export const ResearchPopup: React.FC<ResearchPopupProps> = ({ scene, onClose, onMixAssets }) => {
  const [activeTab, setActiveTab] = useState<'generated' | 'found'>('found');
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]); // Store URLs/Titles
  const [isMixing, setIsMixing] = useState(false);

  // Normalize assets
  const userLinks = scene.referenceLinks || [];
  const groundingLinks = scene.groundingChunks?.map(g => ({
    url: g.web?.uri || '',
    title: g.web?.title || 'Web Source',
    type: 'web'
  })) || [];

  // Merge and classify
  const allAssets = [
    ...userLinks.map(url => ({
      url,
      title: 'User Provided Asset',
      type: url.match(/\.(mp4|mov|webm)$/i) ? 'video' : url.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? 'image' : 'web'
    })),
    ...groundingLinks
  ].filter(a => a.url); // filter empty

  // Scoring Logic
  const imageCount = allAssets.filter(a => a.type === 'image').length;
  const videoCount = allAssets.filter(a => a.type === 'video').length;
  const webCount = allAssets.filter(a => a.type === 'web').length;
  const totalScore = (imageCount * 1) + (videoCount * 3) + (webCount * 1);
  const targetScore = 5; // Per scene target
  const progress = Math.min(100, (totalScore / targetScore) * 100);

  const toggleAssetSelection = (assetTitle: string) => {
    if (selectedAssets.includes(assetTitle)) {
        setSelectedAssets(prev => prev.filter(t => t !== assetTitle));
    } else {
        if (selectedAssets.length < 2) {
            setSelectedAssets(prev => [...prev, assetTitle]);
        }
    }
  };

  const handleMix = async () => {
      if (selectedAssets.length !== 2) return;
      setIsMixing(true);
      try {
          await onMixAssets(selectedAssets[0], selectedAssets[1]);
          setActiveTab('generated');
      } catch (e) {
          console.error("Mix failed", e);
      } finally {
          setIsMixing(false);
          setSelectedAssets([]);
      }
  };

  const getPreview = (asset: any) => {
      if (asset.type === 'image') {
          return (
              <div className="w-full h-48 bg-black flex items-center justify-center overflow-hidden">
                  <img src={asset.url} alt={asset.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" onError={(e) => (e.currentTarget.style.display = 'none')} />
              </div>
          );
      }
      if (asset.type === 'video') {
          return (
              <div className="w-full h-48 bg-black flex items-center justify-center overflow-hidden relative">
                   <video src={asset.url} className="w-full h-full object-cover opacity-80" muted loop onMouseOver={e => e.currentTarget.play()} onMouseOut={e => e.currentTarget.pause()} />
                   <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                       <div className="w-10 h-10 bg-white/10 backdrop-blur rounded-full flex items-center justify-center border border-white/20">
                           <Video size={16} className="text-white" />
                       </div>
                   </div>
              </div>
          );
      }
      // Web Fallback
      return (
          <div className="w-full h-48 bg-zinc-900 flex flex-col items-center justify-center p-6 border-b border-zinc-800 group-hover:bg-zinc-800 transition-colors">
              <Globe size={32} className="text-zinc-700 mb-3 group-hover:text-blue-500 transition-colors" />
              <p className="text-xs text-zinc-500 text-center line-clamp-2 px-4">{asset.title}</p>
          </div>
      );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-in zoom-in-95 duration-200">
      <div className="w-full max-w-5xl bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800 bg-zinc-950/50 backdrop-blur">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-zinc-900 rounded-xl flex items-center justify-center border border-zinc-800 shadow-inner">
                 <LayoutDashboard className="text-blue-500" size={24} />
             </div>
             <div>
                <h3 className="font-bold text-xl tracking-tight text-white flex items-center gap-2">
                    Asset Vault <span className="text-zinc-600">///</span> {scene.id}
                </h3>
                <div className="flex items-center gap-4 text-xs mt-1">
                    <span className="flex items-center gap-1 text-zinc-400">
                        <Clock size={12} /> SESSION: ACTIVE
                    </span>
                    <span className={`flex items-center gap-1 font-bold ${totalScore >= targetScore ? 'text-green-400' : 'text-amber-400'}`}>
                        {totalScore >= targetScore ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
                        INTELLIGENCE SCORE: {totalScore}PTS
                    </span>
                </div>
             </div>
          </div>
          
          <div className="flex items-center gap-2">
              {activeTab === 'found' && (
                  <button 
                    disabled={selectedAssets.length !== 2 || isMixing}
                    onClick={handleMix}
                    className="mr-4 px-4 py-2 bg-purple-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-lg font-bold text-xs uppercase tracking-wide flex items-center gap-2 hover:bg-purple-500 transition-colors shadow-lg shadow-purple-900/20"
                  >
                      {isMixing ? <Loader2 size={14} className="animate-spin" /> : <Blend size={14} />}
                      {isMixing ? 'Fusing...' : 'Fuse Selected (2)'}
                  </button>
              )}

              <div className="flex items-center gap-2 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
                  <button 
                    onClick={() => setActiveTab('found')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'found' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                      Found Assets ({allAssets.length})
                  </button>
                  <button 
                    onClick={() => setActiveTab('generated')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'generated' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                      Generated Output
                  </button>
              </div>

              <button 
                onClick={onClose}
                className="ml-4 p-3 rounded-full bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors border border-zinc-800"
              >
                <X size={20} />
              </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-1 w-full bg-zinc-900">
            <div 
                className={`h-full transition-all duration-1000 ${totalScore >= targetScore ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-amber-500'}`} 
                style={{ width: `${progress}%` }} 
            />
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-black/40">
           
           {activeTab === 'found' && (
               <div className="space-y-8">
                   {/* Agent Reasoning */}
                   <div className="bg-blue-900/10 border border-blue-500/20 p-4 rounded-xl">
                       <h4 className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                           <Search size={14} /> Research Plan
                       </h4>
                       <p className="text-zinc-300 font-mono text-sm leading-relaxed">{scene.visualResearchPlan}</p>
                   </div>

                   {/* Asset Grid */}
                   {allAssets.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-zinc-600 border-2 border-dashed border-zinc-800 rounded-2xl">
                            <Search size={48} className="mb-4 opacity-50" />
                            <p className="text-lg font-medium">No external assets acquired.</p>
                            <p className="text-sm">Agent is scanning for high-value targets...</p>
                        </div>
                   ) : (
                       <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                           {allAssets.map((asset, i) => {
                               const isSelected = selectedAssets.includes(asset.title);
                               return (
                               <div 
                                 key={i} 
                                 onClick={() => toggleAssetSelection(asset.title)}
                                 className={`group cursor-pointer relative bg-zinc-900 border rounded-xl overflow-hidden transition-all hover:-translate-y-1 ${isSelected ? 'border-purple-500 ring-2 ring-purple-500/30 shadow-xl shadow-purple-900/20' : 'border-zinc-800 hover:border-zinc-600'}`}
                               >
                                   {isSelected && (
                                       <div className="absolute top-2 right-2 z-10 w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center text-white shadow-lg">
                                           <CheckCircle size={14} />
                                       </div>
                                   )}
                                   {getPreview(asset)}
                                   <div className="p-4">
                                       <div className="flex items-center justify-between mb-2">
                                           <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                                               asset.type === 'video' ? 'bg-purple-900/30 text-purple-400' : 
                                               asset.type === 'image' ? 'bg-green-900/30 text-green-400' : 
                                               'bg-blue-900/30 text-blue-400'
                                           }`}>
                                               {asset.type}
                                           </span>
                                           <ExternalLink size={12} className="text-zinc-600 group-hover:text-white" />
                                       </div>
                                       <h5 className="text-sm font-medium text-zinc-300 line-clamp-2 mb-1 group-hover:text-white transition-colors">
                                           {asset.title}
                                       </h5>
                                       <p className="text-xs text-zinc-600 font-mono truncate opacity-60">
                                           {new URL(asset.url).hostname}
                                       </p>
                                   </div>
                               </div>
                               );
                           })}
                       </div>
                   )}
               </div>
           )}

           {activeTab === 'generated' && (
               <div className="max-w-4xl mx-auto space-y-8">
                  <div className="aspect-video w-full bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 relative group shadow-2xl">
                      {scene.imageUrl ? (
                          <img src={scene.imageUrl} alt="concept" className="w-full h-full object-cover" />
                      ) : (
                          <div className="flex flex-col items-center justify-center h-full text-zinc-700 gap-4">
                              <ImageIcon size={48} className="opacity-20" />
                              <p className="font-mono text-sm">Awaiting Generation...</p>
                          </div>
                      )}
                      
                      {scene.useVeo && (
                          <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg animate-pulse">
                              VEO 3 RENDER
                          </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-8">
                          <div className="max-w-2xl">
                              <h4 className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2">Prompt</h4>
                              <p className="text-white font-mono text-sm leading-relaxed">{scene.imagePrompt}</p>
                          </div>
                      </div>
                  </div>

                  <div className="bg-zinc-900 p-8 rounded-2xl border border-zinc-800">
                      <h4 className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                          <FileText size={14} /> Script & Voiceover
                      </h4>
                      <p className="text-2xl font-serif text-zinc-200 leading-relaxed indent-8">
                          "{scene.script}"
                      </p>
                  </div>
               </div>
           )}

        </div>
      </div>
    </div>
  );
};
