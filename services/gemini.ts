
import { GoogleGenAI, Type } from "@google/genai";
import { NarrativeBeat, Scene, GroundingChunk, VisualEffect, VideoStrategy, HookStyle, AspectRatio, AssetRecord } from "../types";
import { AssetDb } from "./assetDb";

const TEXT_MODEL = "gemini-3-pro-preview"; // Upgraded from flash for better reasoning
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
  
  if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
    content = content.substring(firstOpen, lastClose + 1);
  }

  try {
    return JSON.parse(content);
  } catch (e) {
    console.error("JSON Parse Error. Cleaned Content:", content);
    // Attempt one more fix for common LLM JSON errors (trailing commas)
    try {
      const fixed = content.replace(/,\s*([\]\s}])/g, '$1');
      return JSON.parse(fixed);
    } catch (e2) {
      throw new Error("Failed to parse JSON response: " + text.substring(0, 100) + "...");
    }
  }
};

export const analyzeRequest = async (input: string): Promise<VideoStrategy> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `
    Analyze this video request: "${input}".
    Determine the optimal production strategy.
    RETURN ONLY A JSON OBJECT:
    {
      "summary": "1-sentence strategic summary",
      "targetAudience": "specific audience description",
      "toneStyle": "description of visual/vocal tone",
      "keyObjective": "primary goal of the video"
    }
  `;
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: { 
        temperature: 0.2, 
        tools: [{ googleSearch: {} }] 
      }
    });
    return cleanAndParseJSON(response.text!) as VideoStrategy;
  });
};

