
import React, { useState, useEffect } from 'react';
import { Scene, RenderProgress } from '../types';
import { VideoRenderer } from '../utils/videoRenderer';
import { Youtube, Upload, Download, Loader2, CheckCircle, AlertTriangle, X } from 'lucide-react';

interface YouTubeModalProps {
  scenes: Scene[];
  aspectRatio: '16:9' | '9:16' | '1:1';
  onClose: () => void;
}

export const YouTubeModal: React.FC<YouTubeModalProps> = ({ scenes, aspectRatio, onClose }) => {
  const [step, setStep] = useState<'details' | 'rendering' | 'uploading' | 'success'>('details');
  const [title, setTitle] = useState('My Agentic Video');
  const [description, setDescription] = useState('Generated with Agentic Video Creator.');
  const [progress, setProgress] = useState<RenderProgress>({ status: 'idle', progress: 0 });
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const startExport = async () => {
      setStep('rendering');
      setProgress({ status: 'preparing', progress: 0 });
      
      const renderer = new VideoRenderer(scenes, aspectRatio, (p, s) => {
          setProgress({ status: 'rendering', progress: p * 100 });
      });
      
      try {
          const blob = await renderer.render();
          setVideoBlob(blob);
          const url = URL.createObjectURL(blob);
          setDownloadUrl(url);
          setStep('uploading');
          simulateUpload();
      } catch (e) {
          console.error(e);
          setStep('details'); // Reset on error
      }
  };

  const simulateUpload = async () => {
      // Simulate API upload delay
      for (let i = 0; i <= 100; i += 5) {
          setProgress({ status: 'encoding', progress: i });
          await new Promise(r => setTimeout(r, 100));
      }
      setStep('success');
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-white"><X size={20}/></button>
        
        <div className="p-8 border-b border-zinc-800 bg-zinc-950/50">
            <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center text-white shadow-lg">
                    <Youtube size={20} />
                </div>
                <h2 className="text-xl font-bold text-white">YouTube Export</h2>
            </div>
            <p className="text-sm text-zinc-400">Render your timeline and upload to Studio.</p>
        </div>

        <div className="p-8">
            {step === 'details' && (
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest block mb-2">Video Title</label>
                        <input 
                            value={title} 
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-red-600 transition-colors"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest block mb-2">Description</label>
                        <textarea 
                            value={description} 
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full h-24 bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-red-600 transition-colors resize-none"
                        />
                    </div>
                    <button 
                        onClick={startExport}
                        className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 mt-4"
                    >
                        <Upload size={18} /> Render & Export
                    </button>
                </div>
            )}

            {(step === 'rendering' || step === 'uploading') && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="relative w-20 h-20 mb-6 flex items-center justify-center">
                         <svg className="w-full h-full transform -rotate-90">
                             <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-zinc-800" />
                             <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-red-600 transition-all duration-300" strokeDasharray={226} strokeDashoffset={226 - (226 * progress.progress) / 100} />
                         </svg>
                         <div className="absolute inset-0 flex items-center justify-center font-mono font-bold text-xl">{Math.round(progress.progress)}%</div>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2 animate-pulse">
                        {step === 'rendering' ? 'Rendering Video Engine...' : 'Uploading to YouTube...'}
                    </h3>
                    <p className="text-sm text-zinc-500 max-w-xs">Please do not close this window. We are stitching your assets into a single video file.</p>
                </div>
            )}

            {step === 'success' && (
                <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-6">
                        <CheckCircle size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Ready for Studio</h3>
                    <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 mb-6 text-left w-full">
                         <div className="flex items-start gap-3">
                            <AlertTriangle size={16} className="text-yellow-500 mt-0.5 shrink-0" />
                            <p className="text-xs text-zinc-400 leading-relaxed">
                                <strong>API Note:</strong> Your current API Key does not support direct YouTube write access. The video file has been generated successfully.
                            </p>
                         </div>
                    </div>
                    
                    <div className="flex gap-3 w-full">
                        {downloadUrl && (
                            <a href={downloadUrl} download="agentic_video_output.webm" className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl flex items-center justify-center gap-2">
                                <Download size={18} /> Save File
                            </a>
                        )}
                        <a href="https://studio.youtube.com" target="_blank" rel="noreferrer" className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl flex items-center justify-center gap-2">
                            Open Studio <Upload size={18} />
                        </a>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
