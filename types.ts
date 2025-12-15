
export enum PipelineStep {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING', // Agent analyzes input/link
  STRATEGY = 'STRATEGY', // User confirms strategy
  RESEARCHING = 'RESEARCHING', // Phase 1.5: Deep Research
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

// New "Database" Record Structure
export interface AssetRecord {
  id: string; // UUID
  originalUrl: string;
  proxyUrl: string; // The "Saved Copy" that is guaranteed to render
  type: 'image' | 'video' | 'text';
  title: string;
  sourceDomain: string;
  timestamp: number;
}

export interface Scene {
  id: string;
  duration: number; // seconds
  type: 'article_card' | 'split_screen' | 'full_chart' | 'diagram' | 'title'; 
  primaryVisual: string;
  script: string;
  motionIntent: string[];
  visualEffect: VisualEffect;
  effectReasoning: string; 
  reasoning: string; 
  visualResearchPlan: string; 
  referenceLinks?: string[]; 
  
  // The Vault
  assets: AssetRecord[]; 
  
  imagePrompt?: string;
  imageUrl?: string;
  videoUrl?: string;
  useVeo?: boolean; 
  audioUrl?: string;
  groundingChunks?: GroundingChunk[];
  
  // Asset Generation Status Tracking
  statusAudio: AssetStatus;
  statusImage: AssetStatus;
  statusVideo: AssetStatus;
  
  // Phase 1.5 Status
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
  | { type: 'UPDATE_ASSET_STATUS'; payload: { id: string; type: 'audio' | 'image' | 'video'; status: AssetStatus } }
  | { type: 'UPDATE_SCENE_RESEARCH_STATUS'; payload: { id: string; isResearching: boolean } }
  | { type: 'INGEST_ASSETS'; payload: { sceneId: string; assets: AssetRecord[] } }
  | { type: 'UPDATE_SCENE_IMAGE'; payload: { id: string; url: string; groundingChunks?: GroundingChunk[] } }
  | { type: 'UPDATE_SCENE_VIDEO'; payload: { id: string; url: string } }
  | { type: 'UPDATE_SCENE_SCRIPT'; payload: { id: string; script: string } }
  | { type: 'UPDATE_SCENE_AUDIO'; payload: { id: string; url: string } }
  | { type: 'ADD_LOG'; payload: string }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'RESET' };
