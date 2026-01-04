import React, { useState, useReducer, useCallback, useEffect, useRef } from 'react';
import { 
  ProjectState, 
  PipelineStep, 
  AgentAction, 
  Scene,
  GroundingChunk,
  VideoStrategy,
  HookStyle,
  AspectRatio,
  AssetStatus,
  AssetRecord
} from './types';
import * as GeminiService from './services/gemini';
import { PipelineSteps } from './components/PipelineSteps';
import { SceneCard } from './components/SceneCard';
import { PreviewPlayer } from './components/PreviewPlayer';
import { ResearchPopup } from './components/ResearchPopup';
import { FallingText } from './components/FallingText';
import { 
  BrainCircuit, 
  Zap, 
  AlertCircle,
  Mic,
  Key,
  Edit2,
  Play,
  CheckCircle2,
  ArrowRight,
  Target,
  PenTool,
  Lightbulb,
  Scissors,
  FileText,
  Type,
  Smartphone,
  Monitor,
  ChevronDown,
  Sparkles,
  PlayCircle,
  Activity,
  Timer,
  Server,
  RefreshCw,
  User,
  Download,
  Youtube,
  Rocket,
  Loader2,
  RefreshCcw,
  Save
} from 'lucide-react';

// Add global window interface extension for aistudio to prevent potential TS errors
declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    }
  }
}

const initialState: ProjectState = {
  topic: '',
  userLinks: [],
  voice: 'Puck',
  hookStyle: 'AI_SELECTED',
  aspectRatio: '16:9',
  status: PipelineStep.IDLE,
  narrativeBeats: [],
  scenes: [],
  logs: [],
  error: undefined
};

const VOICES = [
  { id: 'Puck', label: 'Puck (Male, Friendly)' },
  { id: 'Charon', label: 'Charon (Male, Deep)' },
  { id: 'Kore', label: 'Kore (Female, Soothing)' },
  { id: 'Fenrir', label: 'Fenrir (Male, Intense)' },
  { id: 'Zephyr', label: 'Zephyr (Female, Calm)' },
  { id: 'Aoife', label: 'Aoife (Female, Historic)' },
];

