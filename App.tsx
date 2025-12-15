
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
  FetchedAsset
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
  RefreshCw
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
        logs: [...state.logs, 'Strategy proposed. Waiting for confirmation...']
      };
    case 'SET_STATUS':
      return { ...state, status: action.payload };
    case 'SET_NARRATIVE':
      return { ...state, narrativeBeats: action.payload, logs: [...state.logs, 'Narrative beats generated.'] };
    case 'SET_SCENES':
      return { ...state, scenes: action.payload, logs: [...state.logs, 'Scenes planned. Review required.'] };
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
    case 'ADD_SCENE_ASSETS':
      return {
        ...state,
        scenes: state.scenes.map(s => s.id === action.payload.id ? { 
            ...s, 
            fetchedAssets: [...s.fetchedAssets, ...action.payload.assets] 
        } : s),
        logs: [...state.logs, `Research complete for ${action.payload.id}. Found ${action.payload.assets.length} assets.`]
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
        } : s),
        logs: [...state.logs, `Video generated for ${action.payload.id}`]
      };
    case 'UPDATE_SCENE_AUDIO':
      return {
        ...state,
        scenes: state.scenes.map(s => s.id === action.payload.id ? { 
            ...s, 
            audioUrl: action.payload.url,
            statusAudio: 'success'
        } : s),
        logs: [...state.logs, `Audio generated for ${action.payload.id}`]
      };
    case 'UPDATE_SCENE_SCRIPT':
      return {
        ...state,
        scenes: state.scenes.map(s => s.id === action.payload.id ? { ...s, script: action.payload.script } : s)
      };
    case 'ADD_LOG':
      return { ...state, logs: [...state.logs, action.payload] };
    case 'SET_ERROR':
      return { ...state, status: PipelineStep.ERROR, error: action.payload, logs: [...state.logs, `Error: ${action.payload}`] };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

