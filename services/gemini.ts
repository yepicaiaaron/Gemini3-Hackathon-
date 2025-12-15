
import { GoogleGenAI, Type } from "@google/genai";
import { NarrativeBeat, Scene, GroundingChunk, VisualEffect, VideoStrategy, HookStyle, AspectRatio, AssetRecord } from "../types";
import { AssetDb } from "./assetDb";

const TEXT_MODEL = "gemini-2.5-flash";
const IMAGE_MODEL = "gemini-3-pro-image-preview"; 
const TTS_MODEL = "gemini-2.5-flash-preview-tts";
const VIDEO_MODEL = "veo-3.1-fast-generate-preview";

// Helper for 429/503 handling
const withRetry = async <T>(fn: () => Promise<T>, retries = 3, baseDelay = 3000): Promise<T> => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e: any) {
      const isRateLimit = e.status === 429 || e.code === 429 || (e.message && e.message.includes('429')) || (e.message && e.message.includes('quota'));
      const isServerOverload = e.status === 503 || e.code === 503;
      if (i === retries - 1 || (!isRateLimit && !isServerOverload)) throw e;
      const delay = baseDelay * Math.pow(2, i);
      console.warn(`API Error (${e.status || e.code}). Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error("Max retries exceeded");
};

const cleanAndParseJSON = (text: string) => {
  let content = text;
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch && codeBlockMatch[1]) content = codeBlockMatch[1];
  const firstOpen = content.search(/[\{\[]/);
  let lastClose = -1;
  for (let i = content.length - 1; i >= 0; i--) {
    if (content[i] === '}' || content[i] === ']') {
      lastClose = i;
      break;
    }
  }
  if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
    content = content.substring(firstOpen, lastClose + 1);
  }
  try {
    return JSON.parse(content);
  } catch (e) {
    try {
      const fixed = content.replace(/,\s*([\]}])/g, '$1');
      return JSON.parse(fixed);
    } catch (e2) {
      console.error("JSON Parse Error. Content:", content);
      throw new Error("Failed to parse JSON response");
    }
  }
};

export const analyzeRequest = async (input: string): Promise<VideoStrategy> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `
    You are a Strategic Video Producer.
    Analyze: "${input}".
    Return JSON only.
    {
      "summary": "1-sentence explanation",
      "targetAudience": "Who is this for?",
      "toneStyle": "Vibe",
      "keyObjective": "Goal"
    }
  `;
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: { temperature: 0.1, tools: [{ googleSearch: {} }] }
    });
    return cleanAndParseJSON(response.text!) as VideoStrategy;
  });
};

export const generateNarrative = async (topic: string, hookStyle: HookStyle, strategy?: VideoStrategy): Promise<NarrativeBeat[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `
    Narrative Expert. Topic: "${topic}".
    Strategy: ${JSON.stringify(strategy)}
    Hook: ${hookStyle}
    Generate 10-15 beats. JSON Array.
    [{ "beat": "Name", "goal": "Goal", "description": "Summary" }]
  `;
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: { temperature: 0.2, responseMimeType: "application/json" }
    });
    return cleanAndParseJSON(response.text!) as NarrativeBeat[];
  });
};

export const planScenes = async (beats: NarrativeBeat[], aspectRatio: AspectRatio, userLinks: string[], strategy?: VideoStrategy, hookStyle?: HookStyle): Promise<Scene[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // CHANGED: Persona is now a technical database to prevent "creative" glitch text
  const prompt = `
    You are a Technical Video Database System.
    Your task is to convert narrative beats into structured scene metadata.
    
    INPUT DATA:
    - Beats: ${JSON.stringify(beats)}
    - Strategy: ${JSON.stringify(strategy)}
    - User Assets: ${JSON.stringify(userLinks)}
    
    STRICT OUTPUT RULES:
    1. Language: Standard Professional English ONLY.
    2. Grammar: Must be perfect. No typos. No stuttering.
    3. Formatting: JSON Array only.
    4. PROHIBITED: Do not use "glitch" text, Zalgo text, repeated characters (e.g. "ssccene"), or "AI roleplay" gibberish.
    5. The "reasoning" field must be a clear, boring explanation of the visual choice.

    OUTPUT SCHEMA:
    {
      "id": "string",
      "duration": number,
      "type": "string",
      "primaryVisual": "string",
      "visualResearchPlan": "string",
      "script": "string",
      "visualEffect": "string",
      "effectReasoning": "string",
      "reasoning": "string (Standard English Only)",
      "imagePrompt": "string",
      "useVeo": boolean
    }
  `;

  return withRetry(async () => {
    const response = await ai.models.generateContent({
        model: TEXT_MODEL,
        contents: prompt,
        config: { 
            responseMimeType: "application/json", 
            temperature: 0.4, // Increased to 0.4 to prevent low-temp character stutter/loops
            topK: 40,
            topP: 0.95
        }
    });
    const scenes = cleanAndParseJSON(response.text!) as Scene[];
    return scenes.map((s, i) => ({ 
        ...s, 
        id: s.id || `scene_${i}`, 
        statusAudio: 'idle',
        statusImage: 'idle',
        statusVideo: 'idle',
        visualEffect: s.visualEffect || 'NONE',
        assets: [] 
    }));
  });
};

export const researchScene = async (scene: Scene): Promise<AssetRecord[]> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `
      Deep Visual Research Task.
      Script: "${scene.script}"
      Visual Plan: "${scene.primaryVisual}"
      Needs: "${scene.visualResearchPlan}"
      
      FIND:
      1. 3x High-quality IMAGES (photos/diagrams).
      2. 2x Relevant VIDEOS (youtube/news).
      3. 2x Articles.
    `;
  
    return withRetry(async () => {
      try {
          const response = await ai.models.generateContent({
            model: TEXT_MODEL,
            contents: prompt,
            config: { temperature: 0.1, tools: [{ googleSearch: {} }] }
          });
  
          const chunks = (response.candidates?.[0]?.groundingMetadata?.groundingChunks || []) as GroundingChunk[];
          const ingestedAssets: AssetRecord[] = [];
          
          chunks.forEach(chunk => {
             if (!chunk.web?.uri) return;
             const record = AssetDb.ingest(chunk.web.uri, chunk.web.title);
             ingestedAssets.push(record);
          });
  
          return ingestedAssets;
      } catch (error) {
          console.error("Deep Research Error:", error);
          return []; 
      }
    });
};

export const mixAssets = async (assetA: string, assetB: string, aspectRatio: AspectRatio): Promise<{ imageUrl: string, groundingChunks: GroundingChunk[] }> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    let arStr = aspectRatio === '9:16' ? "9:16" : aspectRatio === '1:1' ? "1:1" : "16:9";

    const prompt = `Combine these concepts into one seamless image: 1. ${assetA}, 2. ${assetB}`;

    return withRetry(async () => {
        const response = await ai.models.generateContent({
            model: IMAGE_MODEL,
            contents: prompt,
            config: { imageConfig: { aspectRatio: arStr, imageSize: "2K" } },
        });
        const parts = response.candidates?.[0]?.content?.parts;
        let imageUrl = '';
        if (parts) {
            for (const part of parts) {
                if (part.inlineData && part.inlineData.data) {
                    imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                    break;
                }
            }
        }
        if (!imageUrl) throw new Error("No image generated");
        return { imageUrl, groundingChunks: [] };
    });
}

export const generateSceneImage = async (prompt: string, aspectRatio: AspectRatio): Promise<{ imageUrl: string, groundingChunks: GroundingChunk[] }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  let arStr = aspectRatio === '9:16' ? "9:16" : aspectRatio === '1:1' ? "1:1" : "16:9";

  return withRetry(async () => {
    const enhancedPrompt = `
    Investigative Visual Artist.
    RESEARCH FIRST: "${prompt}". Find real references.
    THEN GENERATE: Photorealistic 8k image based on findings.
    `;

    const response = await ai.models.generateContent({
        model: IMAGE_MODEL,
        contents: enhancedPrompt,
        config: {
            tools: [{ googleSearch: {} }],
            imageConfig: { aspectRatio: arStr, imageSize: "2K" }
        },
    });

    const groundingChunks = (response.candidates?.[0]?.groundingMetadata?.groundingChunks || []) as GroundingChunk[];
    const parts = response.candidates?.[0]?.content?.parts;
    let imageUrl = '';
    if (parts) {
        for (const part of parts) {
            if (part.inlineData && part.inlineData.data) {
                imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                break;
            }
        }
    }
    if (!imageUrl) throw new Error("No image data");
    return { imageUrl, groundingChunks };
  });
};

export const generateVideo = async (prompt: string, aspectRatio: AspectRatio, inputImageBase64?: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  let arStr = aspectRatio === '9:16' ? "9:16" : "16:9";

  return withRetry(async () => {
    let operation;
    if (inputImageBase64) {
        const base64Clean = inputImageBase64.replace(/^data:image\/(png|jpeg|webp);base64,/, "");
        operation = await ai.models.generateVideos({
            model: VIDEO_MODEL,
            prompt: prompt + ", cinematic movement",
            image: { imageBytes: base64Clean, mimeType: 'image/jpeg' },
            config: { numberOfVideos: 1, resolution: '720p', aspectRatio: arStr }
        });
    } else {
        operation = await ai.models.generateVideos({
            model: VIDEO_MODEL,
            prompt: prompt + ", cinematic lighting",
            config: { numberOfVideos: 1, resolution: '720p', aspectRatio: arStr }
        });
    }

    while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        operation = await ai.operations.getVideosOperation({operation: operation});
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) throw new Error("No video URI");
    const response = await fetch(`${videoUri}&key=${process.env.API_KEY}`);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }, 4, 10000); 
}

export const generateSpeech = async (text: string, voiceName: string = 'Puck'): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  return withRetry(async () => {
    const response = await ai.models.generateContent({
        model: TTS_MODEL,
        contents: { parts: [{ text: text }] },
        config: {
            responseModalities: ["AUDIO"],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName } } },
        },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio data");
    const binaryString = atob(base64Audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    
    // Simple WAV header helper
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
