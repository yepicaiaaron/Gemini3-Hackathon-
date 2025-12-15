
import { AssetRecord } from "../types";

// This service simulates a "Special Database" that ingests, cleans, and stores references.
// Crucially, it creates a "Proxy Copy" of images to ensure they render in the browser (solving the CORS/broken link issue).

class AssetDatabaseService {
    private cache: Map<string, AssetRecord> = new Map();

    /**
     * Ingests a raw URL found by the research agent.
     * "Saves a copy" by generating a high-performance proxy URL.
     */
    public ingest(url: string, title?: string): AssetRecord {
        // Check cache first (Deduplication)
        if (this.cache.has(url)) {
            return this.cache.get(url)!;
        }

        const type = this.classifyType(url, title);
        const sourceDomain = new URL(url).hostname.replace('www.', '');
        const id = crypto.randomUUID();
        
        // THE "SAVE A COPY" MAGIC:
        // We use wsrv.nl (a robust open-source image proxy) to "save" a viewable version of the asset.
        // This strips CORS headers and optimizes the image, effectively storing a viewable copy for our app.
        // If it's a video or text, we don't proxy it the same way, but we catalog it.
        let proxyUrl = url;
        if (type === 'image') {
            // Force HTTPS, default to high quality output
            proxyUrl = `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=800&q=80&output=jpg`;
        }

        const record: AssetRecord = {
            id,
            originalUrl: url,
            proxyUrl,
            type,
            title: title || sourceDomain,
            sourceDomain,
            timestamp: Date.now()
        };

        this.cache.set(url, record);
        return record;
    }

    private classifyType(url: string, title?: string): 'image' | 'video' | 'text' {
        const lowerUrl = url.toLowerCase();
        const lowerTitle = (title || '').toLowerCase();

        if (lowerUrl.match(/\.(jpeg|jpg|png|webp|gif|svg|bmp|tiff)$/)) return 'image';
        if (lowerUrl.includes('images.unsplash.com')) return 'image';
        if (lowerUrl.includes('i.imgur.com')) return 'image';
        
        if (lowerUrl.match(/\.(mp4|mov|avi|webm|mkv)$/)) return 'video';
        if (lowerUrl.includes('youtube.com') || lowerUrl.includes('vimeo.com')) return 'video';
        
        // Heuristics based on Title if URL is ambiguous
        if (lowerTitle.includes('image') || lowerTitle.includes('photo') || lowerTitle.includes('picture') || lowerTitle.includes('diagram')) return 'image';
        if (lowerTitle.includes('video') || lowerTitle.includes('clip') || lowerTitle.includes('footage')) return 'video';

        return 'text';
    }

    public getAssetsForScene(ids: string[]): AssetRecord[] {
        // Implementation for retrieving by ID if we were using a real DB
        return [];
    }
}

export const AssetDb = new AssetDatabaseService();
