
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
  AssetRecord,
  TransitionType,
  VideoDuration,
  User,
  GalleryItem
} from './types';
import * as GeminiService from './services/gemini';
import { AuthService } from './services/auth';
import { PipelineSteps } from './components/PipelineSteps';
import { SceneCard } from './components/SceneCard';
import { PreviewPlayer } from './components/PreviewPlayer';
import { ResearchPopup } from './components/ResearchPopup';
import { FallingText } from './components/FallingText';
import { YouTubeModal } from './components/YouTubeModal';
import { AuthModal } from './components/AuthModal';
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
  User as UserIcon,
  Download,
  Youtube,
  Rocket,
  Loader2,
  RefreshCcw,
  Save,
  ArrowDown,
  Volume2,
  Square,
  LogOut,
  Grid
} from 'lucide-react';

const initialState: ProjectState = {
  topic: '',
  userLinks: [],
  voice: 'Puck',
  hookStyle: 'AI_SELECTED',
  aspectRatio: '16:9',
  duration: '60s',
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

const DURATIONS: { id: VideoDuration, label: string }[] = [
    { id: '30s', label: 'Short (30s)' },
    { id: '60s', label: 'Medium (1m)' },
    { id: '120s', label: 'Long (2m)' }
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
      return { ...initialState, topic: action.payload.topic, userLinks: action.payload.userLinks, voice: action.payload.voice, hookStyle: action.payload.hookStyle, aspectRatio: action.payload.aspectRatio, duration: action.payload.duration, status: PipelineStep.ANALYZING, logs: [`Analyzing input...`] };
    case 'LOAD_PROJECT':
      return action.payload;
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
    case 'UPDATE_SCENE_TRANSITION':
      return { ...state, scenes: state.scenes.map(s => s.id === action.payload.id ? { 
          ...s, 
          transitionIn: action.payload.type === 'in' ? action.payload.transition : s.transitionIn,
          transitionMid: action.payload.type === 'mid' ? action.payload.transition : s.transitionMid
      } : s) };
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

const TransitionNode = ({ type }: { type: TransitionType }) => (
    <div className="flex justify-center py-2">
        <div className="px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-full flex items-center gap-2 text-[9px] font-mono text-zinc-500 uppercase tracking-widest shadow-lg">
            <ArrowDown size={10} /> {type} TRANSITION <ArrowDown size={10} />
        </div>
    </div>
);

const VideoGridBackground = () => (
    <div className="absolute inset-0 grid grid-cols-3 md:grid-cols-4 gap-2 opacity-20 pointer-events-none z-0">
        {HOOKS.map((h, i) => (
             <div key={i} className="relative aspect-video bg-zinc-900 overflow-hidden rounded-lg">
                  <video 
                    src={h.asset} 
                    className="w-full h-full object-cover grayscale brightness-50" 
                    autoPlay 
                    muted 
                    loop 
                    playsInline 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
             </div>
        ))}
        {HOOKS.map((h, i) => (
             <div key={`rep-${i}`} className="relative aspect-video bg-zinc-900 overflow-hidden rounded-lg hidden md:block">
                  <video 
                    src={h.asset} 
                    className="w-full h-full object-cover grayscale brightness-50" 
                    autoPlay 
                    muted 
                    loop 
                    playsInline 
                  />
             </div>
        ))}
    </div>
);

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  
  // Auth & User State
  const [user, setUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [pendingTopic, setPendingTopic] = useState<string | null>(null);

  // Project Config State
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [researchSceneId, setResearchSceneId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [selectedVoice, setSelectedVoice] = useState('Puck');
  const [selectedHook, setSelectedHook] = useState<HookStyle>('AI_SELECTED');
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<AspectRatio>('16:9');
  const [selectedDuration, setSelectedDuration] = useState<VideoDuration>('60s');
  
  const [editingSceneId, setEditingSceneId] = useState<string | null>(null);
  const [editScriptText, setEditScriptText] = useState('');
  const [strategyForm, setStrategyForm] = useState<VideoStrategy | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);

  // Load User Session
  useEffect(() => {
    const currentUser = AuthService.getCurrentUser();
    if (currentUser) setUser(currentUser);
  }, []);

  // Load Gallery when requested
  useEffect(() => {
      if (showGallery && user) {
          AuthService.getUserGallery(user.id).then(setGalleryItems);
      }
  }, [showGallery, user]);

  useEffect(() => {
      if (state.strategy) {
          setStrategyForm(state.strategy);
      }
  }, [state.strategy]);

  // Auto-save on major status changes if user is logged in
  useEffect(() => {
      if (user && (state.status === PipelineStep.COMPLETE || state.status === PipelineStep.REVIEW)) {
          AuthService.saveProject(user, state);
      }
  }, [state.status, user]);

  const handleLogin = (u: User) => {
      setUser(u);
      if (pendingTopic) {
          startAnalysis(pendingTopic);
          setPendingTopic(null);
      }
  };
  
  const handleLogout = () => { AuthService.logout(); setUser(null); setShowGallery(false); };

  const loadProject = (item: GalleryItem) => {
      dispatch({ type: 'LOAD_PROJECT', payload: item.state });
      setShowGallery(false);
  };

  const initiateCreation = (topic: string) => {
      if (!user) {
          setPendingTopic(topic);
          setShowAuthModal(true);
      } else {
          startAnalysis(topic);
      }
  };

  const startAnalysis = useCallback(async (topic: string) => {
    // Cast window to any to access aistudio safely
    const aiStudio = (window as any).aistudio;
    if (aiStudio?.hasSelectedApiKey && !(await aiStudio.hasSelectedApiKey())) await aiStudio?.openSelectKey?.();
    const userLinks = (topic.match(/(https?:\/\/[^\s]+)/g) || []);
    dispatch({ type: 'START_ANALYSIS', payload: { topic, userLinks, voice: selectedVoice, hookStyle: selectedHook, aspectRatio: selectedAspectRatio, duration: selectedDuration } });
    try {
       const strategy = await GeminiService.analyzeRequest(topic);
       dispatch({ type: 'SET_STRATEGY', payload: strategy });
    } catch (error: any) {
       dispatch({ type: 'SET_ERROR', payload: error.message || 'Analysis agent failed.' });
    }
  }, [selectedVoice, selectedHook, selectedAspectRatio, selectedDuration]);

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
    dispatch({ type: 'UPDATE_STRATEGY', payload: strategyForm });
    dispatch({ type: 'SET_STATUS', payload: PipelineStep.NARRATIVE });
    try {
      const beats = await GeminiService.generateNarrative(state.topic, state.hookStyle, state.duration, strategyForm);
      dispatch({ type: 'SET_NARRATIVE', payload: beats });
      dispatch({ type: 'SET_STATUS', payload: PipelineStep.SCENE_PLANNING });
      const scenes = await GeminiService.planScenes(beats, state.aspectRatio, state.userLinks, strategyForm, state.hookStyle);
      dispatch({ type: 'SET_SCENES', payload: scenes });
      
      const wireframePromises = scenes.map(async (scene) => {
          dispatch({ type: 'UPDATE_ASSET_STATUS', payload: { id: scene.id, type: 'preview', status: 'loading' } });
          const conceptUrl = await GeminiService.generateConceptImage(scene.script, state.aspectRatio);
          dispatch({ type: 'UPDATE_SCENE_PREVIEW', payload: { id: scene.id, url: conceptUrl } });
      });
      await Promise.all(wireframePromises);
      await runDeepResearch(scenes);
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Scene planning failed.' });
    }
  }, [strategyForm, state.topic, state.hookStyle, state.aspectRatio, state.userLinks, state.duration]);

  const processSceneProduction = async (scene: Scene) => {
      const tasks = [];
      tasks.push((async () => {
          dispatch({ type: 'UPDATE_ASSET_STATUS', payload: { id: scene.id, type: 'audio', status: 'loading' } });
          const audioUrl = await GeminiService.generateSpeech(scene.script, state.voice);
          dispatch({ type: 'UPDATE_SCENE_AUDIO', payload: { id: scene.id, url: audioUrl } });
      })());
      tasks.push((async () => {
          dispatch({ type: 'UPDATE_ASSET_STATUS', payload: { id: scene.id, type: 'image1', status: 'loading' } });
          const res1 = await GeminiService.generateSceneImage(scene.imagePrompt1 || scene.script, state.aspectRatio);
          dispatch({ type: 'UPDATE_SCENE_IMAGE', payload: { id: scene.id, slot: 1, url: res1.imageUrl } });
          if (scene.useVeo) {
              dispatch({ type: 'UPDATE_ASSET_STATUS', payload: { id: scene.id, type: 'video1', status: 'loading' } });
              const v1 = await GeminiService.generateVideo(scene.imagePrompt1 || scene.script, state.aspectRatio, res1.imageUrl);
              dispatch({ type: 'UPDATE_SCENE_VIDEO', payload: { id: scene.id, slot: 1, url: v1 } });
          }
      })());
      tasks.push((async () => {
          dispatch({ type: 'UPDATE_ASSET_STATUS', payload: { id: scene.id, type: 'image2', status: 'loading' } });
          const res2 = await GeminiService.generateSceneImage(scene.imagePrompt2 || "Alternative " + scene.script, state.aspectRatio);
          dispatch({ type: 'UPDATE_SCENE_IMAGE', payload: { id: scene.id, slot: 2, url: res2.imageUrl } });
          if (scene.useVeo) {
              dispatch({ type: 'UPDATE_ASSET_STATUS', payload: { id: scene.id, type: 'video2', status: 'loading' } });
              const v2 = await GeminiService.generateVideo(scene.imagePrompt2 || scene.script, state.aspectRatio, res2.imageUrl);
              dispatch({ type: 'UPDATE_SCENE_VIDEO', payload: { id: scene.id, slot: 2, url: v2 } });
          }
      })());
      await Promise.all(tasks);
  };

  const approveAndGenerate = useCallback(async () => {
     dispatch({ type: 'SET_STATUS', payload: PipelineStep.ASSET_GENERATION });
     const queue = [...state.scenes];
     const workers = Array.from({ length: 10 }).map(async () => {
         while (queue.length > 0) {
             const scene = queue.shift();
             if (scene) await processSceneProduction(scene);
         }
     });
     await Promise.all(workers);
     dispatch({ type: 'SET_STATUS', payload: PipelineStep.COMPLETE });
     if (user) await AuthService.saveProject(user, state);
  }, [state.scenes, user, state]);

  const playVoiceSample = async () => {
      if (isPlayingVoice) return;
      setIsPlayingVoice(true);
      try {
          const aiStudio = (window as any).aistudio;
          if (aiStudio?.hasSelectedApiKey && !(await aiStudio.hasSelectedApiKey())) await aiStudio?.openSelectKey?.();
          const url = await GeminiService.generateSpeech(`Hello, I am ${selectedVoice}. Ready to narrate.`, selectedVoice);
          const audio = new Audio(url);
          audio.onended = () => setIsPlayingVoice(false);
          await audio.play();
      } catch (e) {
          console.error(e);
          setIsPlayingVoice(false);
      }
  };

  const activeResearchScene = state.scenes.find(s => s.id === researchSceneId);
  const isLoading = state.status === PipelineStep.ANALYZING || state.status === PipelineStep.NARRATIVE || state.status === PipelineStep.SCENE_PLANNING || state.status === PipelineStep.RESEARCHING;

  // Robust check for Deploy Button visibility
  const canDeploy = state.scenes.length > 0 && 
    ![PipelineStep.ANALYZING, PipelineStep.NARRATIVE, PipelineStep.SCENE_PLANNING, PipelineStep.ASSET_GENERATION, PipelineStep.COMPLETE].includes(state.status);

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col font-sans selection:bg-blue-500/30">
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => dispatch({ type: 'RESET' })}>
            <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center border border-white/10"><Zap size={18} className="text-white" /></div>
            <h1 className="font-bold text-lg tracking-tight hidden sm:block">Agentic<span className="text-zinc-500">Video</span> Creator</h1>
          </div>
          <div className="flex items-center gap-4">
             {(window as any).aistudio?.openSelectKey && <button onClick={() => (window as any).aistudio?.openSelectKey?.()} className="text-xs font-mono text-zinc-400 hover:text-white flex items-center gap-1"><Key size={12} /> API KEY</button>}
             
             <div className="h-6 w-[1px] bg-zinc-800" />

             {user ? (
                 <div className="flex items-center gap-3">
                     <button onClick={() => setShowGallery(true)} className="text-xs font-bold text-zinc-300 hover:text-white flex items-center gap-2">
                         <Grid size={14} /> My Creations
                     </button>
                     <div className="flex items-center gap-2 pl-3 border-l border-zinc-800">
                         <img src={user.avatar} className="w-6 h-6 rounded-full border border-white/10" alt={user.name} />
                         <span className="text-xs font-mono text-zinc-400 truncate max-w-[100px] hidden sm:block">{user.name}</span>
                         <button onClick={handleLogout} className="text-zinc-600 hover:text-red-500 ml-1"><LogOut size={14} /></button>
                     </div>
                 </div>
             ) : (
                 <button onClick={() => setShowAuthModal(true)} className="text-xs font-bold bg-white text-black px-4 py-2 rounded-full hover:bg-zinc-200 transition-colors flex items-center gap-2">
                    <UserIcon size={14} /> Sign In
                 </button>
             )}
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col pt-16 relative">
        {isLoading && (
            <FallingText topic={state.topic} statusText={state.logs[state.logs.length - 1]} />
        )}

        {state.status === PipelineStep.IDLE ? (
           <div className="flex-1 flex flex-col items-center justify-center px-4 py-20 relative overflow-hidden">
             <VideoGridBackground />
             <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent z-0" />
             <div className="w-full max-w-3xl relative z-10 space-y-10">
               <div className="text-center space-y-6">
                  <h2 className="text-6xl md:text-7xl font-bold tracking-tighter text-white drop-shadow-2xl">Agentic Video Creator</h2>
                  <p className="text-zinc-400 text-xl max-w-xl mx-auto leading-relaxed drop-shadow-md">Turn concepts or ideas into researched multiscreen videos in mins.</p>
               </div>
               <div className="bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-2xl">
                   <form onSubmit={(e) => { e.preventDefault(); if (inputValue.trim()) initiateCreation(inputValue); }} className="flex flex-col gap-2">
                      <div className="flex items-start px-4 py-4 gap-4">
                         <div className="pt-1 text-zinc-500"><BrainCircuit size={24} /></div>
                         <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="Enter topic or URL..." className="w-full bg-transparent border-none text-xl focus:ring-0 placeholder:text-zinc-500 outline-none text-white font-medium" autoFocus />
                      </div>
                      <div className="bg-black/60 rounded-xl p-3 flex flex-wrap items-center gap-4">
                         <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
                            {HOOKS.map(hook => (
                                <button key={hook.id} type="button" onClick={() => setSelectedHook(hook.id)} className={`relative flex-shrink-0 w-28 h-16 rounded-lg overflow-hidden border transition-all ${selectedHook === hook.id ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-white/10 opacity-60 hover:opacity-100'}`}>
                                   {hook.type === 'video' ? <video src={hook.asset} className="w-full h-full object-cover" muted /> : <img src={hook.asset} className="w-full h-full object-cover" />}
                                   <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><span className="text-[9px] font-bold text-white uppercase px-1 text-center">{hook.label}</span></div>
                                </button>
                            ))}
                         </div>
                         <div className="w-[1px] h-10 bg-white/10 hidden md:block" />
                         <div className="flex items-center gap-4 flex-wrap flex-1 justify-end">
                             {/* Aspect Ratio */}
                             <div className="flex gap-1">
                               <button type="button" onClick={() => setSelectedAspectRatio('16:9')} className={`p-2 rounded-lg border ${selectedAspectRatio === '16:9' ? 'bg-zinc-800 text-white border-zinc-600' : 'text-zinc-500 border-transparent hover:bg-zinc-800/50'}`}><Monitor size={18} /></button>
                               <button type="button" onClick={() => setSelectedAspectRatio('9:16')} className={`p-2 rounded-lg border ${selectedAspectRatio === '9:16' ? 'bg-zinc-800 text-white border-zinc-600' : 'text-zinc-500 border-transparent hover:bg-zinc-800/50'}`}><Smartphone size={18} /></button>
                             </div>

                             {/* Duration */}
                             <div className="flex items-center gap-1 bg-zinc-800 border border-zinc-700 rounded-lg p-1">
                                 {DURATIONS.map(d => (
                                     <button
                                        key={d.id}
                                        type="button"
                                        onClick={() => setSelectedDuration(d.id)}
                                        className={`px-2 py-1 text-[10px] font-bold rounded ${selectedDuration === d.id ? 'bg-zinc-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}
                                     >
                                        {d.id}
                                     </button>
                                 ))}
                             </div>

                             <div className="flex items-center gap-1">
                                 <select value={selectedVoice} onChange={(e) => setSelectedVoice(e.target.value)} className="bg-zinc-800 border border-zinc-700 text-white text-xs rounded-lg px-3 py-2 outline-none">
                                      {VOICES.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
                                 </select>
                                 <button 
                                    type="button" 
                                    onClick={playVoiceSample} 
                                    disabled={isPlayingVoice}
                                    className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300 disabled:opacity-50 transition-colors"
                                 >
                                    {isPlayingVoice ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                                 </button>
                             </div>
                         </div>
                         <button type="submit" className="w-full md:w-auto px-6 py-3 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 text-sm shadow-xl shadow-white/10">Create <ArrowRight size={16} /></button>
                      </div>
                   </form>
               </div>
             </div>
           </div>
        ) : (
          <div className="flex-1 flex flex-col w-full px-6 py-8 relative z-10">
             {/* ERROR DISPLAY */}
             {state.status === PipelineStep.ERROR && (
                 <div className="max-w-4xl mx-auto w-full mb-8 bg-red-950/30 border border-red-500/30 p-8 rounded-3xl flex items-start gap-6 backdrop-blur-xl">
                    <div className="p-4 bg-red-500/10 rounded-2xl border border-red-500/20">
                        <AlertCircle size={32} className="text-red-500" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-2xl font-bold text-white mb-2">System Halt</h3>
                        <p className="text-red-200/80 mb-6 font-mono text-sm">{state.error || "Critical failure in the agentic pipeline."}</p>
                        <button onClick={() => dispatch({ type: 'RESET' })} className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold flex items-center gap-2 transition-all">
                            <RefreshCcw size={18} /> Reboot System
                        </button>
                    </div>
                 </div>
             )}

             {/* STRATEGY VIEW */}
             {state.status === PipelineStep.STRATEGY && strategyForm && (
                <div className="max-w-3xl mx-auto w-full mt-10">
                    <div className="bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
                        
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20">
                                <Target size={24} className="text-blue-500" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white">Strategic Alignment</h2>
                                <p className="text-zinc-400 text-sm">Review agent analysis before production.</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Core Objective</label>
                                <div className="bg-black/50 rounded-xl p-4 border border-zinc-800 text-zinc-300">
                                    {strategyForm.keyObjective}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Executive Summary</label>
                                <textarea 
                                    value={strategyForm.summary}
                                    onChange={(e) => setStrategyForm(prev => prev ? ({...prev, summary: e.target.value}) : null)}
                                    className="w-full h-32 bg-black/50 border border-zinc-800 rounded-xl p-4 text-white focus:outline-none focus:border-blue-500/50 transition-colors resize-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Target Audience</label>
                                    <input 
                                        value={strategyForm.targetAudience}
                                        onChange={(e) => setStrategyForm(prev => prev ? ({...prev, targetAudience: e.target.value}) : null)}
                                        className="w-full bg-black/50 border border-zinc-800 rounded-xl p-4 text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Tone & Style</label>
                                    <input 
                                        value={strategyForm.toneStyle}
                                        onChange={(e) => setStrategyForm(prev => prev ? ({...prev, toneStyle: e.target.value}) : null)}
                                        className="w-full bg-black/50 border border-zinc-800 rounded-xl p-4 text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mt-10 flex items-center justify-end gap-4 border-t border-white/5 pt-6">
                            <button onClick={() => dispatch({ type: 'RESET' })} className="px-6 py-3 text-zinc-500 hover:text-white font-medium transition-colors">Abort</button>
                            <button onClick={confirmStrategyAndPlan} className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all hover:scale-105">
                                <BrainCircuit size={18} /> Generate Narrative
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MAIN DASHBOARD */}
            {state.status !== PipelineStep.STRATEGY && state.status !== PipelineStep.ERROR && (
                <div className="max-w-6xl mx-auto w-full space-y-4">
                    <div className="flex justify-between items-end border-b border-zinc-800 pb-8 mb-8">
                        <div>
                            <h1 className="text-4xl font-bold text-white mb-2 tracking-tight uppercase">Master Dashboard</h1>
                            {state.status === PipelineStep.ASSET_GENERATION && <ProductionTimer />}
                        </div>
                        <div className="flex gap-4">
                            {state.status !== PipelineStep.REVIEW && state.status !== PipelineStep.ANALYZING && state.status !== PipelineStep.SCENE_PLANNING && (
                                <button onClick={() => setIsPreviewOpen(true)} className="px-6 py-3 bg-white text-black font-bold rounded-full flex items-center gap-2 hover:bg-zinc-200 transition-colors"><PlayCircle size={20} /> Launch Preview</button>
                            )}
                            
                            {/* Deploy Button */}
                            {canDeploy && (
                                <button onClick={approveAndGenerate} className="px-6 py-3 bg-blue-600 text-white font-bold rounded-full flex items-center gap-2 hover:bg-blue-500 transition-colors">Deploy Production <ArrowRight size={18} /></button>
                            )}

                            {state.status === PipelineStep.COMPLETE && (
                                <button onClick={() => setIsExporting(true)} className="px-6 py-3 bg-red-600 text-white font-bold rounded-full flex items-center gap-2 animate-pulse hover:bg-red-500 transition-colors">
                                    <Youtube size={20} /> Export Video
                                </button>
                            )}
                        </div>
                    </div>
                    {state.scenes.length === 0 && !isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-zinc-700">
                             <Loader2 size={40} className="mb-4 animate-spin opacity-50"/>
                             <p className="font-mono text-xs uppercase tracking-widest">Waiting for scene data...</p>
                        </div>
                    ) : (
                        state.scenes.map((scene, index) => (
                            <React.Fragment key={scene.id}>
                                <SceneCard 
                                    scene={scene} 
                                    index={index} 
                                    status={state.status} 
                                    onViewResearch={(e) => { e.stopPropagation(); setResearchSceneId(scene.id); }} 
                                    onEditScript={(e) => { e.stopPropagation(); setEditingSceneId(scene.id); setEditScriptText(scene.script); }} 
                                    onUpdateTransition={(id, type, t) => dispatch({ type: 'UPDATE_SCENE_TRANSITION', payload: { id, type, transition: t } })}
                                />
                                {index < state.scenes.length - 1 && (
                                    <TransitionNode type={state.scenes[index + 1].transitionIn} />
                                )}
                            </React.Fragment>
                        ))
                    )}
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

      {isPreviewOpen && state.scenes.length > 0 && <PreviewPlayer scenes={state.scenes} hookStyle={state.hookStyle} onClose={() => setIsPreviewOpen(false)} />}
      
      {isExporting && (
          <YouTubeModal 
            scenes={state.scenes} 
            aspectRatio={selectedAspectRatio} 
            onClose={() => setIsExporting(false)} 
          />
      )}

      {activeResearchScene && <ResearchPopup scene={activeResearchScene} onClose={() => setResearchSceneId(null)} onMixAssets={async (a, b) => { try { const { imageUrl } = await GeminiService.mixAssets(a, b, state.aspectRatio); dispatch({ type: 'UPDATE_SCENE_IMAGE', payload: { id: researchSceneId!, slot: 1, url: imageUrl } }); } catch (e) { console.error(e); } }} />}
      
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} onLogin={handleLogin} />}
      
      {showGallery && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl animate-in fade-in">
              <div className="w-full max-w-6xl h-[90vh] bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden flex flex-col relative shadow-2xl">
                  <button onClick={() => setShowGallery(false)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"><Rocket className="rotate-180" size={24} /></button>
                  <div className="p-10 border-b border-white/5 bg-zinc-950/50">
                      <h2 className="text-3xl font-bold text-white mb-2">My Creations</h2>
                      <p className="text-zinc-500 font-mono text-sm uppercase tracking-widest">Local Database • {galleryItems.length} Projects</p>
                  </div>
                  <div className="flex-1 overflow-y-auto p-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {galleryItems.map(item => (
                          <div key={item.id} onClick={() => loadProject(item)} className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden hover:border-blue-500/50 hover:shadow-2xl hover:-translate-y-1 transition-all cursor-pointer group">
                              <div className="aspect-video relative overflow-hidden bg-black">
                                  <img src={item.thumbnail} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                                  <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/80 rounded text-[10px] font-bold text-white uppercase tracking-widest">{item.durationLabel}</div>
                              </div>
                              <div className="p-6">
                                  <h3 className="font-bold text-white mb-1 truncate">{item.topic || 'Untitled Project'}</h3>
                                  <div className="flex justify-between items-center mt-4">
                                      <span className="text-xs text-zinc-500 font-mono">{new Date(item.timestamp).toLocaleDateString()}</span>
                                      <span className="text-xs text-blue-400 font-mono">{item.sceneCount} Scenes</span>
                                  </div>
                              </div>
                          </div>
                      ))}
                      {galleryItems.length === 0 && (
                          <div className="col-span-full flex flex-col items-center justify-center py-20 text-zinc-700">
                              <Grid size={48} className="mb-4 opacity-50" />
                              <p className="font-mono text-sm uppercase">No saved projects found</p>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
