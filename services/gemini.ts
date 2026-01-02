
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { NarrativeBeat, Scene, GroundingChunk, VisualEffect, VideoStrategy, HookStyle, AspectRatio, AssetRecord } from "../types";
import { AssetDb } from "./assetDb";

const TEXT_MODEL = "gemini-3-pro-preview"; 
const IMAGE_MODEL = "gemini-3-pro-image-preview"; 
const TTS_MODEL = "gemini-2.5-flash-preview-tts";
const VIDEO_MODEL = "veo-3.1-fast-generate-preview";

const withRetry = async <T>(fn: () => Promise<T>, retries = 3, baseDelay = 3000): Promise<T> => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e: any) {
      const isRateLimit = e.status === 429 || e.code === 429 || (e.message && e.message.includes('429')) || (e.message && e.message.includes('quota'));
      const isServerOverload = e.status === 503 || e.code === 503;
      if (i === retries - 1 || (!isRateLimit && !isServerOverload)) throw e;
      const delay = baseDelay * Math.pow(2, i);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error("Max retries exceeded");
};

const cleanAndParseJSON = (text: string) => {
  let content = text.trim();
  const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch && codeBlockMatch[1]) content = codeBlockMatch[1];
  const firstOpen = content.search(/[\{\[]/);
  let lastClose = -1;
  for (let i = content.length - 1; i >= 0; i--) {
    if (content[i] === '}' || content[i] === ']') {
      lastClose = i;
      break;
    }
  }
  if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) content = content.substring(firstOpen, lastClose + 1);
  try {
    return JSON.parse(content);
  } catch (e) {
    try {
      return JSON.parse(content.replace(/,\s*([\]\s}])/g, '$1'));
    } catch (e2) {
      throw new Error("Failed to parse JSON response");
    }
  }
};

export const analyzeRequest = async (input: string): Promise<VideoStrategy> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Analyze: "${input}". Return JSON {summary, targetAudience, toneStyle, keyObjective}.`;
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: { temperature: 0.2, tools: [{ googleSearch: {} }] }
    });
    return cleanAndParseJSON(response.text!) as VideoStrategy;
  });
};

export const generateNarrative = async (topic: string, hookStyle: HookStyle, strategy?: VideoStrategy): Promise<NarrativeBeat[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Narrative Architect. Create 8-12 beats for "${topic}". Strategy: ${JSON.stringify(strategy)}. Return JSON array [{beat, goal, description}].`;
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: { temperature: 0.4, responseMimeType: "application/json" }
    });
    return cleanAndParseJSON(response.text!) as NarrativeBeat[];
  });
};

export const planScenes = async (beats: NarrativeBeat[], aspectRatio: AspectRatio, userLinks: string[], strategy?: VideoStrategy, hookStyle?: HookStyle): Promise<Scene[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Visual Director. Convert beats to dual-asset storyboard. 
  EACH SCENE REQUIRES TWO DISTINCT VISUAL CONCEPTS to avoid repetitive loops.
  
  Return JSON array [{
    "id": "scene_N", 
    "duration": 5, 
    "type": "article_card | split_screen | full_chart | diagram | title", 
    "primaryVisual": "detailed summary", 
    "visualResearchPlan": "search query for visual assets", 
    "script": "VO text", 
    "visualEffect": "Effect name", 
    "reasoning": "Agent reasoning", 
    "imagePrompt1": "Detailed 8k cinematic prompt for FIRST asset of scene",
    "imagePrompt2": "Distinct 8k cinematic prompt for SECOND asset of scene",
    "useVeo": boolean
  }].`;

  return withRetry(async () => {
    const response = await ai.models.generateContent({
        model: TEXT_MODEL,
        contents: prompt,
        config: { responseMimeType: "application/json", temperature: 0.3, thinkingConfig: { thinkingBudget: 16000 } }
    });
    const scenes = cleanAndParseJSON(response.text!) as Scene[];
    return scenes.map((s, i) => ({ 
      ...s, 
      id: s.id || `scene_${i}`, 
      statusAudio: 'idle', 
      statusPreview: 'idle',
      statusImage1: 'idle', 
      statusImage2: 'idle',
      statusVideo1: 'idle', 
      statusVideo2: 'idle',
      assets: [] 
    }));
  });
};

export const generateWireframe = async (prompt: string, aspectRatio: AspectRatio): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  let arStr = aspectRatio === '9:16' ? "9:16" : aspectRatio === '1:1' ? "1:1" : "16:9";
  const wireframePrompt = `Minimalist technical line-art drawing of: ${prompt}. Black ink on white background, thin architectural lines, technical blueprint style, zero shading, zero gradients, no gray, purely binary black and white, professional engineering diagram.`;
  
  return withRetry(async () => {
    const response = await ai.models.generateContent({
        model: IMAGE_MODEL,
        contents: wireframePrompt,
        config: { imageConfig: { aspectRatio: arStr, imageSize: "1K" } },
    });
    const parts = response.candidates?.[0]?.content?.parts;
    let imageUrl = '';
    if (parts) {
        for (const part of parts) {
            if (part.inlineData?.data) {
                imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                break;
            }
        }
    }
    if (!imageUrl) throw new Error("Wireframe failed.");
    return imageUrl;
  });
};

export const researchScene = async (scene: Scene): Promise<AssetRecord[]> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    return withRetry(async () => {
      try {
          const response = await ai.models.generateContent({
            model: TEXT_MODEL,
            contents: `Deep Intel Agent. Gather 8-10 assets for: "${scene.primaryVisual}".
            1. Find real URLs for visual context.
            2. Generate "Synthetic Intel" reports if links are scarce.
            Return JSON: {
                "externalLinks": [{"url": "...", "title": "..."}],
                "syntheticIntel": [{"title": "Agent Intel Report", "summary": "...", "type": "technical"}]
            }`,
            config: { 
                temperature: 0.2, 
                tools: [{ googleSearch: {} }],
                responseMimeType: "application/json"
            }
          });
  
          const researchData = cleanAndParseJSON(response.text!);
          const assets: AssetRecord[] = [];

          if (researchData.externalLinks) {
              for (const link of researchData.externalLinks) {
                  if (link.url && !link.url.includes('google.com')) {
                      const asset = await AssetDb.ingest(link.url, link.title);
                      assets.push(asset);
                  }
              }
          }

          const chunks = (response.candidates?.[0]?.groundingMetadata?.groundingChunks || []) as GroundingChunk[];
          for (const chunk of chunks) {
              if (chunk.web?.uri && !assets.some(a => a.originalUrl === chunk.web?.uri)) {
                  const asset = await AssetDb.ingest(chunk.web.uri, chunk.web.title);
                  assets.push(asset);
              }
          }

          if (researchData.syntheticIntel || assets.length < 5) {
              const syntheticCount = Math.max(3, 8 - assets.length);
              const intel = researchData.syntheticIntel || [];
              for (let i = 0; i < syntheticCount; i++) {
                  const data = intel[i] || { title: "Archival Record " + i, summary: "Historical data point regarding " + scene.primaryVisual };
                  const asset = await AssetDb.ingest(`internal://intel/${crypto.randomUUID()}`, data.title, 'intel', data.summary);
                  assets.push(asset);
              }
          }

          return assets;
      } catch (error) {
          return []; 
      }
    });
};