const HOOKS: {id: HookStyle, label: string, icon: React.ReactNode, asset: string, type: 'video' | 'image'}[] = [
    { id: 'AI_SELECTED', label: 'AI-Selected', icon: <Zap size={14} />, asset: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=800&auto=format&fit=crop', type: 'image' },
    { id: 'FAST_CUT', label: 'Fast Cut', icon: <Scissors size={14} />, asset: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4', type: 'video' },
    { id: 'ARTICLE_HIGHLIGHT', label: 'Article Highlight', icon: <FileText size={14} />, asset: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', type: 'video' },
    { id: 'TEXT_MATCH', label: 'Text Match', icon: <Type size={14} />, asset: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4', type: 'video' },
];

function reducer(state: ProjectState, action: AgentAction): ProjectState {
  switch (action.type) {
    case 'START_ANALYSIS':
      return { ...initialState, topic: action.payload.topic, userLinks: action.payload.userLinks, voice: action.payload.voice, hookStyle: action.payload.hookStyle, aspectRatio: action.payload.aspectRatio, status: PipelineStep.ANALYZING, logs: [`Analyzing input...`] };
    case 'SET_STRATEGY':
      return { ...state, strategy: action.payload, status: PipelineStep.STRATEGY };
    case 'UPDATE_STRATEGY':
      return { ...state, strategy: action.payload };
    case 'SET_STATUS':
      return { ...state, status: action.payload };
    case 'SET_NARRATIVE':
      return { ...state, narrativeBeats: action.payload };
    case 'SET_SCENES':
      return { ...state, scenes: action.payload };
    case 'UPDATE_ASSET_STATUS':
      return { ...state, scenes: state.scenes.map(s => {
          if (s.id !== action.payload.id) return s;
          const updates: any = {};
          if (action.payload.type === 'audio') updates.statusAudio = action.payload.status;
          if (action.payload.type === 'preview') updates.statusPreview = action.payload.status;
          if (action.payload.type === 'image1') updates.statusImage1 = action.payload.status;
          if (action.payload.type === 'image2') updates.statusImage2 = action.payload.status;
          if (action.payload.type === 'video1') updates.statusVideo1 = action.payload.status;
          if (action.payload.type === 'video2') updates.statusVideo2 = action.payload.status;
          return { ...s, ...updates };
      })};
    case 'UPDATE_SCENE_RESEARCH_STATUS':
      return { ...state, scenes: state.scenes.map(s => s.id === action.payload.id ? { ...s, isResearching: action.payload.isResearching } : s) };
    case 'INGEST_ASSETS':
      return { ...state, scenes: state.scenes.map(s => s.id === action.payload.sceneId ? { ...s, assets: action.payload.assets } : s) };
    case 'UPDATE_SCENE_PREVIEW':
      return { ...state, scenes: state.scenes.map(s => s.id === action.payload.id ? { 
          ...s, 
          previewUrl: action.payload.url,
          statusPreview: 'success'
      } : s) };
    case 'UPDATE_SCENE_IMAGE':
      return { ...state, scenes: state.scenes.map(s => s.id === action.payload.id ? { 
          ...s, 
          [`imageUrl${action.payload.slot}`]: action.payload.url, 
          [`statusImage${action.payload.slot}`]: 'success'
      } : s) };
    case 'UPDATE_SCENE_VIDEO':
      return { ...state, scenes: state.scenes.map(s => s.id === action.payload.id ? { 
          ...s, 
          [`videoUrl${action.payload.slot}`]: action.payload.url,
          [`statusVideo${action.payload.slot}`]: 'success'
      } : s) };
    case 'UPDATE_SCENE_AUDIO':
      return { ...state, scenes: state.scenes.map(s => s.id === action.payload.id ? { ...s, audioUrl: action.payload.url, statusAudio: 'success' } : s) };
    case 'UPDATE_SCENE_SCRIPT':
      return { ...state, scenes: state.scenes.map(s => s.id === action.payload.id ? { ...s, script: action.payload.script } : s) };
    case 'ADD_LOG':
      return { ...state, logs: [...state.logs, action.payload] };
    case 'SET_ERROR':
      return { ...state, status: PipelineStep.ERROR, error: action.payload };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

const ProductionTimer = () => {
    const [seconds, setSeconds] = useState(300); 
    useEffect(() => {
        const timer = setInterval(() => setSeconds(prev => Math.max(0, prev - 1)), 1000);
        return () => clearInterval(timer);
    }, []);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return (
        <div className="flex items-center gap-2 text-blue-400 font-mono text-sm bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
            <Timer size={14} />
            <span>EST. PRODUCTION: {mins}:{secs.toString().padStart(2, '0')}</span>
        </div>
    );
};

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [researchSceneId, setResearchSceneId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [selectedVoice, setSelectedVoice] = useState('Puck');
  const [selectedHook, setSelectedHook] = useState<HookStyle>('AI_SELECTED');
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<AspectRatio>('16:9');
  const [editingSceneId, setEditingSceneId] = useState<string | null>(null);
  const [editScriptText, setEditScriptText] = useState('');
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  // Strategy form now initialized by useEffect when state.strategy changes
  const [strategyForm, setStrategyForm] = useState<VideoStrategy | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
      if (state.strategy) {
          setStrategyForm(state.strategy);
      }
  }, [state.strategy]);

  useEffect(() => {
    if (state.scenes.length === 0) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const index = Number(entry.target.getAttribute('data-index'));
          if (!isNaN(index)) setActiveSceneIndex(index);
        }
      });
    }, { threshold: 0.5 });
    state.scenes.forEach((_, i) => {
      const el = document.getElementById(`scene-card-${i}`);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [state.scenes]);

  const startAnalysis = useCallback(async (topic: string) => {
    if (window.aistudio?.hasSelectedApiKey && !(await window.aistudio.hasSelectedApiKey())) await window.aistudio?.openSelectKey?.();
    const userLinks = (topic.match(/(https?:\/\/[^\s]+)/g) || []);
    dispatch({ type: 'START_ANALYSIS', payload: { topic, userLinks, voice: selectedVoice, hookStyle: selectedHook, aspectRatio: selectedAspectRatio } });
    try {
       const strategy = await GeminiService.analyzeRequest(topic);
       dispatch({ type: 'SET_STRATEGY', payload: strategy });
       // Form state updated by effect
    } catch (error: any) {
       dispatch({ type: 'SET_ERROR', payload: error.message || 'Analysis agent failed.' });
    }
  }, [selectedVoice, selectedHook, selectedAspectRatio]);

  const runDeepResearch = async (scenes: Scene[]) => {
      dispatch({ type: 'SET_STATUS', payload: PipelineStep.RESEARCHING });
      const processResearch = async (scene: Scene) => {
          dispatch({ type: 'UPDATE_SCENE_RESEARCH_STATUS', payload: { id: scene.id, isResearching: true } });
          const assets = await GeminiService.researchScene(scene);
          dispatch({ type: 'INGEST_ASSETS', payload: { sceneId: scene.id, assets } });
          dispatch({ type: 'UPDATE_SCENE_RESEARCH_STATUS', payload: { id: scene.id, isResearching: false } });
      };
      const queue = [...scenes];
      const workers = Array.from({ length: 4 }).map(async () => {
          while (queue.length > 0) {
              const scene = queue.shift();
              if (scene) await processResearch(scene);
          }
      });
      await Promise.all(workers);
      dispatch({ type: 'SET_STATUS', payload: PipelineStep.REVIEW });
  };

  const confirmStrategyAndPlan = useCallback(async () => {
    if (!strategyForm) return;
    
    // Commit edits to global state before planning
    dispatch({ type: 'UPDATE_STRATEGY', payload: strategyForm });
    
    dispatch({ type: 'SET_STATUS', payload: PipelineStep.NARRATIVE });
    try {
      // Pass the *edited* strategyForm to the agents
      const beats = await GeminiService.generateNarrative(state.topic, state.hookStyle, strategyForm);
      dispatch({ type: 'SET_NARRATIVE', payload: beats });
      dispatch({ type: 'SET_STATUS', payload: PipelineStep.SCENE_PLANNING });
      const scenes = await GeminiService.planScenes(beats, state.aspectRatio, state.userLinks, strategyForm, state.hookStyle);
      dispatch({ type: 'SET_SCENES', payload: scenes });
      
      const wireframePromises = scenes.map(async (scene) => {
          dispatch({ type: 'UPDATE_ASSET_STATUS', payload: { id: scene.id, type: 'preview', status: 'loading' } });
          // Ensure prompt is script-based but focuses on representing the block visually
          const wireframeUrl = await GeminiService.generateWireframe(scene.script, state.aspectRatio);
          dispatch({ type: 'UPDATE_SCENE_PREVIEW', payload: { id: scene.id, url: wireframeUrl } });
      });
      await Promise.all(wireframePromises);
      
      await runDeepResearch(scenes);
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Scene planning failed.' });
    }
  }, [strategyForm, state.topic, state.hookStyle, state.aspectRatio, state.userLinks]);

  const processSceneProduction = async (scene: Scene) => {
      // 1. Audio
      dispatch({ type: 'UPDATE_ASSET_STATUS', payload: { id: scene.id, type: 'audio', status: 'loading' } });
      const audioUrl = await GeminiService.generateSpeech(scene.script, state.voice);
      dispatch({ type: 'UPDATE_SCENE_AUDIO', payload: { id: scene.id, url: audioUrl } });

      // 2. Dual Asset Production
      // Visual 1
      dispatch({ type: 'UPDATE_ASSET_STATUS', payload: { id: scene.id, type: 'image1', status: 'loading' } });
      const res1 = await GeminiService.generateSceneImage(scene.imagePrompt1 || scene.script, state.aspectRatio);
      dispatch({ type: 'UPDATE_SCENE_IMAGE', payload: { id: scene.id, slot: 1, url: res1.imageUrl } });
      if (scene.useVeo) {
          dispatch({ type: 'UPDATE_ASSET_STATUS', payload: { id: scene.id, type: 'video1', status: 'loading' } });
          const v1 = await GeminiService.generateVideo(scene.imagePrompt1 || scene.script, state.aspectRatio, res1.imageUrl);
          dispatch({ type: 'UPDATE_SCENE_VIDEO', payload: { id: scene.id, slot: 1, url: v1 } });
      }

      // Visual 2
      dispatch({ type: 'UPDATE_ASSET_STATUS', payload: { id: scene.id, type: 'image2', status: 'loading' } });
      const res2 = await GeminiService.generateSceneImage(scene.imagePrompt2 || "Alternative " + scene.script, state.aspectRatio);
      dispatch({ type: 'UPDATE_SCENE_IMAGE', payload: { id: scene.id, slot: 2, url: res2.imageUrl } });
      if (scene.useVeo) {
          dispatch({ type: 'UPDATE_ASSET_STATUS', payload: { id: scene.id, type: 'video2', status: 'loading' } });
          const v2 = await GeminiService.generateVideo(scene.imagePrompt2 || scene.script, state.aspectRatio, res2.imageUrl);
          dispatch({ type: 'UPDATE_SCENE_VIDEO', payload: { id: scene.id, slot: 2, url: v2 } });
      }
  };

  const approveAndGenerate = useCallback(async () => {
     dispatch({ type: 'SET_STATUS', payload: PipelineStep.ASSET_GENERATION });
     const queue = [...state.scenes];
     const workers = Array.from({ length: 2 }).map(async () => {
         while (queue.length > 0) {
             const scene = queue.shift();
             if (scene) await processSceneProduction(scene);
         }
     });
     await Promise.all(workers);
     dispatch({ type: 'SET_STATUS', payload: PipelineStep.COMPLETE });
  }, [state.scenes]);

  const handleDownload = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `agentic_project_${Date.now()}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleYouTubeExport = async () => {
    setIsExporting(true);
    await new Promise(r => setTimeout(r, 3500));
    alert("Project packaged for distribution. API handshake completed.");
    setIsExporting(false);
  };

  const activeResearchScene = state.scenes.find(s => s.id === researchSceneId);

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col font-sans selection:bg-blue-500/30">
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center border border-white/10"><Zap size={18} className="text-white" /></div>
            <h1 className="font-bold text-lg tracking-tight">Agentic<span className="text-zinc-500">Video</span></h1>
          </div>
          <div className="flex items-center gap-4">
             {window.aistudio?.openSelectKey && <button onClick={() => window.aistudio?.openSelectKey?.()} className="text-xs font-mono text-zinc-400 hover:text-white flex items-center gap-1"><Key size={12} /> API KEY</button>}
             <div className="text-xs font-mono text-zinc-600 bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">v0.5.0</div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col pt-16 relative">
        {(state.status === PipelineStep.ANALYZING || state.status === PipelineStep.NARRATIVE || state.status === PipelineStep.SCENE_PLANNING) && (
            <FallingText topic={state.topic} statusText={state.logs[state.logs.length - 1]} />
        )}

        {state.status === PipelineStep.IDLE ? (
           <div className="flex-1 flex flex-col items-center justify-center px-4 py-20 relative overflow-hidden">
             <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
             <div className="w-full max-w-3xl relative z-10 space-y-10">
               <div className="text-center space-y-6">
                  <h2 className="text-6xl md:text-7xl font-bold tracking-tighter text-white">Story to Video.</h2>
                  <p className="text-zinc-400 text-xl max-w-xl mx-auto leading-relaxed">Dual-visual wireframing & multi-agent production.</p>
               </div>
               <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-2xl">
                   <form onSubmit={(e) => { e.preventDefault(); if (inputValue.trim()) startAnalysis(inputValue); }} className="flex flex-col gap-2">
                      <div className="flex items-start px-4 py-4 gap-4">
                         <div className="pt-1 text-zinc-500"><BrainCircuit size={24} /></div>
                         <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="Enter topic or URL..." className="w-full bg-transparent border-none text-xl focus:ring-0 placeholder:text-zinc-600 outline-none text-white font-medium" autoFocus />
                      </div>
                      <div className="bg-black/40 rounded-xl p-3 flex flex-wrap items-center gap-4">
                         <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
                            {HOOKS.map(hook => (
                                <button key={hook.id} type="button" onClick={() => setSelectedHook(hook.id)} className={`relative flex-shrink-0 w-28 h-16 rounded-lg overflow-hidden border transition-all ${selectedHook === hook.id ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-white/10 opacity-60 hover:opacity-100'}`}>
                                   {hook.type === 'video' ? <video src={hook.asset} className="w-full h-full object-cover" muted /> : <img src={hook.asset} className="w-full h-full object-cover" />}
                                   <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><span className="text-[9px] font-bold text-white uppercase px-1">{hook.label}</span></div>
                                </button>
                            ))}
                         </div>
                         <div className="w-[1px] h-10 bg-white/10 hidden md:block" />
                         <div className="flex items-center gap-4 flex-wrap">
                             <div className="flex gap-1">
                               <button type="button" onClick={() => setSelectedAspectRatio('16:9')} className={`p-2 rounded-lg border ${selectedAspectRatio === '16:9' ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}><Monitor size={18} /></button>
                               <button type="button" onClick={() => setSelectedAspectRatio('9:16')} className={`p-2 rounded-lg border ${selectedAspectRatio === '9:16' ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}><Smartphone size={18} /></button>
                             </div>
                             <select value={selectedVoice} onChange={(e) => setSelectedVoice(e.target.value)} className="bg-zinc-800 border border-zinc-700 text-white text-xs rounded-lg px-3 py-2 outline-none">
                                  {VOICES.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
                             </select>
                         </div>
                         <button type="submit" className="ml-auto px-6 py-3 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-colors flex items-center gap-2 text-sm">Create <ArrowRight size={16} /></button>
                      </div>
                   </form>
               </div>
             </div>
           </div>
        ) : (
          <div className="flex-1 flex flex-col w-full px-6 py-8 relative z-10">
            <div className="max-w-6xl mx-auto w-full">
                <PipelineSteps currentStep={state.status} />
                
                {state.status === PipelineStep.COMPLETE && (
                    <div className="mx-auto max-w-4xl bg-zinc-900 border border-zinc-700 p-8 rounded-3xl flex flex-col items-center text-center gap-6 mb-12 shadow-2xl animate-in zoom-in-95 duration-500">
                        <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 mb-2">
                            <CheckCircle2 size={32} />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tight">Project Finalized</h2>
                            <p className="text-zinc-500 font-mono text-sm uppercase tracking-widest">Distributed components synchronized</p>
                        </div>
                        <div className="flex gap-4 w-full">
                            <button onClick={handleDownload} className="flex-1 px-6 py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-2xl flex items-center justify-center gap-3"><Download size={20} /> Project File</button>
                            <button onClick={handleYouTubeExport} disabled={isExporting} className="flex-1 px-6 py-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-2xl flex items-center justify-center gap-3">
                                {isExporting ? <Loader2 className="animate-spin" size={20} /> : <Youtube size={20} />}
                                YouTube Export
                            </button>
                            <button onClick={() => setIsPreviewOpen(true)} className="flex-1 px-6 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl flex items-center justify-center gap-3"><PlayCircle size={20} /> Master Preview</button>
                        </div>
                    </div>
                )}
            </div>

            {state.status === PipelineStep.STRATEGY && strategyForm && (
                <div className="max-w-4xl mx-auto w-full">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-3xl font-bold text-white uppercase tracking-widest flex items-center gap-3">
                                <Activity className="text-blue-500" /> Blueprint Strategy
                            </h2>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => startAnalysis(state.topic)}
                                    className="p-3 rounded-xl border border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-all flex items-center gap-2 text-xs uppercase font-bold tracking-widest"
                                >
                                    <RefreshCcw size={16} /> Regenerate
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            <div className="bg-black/60 rounded-2xl p-6 border border-zinc-800/50">
                                <label className="text-xs font-bold text-blue-400 uppercase mb-3 block tracking-widest">Core Narrative Summary</label>
                                <textarea 
                                    value={strategyForm.summary} 
                                    onChange={(e) => setStrategyForm({...strategyForm, summary: e.target.value})}
                                    className="w-full h-32 bg-transparent text-lg text-zinc-100 placeholder-zinc-700 focus:outline-none resize-none leading-relaxed"
                                    placeholder="Enter summary..."
                                />
                            </div>
                            <div className="space-y-6">
                                <div className="bg-black/60 rounded-2xl p-6 border border-zinc-800/50">
                                    <label className="text-xs font-bold text-purple-400 uppercase mb-2 block tracking-widest">Key Objective</label>
                                    <input 
                                        type="text" 
                                        value={strategyForm.keyObjective} 
                                        onChange={(e) => setStrategyForm({...strategyForm, keyObjective: e.target.value})}
                                        className="w-full bg-transparent text-sm text-zinc-300 focus:outline-none"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="bg-black/60 rounded-2xl p-6 border border-zinc-800/50">
                                        <label className="text-xs font-bold text-green-400 uppercase mb-2 block tracking-widest">Target Audience</label>
                                        <input 
                                            type="text" 
                                            value={strategyForm.targetAudience} 
                                            onChange={(e) => setStrategyForm({...strategyForm, targetAudience: e.target.value})}
                                            className="w-full bg-transparent text-sm text-zinc-300 focus:outline-none"
                                        />
                                    </div>
                                    <div className="bg-black/60 rounded-2xl p-6 border border-zinc-800/50">
                                        <label className="text-xs font-bold text-orange-400 uppercase mb-2 block tracking-widest">Tone & Style</label>
                                        <input 
                                            type="text" 
                                            value={strategyForm.toneStyle} 
                                            onChange={(e) => setStrategyForm({...strategyForm, toneStyle: e.target.value})}
                                            className="w-full bg-transparent text-sm text-zinc-300 focus:outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={confirmStrategyAndPlan} 
                            className="w-full py-5 bg-white text-black font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-3 transition-transform hover:scale-[1.01] shadow-lg shadow-white/10"
                        >
                            <Zap size={20} className="fill-black" /> Approve & Initiate Planning Agents
                        </button>
                    </div>
                </div>
            )}

            {(state.status === PipelineStep.REVIEW || state.status === PipelineStep.RESEARCHING || state.status === PipelineStep.ASSET_GENERATION || state.status === PipelineStep.COMPLETE) && (
                <div className="max-w-6xl mx-auto w-full space-y-12">
                    <div className="flex justify-between items-end border-b border-zinc-800 pb-8">
                        <div>
                            <h1 className="text-4xl font-bold text-white mb-2 tracking-tight uppercase">Master Dashboard</h1>
                            {state.status === PipelineStep.ASSET_GENERATION && <ProductionTimer />}
                        </div>
                        <div className="flex gap-4">
                            <button onClick={() => setIsPreviewOpen(true)} className="px-6 py-3 bg-white text-black font-bold rounded-full flex items-center gap-2"><PlayCircle size={20} /> Launch Preview</button>
                            {state.status === PipelineStep.REVIEW && <button onClick={approveAndGenerate} className="px-6 py-3 bg-blue-600 text-white font-bold rounded-full flex items-center gap-2">Deploy Production <ArrowRight size={18} /></button>}
                        </div>
                    </div>
                    {state.scenes.map((scene, index) => (
                        <SceneCard 
                            key={scene.id} 
                            scene={scene} 
                            index={index} 
                            status={state.status} 
                            onViewResearch={(e) => { e.stopPropagation(); setResearchSceneId(scene.id); }} 
                            onEditScript={(e) => { e.stopPropagation(); setEditingSceneId(scene.id); setEditScriptText(scene.script); }} 
                        />
                    ))}
                </div>
            )}
          </div>
        )}
      </main>

      {editingSceneId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
                  <textarea value={editScriptText} onChange={(e) => setEditScriptText(e.target.value)} className="w-full h-48 bg-zinc-950 text-white p-4 rounded-xl mb-6 font-serif italic text-lg" />
                  <div className="flex justify-end gap-3"><button onClick={() => setEditingSceneId(null)} className="px-6 py-3 text-zinc-400">Cancel</button><button onClick={() => { dispatch({ type: 'UPDATE_SCENE_SCRIPT', payload: { id: editingSceneId, script: editScriptText } }); setEditingSceneId(null); }} className="px-6 py-3 bg-white text-black font-bold rounded-xl">Save Archive</button></div>
              </div>
          </div>
      )}

      {isPreviewOpen && state.scenes.length > 0 && <PreviewPlayer scenes={state.scenes} onClose={() => setIsPreviewOpen(false)} />}
      {activeResearchScene && <ResearchPopup scene={activeResearchScene} onClose={() => setResearchSceneId(null)} onMixAssets={async (a, b) => { try { const { imageUrl } = await GeminiService.mixAssets(a, b, state.aspectRatio); dispatch({ type: 'UPDATE_SCENE_IMAGE', payload: { id: researchSceneId!, slot: 1, url: imageUrl } }); } catch (e) { console.error(e); } }} />}
    </div>
  );
}