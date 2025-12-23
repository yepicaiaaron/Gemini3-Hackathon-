
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
  User
} from 'lucide-react';

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
    { 
      id: 'AI_SELECTED', 
      label: 'AI-Selected', 
      icon: <Zap size={14} />, 
      asset: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=800&auto=format&fit=crop', 
      type: 'image' 
    },
    { 
      id: 'FAST_CUT', 
      label: 'Fast Cut', 
      icon: <Scissors size={14} />, 
      asset: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4', 
      type: 'video' 
    },
    { 
      id: 'ARTICLE_HIGHLIGHT', 
      label: 'Article Highlight', 
      icon: <FileText size={14} />, 
      asset: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', 
      type: 'video' 
    },
    { 
      id: 'TEXT_MATCH', 
      label: 'Text Match', 
      icon: <Type size={14} />, 
      asset: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4', 
      type: 'video' 
    },
];

const AUDIENCE_OPTIONS = [
  "General Public", "Tech Enthusiasts", "Investors", "Students", "Corporate Executives", "Gamers", "Parents", "Researchers"
];
const TONE_OPTIONS = [
  "Professional", "High-Energy", "Documentary", "Minimalist", "Cyberpunk", "Humorous", "Dramatic", "Educational"
];
const OBJECTIVE_OPTIONS = [
  "Education", "Brand Awareness", "Sales/Conversion", "Entertainment", "News Update", "Technical Deep Dive"
];

