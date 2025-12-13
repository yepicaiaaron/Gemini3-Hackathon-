export enum PipelineStep {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING', // Agent analyzes input/link
  STRATEGY = 'STRATEGY', // User confirms strategy
  RESEARCHING = 'RESEARCHING', // Deep research (optional, merged into Analysis usually but kept for flow)
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

export interface Scene {
  id: string;
  duration: number; // seconds
  type: 'article_card' | 'split_screen' | 'full_chart' | 'diagram' | 'title'; 
  primaryVisual: string;
  script: string;
  motionIntent: string[];
  visualEffect: VisualEffect;
  effectReasoning: string; 
  visualResearchPlan: string; // New: Explain what assets are needed/used
  referenceLinks?: string[]; // New: Specific user provided links for this scene
  imagePrompt?: string;
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  groundingChunks?: GroundingChunk[];
  isLoading?: boolean;
}

export interface ProjectState {
  topic: string;
  userLinks: string[]; // New: Links extracted from input
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
  | { type: 'UPDATE_SCENE_IMAGE'; payload: { id: string; url: string; groundingChunks?: GroundingChunk[] } }
  | { type: 'UPDATE_SCENE_VIDEO'; payload: { id: string; url: string } }
  | { type: 'UPDATE_SCENE_SCRIPT'; payload: { id: string; script: string } }
  | { type: 'UPDATE_SCENE_AUDIO'; payload: { id: string; url: string } }
  | { type: 'ADD_LOG'; payload: string }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'RESET' };
