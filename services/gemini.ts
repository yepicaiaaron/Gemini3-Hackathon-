
import { GoogleGenAI, Type } from "@google/genai";
import { NarrativeBeat, Scene, GroundingChunk, VisualEffect, VideoStrategy, HookStyle, AspectRatio, FetchedAsset } from "../types";

const TEXT_MODEL = "gemini-2.5-flash";
const IMAGE_MODEL = "gemini-3-pro-image-preview"; 
const TTS_MODEL = "gemini-2.5-flash-preview-tts";
const VIDEO_MODEL = "veo-3.1-fast-generate-preview";

// Helper for 429/503 handling with exponential backoff
const withRetry = async <T>(fn: () => Promise<T>, retries = 3, baseDelay = 3000): Promise<T> => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e: any) {
      const isRateLimit = e.status === 429 || e.code === 429 || (e.message && e.message.includes('429')) || (e.message && e.message.includes('quota'));
      const isServerOverload = e.status === 503 || e.code === 503;
      
      // If we used all retries or it's not a temporary error, throw
      if (i === retries - 1 || (!isRateLimit && !isServerOverload)) throw e;
      
      const delay = baseDelay * Math.pow(2, i); // 3000, 6000, 12000...
      console.warn(`API Error (${e.status || e.code}). Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error("Max retries exceeded");
};

// Robust Helper to extract JSON from any text response
const cleanAndParseJSON = (text: string) => {
  // 1. Extract content from markdown code blocks if present
  let content = text;
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch && codeBlockMatch[1]) {
    content = codeBlockMatch[1];
  }

  // 2. Locate the first valid opening character ({ or [)
  const firstOpen = content.search(/[\{\[]/);
  
  // 3. Locate the last valid closing character (} or ])
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
    // 4. Try fixing common LLM JSON errors (trailing commas)
    try {
      // Regex to remove trailing commas before closing brackets/braces
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
    Analyze the user's input: "${input}".
    
    If it is a URL, infer the content of the page (you have search access).
    If it is a topic, analyze the likely intent.

    Your task is to seek clarity on what the user wants to achieve.
    Propose a strategy for a high-quality video adaptation.
    
    RETURN ONLY RAW JSON. Do not include markdown formatting.
    Structure:
    {
      "summary": "1-sentence explanation of what the input is about",
      "targetAudience": "Who is this video for?",
      "toneStyle": "The best vibe (e.g., High-Energy, Professional)",
      "keyObjective": "What should the viewer get out of this?"
    }
  `;

  return withRetry(async () => {
    try {
        const response = await ai.models.generateContent({
        model: TEXT_MODEL,
        contents: prompt,
        config: {
            tools: [{ googleSearch: {} }], 
        }
        });

        if (response.text) {
        return cleanAndParseJSON(response.text) as VideoStrategy;
        }
        
        // Fallback if search fails to produce text
        console.warn("Analysis search yielded no text, retrying without search...");
        const fallbackResponse = await ai.models.generateContent({
            model: TEXT_MODEL,
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        if (fallbackResponse.text) {
            return cleanAndParseJSON(fallbackResponse.text) as VideoStrategy;
        }

        throw new Error("Failed to generate strategy");
    } catch (error) {
        console.error("Analysis Error:", error);
        throw error;
    }
  });
};

export const generateNarrative = async (topic: string, hookStyle: HookStyle, strategy?: VideoStrategy): Promise<NarrativeBeat[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const strategyContext = strategy ? `
    STRATEGY CONTEXT:
    - Context Summary: ${strategy.summary}
    - Target Audience: ${strategy.targetAudience}
    - Tone/Style: ${strategy.toneStyle}
    - Key Objective: ${strategy.keyObjective}
  ` : '';

  const hookContext = `
    HOOK STYLE: ${hookStyle}
    - If FAST_CUT: Start with rapid visual changes and punchy 1-2 word lines.
    - If ARTICLE_HIGHLIGHT: Start by displaying a headline and zooming in.
    - If TEXT_MATCH: Match voiceover words exactly with on-screen text.
    - If AI_SELECTED: Choose the most engaging opening based on the topic.
  `;

  const prompt = `
    You are a narrative expert for short-form video content.
    Topic: "${topic}"
    ${strategyContext}
    ${hookContext}
    
    Decompose this topic into a compelling 10-15 step narrative arc.
    CRITICAL: YOU MUST GENERATE AT LEAST 10 BEATS.
    Each step should be a "beat" with a specific goal and a short description of the content.
    The pacing should be snappy but comprehensive.
    Focus on clarity, insight, and engagement.
  `;

  return withRetry(async () => {
    try {
        const response = await ai.models.generateContent({
        model: TEXT_MODEL,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                beat: { type: Type.STRING, description: "Name of the beat (e.g., The Hook, The Problem)" },
                goal: { type: Type.STRING, description: "The narrative goal" },
                description: { type: Type.STRING, description: "Short summary of what is said/shown" }
                },
                required: ["beat", "goal", "description"]
            }
            }
        }
        });

        if (response.text) {
        return cleanAndParseJSON(response.text) as NarrativeBeat[];
        }
        throw new Error("No response text from narrative generation");
    } catch (error) {
        console.error("Narrative Gen Error:", error);
        throw error;
    }
  });
};

