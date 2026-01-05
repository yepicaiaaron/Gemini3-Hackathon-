
import { Scene, AspectRatio, TransitionType } from '../types';

interface RenderContext {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    audioCtx: AudioContext;
    destNode: MediaStreamAudioDestinationNode;
    width: number;
    height: number;
}

interface LoadedScene {
    scene: Scene;
    audioBuffer?: AudioBuffer;
    assetA: HTMLImageElement | HTMLVideoElement;
    assetB: HTMLImageElement | HTMLVideoElement;
    duration: number;
}

export class VideoRenderer {
    private scenes: Scene[];
    private aspectRatio: AspectRatio;
    private onProgress: (progress: number, status: string) => void;
    private stopRequested = false;

    constructor(scenes: Scene[], aspectRatio: AspectRatio, onProgress: (p: number, s: string) => void) {
        this.scenes = scenes;
        this.aspectRatio = aspectRatio;
        this.onProgress = onProgress;
    }

    private async loadAudio(url: string, ctx: AudioContext): Promise<AudioBuffer> {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        return await ctx.decodeAudioData(arrayBuffer);
    }

    private loadImage(url: string): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
            img.src = url;
        });
    }

    private loadVideo(url: string): Promise<HTMLVideoElement> {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.crossOrigin = "anonymous";
            video.src = url;
            video.muted = true;
            video.preload = "auto";
            video.onloadeddata = () => resolve(video);
            video.onerror = () => {
                // Fallback to image loading if video fails (usually CORS issue with direct blobs not working in canvas draw sometimes)
                // But for blobs created locally it should work.
                reject(new Error(`Failed to load video: ${url}`));
            };
        });
    }

    private async prepareAssets(audioCtx: AudioContext): Promise<LoadedScene[]> {
        this.onProgress(0, 'Loading assets...');
        const loaded: LoadedScene[] = [];
        let completed = 0;
        const total = this.scenes.length * 3; // Audio + 2 visuals

        for (const scene of this.scenes) {
            // Audio
            let audioBuffer;
            if (scene.audioUrl) {
                try {
                    audioBuffer = await this.loadAudio(scene.audioUrl, audioCtx);
                } catch (e) {
                    console.warn(`Failed audio for ${scene.id}`, e);
                }
            }
            completed++;
            this.onProgress(completed / total, 'Loading audio...');

            // Visual A
            let assetA: HTMLImageElement | HTMLVideoElement;
            const urlA = scene.videoUrl1 || scene.imageUrl1 || scene.previewUrl || '';
            try {
                if (urlA.match(/\.(mp4|webm)|blob:/) && scene.videoUrl1) {
                    assetA = await this.loadVideo(urlA);
                } else {
                    assetA = await this.loadImage(urlA);
                }
            } catch (e) {
                assetA = new Image(); // Empty placeholder
            }
            completed++;

            // Visual B
            let assetB: HTMLImageElement | HTMLVideoElement;
            const urlB = scene.videoUrl2 || scene.imageUrl2 || urlA; // Fallback to A
            try {
                if (urlB.match(/\.(mp4|webm)|blob:/) && scene.videoUrl2) {
                    assetB = await this.loadVideo(urlB);
                } else {
                    assetB = await this.loadImage(urlB);
                }
            } catch (e) {
                assetB = new Image();
            }
            completed++;
            this.onProgress(completed / total, 'Loading visuals...');

            loaded.push({
                scene,
                audioBuffer,
                assetA,
                assetB,
                duration: audioBuffer ? audioBuffer.duration : (scene.duration || 5)
            });
        }
        return loaded;
    }

    public async render(): Promise<Blob> {
        const width = this.aspectRatio === '16:9' ? 1920 : this.aspectRatio === '9:16' ? 1080 : 1080;
        const height = this.aspectRatio === '16:9' ? 1080 : this.aspectRatio === '9:16' ? 1920 : 1080;
        const fps = 30;
        
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const destNode = audioCtx.createMediaStreamDestination();
        
        const loadedScenes = await this.prepareAssets(audioCtx);
        
        // Setup MediaRecorder
        const canvasStream = canvas.captureStream(fps);
        const combinedStream = new MediaStream([
            ...canvasStream.getVideoTracks(),
            ...destNode.stream.getAudioTracks()
        ]);
        
        const recorder = new MediaRecorder(combinedStream, {
            mimeType: 'video/webm;codecs=vp9,opus',
            videoBitsPerSecond: 5000000 // 5Mbps
        });
        
        const chunks: Blob[] = [];
        recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
        
        return new Promise(async (resolve, reject) => {
            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'video/webm' });
                audioCtx.close();
                resolve(blob);
            };

            recorder.start();
            
            let startTime = audioCtx.currentTime;
            
            // Playback Loop
            for (let i = 0; i < loadedScenes.length; i++) {
                if (this.stopRequested) break;
                
                const item = loadedScenes[i];
                
                // Play Audio
                if (item.audioBuffer) {
                    const source = audioCtx.createBufferSource();
                    source.buffer = item.audioBuffer;
                    source.connect(destNode);
                    source.start(startTime);
                }

                // Render Visuals loop for the duration of this scene
                const frameDuration = 1 / fps;
                const sceneDuration = item.duration;
                let sceneTime = 0;
                
                // Check if assets are video and play them
                if (item.assetA instanceof HTMLVideoElement) { item.assetA.currentTime = 0; item.assetA.play(); }
                if (item.assetB instanceof HTMLVideoElement) { item.assetB.currentTime = 0; item.assetB.play(); }

                while (sceneTime < sceneDuration) {
                    this.onProgress(
                        (i / loadedScenes.length) + ((sceneTime / sceneDuration) / loadedScenes.length), 
                        `Rendering Scene ${i + 1}/${loadedScenes.length}`
                    );

                    // Logic for A/B split (simple 50/50 for now)
                    const isB = sceneTime > (sceneDuration / 2);
                    const currentAsset = isB ? item.assetB : item.assetA;
                    
                    // Draw Background
                    ctx.fillStyle = '#000';
                    ctx.fillRect(0, 0, width, height);

                    // Draw Asset
                    this.drawAsset(ctx, currentAsset, width, height);
                    
                    // Handle Transitions (Entry)
                    if (sceneTime < 1.0) { // First 1 second transition in
                        this.applyTransition(ctx, item.scene.transitionIn, sceneTime / 1.0, width, height);
                    }
                    
                    // Handle Internal Cut (A -> B)
                    // Currently hard cut, could add logic here

                    // Wait for next frame time
                    const elapsedReal = audioCtx.currentTime - startTime;
                    // Sync loop
                    // In a real export, we would use OfflineAudioContext for faster-than-realtime, 
                    // but MediaRecorder requires realtime.
                    await new Promise(r => setTimeout(r, 1000/fps));
                    sceneTime += frameDuration;
                }
                
                if (item.assetA instanceof HTMLVideoElement) item.assetA.pause();
                if (item.assetB instanceof HTMLVideoElement) item.assetB.pause();
                
                startTime += sceneDuration;
            }
            
            recorder.stop();
            this.onProgress(1, 'Finalizing...');
        });
    }

    private drawAsset(ctx: CanvasRenderingContext2D, asset: HTMLImageElement | HTMLVideoElement, w: number, h: number) {
        // Cover fit
        const imgRatio = (asset instanceof HTMLVideoElement ? asset.videoWidth : asset.width) / (asset instanceof HTMLVideoElement ? asset.videoHeight : asset.height);
        const canvasRatio = w / h;
        let dw = w;
        let dh = h;
        let dx = 0;
        let dy = 0;

        if (imgRatio > canvasRatio) {
            dw = h * imgRatio;
            dx = (w - dw) / 2;
        } else {
            dh = w / imgRatio;
            dy = (h - dh) / 2;
        }
        
        try {
            ctx.drawImage(asset, dx, dy, dw, dh);
        } catch (e) {
            // ignore draw errors
        }
    }

    private applyTransition(ctx: CanvasRenderingContext2D, type: TransitionType, progress: number, w: number, h: number) {
        // progress 0 -> 1
        if (type === 'FADE') {
             ctx.fillStyle = `rgba(0,0,0,${1 - progress})`;
             ctx.fillRect(0, 0, w, h);
        } else if (type === 'SLIDE_LEFT') {
             // We can't easily undo the draw, but we can overlay black effectively or just assume fade for simplicity in this MVP
             // Real implementation requires double buffering which is heavy for this snippet
             ctx.fillStyle = `rgba(0,0,0,${1 - progress})`;
             ctx.fillRect(0, 0, w, h);
        }
        // ... simple fade fallback for stability
    }
}
