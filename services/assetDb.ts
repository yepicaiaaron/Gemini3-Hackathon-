
import { AssetRecord } from "../types";

class AssetDatabaseService {
    private cache: Map<string, AssetRecord> = new Map();

    /**
     * "Ingests" a URL or Content Block:
     */
    public async ingest(rawUrl: string, title?: string, typeOverride?: 'intel', textContent?: string): Promise<AssetRecord> {
        const url = this.cleanUrl(rawUrl);
        
        // Deduplication for URLs
        if (this.cache.has(url) && !typeOverride) {
            return this.cache.get(url)!;
        }

        const type = typeOverride || this.classifyType(url, title);
        let sourceDomain = 'agent.internal';
        try {
            if (url.startsWith('http')) {
                sourceDomain = new URL(url).hostname.replace('www.', '');
            }
        } catch (e) {
            sourceDomain = 'external';
        }

        const id = crypto.randomUUID();
        let proxyUrl = url;
        let isCached = false;
        
        if (type === 'image' && url.startsWith('http')) {
            // Use multiple proxy fallbacks
            const wsrvUrl = `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=800&q=80&output=jpg`;
            try {
                const response = await fetch(wsrvUrl, { credentials: 'omit' });
                if (response.ok) {
                    const blob = await response.blob();
                    proxyUrl = URL.createObjectURL(blob);
                    isCached = true;
                } else {
                     proxyUrl = wsrvUrl;
                }
            } catch (e) {
                proxyUrl = wsrvUrl;
            }
        }

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
            isCached,
            textContent: textContent
        };

        if (!typeOverride) this.cache.set(url, record);
        return record;
    }

    private cleanUrl(url: string): string {
        try {
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
        if (lowerUrl.match(/\.(mp4|mov|avi|webm|mkv)$/) || lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) return 'video';
        const imageExts = /\.(jpeg|jpg|png|webp|gif|svg|bmp|tiff)$/;
        if (lowerUrl.match(imageExts) || ['images.unsplash.com', 'i.imgur.com', 'cdn.'].some(host => lowerUrl.includes(host))) return 'image';
        return 'source';
    }
}

export const AssetDb = new AssetDatabaseService();
