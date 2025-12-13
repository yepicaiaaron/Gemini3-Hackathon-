import { GoogleGenAI, Type } from "@google/genai";
import { NarrativeBeat, Scene, GroundingChunk, VisualEffect, VideoStrategy, HookStyle, AspectRatio } from "../types";

const TEXT_MODEL = "gemini-2.5-flash";
const IMAGE_MODEL = "gemini-3-pro-image-preview"; 
const TTS_MODEL = "gemini-2.5-flash-preview-tts";
const VIDEO_MODEL = "veo-3.1-fast-generate-preview";

// Helper to extract JSON from markdown code blocks if present
const cleanAndParseJSON = (text: string) => {
  try {
    // 1. Try direct parse
    return JSON.parse(text);
  } catch (e) {
    // 2. Try extracting from ```json ... ``` or ``` ... ```
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
      try {
        return JSON.parse(match[1]);
      } catch (e2) {
        throw new Error("Failed to parse extracted JSON block");
      }
    }
    throw new Error("Failed to parse JSON response");
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
    throw new Error("Failed to generate strategy");
  } catch (error) {
    console.error("Analysis Error:", error);
    throw error;
  }
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
      return JSON.parse(response.text) as NarrativeBeat[];
    }
    throw new Error("No response text from narrative generation");
  } catch (error) {
    console.error("Narrative Gen Error:", error);
    throw error;
  }
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

  const editingConstraints = hookStyle === 'FAST_CUT' 
    ? "EDITING RULE: 'FAST_CUT' mode is active. Scenes MUST be short (1.5s - 3s max). Break down concepts into rapid-fire visuals. Avoid long static shots."
    : "EDITING RULE: Standard pacing. Allow 3-6 seconds per scene for readability.";

  const prompt = `
    You are a Deep Research Agent and Lead Creative Director.
    Convert the following narrative beats into high-fidelity video scenes.
    
    ${editingConstraints}

    CRITICAL OBJECTIVES:
    1. **Deep Research & Asset Mining**: 
       - You MUST find real-world assets (Images/Videos) for every scene IMMEDIATELY.
       - **PRIORITY**: Try to find DIRECT URLs to images (ending in .jpg, .png) or videos so we can preview them in the app.
       - Use 'googleSearch' to find specific, high-value visual references.
       - Scoring: Each Image = 1pt, Video = 3pts. GOAL: >20 points total for the storyboard.
       - "visualResearchPlan" must list exactly what you found.
    
    2. **Veo 3 Video Generation**:
       - We need to bring this to life.
       - **50-80% of scenes MUST utilize 'useVeo: true'**.
       - Prioritize Veo for: Action shots, emotional character moments, complex abstract visualizations, and b-roll.
       - Static images are only for specific diagrams or text overlays.

    3. **Transparency & Reasoning**:
       - The "reasoning" field MUST be written in PERFECT, PROFESSIONAL ENGLISH. No gibberish.
       - Explain WHY you chose this visual approach, what research you found, and why it fits the narrative.

    ASPECT RATIO: ${aspectRatio}
    ${strategyContext}
    ${userLinksContext}
    
    Beats: ${JSON.stringify(beats)}
    
    OUTPUT FORMAT:
    Return a RAW JSON ARRAY of objects.
    
    JSON Schema per object:
    {
      "id": "string",
      "duration": number,
      "type": "string (article_card|split_screen|full_chart|diagram|title)",
      "primaryVisual": "string",
      "visualResearchPlan": "string",
      "referenceLinks": ["string (url)"],
      "script": "string",
      "motionIntent": ["string", "string"],
      "visualEffect": "string (NONE|VHS|GLITCH|ZOOM_BLUR|PIXELATE|RGB_SHIFT|CRT|FILM_GRAIN|SHAKE|VIGNETTE|MEME_FUSION)",
      "effectReasoning": "string",
      "reasoning": "string (Professional explanation of creative choices)",
      "imagePrompt": "string",
      "useVeo": boolean
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        // responseMimeType removed to allow tool use
      }
    });

    if (response.text) {
      const scenes = cleanAndParseJSON(response.text) as Scene[];
      
      const groundingChunks = (response.candidates?.[0]?.groundingMetadata?.groundingChunks || []) as GroundingChunk[];
      
      return scenes.map((s, i) => ({ 
        ...s, 
        id: s.id || `scene_${i}`, 
        isLoading: false, // Ensure we don't show loading state initially
        visualEffect: s.visualEffect || 'NONE',
        // Distribute grounding chunks if references are empty to ensure we have data
        referenceLinks: (s.referenceLinks && s.referenceLinks.length > 0) 
            ? s.referenceLinks 
            : groundingChunks.slice(i, i+3).map(g => g.web?.uri || '').filter(Boolean)
      }));
    }
    throw new Error("No response text from scene planning");
  } catch (error) {
    console.error("Scene Planning Error:", error);
    throw error;
  }
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
      
      The result should be a seamless, artistic fusion of these two concepts.
      High fidelity, cinematic lighting.
    `;

    try {
        const response = await ai.models.generateContent({
            model: IMAGE_MODEL,
            contents: prompt,
            config: {
                imageConfig: {
                    aspectRatio: arStr,
                    imageSize: "2K"
                }
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
}

export const generateSceneImage = async (prompt: string, aspectRatio: AspectRatio): Promise<{ imageUrl: string, groundingChunks: GroundingChunk[] }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  let arStr = "16:9";
  if (aspectRatio === '9:16') arStr = "9:16";
  if (aspectRatio === '1:1') arStr = "1:1";

  try {
    const enhancedPrompt = `
      Find visual references for: "${prompt}".
      TASK: Generate a high-quality, photorealistic image of the subject.
      CONSTRAINTS: 
      - If a person is mentioned, you MUST use the search results for accuracy.
      - If type is split screen, ensure distinct visual separation.
      - No text overlays.
    `;

    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: enhancedPrompt,
      config: {
        tools: [{ googleSearch: {} }],
        imageConfig: {
          aspectRatio: arStr,
          imageSize: "2K"
        }
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
    
    if (!imageUrl) {
       throw new Error("No image data in response");
    }

    return { imageUrl, groundingChunks };

  } catch (error) {
    console.error("Image Gen Error:", error);
    return { 
      imageUrl: `https://picsum.photos/seed/${Math.random()}/1280/720`, 
      groundingChunks: [] 
    }; 
  }
};

export const generateVideo = async (prompt: string, aspectRatio: AspectRatio): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  let arStr = "16:9";
  if (aspectRatio === '9:16') arStr = "9:16";

  try {
    console.log("Starting video generation for:", prompt);
    let operation = await ai.models.generateVideos({
      model: VIDEO_MODEL,
      prompt: prompt + ", highly detailed, 4k, cinematic lighting, photorealistic, 24fps",
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: arStr
      }
    });

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
}

export const generateSpeech = async (text: string, voiceName: string = 'Puck'): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: TTS_MODEL,
      contents: {
        parts: [{ text: text }],
      },
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voiceName,
            },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      throw new Error("No audio data in response");
    }

    const binaryString = atob(base64Audio);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const wavBlob = pcmToWav(bytes);
    return URL.createObjectURL(wavBlob);

  } catch (error) {
    console.error("TTS Gen Error:", error);
    throw error;
  }
};

function pcmToWav(pcmData: Uint8Array, sampleRate: number = 24000): Blob {
  const numChannels = 1;
  const byteRate = sampleRate * numChannels * 2; 
  const blockAlign = numChannels * 2;
  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
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