function reducer(state: ProjectState, action: AgentAction): ProjectState {
  switch (action.type) {
    case 'START_ANALYSIS':
      return { 
        ...initialState, 
        topic: action.payload.topic, 
        userLinks: action.payload.userLinks,
        voice: action.payload.voice,
        hookStyle: action.payload.hookStyle,
        aspectRatio: action.payload.aspectRatio,
        status: PipelineStep.ANALYZING, 
        logs: [`Analyzing input: "${action.payload.topic}"...`] 
      };
    case 'SET_STRATEGY':
      return {
        ...state,
        strategy: action.payload,
        status: PipelineStep.STRATEGY,
        logs: [...state.logs, 'Proposed production strategy.']
      };
    case 'SET_STATUS':
      return { ...state, status: action.payload };
    case 'SET_NARRATIVE':
      return { ...state, narrativeBeats: action.payload, logs: [...state.logs, 'Narrative arc finalized.'] };
    case 'SET_SCENES':
      return { ...state, scenes: action.payload, logs: [...state.logs, 'Visual scenes planned.'] };
    case 'UPDATE_ASSET_STATUS':
      return {
        ...state,
        scenes: state.scenes.map(s => {
          if (s.id !== action.payload.id) return s;
          const updates: any = {};
          if (action.payload.type === 'audio') updates.statusAudio = action.payload.status;
          if (action.payload.type === 'image') updates.statusImage = action.payload.status;
          if (action.payload.type === 'video') updates.statusVideo = action.payload.status;
          return { ...s, ...updates };
        })
      };
    case 'UPDATE_SCENE_RESEARCH_STATUS':
      return {
        ...state,
        scenes: state.scenes.map(s => s.id === action.payload.id ? { ...s, isResearching: action.payload.isResearching } : s)
      };
    case 'INGEST_ASSETS':
      return {
        ...state,
        scenes: state.scenes.map(s => s.id === action.payload.sceneId ? { 
            ...s, 
            assets: action.payload.assets // Overwrite or append? Overwriting as research is a distinct phase
        } : s)
      };
    case 'UPDATE_SCENE_IMAGE':
      return {
        ...state,
        scenes: state.scenes.map(s => s.id === action.payload.id ? { 
            ...s, 
            imageUrl: action.payload.url, 
            groundingChunks: action.payload.groundingChunks,
            statusImage: 'success'
        } : s)
      };
    case 'UPDATE_SCENE_VIDEO':
      return {
        ...state,
        scenes: state.scenes.map(s => s.id === action.payload.id ? { 
            ...s, 
            videoUrl: action.payload.url,
            statusVideo: 'success'
        } : s)
      };
    case 'UPDATE_SCENE_AUDIO':
      return {
        ...state,
        scenes: state.scenes.map(s => s.id === action.payload.id ? { 
            ...s, 
            audioUrl: action.payload.url,
            statusAudio: 'success'
        } : s)
      };
    case 'UPDATE_SCENE_SCRIPT':
      return {
        ...state,
        scenes: state.scenes.map(s => s.id === action.payload.id ? { ...s, script: action.payload.script } : s)
      };
    case 'ADD_LOG':
      return { ...state, logs: [...state.logs, action.payload] };
    case 'SET_ERROR':
      return { ...state, status: PipelineStep.ERROR, error: action.payload, logs: [...state.logs, `CRITICAL ERROR: ${action.payload}`] };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

const ProductionTimer = () => {
    const [seconds, setSeconds] = useState(240); 
    useEffect(() => {
        const timer = setInterval(() => setSeconds(prev => Math.max(0, prev - 1)), 1000);
        return () => clearInterval(timer);
    }, []);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return (
        <div className="flex items-center gap-2 text-blue-400 font-mono text-sm bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20 animate-pulse">
            <Timer size={14} />
            <span>EST. PRODUCTION TIME: {mins}:{secs.toString().padStart(2, '0')}</span>
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
  const [strategyForm, setStrategyForm] = useState<VideoStrategy | null>(null);

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

  const checkApiKey = async () => {
    if (window.aistudio?.hasSelectedApiKey) {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey && window.aistudio.openSelectKey) await window.aistudio.openSelectKey();
    }
  };

  const extractUrls = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.match(urlRegex) || [];
  };

  const startAnalysis = useCallback(async (topic: string) => {
    await checkApiKey();
    const userLinks = extractUrls(topic);
    dispatch({ type: 'START_ANALYSIS', payload: { topic, userLinks, voice: selectedVoice, hookStyle: selectedHook, aspectRatio: selectedAspectRatio } });
    try {
       const strategy = await GeminiService.analyzeRequest(topic);
       dispatch({ type: 'SET_STRATEGY', payload: strategy });
       setStrategyForm(strategy);
    } catch (error: any) {
       dispatch({ type: 'SET_ERROR', payload: error.message || 'Analysis agent failed.' });
    }
  }, [selectedVoice, selectedHook, selectedAspectRatio]);

  const runDeepResearch = async (scenes: Scene[]) => {
      dispatch({ type: 'SET_STATUS', payload: PipelineStep.RESEARCHING });
      dispatch({ type: 'ADD_LOG', payload: 'Researching visual references...' });
      const CONCURRENCY = 4;
      const processResearch = async (scene: Scene) => {
          dispatch({ type: 'UPDATE_SCENE_RESEARCH_STATUS', payload: { id: scene.id, isResearching: true } });
          const assets = await GeminiService.researchScene(scene);
          dispatch({ type: 'INGEST_ASSETS', payload: { sceneId: scene.id, assets } });
          dispatch({ type: 'UPDATE_SCENE_RESEARCH_STATUS', payload: { id: scene.id, isResearching: false } });
      };
      const queue = [...scenes];
      const workers = Array.from({ length: CONCURRENCY }).map(async () => {
          while (queue.length > 0) {
              const scene = queue.shift();
              if (scene) await processResearch(scene);
          }
      });
      await Promise.all(workers);
      dispatch({ type: 'SET_STATUS', payload: PipelineStep.REVIEW });
      dispatch({ type: 'ADD_LOG', payload: 'Intel gathering complete.' });
  };

  const confirmStrategyAndPlan = useCallback(async () => {
    if (!strategyForm) return;
    dispatch({ type: 'SET_STATUS', payload: PipelineStep.NARRATIVE });
    dispatch({ type: 'ADD_LOG', payload: 'Synthesizing narrative arc...' });
    try {
      const beats = await GeminiService.generateNarrative(state.topic, state.hookStyle, strategyForm);
      dispatch({ type: 'SET_NARRATIVE', payload: beats });
      dispatch({ type: 'SET_STATUS', payload: PipelineStep.SCENE_PLANNING });
      dispatch({ type: 'ADD_LOG', payload: 'Directing storyboard...' });
      const scenes = await GeminiService.planScenes(beats, state.aspectRatio, state.userLinks, strategyForm, state.hookStyle);
      dispatch({ type: 'SET_SCENES', payload: scenes });
      await runDeepResearch(scenes);
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Scene planning failed.' });
    }
  }, [strategyForm, state.topic, state.hookStyle, state.aspectRatio, state.userLinks]);

  const generateAudioForScene = async (sceneId: string, script: string) => {
    dispatch({ type: 'UPDATE_ASSET_STATUS', payload: { id: sceneId, type: 'audio', status: 'loading' } });
    try {
        const url = await GeminiService.generateSpeech(script, state.voice);
        dispatch({ type: 'UPDATE_SCENE_AUDIO', payload: { id: sceneId, url } });
        return true;
    } catch (e) {
        dispatch({ type: 'UPDATE_ASSET_STATUS', payload: { id: sceneId, type: 'audio', status: 'error' } });
        return false;
    }
  };

  const generateImageForScene = async (sceneId: string, prompt: string) => {
    dispatch({ type: 'UPDATE_ASSET_STATUS', payload: { id: sceneId, type: 'image', status: 'loading' } });
    try {
        const { imageUrl, groundingChunks } = await GeminiService.generateSceneImage(prompt, state.aspectRatio);
        dispatch({ type: 'UPDATE_SCENE_IMAGE', payload: { id: sceneId, url: imageUrl, groundingChunks } });
        return imageUrl;
    } catch (e) {
        dispatch({ type: 'UPDATE_ASSET_STATUS', payload: { id: sceneId, type: 'image', status: 'error' } });
        return null;
    }
  };

  const generateVideoForScene = async (sceneId: string, prompt: string, imageUrl: string) => {
    dispatch({ type: 'UPDATE_ASSET_STATUS', payload: { id: sceneId, type: 'video', status: 'loading' } });
    try {
        const videoUrl = await GeminiService.generateVideo(prompt, state.aspectRatio, imageUrl);
        dispatch({ type: 'UPDATE_SCENE_VIDEO', payload: { id: sceneId, url: videoUrl } });
        return true;
    } catch (e) {
        dispatch({ type: 'UPDATE_ASSET_STATUS', payload: { id: sceneId, type: 'video', status: 'error' } });
        return false;
    }
  };

  const processScene = async (scene: Scene) => {
      const audioPromise = generateAudioForScene(scene.id, scene.script);
      const imagePromise = generateImageForScene(scene.id, scene.imagePrompt || scene.script);
      const [audioSuccess, generatedImageUrl] = await Promise.all([audioPromise, imagePromise]);
      if (generatedImageUrl && (scene.useVeo || scene.type === 'split_screen')) {
          await generateVideoForScene(scene.id, scene.imagePrompt || scene.script, generatedImageUrl);
      }
  };

  const approveAndGenerate = useCallback(async () => {
     dispatch({ type: 'SET_STATUS', payload: PipelineStep.ASSET_GENERATION });
     dispatch({ type: 'ADD_LOG', payload: 'Beginning parallel production...' });
     const CONCURRENCY = 2; // Keep it low for high reliability on complex video generation
     const queue = [...state.scenes];
     const workers = Array.from({ length: CONCURRENCY }).map(async () => {
         while (queue.length > 0) {
             const scene = queue.shift();
             if (scene) await processScene(scene);
         }
     });
     await Promise.all(workers);
     dispatch({ type: 'SET_STATUS', payload: PipelineStep.COMPLETE });
     dispatch({ type: 'ADD_LOG', payload: 'Production complete.' });
  }, [state.scenes]);

  const handleRetryAsset = async (sceneId: string, type: 'audio' | 'image' | 'video') => {
      const scene = state.scenes.find(s => s.id === sceneId);
      if (!scene) return;
      if (type === 'audio') await generateAudioForScene(sceneId, scene.script);
      else if (type === 'image') {
          const imgUrl = await generateImageForScene(sceneId, scene.imagePrompt || scene.script);
          if (imgUrl && scene.useVeo) await generateVideoForScene(sceneId, scene.imagePrompt || scene.script, imgUrl);
      } else if (type === 'video') {
          if (scene.imageUrl) await generateVideoForScene(sceneId, scene.imagePrompt || scene.script, scene.imageUrl);
      }
  };

  const StrategyField = ({ label, icon, value, options, onChange }: any) => (
    <div className="space-y-2">
      <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-2">{icon} {label}</label>
      <div className="relative group">
         <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 pr-8 text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
         <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"><ChevronDown size={14} className="text-zinc-600 group-hover:text-zinc-400" /></div>
         <select className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => onChange(e.target.value)} value=""><option value="" disabled>Select...</option>{options.map((opt:string) => (<option key={opt} value={opt}>{opt}</option>))}</select>
      </div>
    </div>
  );

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
             {window.aistudio?.openSelectKey && <button onClick={() => window.aistudio?.openSelectKey()} className="text-xs font-mono text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"><Key size={12} /> API KEY</button>}
             <div className="text-xs font-mono text-zinc-600 bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">v0.3.0</div>
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
                <p className="text-zinc-400 text-xl max-w-xl mx-auto leading-relaxed">Multi-agent intelligence for professional explainer production.</p>
             </div>
             <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-2xl">
                 <form onSubmit={(e) => { e.preventDefault(); if (inputValue.trim()) startAnalysis(inputValue); }} className="flex flex-col gap-2">
                    <div className="flex items-start px-4 py-4 gap-4">
                       <div className="pt-1 text-zinc-500"><BrainCircuit size={24} /></div>
                       <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="Topic, news URL, or script..." className="w-full bg-transparent border-none text-xl focus:ring-0 placeholder:text-zinc-600 outline-none text-white font-medium" autoFocus />
                    </div>
                    <div className="bg-black/40 rounded-xl p-3 flex flex-wrap items-center gap-4">
                       <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
                          {HOOKS.map(hook => (
                              <button key={hook.id} type="button" onClick={() => setSelectedHook(hook.id)} className={`relative flex-shrink-0 w-28 h-16 rounded-lg overflow-hidden border transition-all ${selectedHook === hook.id ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-white/10 opacity-60 hover:opacity-100'}`}>
                                 {hook.type === 'video' ? <video src={hook.asset} className="w-full h-full object-cover" muted /> : <img src={hook.asset} className="w-full h-full object-cover" />}
                                 <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><span className="text-[9px] font-bold text-white uppercase text-center px-1">{hook.label}</span></div>
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
                       <button type="submit" className="ml-auto px-6 py-3 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-colors flex items-center gap-2 text-sm">Generate <ArrowRight size={16} /></button>
                    </div>
                 </form>
             </div>
           </div>
         </div>
        ) : (
          <div className="flex-1 flex flex-col w-full px-6 py-8 relative z-10">
            <div className="max-w-6xl mx-auto w-full">
                <PipelineSteps currentStep={state.status} />
                {state.status === PipelineStep.ERROR && (
                    <div className="mx-auto max-w-xl bg-red-950 border border-red-500 text-red-200 p-6 rounded-2xl flex items-center gap-4 mb-8">
                        <AlertCircle size={24} />
                        <div className="flex-1"><h3 className="font-bold">Error</h3><p className="text-sm opacity-80">{state.error}</p></div>
                        <button onClick={() => dispatch({ type: 'RESET' })} className="px-4 py-2 bg-red-500/20 rounded-lg text-sm">Reset</button>
                    </div>
                )}
            </div>

            {state.status === PipelineStep.STRATEGY && strategyForm && (
                <div className="max-w-4xl mx-auto w-full animate-in fade-in slide-in-from-bottom-8 duration-500">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl">
                        <h2 className="text-3xl font-bold text-white mb-8">Production Blueprint</h2>
                        <div className="bg-black/60 rounded-2xl p-6 mb-8 border border-white/5">
                            <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Proposed Strategy</h4>
                            <p className="text-zinc-100 text-lg leading-relaxed">"{strategyForm.summary}"</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
                            <StrategyField label="Audience" icon={<Target size={14} />} value={strategyForm.targetAudience} options={AUDIENCE_OPTIONS} onChange={(val: string) => setStrategyForm({...strategyForm, targetAudience: val})} />
                            <StrategyField label="Tone" icon={<PenTool size={14} />} value={strategyForm.toneStyle} options={TONE_OPTIONS} onChange={(val: string) => setStrategyForm({...strategyForm, toneStyle: val})} />
                            <StrategyField label="Goal" icon={<Lightbulb size={14} />} value={strategyForm.keyObjective} options={OBJECTIVE_OPTIONS} onChange={(val: string) => setStrategyForm({...strategyForm, keyObjective: val})} />
                        </div>
                        <div className="flex justify-end"><button onClick={confirmStrategyAndPlan} className="px-8 py-4 bg-white text-black font-bold rounded-2xl flex items-center gap-3"><Zap size={20} /> Deploy Agents</button></div>
                    </div>
                </div>
            )}

            {(state.status === PipelineStep.REVIEW || state.status === PipelineStep.RESEARCHING || state.status === PipelineStep.ASSET_GENERATION || state.status === PipelineStep.COMPLETE) && (
                <div className="relative flex max-w-7xl mx-auto w-full gap-12">
                    <div className="hidden xl:block w-72 flex-shrink-0">
                        <div className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto pr-4">
                            <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-6 flex items-center gap-2"><Activity size={14} /> Narrative Arc</h3>
                            <div className="space-y-1 relative border-l border-zinc-800 ml-3">
                                {state.narrativeBeats.map((beat, i) => (
                                    <div key={i} className={`relative pl-6 py-2 transition-all ${activeSceneIndex === i ? 'opacity-100' : 'opacity-40'}`}>
                                        <div className={`absolute left-[-5px] top-3.5 w-2.5 h-2.5 rounded-full border-2 ${activeSceneIndex === i ? 'bg-blue-500 border-blue-400' : 'bg-zinc-900 border-zinc-700'}`} />
                                        <h4 className="text-sm font-bold">{beat.beat}</h4>
                                        <p className="text-xs text-zinc-400 mt-1">{beat.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 pb-40 space-y-24 min-w-0">
                        <div className="flex justify-between items-end border-b border-zinc-800 pb-4 mb-10">
                            <div><h1 className="text-4xl font-bold text-white mb-2">Storyboard</h1>{state.status === PipelineStep.ASSET_GENERATION && <ProductionTimer />}</div>
                            <div className="flex gap-4">
                                <button onClick={() => setIsPreviewOpen(true)} className="px-6 py-3 bg-white text-black font-bold rounded-full flex items-center gap-2"><PlayCircle size={20} /> Preview</button>
                                {state.status === PipelineStep.REVIEW && <button onClick={approveAndGenerate} className="px-6 py-3 bg-blue-600 text-white font-bold rounded-full flex items-center gap-2">Final Render <ArrowRight size={18} /></button>}
                            </div>
                        </div>
                        {state.scenes.map((scene, index) => (
                            <div key={scene.id} id={`scene-card-${index}`} data-index={index} className="relative">
                                <SceneCard scene={scene} index={index} status={state.status} onClick={() => {}} onViewResearch={(e) => { e.stopPropagation(); setResearchSceneId(scene.id); }} onEditScript={(e) => { e.stopPropagation(); setEditingSceneId(scene.id); setEditScriptText(scene.script); }} onRetryAsset={handleRetryAsset} />
                            </div>
                        ))}
                    </div>
                </div>
            )}
          </div>
        )}
      </main>

      {editingSceneId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl">
                  <h3 className="text-xl font-bold mb-6 flex items-center gap-3 text-white"><Edit2 size={20} /> Edit Script</h3>
                  <textarea value={editScriptText} onChange={(e) => setEditScriptText(e.target.value)} className="w-full h-48 bg-zinc-950 text-zinc-100 p-4 rounded-xl border border-zinc-800 mb-6 font-serif text-xl leading-relaxed resize-none" />
                  <div className="flex justify-end gap-3"><button onClick={() => setEditingSceneId(null)} className="px-6 py-3 text-zinc-400">Cancel</button><button onClick={() => { dispatch({ type: 'UPDATE_SCENE_SCRIPT', payload: { id: editingSceneId, script: editScriptText } }); setEditingSceneId(null); }} className="px-6 py-3 bg-white text-black font-bold rounded-xl">Save Changes</button></div>
              </div>
          </div>
      )}

      {isPreviewOpen && state.scenes.length > 0 && <PreviewPlayer scenes={state.scenes} onClose={() => setIsPreviewOpen(false)} />}
      {activeResearchScene && <ResearchPopup scene={activeResearchScene} onClose={() => setResearchSceneId(null)} onMixAssets={async (a, b) => { try { const { imageUrl, groundingChunks } = await GeminiService.mixAssets(a, b, state.aspectRatio); dispatch({ type: 'UPDATE_SCENE_IMAGE', payload: { id: researchSceneId!, url: imageUrl, groundingChunks } }); } catch (e) { console.error(e); } }} />}
    </div>
  );
}
