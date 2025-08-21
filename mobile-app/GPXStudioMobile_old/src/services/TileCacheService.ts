import * as FileSystem from 'expo-file-system';
import { OSMProviderType, OSM_PROVIDERS } from '../components/MapProviderSelector';

interface TileCacheConfig {
    provider: OSMProviderType;
    region: {
        latitude: number;
        longitude: number;
        latitudeDelta: number;
        longitudeDelta: number;
    };
    minZoom: number;
    maxZoom: number;
}

interface CachedTileInfo {
    url: string;
    localPath: string;
    timestamp: number;
    size: number;
}

class TileCacheService {
    private cacheDir: string;
    private cacheIndex: Map<string, CachedTileInfo> = new Map();
    private readonly CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 giorni
    private readonly MAX_CACHE_SIZE = 100 * 1024 * 1024; // 100MB

    constructor() {
        this.cacheDir = `${FileSystem.cacheDirectory}tiles/`;
        this.initializeCache();
    }

    private async initializeCache() {
        try {
            // Crea la directory cache se non esiste
            const dirInfo = await FileSystem.getInfoAsync(this.cacheDir);
            if (!dirInfo.exists) {
                await FileSystem.makeDirectoryAsync(this.cacheDir, { intermediates: true });
            }

            // Carica l'indice della cache
            await this.loadCacheIndex();
            await this.cleanExpiredTiles();
        } catch (error) {
            console.error('Error initializing tile cache:', error);
        }
    }

    private async loadCacheIndex() {
        try {
            const indexPath = `${this.cacheDir}index.json`;
            const indexInfo = await FileSystem.getInfoAsync(indexPath);

            if (indexInfo.exists) {
                const indexContent = await FileSystem.readAsStringAsync(indexPath);
                const indexData = JSON.parse(indexContent);
                this.cacheIndex = new Map(Object.entries(indexData));
            }
        } catch (error) {
            console.error('Error loading cache index:', error);
        }
    }

    private async saveCacheIndex() {
        try {
            const indexPath = `${this.cacheDir}index.json`;
            const indexData = Object.fromEntries(this.cacheIndex);
            await FileSystem.writeAsStringAsync(indexPath, JSON.stringify(indexData));
        } catch (error) {
            console.error('Error saving cache index:', error);
        }
    }

    private async cleanExpiredTiles() {
        const now = Date.now();
        const expiredKeys: string[] = [];

        for (const [key, info] of this.cacheIndex) {
            if (now - info.timestamp > this.CACHE_EXPIRY) {
                expiredKeys.push(key);
                try {
                    await FileSystem.deleteAsync(info.localPath, { idempotent: true });
                } catch (error) {
                    console.error('Error deleting expired tile:', error);
                }
            }
        }

        expiredKeys.forEach((key) => this.cacheIndex.delete(key));

        if (expiredKeys.length > 0) {
            await this.saveCacheIndex();
        }
    }

    private getTileKey(provider: OSMProviderType, z: number, x: number, y: number): string {
        return `${provider}_${z}_${x}_${y}`;
    }

    private getTileUrl(provider: OSMProviderType, z: number, x: number, y: number): string {
        return OSM_PROVIDERS[provider].urlTemplate
            .replace('{z}', z.toString())
            .replace('{x}', x.toString())
            .replace('{y}', y.toString());
    }

    private async downloadTile(url: string, localPath: string): Promise<boolean> {
        try {
            const downloadResult = await FileSystem.downloadAsync(url, localPath);
            return downloadResult.status === 200;
        } catch (error) {
            console.error('Error downloading tile:', error);
            return false;
        }
    }

    async cacheTile(
        provider: OSMProviderType,
        z: number,
        x: number,
        y: number
    ): Promise<string | null> {
        const key = this.getTileKey(provider, z, x, y);

        // Controlla se il tile è già in cache
        if (this.cacheIndex.has(key)) {
            const info = this.cacheIndex.get(key)!;
            const fileInfo = await FileSystem.getInfoAsync(info.localPath);
            if (fileInfo.exists) {
                return info.localPath;
            } else {
                // Rimuovi dalla cache se il file non esiste
                this.cacheIndex.delete(key);
            }
        }

        // Scarica il tile
        const url = this.getTileUrl(provider, z, x, y);
        const localPath = `${this.cacheDir}${key}.png`;

        const success = await this.downloadTile(url, localPath);
        if (success) {
            const fileInfo = await FileSystem.getInfoAsync(localPath);
            const fileSize = fileInfo.exists && 'size' in fileInfo ? fileInfo.size : 0;

            this.cacheIndex.set(key, {
                url,
                localPath,
                timestamp: Date.now(),
                size: fileSize,
            });

            await this.saveCacheIndex();
            return localPath;
        }

        return null;
    }

    async preloadRegion(config: TileCacheConfig): Promise<{ success: number; failed: number }> {
        const { provider, region, minZoom, maxZoom } = config;
        let success = 0;
        let failed = 0;

        for (let z = minZoom; z <= maxZoom; z++) {
            const tilesX = Math.pow(2, z);
            const tilesY = Math.pow(2, z);

            // Calcola i tile bounds per la regione
            const leftTile = Math.floor(((region.longitude + 180) / 360) * tilesX);
            const rightTile = Math.floor(
                ((region.longitude + region.longitudeDelta + 180) / 360) * tilesX
            );
            const topTile = Math.floor(
                ((1 -
                    Math.log(
                        Math.tan((region.latitude * Math.PI) / 180) +
                            1 / Math.cos((region.latitude * Math.PI) / 180)
                    ) /
                        Math.PI) /
                    2) *
                    tilesY
            );
            const bottomTile = Math.floor(
                ((1 -
                    Math.log(
                        Math.tan(((region.latitude - region.latitudeDelta) * Math.PI) / 180) +
                            1 / Math.cos(((region.latitude - region.latitudeDelta) * Math.PI) / 180)
                    ) /
                        Math.PI) /
                    2) *
                    tilesY
            );

            for (let x = leftTile; x <= rightTile; x++) {
                for (let y = topTile; y <= bottomTile; y++) {
                    const result = await this.cacheTile(provider, z, x, y);
                    if (result) {
                        success++;
                    } else {
                        failed++;
                    }
                }
            }
        }

        return { success, failed };
    }

    async getCacheStats(): Promise<{ count: number; totalSize: number }> {
        let totalSize = 0;

        for (const info of this.cacheIndex.values()) {
            totalSize += info.size;
        }

        return {
            count: this.cacheIndex.size,
            totalSize,
        };
    }

    async clearCache(): Promise<void> {
        try {
            await FileSystem.deleteAsync(this.cacheDir, { idempotent: true });
            await FileSystem.makeDirectoryAsync(this.cacheDir, { intermediates: true });
            this.cacheIndex.clear();
            await this.saveCacheIndex();
        } catch (error) {
            console.error('Error clearing cache:', error);
        }
    }
}

export const tileCacheService = new TileCacheService();
export type { TileCacheConfig };