export const planScenes = async (beats: NarrativeBeat[], aspectRatio: AspectRatio, userLinks: string[], strategy?: VideoStrategy, hookStyle?: HookStyle): Promise<Scene[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const strategyContext = strategy ? `
    Keep the visual style aligned with:
    - Audience: ${strategy.targetAudience}
    - Tone: ${strategy.toneStyle}
  ` : '';

  const userLinksContext = userLinks.length > 0 ? `
    USER PROVIDED ASSETS (Use these links!):
    ${JSON.stringify(userLinks)}
  ` : '';

  const prompt = `
    You are a Lead Creative Director.
    Convert the narrative beats into video scenes.
    
    BEATS: ${JSON.stringify(beats)}
    
    ${strategyContext}
    ${userLinksContext}
    
    Provide a detailed visual plan for each scene. 
    NOTE: DO NOT Perform the deep research yet. Just plan WHAT to research.
    
    OUTPUT FORMAT: JSON Array of Scenes.
    {
      "id": "string",
      "duration": number,
      "type": "string (article_card|split_screen|full_chart|diagram|title)",
      "primaryVisual": "string (Description of main visual)",
      "visualResearchPlan": "string (What specific images/videos/text do we need to find?)",
      "script": "string",
      "visualEffect": "string",
      "effectReasoning": "string",
      "reasoning": "string",
      "imagePrompt": "string (Prompt for AI generation if research fails)",
      "useVeo": boolean
    }
  `;

  return withRetry(async () => {
    try {
        const response = await ai.models.generateContent({
            model: TEXT_MODEL,
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });

        if (response.text) {
           const scenes = cleanAndParseJSON(response.text) as Scene[];
           return scenes.map((s, i) => ({ 
                ...s, 
                id: s.id || `scene_${i}`, 
                statusAudio: 'idle',
                statusImage: 'idle',
                statusVideo: 'idle',
                visualEffect: s.visualEffect || 'NONE',
                fetchedAssets: [] // Initialize empty
            }));
        }
        throw new Error("No response text from scene planning");
    } catch (error) {
        console.error("Scene Planning Error:", error);
        throw error;
    }
  });
};

export const researchScene = async (scene: Scene): Promise<FetchedAsset[]> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // We explicitly ask for links in the prompt, but rely on grounding chunks for the structured data
    const prompt = `
      Perform Deep Visual Research for this scene:
      
      SCENE CONTEXT:
      - Script: "${scene.script}"
      - Visual Plan: "${scene.primaryVisual}"
      - Research Needs: "${scene.visualResearchPlan}"
      
      TASK:
      1. Search for 3 distinct, high-quality IMAGE sources (photos, diagrams, charts) that match the visual plan.
      2. Search for 2 relevant VIDEO sources (clips, youtube, news footage) related to the topic.
      3. Search for 2 authoritative TEXT articles to back up the script.
      
      Return a summary of what you found.
    `;
  
    return withRetry(async () => {
      try {
          const response = await ai.models.generateContent({
            model: TEXT_MODEL,
            contents: prompt,
            config: { tools: [{ googleSearch: {} }] }
          });
  
          // Extract Grounding Chunks and convert to FetchedAssets
          const chunks = (response.candidates?.[0]?.groundingMetadata?.groundingChunks || []) as GroundingChunk[];
          
          const assets: FetchedAsset[] = [];
          
          chunks.forEach(chunk => {
             if (!chunk.web?.uri) return;
             
             const url = chunk.web.uri;
             const title = chunk.web.title || "External Source";
             const lowerUrl = url.toLowerCase();
             
             // Naive classification based on URL/Title or default to text
             // In a real app with Puppeteer we would check headers, but here we infer.
             let type: 'image' | 'video' | 'text' = 'text';
             
             if (lowerUrl.match(/\.(jpeg|jpg|png|webp|gif|svg)$/)) {
                 type = 'image';
             } else if (lowerUrl.match(/\.(mp4|mov|avi|webm)$/) || lowerUrl.includes('youtube.com') || lowerUrl.includes('vimeo.com')) {
                 type = 'video';
             } else if (title.toLowerCase().includes('image') || title.toLowerCase().includes('photo') || title.toLowerCase().includes('picture')) {
                 type = 'image'; // Heuristic
             } else if (title.toLowerCase().includes('video') || title.toLowerCase().includes('clip') || title.toLowerCase().includes('watch')) {
                 type = 'video'; // Heuristic
             }
             
             // Deduplicate
             if (!assets.find(a => a.url === url)) {
                 assets.push({ type, url, title, source: new URL(url).hostname });
             }
          });
  
          return assets;
      } catch (error) {
          console.error("Deep Research Error:", error);
          return []; // Fail gracefully for research
      }
    });
};

