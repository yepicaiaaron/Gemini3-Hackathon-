
import React, { useState } from 'react';
import { X, Search, ExternalLink, Image as ImageIcon, LayoutDashboard, Video, FileText, AlertTriangle, CheckCircle, Clock, Blend, Loader2, Eye, Database } from 'lucide-react';
import { Scene, AssetRecord } from '../types';

interface ResearchPopupProps {
  scene: Scene;
  onClose: () => void;
  onMixAssets: (assetA: string, assetB: string) => Promise<void>;
}

export const ResearchPopup: React.FC<ResearchPopupProps> = ({ scene, onClose, onMixAssets }) => {
  const [activeTab, setActiveTab] = useState<'generated' | 'found'>('found');
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]); // Stores IDs
  const [previewAsset, setPreviewAsset] = useState<AssetRecord | null>(null);
  const [isMixing, setIsMixing] = useState(false);

  // Use the Asset Database Records
  const allAssets = scene.assets || [];

  // Scoring Logic
  const imageCount = allAssets.filter(a => a.type === 'image').length;
  const videoCount = allAssets.filter(a => a.type === 'video').length;
  const textCount = allAssets.filter(a => a.type === 'text').length;
  
  const totalScore = (textCount * 0.5) + (imageCount * 1) + (videoCount * 2);
  const targetScore = 5; 
  const progress = Math.min(100, (totalScore / targetScore) * 100);

  const toggleAssetSelection = (e: React.MouseEvent, assetId: string) => {
    e.stopPropagation();
    if (selectedAssets.includes(assetId)) {
        setSelectedAssets(prev => prev.filter(id => id !== assetId));
    } else {
        if (selectedAssets.length < 2) {
            setSelectedAssets(prev => [...prev, assetId]);
        }
    }
  };

  const handleMix = async () => {
      if (selectedAssets.length !== 2) return;
      setIsMixing(true);
      try {
          // Pass titles/descriptions to mixer, not just URLs, for better context
          const assetA = allAssets.find(a => a.id === selectedAssets[0]);
          const assetB = allAssets.find(a => a.id === selectedAssets[1]);
          if(assetA && assetB) {
              await onMixAssets(assetA.title, assetB.title); 
              setActiveTab('generated');
          }
      } catch (e) {
          console.error("Mix failed", e);
      } finally {
          setIsMixing(false);
          setSelectedAssets([]);
      }
  };

  const AssetThumbnail = ({ asset }: { asset: AssetRecord }) => {
      const hostname = asset.sourceDomain;
      const favicon = `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`;

      // Visual Card for Text/Web
      if (asset.type === 'text') {
          return (
             <div className="w-full h-full bg-zinc-950 flex flex-col items-center justify-center p-4 text-zinc-400 border border-zinc-800 relative overflow-hidden group-hover:bg-zinc-800 transition-colors">
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-500 via-zinc-900 to-black" />
                <img src={favicon} alt="icon" className="w-12 h-12 mb-3 rounded-lg shadow-lg opacity-80" onError={(e) => e.currentTarget.style.display='none'} />
                <div className="z-10 text-center w-full px-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider block text-blue-400 mb-1 truncate">{hostname}</span>
                    <FileText size={16} className="mx-auto text-zinc-600" />
                </div>
            </div>
          );
      }

      // For Images/Videos, use the Proxy URL (Saved Copy)
      if (asset.type === 'image') {
          return (
              <img 
                src={asset.proxyUrl} 
                alt={asset.title} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                onError={(e) => {
                    // Fallback to favicon card if proxy fails
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement?.querySelector('.fallback-card')?.classList.remove('hidden');
                }} 
              />
          );
      }
      if (asset.type === 'video') {
          return (
              <div className="w-full h-full bg-zinc-900 flex items-center justify-center relative">
                  <Video size={32} className="text-purple-500" />
                  <img src={favicon} className="absolute bottom-2 right-2 w-4 h-4 opacity-50" />
              </div>
          );
      }
      return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-in zoom-in-95 duration-200">
      
      {/* FULL SCREEN PREVIEW OVERLAY */}
      {previewAsset && (
          <div className="absolute inset-0 z-[60] bg-black/95 flex flex-col items-center justify-center p-8 animate-in fade-in duration-200" onClick={() => setPreviewAsset(null)}>
              <button className="absolute top-6 right-6 p-4 bg-zinc-800 rounded-full text-white hover:bg-zinc-700">
                  <X size={24} />
              </button>
              <div className="max-w-6xl max-h-[80vh] w-full flex items-center justify-center relative" onClick={e => e.stopPropagation()}>
                  {previewAsset.type === 'image' ? (
                      <img src={previewAsset.proxyUrl} alt={previewAsset.title} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl border border-zinc-800" />
                  ) : (
                      <div className="bg-zinc-900 p-12 rounded-2xl text-center border border-zinc-800 flex flex-col items-center">
                          <img src={`https://www.google.com/s2/favicons?domain=${previewAsset.sourceDomain}&sz=128`} className="w-24 h-24 mb-6 rounded-2xl shadow-2xl" alt="site icon" />
                          <h3 className="text-2xl font-bold text-white mb-2 max-w-2xl text-center">{previewAsset.title}</h3>
                          <p className="text-zinc-500 mb-8 font-mono text-sm">{previewAsset.originalUrl}</p>
                          <a href={previewAsset.originalUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-full font-bold hover:bg-blue-500 transition-all hover:scale-105 shadow-xl shadow-blue-900/20">
                              Visit Source Website <ExternalLink size={16} />
                          </a>
                      </div>
                  )}
              </div>
          </div>
      )}

      <div className="w-full max-w-6xl bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800 bg-zinc-950/50 backdrop-blur">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-zinc-900 rounded-xl flex items-center justify-center border border-zinc-800 shadow-inner">
                 <Database className="text-blue-500" size={24} />
             </div>
             <div>
                <h3 className="font-bold text-xl tracking-tight text-white flex items-center gap-2">
                    Asset Database <span className="text-zinc-600">///</span> {scene.id}
                </h3>
                <div className="flex items-center gap-4 text-xs mt-1">
                    <span className="flex items-center gap-1 text-zinc-400">
                        <Clock size={12} /> STATUS: ONLINE
                    </span>
                    <span className={`flex items-center gap-1 font-bold ${totalScore >= targetScore ? 'text-green-400' : 'text-amber-400'}`}>
                        {totalScore >= targetScore ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
                        COLLECTED: {allAssets.length} ITEMS
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
                      {isMixing ? 'Fusing...' : `Fuse Selected (${selectedAssets.length}/2)`}
                  </button>
              )}
              <button onClick={onClose} className="p-3 rounded-full bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800"><X size={20} /></button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-black/40">
           {activeTab === 'found' && (
               <div className="space-y-8">
                   <div className="bg-blue-900/10 border border-blue-500/20 p-4 rounded-xl">
                       <h4 className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                           <Search size={14} /> Acquisition Plan
                       </h4>
                       <p className="text-zinc-300 font-mono text-sm leading-relaxed">{scene.visualResearchPlan}</p>
                   </div>

                   {allAssets.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-zinc-600 border-2 border-dashed border-zinc-800 rounded-2xl">
                            <Loader2 size={48} className="mb-4 animate-spin text-blue-500" />
                            <p className="text-lg font-medium">Ingesting Assets...</p>
                        </div>
                   ) : (
                       <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                           {allAssets.map((asset) => {
                               const isSelected = selectedAssets.includes(asset.id);
                               return (
                               <div 
                                 key={asset.id}
                                 className={`group relative bg-zinc-900 border rounded-xl overflow-hidden transition-all hover:-translate-y-1 hover:shadow-xl ${isSelected ? 'border-purple-500 ring-1 ring-purple-500 shadow-purple-900/20' : 'border-zinc-800 hover:border-zinc-600'}`}
                               >
                                   <div 
                                      onClick={(e) => toggleAssetSelection(e, asset.id)}
                                      className={`absolute top-2 right-2 z-20 w-6 h-6 rounded-full border cursor-pointer flex items-center justify-center transition-all ${isSelected ? 'bg-purple-600 border-purple-500 text-white' : 'bg-black/50 border-white/20 text-transparent hover:border-white/50'}`}
                                   >
                                       <CheckCircle size={14} />
                                   </div>

                                   <div className="aspect-video w-full bg-black relative cursor-zoom-in" onClick={() => setPreviewAsset(asset)}>
                                        <AssetThumbnail asset={asset} />
                                        
                                        {/* Fallback Card (Hidden by default, shown on error) */}
                                        <div className="fallback-card hidden w-full h-full bg-zinc-900 flex-col items-center justify-center">
                                            <AlertTriangle className="text-amber-500 mb-2" size={20} />
                                            <span className="text-[10px] text-zinc-500">Preview Unavailable</span>
                                        </div>

                                        <div className="absolute bottom-2 left-2 z-10 flex gap-1">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase backdrop-blur-md ${
                                                asset.type === 'video' ? 'bg-purple-900/80 text-purple-200' : 
                                                asset.type === 'image' ? 'bg-green-900/80 text-green-200' : 
                                                'bg-blue-900/80 text-blue-200'
                                            }`}>
                                                {asset.type}
                                            </span>
                                        </div>
                                   </div>

                                   <div className="p-4" onClick={() => setPreviewAsset(asset)}>
                                       <p className="text-xs text-zinc-500 font-mono mb-1">{asset.sourceDomain}</p>
                                       <h5 className="text-sm font-medium text-zinc-300 line-clamp-2 group-hover:text-white transition-colors cursor-pointer">
                                           {asset.title}
                                       </h5>
                                   </div>
                               </div>
                               );
                           })}
                       </div>
                   )}
               </div>
           )}
           {/* ... Generated Tab remains the same ... */}
        </div>
      </div>
    </div>
  );
};