export const generateSceneImage = async (prompt: string, aspectRatio: AspectRatio): Promise<{ imageUrl: string, groundingChunks: GroundingChunk[] }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  let arStr = aspectRatio === '9:16' ? "9:16" : aspectRatio === '1:1' ? "1:1" : "16:9";
  return withRetry(async () => {
    const response = await ai.models.generateContent({
        model: IMAGE_MODEL,
        contents: `Cinematic masterpiece 8k, detailed high-fidelity render: ${prompt}`,
        config: { tools: [{ googleSearch: {} }], imageConfig: { aspectRatio: arStr, imageSize: "1K" } },
    });
    const parts = response.candidates?.[0]?.content?.parts;
    let imageUrl = '';
    if (parts) {
        for (const part of parts) {
            if (part.inlineData?.data) {
                imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                break;
            }
        }
    }
    if (!imageUrl) throw new Error("Image failed.");
    return { imageUrl, groundingChunks: (response.candidates?.[0]?.groundingMetadata?.groundingChunks || []) as GroundingChunk[] };
  });
};

export const mixAssets = async (assetA: string, assetB: string, aspectRatio: AspectRatio): Promise<{ imageUrl: string, groundingChunks: GroundingChunk[] }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  let arStr = aspectRatio === '9:16' ? "9:16" : aspectRatio === '1:1' ? "1:1" : "16:9";
  return withRetry(async () => {
    const response = await ai.models.generateContent({
        model: IMAGE_MODEL,
        contents: `Create a cinematic 8k image that fuses the concepts of "${assetA}" and "${assetB}". Ensure a cohesive and professional visual style.`,
        config: { tools: [{ googleSearch: {} }], imageConfig: { aspectRatio: arStr, imageSize: "1K" } },
    });
    const parts = response.candidates?.[0]?.content?.parts;
    let imageUrl = '';
    if (parts) {
        for (const part of parts) {
            if (part.inlineData?.data) {
                imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                break;
            }
        }
    }
    if (!imageUrl) throw new Error("Asset fusion failed.");
    return { imageUrl, groundingChunks: (response.candidates?.[0]?.groundingMetadata?.groundingChunks || []) as GroundingChunk[] };
  });
};

export const generateVideo = async (prompt: string, aspectRatio: AspectRatio, inputImageBase64?: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  let arStr = aspectRatio === '9:16' ? "9:16" : "16:9";
  return withRetry(async () => {
    const base64Clean = inputImageBase64?.replace(/^data:image\/(png|jpeg|webp);base64,/, "");
    let operation = await ai.models.generateVideos({
        model: VIDEO_MODEL,
        prompt: prompt + ", fluid motion",
        ...(base64Clean ? { image: { imageBytes: base64Clean, mimeType: 'image/jpeg' } } : {}),
        config: { numberOfVideos: 1, resolution: '720p', aspectRatio: arStr }
    });
    while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 8000));
        operation = await ai.operations.getVideosOperation({operation: operation});
    }
    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    const response = await fetch(`${videoUri}&key=${process.env.API_KEY}`);
    return URL.createObjectURL(await response.blob());
  }, 2, 20000); 
}

export const generateSpeech = async (text: string, voiceName: string = 'Puck'): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  return withRetry(async () => {
    const response = await ai.models.generateContent({
        model: TTS_MODEL,
        contents: { parts: [{ text: text }] },
        config: { responseModalities: [Modality.AUDIO], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName } } } },
    });
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    const binaryString = atob(base64Audio!);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    const wavHeader = new ArrayBuffer(44);
    const view = new DataView(wavHeader);
    const writeString = (o: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
    writeString(0, 'RIFF'); view.setUint32(4, 36 + bytes.length, true); writeString(8, 'WAVE'); writeString(12, 'fmt ');
    view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
    view.setUint32(24, 24000, true); view.setUint32(28, 48000, true); view.setUint16(32, 2, true);
    view.setUint16(34, 16, true); writeString(36, 'data'); view.setUint32(40, bytes.length, true);
    return URL.createObjectURL(new Blob([wavHeader, bytes], { type: 'audio/wav' }));
  });
};
