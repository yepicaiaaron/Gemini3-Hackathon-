
export enum PipelineStep {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING', 
  STRATEGY = 'STRATEGY', 
  RESEARCHING = 'RESEARCHING', 
  NARRATIVE = 'NARRATIVE',
  SCENE_PLANNING = 'SCENE_PLANNING',
  REVIEW = 'REVIEW',
  ASSET_GENERATION = 'ASSET_GENERATION',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}

export interface NarrativeBeat {
  beat: string;
  goal: string;
  description: string;
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}

export interface VideoStrategy {
  summary: string;
  targetAudience: string;
  toneStyle: string;
  keyObjective: string;
}

export type VisualEffect = 
  | 'NONE' 
  | 'VHS' 
  | 'GLITCH' 
  | 'ZOOM_BLUR' 
  | 'PIXELATE' 
  | 'RGB_SHIFT' 
  | 'CRT' 
  | 'FILM_GRAIN' 
  | 'SHAKE' 
  | 'VIGNETTE' 
  | 'MEME_FUSION';

export type HookStyle = 'AI_SELECTED' | 'FAST_CUT' | 'ARTICLE_HIGHLIGHT' | 'TEXT_MATCH';
export type AspectRatio = '16:9' | '9:16' | '1:1';

export type AssetStatus = 'idle' | 'loading' | 'success' | 'error';

export interface AssetRecord {
  id: string; 
  originalUrl: string;
  proxyUrl: string; 
  storagePath: string; 
  type: 'image' | 'video' | 'source' | 'intel'; 
  title: string;
  sourceDomain: string;
  timestamp: number;
  isCached: boolean;
  textContent?: string;
}

export interface Scene {
  id: string;
  duration: number; 
  type: 'article_card' | 'split_screen' | 'full_chart' | 'diagram' | 'title'; 
  primaryVisual: string;
  script: string;
  motionIntent: string[];
  visualEffect: VisualEffect;
  effectReasoning: string; 
  reasoning: string; 
  visualResearchPlan: string; 
  
  assets: AssetRecord[]; 
  
  previewUrl?: string; // B&W Wireframe
  imagePrompt1?: string;
  imagePrompt2?: string;
  imageUrl1?: string;
  imageUrl2?: string;
  videoUrl1?: string;
  videoUrl2?: string;
  
  useVeo?: boolean; 
  audioUrl?: string;
  groundingChunks?: GroundingChunk[];
  
  statusAudio: AssetStatus;
  statusPreview: AssetStatus;
  statusImage1: AssetStatus;
  statusImage2: AssetStatus;
  statusVideo1: AssetStatus;
  statusVideo2: AssetStatus;
  
  isResearching?: boolean;
}

export interface ProjectState {
  topic: string;
  userLinks: string[]; 
  voice: string;
  hookStyle: HookStyle;
  aspectRatio: AspectRatio;
  status: PipelineStep;
  strategy?: VideoStrategy;
  narrativeBeats: NarrativeBeat[];
  scenes: Scene[];
  logs: string[];
  error?: string;
}

export type AgentAction = 
  | { type: 'START_ANALYSIS'; payload: { topic: string; userLinks: string[]; voice: string; hookStyle: HookStyle; aspectRatio: AspectRatio } }
  | { type: 'SET_STRATEGY'; payload: VideoStrategy }
  | { type: 'SET_STATUS'; payload: PipelineStep }
  | { type: 'SET_NARRATIVE'; payload: NarrativeBeat[] }
  | { type: 'SET_SCENES'; payload: Scene[] }
  | { type: 'UPDATE_ASSET_STATUS'; payload: { id: string; type: 'audio' | 'preview' | 'image1' | 'image2' | 'video1' | 'video2'; status: AssetStatus } }
  | { type: 'UPDATE_SCENE_RESEARCH_STATUS'; payload: { id: string; isResearching: boolean } }
  | { type: 'INGEST_ASSETS'; payload: { sceneId: string; assets: AssetRecord[] } }
  | { type: 'UPDATE_SCENE_PREVIEW'; payload: { id: string; url: string } }
  | { type: 'UPDATE_SCENE_IMAGE'; payload: { id: string; slot: 1 | 2; url: string; groundingChunks?: GroundingChunk[] } }
  | { type: 'UPDATE_SCENE_VIDEO'; payload: { id: string; slot: 1 | 2; url: string } }
  | { type: 'UPDATE_SCENE_SCRIPT'; payload: { id: string; script: string } }
  | { type: 'UPDATE_SCENE_AUDIO'; payload: { id: string; url: string } }
  | { type: 'ADD_LOG'; payload: string }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'RESET' };
