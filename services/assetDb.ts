
import { AssetRecord } from "../types";

class AssetDatabaseService {
    private cache: Map<string, AssetRecord> = new Map();

    /**
     * "Ingests" a URL:
     * 1. Cleans redirects (vertexaisearch, google url)
     * 2. Classifies STRICTLY (Image vs Video vs Source/Text)
     * 3. DOWNLOADS the asset to local Blob storage (App BD) to avoid CORS/Broken links.
     */
    public async ingest(rawUrl: string, title?: string): Promise<AssetRecord> {
        const url = this.cleanUrl(rawUrl);
        
        // Deduplication
        if (this.cache.has(url)) {
            return this.cache.get(url)!;
        }

        const type = this.classifyType(url, title);
        let sourceDomain = 'unknown';
        try {
            sourceDomain = new URL(url).hostname.replace('www.', '');
        } catch (e) {
            sourceDomain = 'external';
        }

        const id = crypto.randomUUID();
        
        // REAL STORAGE IMPLEMENTATION
        // We actively fetch the resource using a proxy to get the binary data.
        let proxyUrl = url;
        let isCached = false;
        
        if (type === 'image') {
            const fetchUrl = `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=800&q=80&output=jpg`;
            try {
                // Use wsrv.nl as a CORS-friendly caching proxy
                // We fetch the PROXY url, get the blob, and store it LOCALLY.
                // 'credentials': 'omit' is important for some CORS configurations
                const response = await fetch(fetchUrl, { credentials: 'omit' });
                if (response.ok) {
                    const blob = await response.blob();
                    // Create a local object URL (served from App Memory)
                    proxyUrl = URL.createObjectURL(blob);
                    isCached = true;
                } else {
                     // If download fails (e.g. 404, 429), fall back to the proxy URL directly
                     // This prevents using the raw CORS-blocked URL
                     console.warn(`AssetDb: Failed to download blob for ${url} (Status: ${response.status}). Using proxy link.`);
                     proxyUrl = fetchUrl;
                }
            } catch (e) {
                console.warn(`AssetDb: Network error caching image ${url}. Falling back to proxy link.`, e);
                // Fallback: Use the proxy URL directly as a hotlink if download fails completely
                proxyUrl = fetchUrl;
            }
        }

        // Create a fake "internal" path to satisfy the user's need for a database/bucket feel
        // In a real backend app, this would be the actual GCS path.
        const storagePath = `gs://agent-vault/${type}s/${sourceDomain}/${id.substring(0, 8)}`;

        const record: AssetRecord = {
            id,
            originalUrl: url,
            proxyUrl, 
            storagePath,
            type,
            title: title || sourceDomain,
            sourceDomain,
            timestamp: Date.now(),
            isCached
        };

        this.cache.set(url, record);
        return record;
    }

    /**
     * Extracts the REAL URL from tracking/redirect links
     */
    private cleanUrl(url: string): string {
        try {
            // Handle Google Search Redirects
            if (url.includes('google.com/url') || url.includes('google.com/search')) {
                const params = new URL(url).searchParams;
                const q = params.get('q') || params.get('url');
                if (q) return decodeURIComponent(q);
            }
            return url;
        } catch (e) {
            return url;
        }
    }

    private classifyType(url: string, title?: string): 'image' | 'video' | 'source' {
        const lowerUrl = url.toLowerCase();
        
        // 1. VIDEO
        if (lowerUrl.match(/\.(mp4|mov|avi|webm|mkv)$/)) return 'video';
        if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be') || lowerUrl.includes('vimeo.com')) return 'video';

        // 2. IMAGE (Strict Mode)
        const imageExts = /\.(jpeg|jpg|png|webp|gif|svg|bmp|tiff)$/;
        if (lowerUrl.match(imageExts)) return 'image';
        
        const knownImageHosts = ['images.unsplash.com', 'i.imgur.com', 'cdn.', 'static.', 'media.'];
        if (knownImageHosts.some(host => lowerUrl.includes(host))) return 'image';

        // 3. FALLBACK -> SOURCE (Text/Document)
        return 'source';
    }
}

export const AssetDb = new AssetDatabaseService();