export const mixAssets = async (assetA: string, assetB: string, aspectRatio: AspectRatio): Promise<{ imageUrl: string, groundingChunks: GroundingChunk[] }> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    let arStr = "16:9";
    if (aspectRatio === '9:16') arStr = "9:16";
    if (aspectRatio === '1:1') arStr = "1:1";

    const prompt = `
      Create a new image that conceptually combines:
      1. ${assetA}
      2. ${assetB}
      
      The result should be a seamless, artistic fusion.
    `;

    return withRetry(async () => {
        try {
            const response = await ai.models.generateContent({
                model: IMAGE_MODEL,
                contents: prompt,
                config: {
                    imageConfig: { aspectRatio: arStr, imageSize: "2K" }
                },
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
        } catch (error) {
            console.error("Asset Mix Error:", error);
            throw error;
        }
    });
}

export const generateSceneImage = async (prompt: string, aspectRatio: AspectRatio): Promise<{ imageUrl: string, groundingChunks: GroundingChunk[] }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  let arStr = "16:9";
  if (aspectRatio === '9:16') arStr = "9:16";
  if (aspectRatio === '1:1') arStr = "1:1";

  return withRetry(async () => {
    try {
        const enhancedPrompt = `
        You are an investigative visual artist.
        RESEARCH THEN GENERATE: "${prompt}".
        Find real references of specific people/places if mentioned.
        Then generate a photorealistic 8k image.
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
        if (!imageUrl) throw new Error("No image data in response");

        return { imageUrl, groundingChunks };

    } catch (error) {
        console.error("Image Gen Error:", error);
        throw error;
    }
  });
};

export const generateVideo = async (prompt: string, aspectRatio: AspectRatio, inputImageBase64?: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  let arStr = "16:9";
  if (aspectRatio === '9:16') arStr = "9:16";

  return withRetry(async () => {
    try {
        console.log("Starting video generation for:", prompt);
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
                prompt: prompt + ", cinematic lighting, 24fps",
                config: { numberOfVideos: 1, resolution: '720p', aspectRatio: arStr }
            });
        }

        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 5000));
            operation = await ai.operations.getVideosOperation({operation: operation});
        }

        const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (!videoUri) throw new Error("No video URI returned");

        const response = await fetch(`${videoUri}&key=${process.env.API_KEY}`);
        const blob = await response.blob();
        return URL.createObjectURL(blob);

    } catch (error) {
        console.error("Video Gen Error:", error);
        throw error;
    }
  }, 4, 10000); 
}

export const generateSpeech = async (text: string, voiceName: string = 'Puck'): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  return withRetry(async () => {
    try {
        const response = await ai.models.generateContent({
        model: TTS_MODEL,
        contents: { parts: [{ text: text }] },
        config: {
            responseModalities: ["AUDIO"],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName } } },
        },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) throw new Error("No audio data in response");

        const binaryString = atob(base64Audio);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) { bytes[i] = binaryString.charCodeAt(i); }

        const wavBlob = pcmToWav(bytes);
        return URL.createObjectURL(wavBlob);

    } catch (error) {
        console.error("TTS Gen Error:", error);
        throw error;
    }
  });
};

function pcmToWav(pcmData: Uint8Array, sampleRate: number = 24000): Blob {
  const numChannels = 1;
  const byteRate = sampleRate * numChannels * 2; 
  const blockAlign = numChannels * 2;
  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) { view.setUint8(offset + i, string.charCodeAt(i)); }
  };
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + pcmData.length, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); 
  view.setUint16(20, 1, true); 
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, pcmData.length, true);
  return new Blob([wavHeader, pcmData], { type: 'audio/wav' });
}
