import React, { useState } from 'react';
import { X, Search, ExternalLink, Image as ImageIcon, LayoutDashboard, Video, FileText, AlertTriangle, CheckCircle, Clock, Blend, Loader2, Eye, Database, HardDrive, Link as LinkIcon, File, DownloadCloud, Wifi } from 'lucide-react';
import { Scene, AssetRecord } from '../types';

interface ResearchPopupProps {
  scene: Scene;
  onClose: () => void;
  onMixAssets: (assetA: string, assetB: string) => Promise<void>;
}

interface AssetCardProps { 
  asset: AssetRecord; 
  isSelected: boolean; 
  onToggle: (e: React.MouseEvent, id: string) => void;
  onPreview: (asset: AssetRecord) => void;
}

const AssetCard: React.FC<AssetCardProps> = ({ 
  asset, 
  isSelected, 
  onToggle, 
  onPreview 
}) => {
    const favicon = `https://www.google.com/s2/favicons?domain=${asset.sourceDomain}&sz=64`;
    const isMedia = asset.type === 'image' || asset.type === 'video';

    return (
      <div 
          onClick={(e) => onToggle(e, asset.id)}
          className={`
              group relative bg-zinc-900 border rounded-lg overflow-hidden transition-all hover:-translate-y-1 hover:shadow-xl cursor-pointer flex flex-col
              ${isSelected ? 'border-blue-500 ring-1 ring-blue-500 shadow-blue-900/20' : 'border-zinc-800 hover:border-zinc-600'}
              ${!isMedia ? 'h-32' : 'h-48'}
          `}
      >
           {/* Selection Checkbox */}
          <div className={`absolute top-2 right-2 z-20 w-5 h-5 rounded-full border flex items-center justify-center transition-all ${isSelected ? 'bg-blue-600 border-blue-500 text-white' : 'bg-black/50 border-white/20 text-transparent group-hover:border-white/50'}`}>
              <CheckCircle size={12} />
          </div>

          {/* Type Badge */}
          <div className="absolute top-2 left-2 z-10 flex gap-1">
              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border backdrop-blur-md uppercase ${
                  asset.type === 'video' ? 'bg-purple-900/80 text-purple-200 border-purple-500/30' : 
                  asset.type === 'image' ? 'bg-green-900/80 text-green-200 border-green-500/30' : 
                  'bg-zinc-800/80 text-zinc-300 border-zinc-600/30'
              }`}>
                  {asset.type.toUpperCase()}
              </span>
              
              {asset.isCached ? (
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border backdrop-blur-md bg-blue-900/80 text-blue-200 border-blue-500/30 flex items-center gap-1">
                      <DownloadCloud size={8} /> LOCAL
                  </span>
              ) : (
                 <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border backdrop-blur-md bg-zinc-800/80 text-zinc-400 border-zinc-600/30 flex items-center gap-1">
                      <Wifi size={8} /> REMOTE
                  </span>
              )}
          </div>

          {/* PREVIEW AREA */}
          <div className="flex-1 relative overflow-hidden bg-black w-full" onClick={(e) => { e.stopPropagation(); onPreview(asset); }}>
              {asset.type === 'image' ? (
                  <img 
                      src={asset.proxyUrl} 
                      alt={asset.title} 
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                      onError={(e) => {
                           // If image fails, hide it and show it as a source card
                           e.currentTarget.style.display = 'none';
                           e.currentTarget.parentElement?.querySelector('.fallback-icon')?.classList.remove('hidden');
                      }}
                  />
              ) : asset.type === 'video' ? (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                      <Video size={32} className="text-purple-500 opacity-80" />
                  </div>
              ) : (
                  // SOURCE / TEXT
                  <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950 p-4 relative">
                      {/* Abstract Background */}
                      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900 via-transparent to-transparent" />
                      <FileText size={24} className="text-zinc-700 mb-2 group-hover:text-zinc-500 transition-colors" />
                      <span className="text-[10px] text-zinc-600 font-mono text-center line-clamp-2 px-2 break-all uppercase tracking-tight">
                          {asset.sourceDomain}
                      </span>
                  </div>
              )}
              
              {/* Fallback Icon for broken images */}
              <div className="fallback-icon hidden absolute inset-0 flex flex-col items-center justify-center bg-zinc-900">
                  <AlertTriangle size={20} className="text-amber-500 mb-1" />
                  <span className="text-[10px] text-zinc-500">Preview Error</span>
              </div>
          </div>

          {/* METADATA FOOTER */}
          <div className="h-14 p-2 bg-zinc-900 border-t border-zinc-800 flex flex-col justify-between">
              <h5 className="text-[11px] font-medium text-zinc-300 line-clamp-1 group-hover:text-white" title={asset.title}>
                  {asset.title}
              </h5>
              <div className="flex items-center gap-2">
                  <img src={favicon} className="w-3 h-3 rounded-sm opacity-50" onError={(e) => e.currentTarget.style.display='none'} />
                  <span className="text-[9px] text-zinc-500 font-mono truncate flex-1">{asset.storagePath}</span>
              </div>
          </div>
      </div>
    );
};

export const ResearchPopup: React.FC<ResearchPopupProps> = ({ scene, onClose, onMixAssets }) => {
  const [activeTab, setActiveTab] = useState<'generated' | 'found'>('found');
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]); 
  const [previewAsset, setPreviewAsset] = useState<AssetRecord | null>(null);
  const [isMixing, setIsMixing] = useState(false);

  const allAssets = scene.assets || [];

  const imageCount = allAssets.filter(a => a.type === 'image').length;
  const videoCount = allAssets.filter(a => a.type === 'video').length;
  const sourceCount = allAssets.filter(a => a.type === 'source').length;
  
  const totalScore = (sourceCount * 0.5) + (imageCount * 1) + (videoCount * 2);
  const targetScore = 5; 

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-in zoom-in-95 duration-200">
      
      {/* FULL SCREEN PREVIEW OVERLAY */}
      {previewAsset && (
          <div className="absolute inset-0 z-[60] bg-black/95 flex flex-col items-center justify-center p-8 animate-in fade-in duration-200" onClick={() => setPreviewAsset(null)}>
              <div className="max-w-5xl w-full bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                  <div className="p-4 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                          <div className="p-2 bg-zinc-800 rounded-lg"><Database size={16} className="text-blue-500"/></div>
                          <div className="flex flex-col">
                              <span className="text-xs text-zinc-500 font-mono uppercase">Stored Object</span>
                              <span className="text-sm font-bold text-white font-mono">{previewAsset.storagePath}</span>
                          </div>
                      </div>
                      <button onClick={() => setPreviewAsset(null)} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400"><X size={20}/></button>
                  </div>
                  
                  <div className="flex-1 overflow-auto p-8 bg-black flex items-center justify-center">
                      {previewAsset.type === 'image' ? (
                          <img src={previewAsset.proxyUrl} className="max-w-full max-h-[60vh] object-contain shadow-lg border border-zinc-800" />
                      ) : (
                          <div className="text-center">
                              <div className="w-24 h-24 bg-zinc-900 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-zinc-800">
                                  {previewAsset.type === 'video' ? <Video size={48} className="text-purple-500"/> : <FileText size={48} className="text-blue-500"/>}
                              </div>
                              <h2 className="text-2xl font-bold text-white mb-2 max-w-2xl">{previewAsset.title}</h2>
                              <a href={previewAsset.originalUrl} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 flex items-center justify-center gap-2 mt-4 text-sm font-mono">
                                  {previewAsset.originalUrl} <ExternalLink size={12}/>
                              </a>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      <div className="w-full max-w-6xl bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800 bg-zinc-950/50 backdrop-blur">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-zinc-900 rounded-xl flex items-center justify-center border border-zinc-800 shadow-inner">
                 <HardDrive className="text-blue-500" size={24} />
             </div>
             <div>
                <h3 className="font-bold text-xl tracking-tight text-white flex items-center gap-2">
                    Project Vault <span className="text-zinc-600">///</span> {scene.id}
                </h3>
                <div className="flex items-center gap-4 text-xs mt-1 font-mono text-zinc-400">
                    <span className="flex items-center gap-1">
                        <Database size={12} /> {allAssets.length} OBJECTS STORED
                    </span>
                    <span className="flex items-center gap-1">
                        <CheckCircle size={12} className="text-green-500" /> SYNCED TO BUCKET
                    </span>
                </div>
             </div>
          </div>
          
          <div className="flex items-center gap-2">
              {activeTab === 'found' && (
                  <button 
                    disabled={selectedAssets.length !== 2 || isMixing}
                    onClick={handleMix}
                    className="mr-4 px-4 py-2 bg-blue-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-lg font-bold text-xs uppercase tracking-wide flex items-center gap-2 hover:bg-blue-500 transition-colors shadow-lg shadow-blue-900/20"
                  >
                      {isMixing ? <Loader2 size={14} className="animate-spin" /> : <Blend size={14} />}
                      {isMixing ? 'Processing...' : `Fuse Selected (${selectedAssets.length}/2)`}
                  </button>
              )}
              <button onClick={onClose} className="p-3 rounded-full bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800"><X size={20} /></button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-black/40">
           {activeTab === 'found' && (
               <div className="space-y-8">
                   <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl flex items-center gap-4">
                       <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                           <Search size={16} className="text-blue-500" />
                       </div>
                       <div className="flex-1">
                           <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Acquisition Target</h4>
                           <p className="text-zinc-300 font-serif text-sm italic">"{scene.visualResearchPlan}"</p>
                       </div>
                   </div>

                   {allAssets.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-zinc-600 border-2 border-dashed border-zinc-800 rounded-2xl">
                            <Loader2 size={48} className="mb-4 animate-spin text-blue-500" />
                            <p className="text-lg font-medium">Ingesting Assets to Vault...</p>
                        </div>
                   ) : (
                       <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                           {allAssets.map((asset) => (
                               <AssetCard 
                                 key={asset.id} 
                                 asset={asset} 
                                 isSelected={selectedAssets.includes(asset.id)}
                                 onToggle={toggleAssetSelection}
                                 onPreview={setPreviewAsset}
                               />
                           ))}
                       </div>
                   )}
               </div>
           )}
        </div>
      </div>
    </div>
  );
};