export const generateNarrative = async (topic: string, hookStyle: HookStyle, strategy?: VideoStrategy): Promise<NarrativeBeat[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `
    You are a Narrative Architect. Create a high-impact narrative for: "${topic}".
    Production Strategy: ${JSON.stringify(strategy)}
    Requested Hook: ${hookStyle}

    Generate exactly 8-12 chronological beats. 
    RETURN ONLY A JSON ARRAY OF OBJECTS:
    [{ "beat": "Short Name", "goal": "Dramatic Goal", "description": "1-sentence plot point" }]
  `;
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
  
  const prompt = `
    You are an Expert Visual Director. Convert these narrative beats into a high-fidelity cinematic storyboard.
    
    INPUT DATA:
    - Narrative: ${JSON.stringify(beats)}
    - Strategy: ${JSON.stringify(strategy)}
    - User Assets: ${JSON.stringify(userLinks)}
    - Aspect Ratio: ${aspectRatio}
    
    INSTRUCTIONS:
    1. For EACH narrative beat, create exactly one scene.
    2. The "reasoning" MUST explain the directorial choice in professional English.
    3. The "visualResearchPlan" should be a query to find real-world visual references.
    4. The "imagePrompt" MUST be a highly detailed 8k cinematic prompt.
    5. Set "useVeo" to true if the scene needs complex motion (e.g., fluid character movement, dynamic environments).

    RETURN ONLY A JSON ARRAY OF OBJECTS (one for each beat):
    [{
      "id": "scene_N",
      "duration": 5,
      "type": "article_card | split_screen | full_chart | diagram | title",
      "primaryVisual": "detailed visual description",
      "visualResearchPlan": "search query for visual research",
      "script": "voiceover text for this scene",
      "visualEffect": "NONE | VHS | GLITCH | ZOOM_BLUR | RGB_SHIFT | etc",
      "effectReasoning": "why this effect fits",
      "reasoning": "directorial reasoning for this scene's composition",
      "imagePrompt": "masterpiece 8k cinematic prompt",
      "useVeo": boolean
    }]
  `;

  return withRetry(async () => {
    const response = await ai.models.generateContent({
        model: TEXT_MODEL,
        contents: prompt,
        config: { 
            responseMimeType: "application/json", 
            temperature: 0.3,
            thinkingConfig: { thinkingBudget: 16000 }
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
      Visual Researcher. Find 4-6 distinct, real-world image or reference URLs for this visual plan.
      
      Visual Plan: "${scene.primaryVisual}"
      Research Query: "${scene.visualResearchPlan}"
      
      You MUST use the googleSearch tool.
      Target domains: Smithsonian, NASA, Reuters, Wikipedia, specialized archives.
    `;
  
    return withRetry(async () => {
      try {
          const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview", // Flash is fine for search
            contents: prompt,
            config: { 
                temperature: 0.1, 
                tools: [{ googleSearch: {} }] 
            }
          });
  
          let chunks = (response.candidates?.[0]?.groundingMetadata?.groundingChunks || []) as GroundingChunk[];
          
          if (chunks.length === 0 && response.text) {
             const urlRegex = /(https?:\/\/[^\s\)]+)/g;
             const matches = response.text.match(urlRegex) || [];
             const uniqueUrls = Array.from(new Set(matches));
             chunks = uniqueUrls.map((url: string) => ({
                 web: { uri: url, title: new URL(url).hostname }
             }));
          }

          const assetPromises = chunks.map(async (chunk) => {
             try {
                 if (!chunk.web?.uri) return null;
                 const uri = chunk.web.uri;
                 if (uri.includes('google.com/search') || uri.includes('vertexaisearch')) return null;
                 return await AssetDb.ingest(uri, chunk.web.title);
             } catch (innerError) {
                 return null;
             }
          });
          
          const results = await Promise.all(assetPromises);
          return results.filter(r => r !== null) as AssetRecord[];

      } catch (error) {
          console.error("Deep Research Error:", error);
          return []; 
      }
    });
};

export const generateSceneImage = async (prompt: string, aspectRatio: AspectRatio): Promise<{ imageUrl: string, groundingChunks: GroundingChunk[] }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  let arStr = aspectRatio === '9:16' ? "9:16" : aspectRatio === '1:1' ? "1:1" : "16:9";

  return withRetry(async () => {
    // For high quality, we provide a very specific prompt.
    // The googleSearch tool in image generation helps provide context to the model for more accurate generation.
    const response = await ai.models.generateContent({
        model: IMAGE_MODEL,
        contents: `Research and then generate a masterpiece 8k, cinematic, high-detail image of: ${prompt}. Ensure composition follows the rule of thirds and has professional lighting.`,
        config: {
            tools: [{ googleSearch: {} }],
            imageConfig: { aspectRatio: arStr, imageSize: "1K" }
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
    if (!imageUrl) throw new Error("Model failed to provide image data in parts.");
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
            prompt: prompt + ", cinematic high-definition motion",
            image: { imageBytes: base64Clean, mimeType: 'image/jpeg' },
            config: { numberOfVideos: 1, resolution: '720p', aspectRatio: arStr }
        });
    } else {
        operation = await ai.models.generateVideos({
            model: VIDEO_MODEL,
            prompt: prompt + ", cinematic masterpiece",
            config: { numberOfVideos: 1, resolution: '720p', aspectRatio: arStr }
        });
    }

    while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 8000));
        operation = await ai.operations.getVideosOperation({operation: operation});
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) throw new Error("Video operation succeeded but returned no URI.");
    const response = await fetch(`${videoUri}&key=${process.env.API_KEY}`);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }, 3, 15000); 
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
    if (!base64Audio) throw new Error("TTS generation failed: No audio data returned.");
    const binaryString = atob(base64Audio);
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

export const mixAssets = async (assetA: string, assetB: string, aspectRatio: AspectRatio): Promise<{ imageUrl: string, groundingChunks: GroundingChunk[] }> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    let arStr = aspectRatio === '9:16' ? "9:16" : aspectRatio === '1:1' ? "1:1" : "16:9";

    const prompt = `A conceptual masterpiece fusion of: "${assetA}" and "${assetB}". 8k cinematic art style.`;

    return withRetry(async () => {
        const response = await ai.models.generateContent({
            model: IMAGE_MODEL,
            contents: prompt,
            config: { imageConfig: { aspectRatio: arStr, imageSize: "1K" } },
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
        if (!imageUrl) throw new Error("Image mixing failed.");
        return { imageUrl, groundingChunks: [] };
    });
}
