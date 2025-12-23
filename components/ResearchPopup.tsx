
import React, { useState } from 'react';
import { X, Search, ExternalLink, Image as ImageIcon, LayoutDashboard, Video, FileText, AlertTriangle, CheckCircle, Clock, Blend, Loader2, Eye, Database, HardDrive, Link as LinkIcon, File, DownloadCloud, Wifi, Fingerprint, ShieldAlert, Binary } from 'lucide-react';
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
              ${!isMedia ? 'h-36' : 'h-48'}
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
                  asset.type === 'intel' ? 'bg-blue-900/80 text-blue-200 border-blue-500/30' :
                  'bg-zinc-800/80 text-zinc-300 border-zinc-600/30'
              }`}>
                  {asset.type.toUpperCase()}
              </span>
          </div>

          {/* PREVIEW AREA */}
          <div className="flex-1 relative overflow-hidden bg-black w-full" onClick={(e) => { e.stopPropagation(); onPreview(asset); }}>
              {asset.type === 'image' ? (
                  <img 
                      src={asset.proxyUrl} 
                      alt={asset.title} 
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                      onError={(e) => {
                           e.currentTarget.style.display = 'none';
                           e.currentTarget.parentElement?.querySelector('.fallback-icon')?.classList.remove('hidden');
                           e.currentTarget.parentElement?.querySelector('.fallback-icon')?.classList.add('flex');
                      }}
                  />
              ) : asset.type === 'video' ? (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                      <Video size={32} className="text-purple-500 opacity-80" />
                  </div>
              ) : asset.type === 'intel' ? (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-blue-950/20 p-4 border-b border-blue-500/10">
                      <Binary size={24} className="text-blue-500/40 mb-2" />
                      <p className="text-[10px] text-blue-300/60 font-mono text-center line-clamp-2 uppercase">Neural Ingest Completed</p>
                  </div>
              ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950 p-4 relative">
                      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900 via-transparent to-transparent" />
                      <FileText size={24} className="text-zinc-700 mb-2" />
                      <span className="text-[10px] text-zinc-600 font-mono text-center line-clamp-1 truncate w-full">{asset.sourceDomain}</span>
                  </div>
              )}
              
              <div className="fallback-icon hidden absolute inset-0 flex-col items-center justify-center bg-zinc-950 p-4 text-center">
                  <ShieldAlert size={20} className="text-zinc-700 mb-1" />
                  <span className="text-[9px] text-zinc-600 leading-tight mb-2 uppercase font-mono tracking-tighter">Media Access Restricted</span>
                  <a href={asset.originalUrl} target="_blank" rel="noreferrer" className="text-[9px] text-blue-500 hover:underline flex items-center gap-1" onClick={e => e.stopPropagation()}>ORIGINAL SOURCE <ExternalLink size={8} /></a>
              </div>
          </div>

          {/* METADATA FOOTER */}
          <div className="h-16 p-2 bg-zinc-900 border-t border-zinc-800 flex flex-col justify-between">
              <h5 className="text-[11px] font-bold text-zinc-300 line-clamp-1 group-hover:text-white uppercase tracking-tight" title={asset.title}>
                  {asset.title}
              </h5>
              <div className="flex items-center gap-2">
                  <Fingerprint size={10} className="text-zinc-700" />
                  <span className="text-[9px] text-zinc-600 font-mono truncate flex-1 uppercase tracking-tighter">{asset.id.split('-')[0]}</span>
              </div>
          </div>
      </div>
    );
};

export const ResearchPopup: React.FC<ResearchPopupProps> = ({ scene, onClose, onMixAssets }) => {
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]); 
  const [previewAsset, setPreviewAsset] = useState<AssetRecord | null>(null);
  const [isMixing, setIsMixing] = useState(false);

  const allAssets = scene.assets || [];

  const toggleAssetSelection = (e: React.MouseEvent, assetId: string) => {
    e.stopPropagation();
    if (selectedAssets.includes(assetId)) {
        setSelectedAssets(prev => prev.filter(id => id !== assetId));
    } else {
        if (selectedAssets.length < 2) setSelectedAssets(prev => [...prev, assetId]);
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
              onClose();
          }
      } catch (e) { console.error(e); } finally { setIsMixing(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-2xl p-4 animate-in fade-in duration-300">
      
      {previewAsset && (
          <div className="absolute inset-0 z-[60] bg-black/95 flex flex-col items-center justify-center p-8 animate-in zoom-in-95 duration-200" onClick={() => setPreviewAsset(null)}>
              <div className="max-w-4xl w-full bg-zinc-900 rounded-3xl border border-zinc-800 overflow-hidden shadow-2xl flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                  <div className="p-4 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-500/10 rounded-lg"><Database size={16} className="text-blue-500"/></div>
                          <span className="text-sm font-bold text-white font-mono uppercase tracking-widest">{previewAsset.storagePath}</span>
                      </div>
                      <button onClick={() => setPreviewAsset(null)} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400"><X size={20}/></button>
                  </div>
                  
                  <div className="flex-1 overflow-auto p-10 bg-black flex flex-col items-center">
                      {previewAsset.type === 'image' ? (
                          <div className="relative w-full h-full flex items-center justify-center">
                            <img 
                              src={previewAsset.proxyUrl} 
                              className="max-w-full max-h-[60vh] object-contain shadow-2xl rounded-xl border border-white/5" 
                              onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.parentElement?.querySelector('.full-fallback')?.classList.remove('hidden');
                                  e.currentTarget.parentElement?.querySelector('.full-fallback')?.classList.add('flex');
                              }}
                            />
                            <div className="full-fallback hidden flex-col items-center justify-center text-center">
                                <ShieldAlert size={64} className="text-zinc-800 mb-4" />
                                <h3 className="text-xl font-black text-white mb-2 uppercase tracking-tighter">Access Key Required</h3>
                                <p className="text-zinc-500 max-w-sm mb-8 text-sm leading-relaxed">External source provider has restricted direct neural imaging. Manual redirection required.</p>
                                <a href={previewAsset.originalUrl} target="_blank" rel="noreferrer" className="px-8 py-4 bg-white text-black font-black uppercase tracking-widest rounded-full transition-transform hover:scale-105 flex items-center gap-2">
                                    Open Direct Link <ExternalLink size={16} />
                                </a>
                            </div>
                          </div>
                      ) : (
                          <div className="w-full max-w-2xl">
                              <div className="flex items-center gap-4 mb-8">
                                  <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center border border-white/5">
                                      {previewAsset.type === 'video' ? <Video size={32} className="text-purple-500"/> : <FileText size={32} className="text-blue-500"/>}
                                  </div>
                                  <div>
                                      <h2 className="text-2xl font-black text-white uppercase tracking-tighter leading-none mb-1">{previewAsset.title}</h2>
                                      <p className="text-zinc-500 font-mono text-xs">{previewAsset.sourceDomain}</p>
                                  </div>
                              </div>
                              <div className="p-8 bg-zinc-900 border border-white/5 rounded-2xl text-zinc-300 font-serif text-lg italic leading-relaxed shadow-inner">
                                  {previewAsset.textContent || "No text snippets extracted from source. Direct access recommended."}
                              </div>
                              <a href={previewAsset.originalUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-3 mt-10 p-4 border border-zinc-800 rounded-full text-zinc-500 hover:text-white transition-colors text-xs font-mono uppercase tracking-widest">
                                  {previewAsset.originalUrl} <ExternalLink size={14}/>
                              </a>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      <div className="w-full max-w-6xl bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-zinc-800 bg-zinc-950/50 backdrop-blur">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-zinc-900 rounded-xl flex items-center justify-center border border-zinc-800 shadow-inner">
                 <HardDrive className="text-blue-500" size={24} />
             </div>
             <div>
                <h3 className="font-bold text-xl tracking-tight text-white flex items-center gap-2 uppercase tracking-widest">Project Vault <span className="text-zinc-700">/</span> {scene.id}</h3>
                <div className="flex items-center gap-4 text-[10px] mt-1 font-mono text-zinc-500 uppercase tracking-widest">
                    <span className="flex items-center gap-1 text-blue-400"><Database size={12} /> {allAssets.length} Intel Blocks Stored</span>
                    <span className="flex items-center gap-1"><CheckCircle size={12} className="text-green-500" /> Synced to Local Bucket</span>
                </div>
             </div>
          </div>
          <div className="flex items-center gap-2">
              <button 
                disabled={selectedAssets.length !== 2 || isMixing}
                onClick={handleMix}
                className="mr-4 px-6 py-3 bg-blue-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-full font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-blue-500 transition-all shadow-xl shadow-blue-900/20"
              >
                  {isMixing ? <Loader2 size={14} className="animate-spin" /> : <Blend size={14} />}
                  {isMixing ? 'Fusing...' : `Neural Mix (${selectedAssets.length}/2)`}
              </button>
              <button onClick={onClose} className="p-3 rounded-full bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"><X size={20} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-black/40">
           <div className="space-y-8">
               <div className="bg-blue-950/10 border border-blue-500/10 p-5 rounded-2xl flex items-center gap-4">
                   <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
                       <Search size={18} className="text-blue-500" />
                   </div>
                   <div className="flex-1">
                       <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-1">Active Research Directive</h4>
                       <p className="text-zinc-300 font-serif text-sm italic leading-relaxed">"{scene.visualResearchPlan}"</p>
                   </div>
               </div>

               {allAssets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 text-zinc-700 border-2 border-dashed border-zinc-900 rounded-3xl">
                        <Loader2 size={48} className="mb-6 animate-spin text-blue-500/50" />
                        <p className="text-sm font-mono uppercase tracking-[0.3em]">Downloading Neural Data...</p>
                    </div>
               ) : (
                   <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-5">
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
        </div>
      </div>
    </div>
  );
};