// Simple Countdown Timer Component
const ProductionTimer = () => {
    const [seconds, setSeconds] = useState(180); // 3 minutes total

    useEffect(() => {
        const timer = setInterval(() => {
            setSeconds(prev => Math.max(0, prev - 1));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    return (
        <div className="flex items-center gap-2 text-blue-400 font-mono text-sm bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20 animate-pulse">
            <Timer size={14} />
            <span>EST. REMAINING: {mins}:{secs.toString().padStart(2, '0')}</span>
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

  // Scroll spy to update active narrative beat
  useEffect(() => {
    if (state.scenes.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const index = Number(entry.target.getAttribute('data-index'));
          if (!isNaN(index)) {
            setActiveSceneIndex(index);
          }
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
      if (!hasKey && window.aistudio.openSelectKey) {
        await window.aistudio.openSelectKey();
      }
    }
  };

  const extractUrls = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.match(urlRegex) || [];
  };

  // Phase 1: Analysis & Strategy
  const startAnalysis = useCallback(async (topic: string) => {
    await checkApiKey();
    const userLinks = extractUrls(topic);
    
    dispatch({ 
        type: 'START_ANALYSIS', 
        payload: { 
            topic, 
            userLinks,
            voice: selectedVoice,
            hookStyle: selectedHook,
            aspectRatio: selectedAspectRatio
        } 
    });

    try {
       const strategy = await GeminiService.analyzeRequest(topic);
       dispatch({ type: 'SET_STRATEGY', payload: strategy });
       setStrategyForm(strategy);
    } catch (error: any) {
       dispatch({ type: 'SET_ERROR', payload: error.message || 'Analysis failed' });
    }
  }, [selectedVoice, selectedHook, selectedAspectRatio]);

  // Phase 1.5: Deep Research (Concurrent)
  const runDeepResearch = async (scenes: Scene[]) => {
      dispatch({ type: 'SET_STATUS', payload: PipelineStep.RESEARCHING });
      dispatch({ type: 'ADD_LOG', payload: 'PHASE 1.5: Starting High-Concurrency Deep Research...' });

      const RESEARCH_CONCURRENCY = 10;
      
      const processResearch = async (scene: Scene) => {
          dispatch({ type: 'UPDATE_SCENE_RESEARCH_STATUS', payload: { id: scene.id, isResearching: true } });
          const assets = await GeminiService.researchScene(scene);
          dispatch({ type: 'ADD_SCENE_ASSETS', payload: { id: scene.id, assets } });
          dispatch({ type: 'UPDATE_SCENE_RESEARCH_STATUS', payload: { id: scene.id, isResearching: false } });
      };

      // Simple Batching Logic for concurrency
      const queue = [...scenes];
      const workers = Array.from({ length: RESEARCH_CONCURRENCY }).map(async () => {
          while (queue.length > 0) {
              const scene = queue.shift();
              if (scene) await processResearch(scene);
          }
      });

      await Promise.all(workers);
      
      dispatch({ type: 'SET_STATUS', payload: PipelineStep.REVIEW });
      dispatch({ type: 'ADD_LOG', payload: 'Research phase complete. Ready for review.' });
  };

  // Phase 2: Planning
  const confirmStrategyAndPlan = useCallback(async () => {
    if (!strategyForm) return;
    
    dispatch({ type: 'SET_STATUS', payload: PipelineStep.NARRATIVE });
    dispatch({ type: 'ADD_LOG', payload: 'Strategy confirmed. Generating narrative...' });

    try {
      const beats = await GeminiService.generateNarrative(state.topic, state.hookStyle, strategyForm);
      dispatch({ type: 'SET_NARRATIVE', payload: beats });
      
      dispatch({ type: 'SET_STATUS', payload: PipelineStep.SCENE_PLANNING });
      dispatch({ type: 'ADD_LOG', payload: 'Deep Research Agent: Planning visual scenes (Targeting 10+)...' });

      const scenes = await GeminiService.planScenes(beats, state.aspectRatio, state.userLinks, strategyForm, state.hookStyle);
      dispatch({ type: 'SET_SCENES', payload: scenes });
      
      // TRIGGER PHASE 1.5
      await runDeepResearch(scenes);

    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Unknown error' });
    }
  }, [strategyForm, state.topic, state.hookStyle, state.aspectRatio, state.userLinks]);

  // --- ASSET GENERATION PIPELINE (With Retry) ---

  const MAX_RETRIES = 5;

  const generateAudioForScene = async (sceneId: string, script: string) => {
    const currentScene = state.scenes.find(s => s.id === sceneId);
    if(currentScene?.statusAudio === 'success') return true;

    dispatch({ type: 'UPDATE_ASSET_STATUS', payload: { id: sceneId, type: 'audio', status: 'loading' } });
    
    let attempts = 0;
    while(attempts < MAX_RETRIES) {
        try {
            const url = await GeminiService.generateSpeech(script, state.voice);
            dispatch({ type: 'UPDATE_SCENE_AUDIO', payload: { id: sceneId, url } });
            return true;
        } catch (e) {
            attempts++;
            if (attempts < MAX_RETRIES) {
                 await new Promise(r => setTimeout(r, 2000));
            }
        }
    }
    dispatch({ type: 'UPDATE_ASSET_STATUS', payload: { id: sceneId, type: 'audio', status: 'error' } });
    return false;
  };

  const generateImageForScene = async (sceneId: string, prompt: string) => {
    const currentScene = state.scenes.find(s => s.id === sceneId);
    if(currentScene?.statusImage === 'success' && currentScene.imageUrl) return currentScene.imageUrl;

    dispatch({ type: 'UPDATE_ASSET_STATUS', payload: { id: sceneId, type: 'image', status: 'loading' } });
    
    let attempts = 0;
    while(attempts < MAX_RETRIES) {
        try {
            const { imageUrl, groundingChunks } = await GeminiService.generateSceneImage(prompt, state.aspectRatio);
            dispatch({ type: 'UPDATE_SCENE_IMAGE', payload: { id: sceneId, url: imageUrl, groundingChunks } });
            return imageUrl;
        } catch (e) {
            attempts++;
            if (attempts < MAX_RETRIES) {
                 await new Promise(r => setTimeout(r, 3000));
            }
        }
    }

    dispatch({ type: 'UPDATE_ASSET_STATUS', payload: { id: sceneId, type: 'image', status: 'error' } });
    return null;
  };

  const generateVideoForScene = async (sceneId: string, prompt: string, imageUrl: string) => {
    const currentScene = state.scenes.find(s => s.id === sceneId);
    if(currentScene?.statusVideo === 'success') return true;

    dispatch({ type: 'UPDATE_ASSET_STATUS', payload: { id: sceneId, type: 'video', status: 'loading' } });
    
    let attempts = 0;
    while(attempts < MAX_RETRIES) {
        try {
            const videoUrl = await GeminiService.generateVideo(prompt, state.aspectRatio, imageUrl);
            dispatch({ type: 'UPDATE_SCENE_VIDEO', payload: { id: sceneId, url: videoUrl } });
            return true;
        } catch (e) {
            attempts++;
            if (attempts < MAX_RETRIES) {
                 const delay = 15000 + (attempts * 5000); 
                 await new Promise(r => setTimeout(r, delay));
            }
        }
    }
    
    dispatch({ type: 'UPDATE_ASSET_STATUS', payload: { id: sceneId, type: 'video', status: 'error' } });
    return false;
  };

  const processScene = async (scene: Scene) => {
      const audioPromise = generateAudioForScene(scene.id, scene.script);
      const imagePromise = generateImageForScene(scene.id, scene.imagePrompt || scene.script);

      const [audioSuccess, generatedImageUrl] = await Promise.all([audioPromise, imagePromise]);

      if (generatedImageUrl && (scene.useVeo || scene.type === 'split_screen' || scene.visualEffect === 'ZOOM_BLUR')) {
          await generateVideoForScene(scene.id, scene.imagePrompt || scene.script, generatedImageUrl);
      }
  };

  const handleRetryAsset = async (sceneId: string, type: 'audio' | 'image' | 'video') => {
      const scene = state.scenes.find(s => s.id === sceneId);
      if (!scene) return;
      dispatch({ type: 'ADD_LOG', payload: `Manually retrying ${type} for ${sceneId}...` });

      if (type === 'audio') {
          await generateAudioForScene(sceneId, scene.script);
      } else if (type === 'image') {
          const imgUrl = await generateImageForScene(sceneId, scene.imagePrompt || scene.script);
          if (imgUrl && (scene.useVeo || scene.type === 'split_screen') && scene.statusVideo !== 'success') {
              await generateVideoForScene(sceneId, scene.imagePrompt || scene.script, imgUrl);
          }
      } else if (type === 'video') {
          if (!scene.imageUrl) return;
          await generateVideoForScene(sceneId, scene.imagePrompt || scene.script, scene.imageUrl);
      }
  };

  const approveAndGenerate = useCallback(async () => {
     dispatch({ type: 'SET_STATUS', payload: PipelineStep.ASSET_GENERATION });
     dispatch({ type: 'ADD_LOG', payload: 'Starting parallel production (3x concurrency)...' });

     const CONCURRENCY_LIMIT = 3;
     const queue = [...state.scenes];

     const processNext = async () => {
         if (queue.length === 0) return;
         const scene = queue.shift()!;
         const el = document.getElementById(`scene-card-${state.scenes.indexOf(scene)}`);
         if(el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
         await processScene(scene);
     };

     const workers = Array.from({ length: CONCURRENCY_LIMIT }).map(async () => {
         while (queue.length > 0) {
             await processNext();
         }
     });

     await Promise.all(workers);

     dispatch({ type: 'SET_STATUS', payload: PipelineStep.COMPLETE });
     dispatch({ type: 'ADD_LOG', payload: 'All assets generated!' });
  }, [state.scenes]);

  const handleMixAssets = async (assetA: string, assetB: string) => {
      if (!researchSceneId) return;
      try {
          const { imageUrl, groundingChunks } = await GeminiService.mixAssets(assetA, assetB, state.aspectRatio);
          dispatch({ 
              type: 'UPDATE_SCENE_IMAGE', 
              payload: { id: researchSceneId, url: imageUrl, groundingChunks } 
          });
      } catch (e) {
          console.error("Failed to mix", e);
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) startAnalysis(inputValue);
  };

  const handleSaveScript = () => {
    if (editingSceneId) {
        dispatch({ type: 'UPDATE_SCENE_SCRIPT', payload: { id: editingSceneId, script: editScriptText } });
        setEditingSceneId(null);
    }
  };

  const activeResearchScene = state.scenes.find(s => s.id === researchSceneId);

  const StrategyField = ({ label, icon, value, options, onChange }: any) => {
    return (
      <div className="space-y-2">
        <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-2">
            {icon} {label}
        </label>
        <div className="relative group">
           <input 
              type="text" 
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 pr-8 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
              placeholder="Enter custom or select..."
           />
           <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
             <ChevronDown size={14} className="text-zinc-600 group-hover:text-zinc-400" />
           </div>
           <select 
             className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
             onChange={(e) => {
               if(e.target.value) onChange(e.target.value);
             }}
             value=""
           >
             <option value="" disabled>Select an option...</option>
             {options.map((opt:string) => (
               <option key={opt} value={opt}>{opt}</option>
             ))}
           </select>
        </div>
      </div>
    );
  };

  const canPreview = state.scenes.length > 0;

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col font-sans selection:bg-blue-500/30">
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center border border-white/10">
              <Zap size={18} className="text-white" />
            </div>
            <h1 className="font-bold text-lg tracking-tight">Agentic<span className="text-zinc-500">Video</span></h1>
          </div>
          <div className="flex items-center gap-4">
             {window.aistudio?.openSelectKey && (
               <button 
                  onClick={() => window.aistudio?.openSelectKey()}
                  className="text-xs font-mono text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
               >
                 <Key size={12} />
                 API KEY
               </button>
             )}
             <div className="text-xs font-mono text-zinc-600 bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">
               v0.1.0
             </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col pt-16 relative">
        {(state.status === PipelineStep.SCENE_PLANNING || state.status === PipelineStep.RESEARCHING) && (
            <FallingText topic={state.topic} statusText={state.logs[state.logs.length - 1]} />
        )}

        {state.status === PipelineStep.IDLE ? (
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-20 relative overflow-hidden">
             {/* ... (Same as previous idle screen) ... */}
              <div className="w-full max-w-3xl relative z-10 space-y-10">
              <div className="text-center space-y-6">
                 <h2 className="text-6xl md:text-7xl font-bold tracking-tighter text-white">
                   Story to Video.
                 </h2>
                 <p className="text-zinc-400 text-xl max-w-xl mx-auto leading-relaxed">
                   Transform ideas, research URLs, and documents into high-fidelity video scenes with one prompt.
                 </p>
              </div>

              <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-2xl">
                  <form onSubmit={handleSubmit} className="flex flex-col gap-2">
                     <div className="flex items-start px-4 py-4 gap-4">
                        <div className="pt-1 text-zinc-500">
                          <BrainCircuit size={24} />
                        </div>
                        <input
                          type="text"
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          placeholder="What are we creating today? (Paste a URL or topic)"
                          className="w-full bg-transparent border-none text-xl focus:ring-0 placeholder:text-zinc-600 outline-none text-white font-medium"
                          autoFocus
                        />
                     </div>
                     
                     <div className="bg-black/40 rounded-xl p-3 flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
                           <span className="text-xs font-bold text-zinc-600 uppercase tracking-wider mr-2">Style</span>
                           {HOOKS.map(hook => (
                               <button
                                  key={hook.id}
                                  type="button"
                                  onClick={() => setSelectedHook(hook.id)}
                                  className={`relative group flex-shrink-0 w-32 h-20 rounded-lg overflow-hidden border transition-all ${selectedHook === hook.id ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-white/10 opacity-60 hover:opacity-100'}`}
                               >
                                  {hook.type === 'video' ? (
                                      <video 
                                        src={hook.asset} 
                                        className="w-full h-full object-cover" 
                                        loop 
                                        muted 
                                        playsInline 
                                        onMouseOver={e => e.currentTarget.play().catch(() => {})} 
                                        onMouseOut={e => {e.currentTarget.pause(); e.currentTarget.currentTime = 0;}} 
                                      />
                                  ) : (
                                      <img src={hook.asset} className="w-full h-full object-cover" alt={hook.label} />
                                  )}
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end justify-center pb-1">
                                      <span className="text-[10px] font-bold text-white uppercase text-center px-1 shadow-sm">{hook.label}</span>
                                  </div>
                                  {selectedHook === hook.id && (
                                      <div className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_5px_rgba(59,130,246,1)]" />
                                  )}
                               </button>
                           ))}
                        </div>

                        <div className="w-[1px] h-10 bg-white/10 hidden md:block" />

                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedAspectRatio('16:9')}
                            className={`p-2 rounded-lg border transition-all ${selectedAspectRatio === '16:9' ? 'bg-zinc-800 border-zinc-600 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
                            title="Landscape"
                          >
                             <Monitor size={18} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedAspectRatio('9:16')}
                            className={`p-2 rounded-lg border transition-all ${selectedAspectRatio === '9:16' ? 'bg-zinc-800 border-zinc-600 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
                            title="Portrait"
                          >
                             <Smartphone size={18} />
                          </button>
                        </div>
                        
                        <button 
                            type="submit"
                            className="ml-auto px-6 py-3 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-colors flex items-center gap-2 text-sm shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                        >
                            Generate <ArrowRight size={16} />
                        </button>
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
                    <div className="mx-auto max-w-xl bg-red-950/50 border border-red-500/50 text-red-200 p-6 rounded-2xl flex items-center gap-4 backdrop-blur-md mb-8">
                        <AlertCircle size={24} className="text-red-500" />
                        <div>
                            <h3 className="font-bold">Generation Paused</h3>
                            <p className="text-sm opacity-80">{state.error}</p>
                        </div>
                        <button 
                        onClick={() => dispatch({ type: 'RESET' })}
                        className="ml-auto px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-sm transition-colors"
                        >Try Again</button>
                    </div>
                )}
            </div>

            {state.status === PipelineStep.STRATEGY && strategyForm && (
                <div className="max-w-4xl mx-auto w-full animate-in fade-in slide-in-from-bottom-8 duration-500">
                    {/* ... (Strategy UI same as before) ... */}
                    <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-3xl p-8 shadow-2xl">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                                <Sparkles size={24} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-3xl font-bold text-white tracking-tight">Strategy Blueprint</h2>
                                <p className="text-zinc-400">Review the AI's proposed direction before we write the script.</p>
                            </div>
                        </div>

                        <div className="bg-black/60 rounded-2xl p-6 mb-8 border border-white/5">
                            <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Core Concept</h4>
                            <p className="text-zinc-100 text-lg leading-relaxed">"{strategyForm.summary}"</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
                            <StrategyField 
                                label="Target Audience"
                                icon={<Target size={14} />}
                                value={strategyForm.targetAudience}
                                options={AUDIENCE_OPTIONS}
                                onChange={(val: string) => setStrategyForm({...strategyForm, targetAudience: val})}
                            />
                            <StrategyField 
                                label="Tone & Style"
                                icon={<PenTool size={14} />}
                                value={strategyForm.toneStyle}
                                options={TONE_OPTIONS}
                                onChange={(val: string) => setStrategyForm({...strategyForm, toneStyle: val})}
                            />
                            <StrategyField 
                                label="Key Objective"
                                icon={<Lightbulb size={14} />}
                                value={strategyForm.keyObjective}
                                options={OBJECTIVE_OPTIONS}
                                onChange={(val: string) => setStrategyForm({...strategyForm, keyObjective: val})}
                            />
                        </div>

                        <div className="flex justify-end pt-6 border-t border-white/5">
                             <button 
                                onClick={confirmStrategyAndPlan}
                                className="px-8 py-4 bg-white text-black font-bold rounded-2xl hover:scale-105 transition-all flex items-center gap-3 shadow-[0_0_30px_rgba(255,255,255,0.1)]"
                             >
                                <Zap size={20} /> Generate Narrative & Scenes
                             </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Layout for Review/Production Phase */}
            {(state.status === PipelineStep.REVIEW || state.status === PipelineStep.RESEARCHING || state.status === PipelineStep.ASSET_GENERATION || state.status === PipelineStep.COMPLETE) && (
                <div className="relative flex max-w-7xl mx-auto w-full gap-12">
                    
                    {/* Sticky Narrative Sidebar */}
                    <div className="hidden xl:block w-72 flex-shrink-0">
                        <div className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto pr-4 custom-scrollbar">
                            <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-6 sticky top-0 bg-black py-2 z-10 flex items-center gap-2">
                                <Activity size={14} /> Narrative Arc
                            </h3>
                            <div className="space-y-1 relative border-l border-zinc-800 ml-3">
                                {state.narrativeBeats.map((beat, i) => {
                                    const isActive = activeSceneIndex === i || (i === state.narrativeBeats.length -1 && activeSceneIndex >= i);
                                    return (
                                        <div 
                                            key={i} 
                                            className={`relative pl-6 py-2 transition-all duration-500 ${isActive ? 'opacity-100' : 'opacity-40'}`}
                                        >
                                            <div className={`absolute left-[-5px] top-3.5 w-2.5 h-2.5 rounded-full border-2 transition-all duration-500 z-10 ${isActive ? 'bg-blue-500 border-blue-400 scale-125 shadow-[0_0_10px_rgba(59,130,246,0.8)]' : 'bg-zinc-900 border-zinc-700'}`} />
                                            {isActive && <div className="absolute left-[-5px] top-3.5 w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping" />}
                                            
                                            <h4 className={`text-sm font-bold transition-colors ${isActive ? 'text-white' : 'text-zinc-400'}`}>
                                                {beat.beat}
                                            </h4>
                                            
                                            <div className={`overflow-hidden transition-all duration-500 ${isActive ? 'max-h-40 mt-2' : 'max-h-0'}`}>
                                                <p className="text-xs text-zinc-400 leading-relaxed border-l-2 border-zinc-800 pl-3">
                                                    {beat.description}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Main Feed */}
                    <div className="flex-1 pb-40 space-y-24 min-w-0">
                        <div className="flex justify-between items-end border-b border-zinc-800 pb-4 mb-10">
                            <div>
                                <div className="flex items-center gap-3">
                                    <h1 className="text-4xl font-bold text-white mb-2">Storyboard</h1>
                                    {state.status === PipelineStep.ASSET_GENERATION && <ProductionTimer />}
                                </div>
                                <p className="text-zinc-400">
                                    {state.status === PipelineStep.ASSET_GENERATION 
                                        ? "Generating high-fidelity assets (Audio → Image → Video)..." 
                                        : state.status === PipelineStep.RESEARCHING 
                                        ? "Performing deep research across visual databases..."
                                        : "Review assets, scripts, and visual direction."
                                    }
                                </p>
                            </div>
                            
                            {canPreview && (
                                <button 
                                    onClick={() => setIsPreviewOpen(true)}
                                    className={`flex items-center gap-2 px-6 py-3 rounded-full transition-all font-bold shadow-[0_0_20px_rgba(255,255,255,0.15)] ${state.status === PipelineStep.ASSET_GENERATION ? 'bg-zinc-800 text-white border border-zinc-700' : 'bg-white text-black hover:bg-zinc-200'}`}
                                >
                                    <PlayCircle size={20} className={state.status === PipelineStep.ASSET_GENERATION ? 'text-blue-400' : 'text-black'} />
                                    {state.status === PipelineStep.ASSET_GENERATION ? 'Live Preview' : 'Watch Full Preview'}
                                </button>
                            )}

                            {state.status === PipelineStep.REVIEW && (
                                <button 
                                    onClick={approveAndGenerate}
                                    className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-full shadow-lg shadow-blue-900/30 flex items-center gap-2 transition-all hover:scale-105"
                                >
                                    Start Production <ArrowRight size={18} />
                                </button>
                            )}
                        </div>

                        {state.scenes.map((scene, index) => (
                            <div key={scene.id} id={`scene-card-${index}`} data-index={index} className="relative">
                                {/* Connector Line */}
                                {index < state.scenes.length - 1 && (
                                    <div className="absolute left-8 top-full h-24 w-[2px] bg-gradient-to-b from-zinc-800 to-transparent z-0" />
                                )}
                                
                                <SceneCard 
                                    scene={scene} 
                                    index={index}
                                    status={state.status}
                                    userLinks={state.userLinks}
                                    onClick={() => {}}
                                    onViewResearch={(e) => {
                                        e.stopPropagation();
                                        setResearchSceneId(scene.id);
                                    }}
                                    onEditScript={(e) => {
                                        e.stopPropagation();
                                        setEditingSceneId(scene.id);
                                        setEditScriptText(scene.script);
                                    }}
                                    onRetryAsset={handleRetryAsset}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}
          </div>
        )}
      </main>
      
      {/* Script Editor Modal */}
      {editingSceneId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl">
                  {/* ... (Script editor content same as before) ... */}
                  <div className="flex items-center justify-between mb-6">
                     <h3 className="text-xl font-bold flex items-center gap-3 text-white">
                        <Edit2 size={20} className="text-blue-500"/> Edit Script
                     </h3>
                     <span className="text-xs text-zinc-500 font-mono bg-zinc-950 px-2 py-1 rounded">SCENE {editingSceneId}</span>
                  </div>
                  
                  <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 mb-6">
                     <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3 block">Voiceover Text</label>
                     <textarea 
                        value={editScriptText}
                        onChange={(e) => setEditScriptText(e.target.value)}
                        className="w-full h-48 bg-transparent text-zinc-100 focus:outline-none resize-none font-serif text-xl leading-relaxed"
                     />
                  </div>
                  
                  <div className="flex justify-end gap-3">
                      <button 
                         onClick={() => setEditingSceneId(null)}
                         className="px-6 py-3 text-zinc-400 hover:text-white transition-colors"
                      >Cancel</button>
                      <button 
                         onClick={handleSaveScript}
                         className="px-6 py-3 bg-white text-black font-bold rounded-xl flex items-center gap-2 hover:bg-zinc-200 transition-colors"
                      >
                          Save Changes
                      </button>
                  </div>
              </div>
          </div>
      )}

      {isPreviewOpen && state.scenes.length > 0 && (
        <PreviewPlayer 
          scenes={state.scenes} 
          onClose={() => setIsPreviewOpen(false)} 
        />
      )}
      
      {activeResearchScene && (
        <ResearchPopup 
            scene={activeResearchScene}
            onClose={() => setResearchSceneId(null)}
            onMixAssets={handleMixAssets}
        />
      )}
    </div>
  );
}
