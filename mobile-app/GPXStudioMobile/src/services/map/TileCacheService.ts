import * as FileSystem from 'expo-file-system';
import {
  MapBounds,
  MapTileCache,
  CachedArea,
  TileCacheConfig,
} from '../../types/map';

export class TileCacheService {
  private cacheDir: string;
  private config: TileCacheConfig;
  private cacheIndex: Map<string, MapTileCache> = new Map();

  constructor(config?: Partial<TileCacheConfig>) {
    this.cacheDir = `${FileSystem.documentDirectory}mapTiles/`;
    this.config = {
      maxSizeBytes: 500 * 1024 * 1024, // 500MB default
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      compressionLevel: 6,
      cleanupThreshold: 0.8, // 80%
      ...config,
    };
    this.initializeCache();
  }

  private async initializeCache(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.cacheDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.cacheDir, {
          intermediates: true,
        });
      }
      await this.loadCacheIndex();
    } catch (error) {
      console.error('Failed to initialize tile cache:', error);
    }
  }

  private async loadCacheIndex(): Promise<void> {
    try {
      const indexPath = `${this.cacheDir}index.json`;
      const indexInfo = await FileSystem.getInfoAsync(indexPath);

      if (indexInfo.exists) {
        const indexContent = await FileSystem.readAsStringAsync(indexPath);
        const indexData = JSON.parse(indexContent);

        for (const [key, value] of Object.entries(indexData)) {
          this.cacheIndex.set(key, {
            ...(value as MapTileCache),
            cachedAt: new Date((value as any).cachedAt),
          });
        }
      }
    } catch (error) {
      console.error('Failed to load cache index:', error);
    }
  }

  private async saveCacheIndex(): Promise<void> {
    try {
      const indexPath = `${this.cacheDir}index.json`;
      const indexData: Record<string, any> = {};

      Array.from(this.cacheIndex.entries()).forEach(([key, value]) => {
        indexData[key] = {
          ...value,
          cachedAt: value.cachedAt.toISOString(),
        };
      });

      await FileSystem.writeAsStringAsync(indexPath, JSON.stringify(indexData));
    } catch (error) {
      console.error('Failed to save cache index:', error);
    }
  }

  private getTileKey(
    provider: string,
    z: number,
    x: number,
    y: number
  ): string {
    return `${provider}_${z}_${x}_${y}`;
  }

  private getTilePath(
    provider: string,
    z: number,
    x: number,
    y: number
  ): string {
    return `${this.cacheDir}${provider}/${z}/${x}/${y}.png`;
  }

  private async ensureTileDirectory(
    provider: string,
    z: number,
    x: number
  ): Promise<void> {
    const dirPath = `${this.cacheDir}${provider}/${z}/${x}/`;
    const dirInfo = await FileSystem.getInfoAsync(dirPath);

    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });
    }
  }

  async cacheTile(
    provider: string,
    z: number,
    x: number,
    y: number,
    tileUrl: string
  ): Promise<boolean> {
    try {
      const tileKey = this.getTileKey(provider, z, x, y);
      const tilePath = this.getTilePath(provider, z, x, y);

      // Check if tile already exists and is not expired
      if (await this.isTileCached(provider, z, x, y)) {
        return true;
      }

      await this.ensureTileDirectory(provider, z, x);

      // Download and cache the tile
      const downloadResult = await FileSystem.downloadAsync(tileUrl, tilePath);

      if (downloadResult.status === 200) {
        // Update cache index
        const fileInfo = await FileSystem.getInfoAsync(tilePath);
        this.cacheIndex.set(tileKey, {
          provider,
          bounds: this.tileToBounds(z, x, y),
          zoomLevels: [z],
          cachedAt: new Date(),
          sizeBytes: fileInfo.exists && 'size' in fileInfo ? fileInfo.size : 0,
        });

        await this.saveCacheIndex();
        await this.checkCacheSize();
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to cache tile:', error);
      return false;
    }
  }

  async isTileCached(
    provider: string,
    z: number,
    x: number,
    y: number
  ): Promise<boolean> {
    try {
      const tileKey = this.getTileKey(provider, z, x, y);
      const cacheEntry = this.cacheIndex.get(tileKey);

      if (!cacheEntry) {
        return false;
      }

      // Check if tile is expired
      const age = Date.now() - cacheEntry.cachedAt.getTime();
      if (age > this.config.maxAge) {
        await this.removeTile(provider, z, x, y);
        return false;
      }

      // Check if file actually exists
      const tilePath = this.getTilePath(provider, z, x, y);
      const fileInfo = await FileSystem.getInfoAsync(tilePath);

      if (!fileInfo.exists) {
        this.cacheIndex.delete(tileKey);
        await this.saveCacheIndex();
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to check tile cache:', error);
      return false;
    }
  }

  async getCachedTilePath(
    provider: string,
    z: number,
    x: number,
    y: number
  ): Promise<string | null> {
    if (await this.isTileCached(provider, z, x, y)) {
      return this.getTilePath(provider, z, x, y);
    }
    return null;
  }

  async cacheMapArea(
    provider: string,
    bounds: MapBounds,
    zoomLevels: number[]
  ): Promise<void> {
    const tiles: Array<{ z: number; x: number; y: number; url: string }> = [];

    // Calculate all tiles needed for the area and zoom levels
    for (const zoom of zoomLevels) {
      const tileBounds = this.boundsToTiles(bounds, zoom);

      for (let x = tileBounds.minX; x <= tileBounds.maxX; x++) {
        for (let y = tileBounds.minY; y <= tileBounds.maxY; y++) {
          const tileUrl = this.buildTileUrl(provider, zoom, x, y);
          if (tileUrl) {
            tiles.push({ z: zoom, x, y, url: tileUrl });
          }
        }
      }
    }

    // Cache tiles in batches to avoid overwhelming the network
    const batchSize = 10;
    for (let i = 0; i < tiles.length; i += batchSize) {
      const batch = tiles.slice(i, i + batchSize);
      const promises = batch.map((tile) =>
        this.cacheTile(provider, tile.z, tile.x, tile.y, tile.url)
      );

      await Promise.allSettled(promises);

      // Small delay between batches to be respectful to tile servers
      if (i + batchSize < tiles.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
  }

  async removeTile(
    provider: string,
    z: number,
    x: number,
    y: number
  ): Promise<void> {
    try {
      const tileKey = this.getTileKey(provider, z, x, y);
      const tilePath = this.getTilePath(provider, z, x, y);

      const fileInfo = await FileSystem.getInfoAsync(tilePath);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(tilePath);
      }

      this.cacheIndex.delete(tileKey);
      await this.saveCacheIndex();
    } catch (error) {
      console.error('Failed to remove tile:', error);
    }
  }

  async clearCache(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.cacheDir);
      if (dirInfo.exists) {
        await FileSystem.deleteAsync(this.cacheDir);
        await FileSystem.makeDirectoryAsync(this.cacheDir, {
          intermediates: true,
        });
      }

      this.cacheIndex.clear();
      await this.saveCacheIndex();
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  async getCacheSize(): Promise<number> {
    let totalSize = 0;
    Array.from(this.cacheIndex.values()).forEach((cache) => {
      totalSize += cache.sizeBytes;
    });
    return totalSize;
  }

  async getCachedAreas(): Promise<CachedArea[]> {
    const areas: Map<string, CachedArea> = new Map();

    Array.from(this.cacheIndex.entries()).forEach(([key, cache]) => {
      const areaKey = `${cache.provider}_${cache.bounds.north}_${cache.bounds.south}_${cache.bounds.east}_${cache.bounds.west}`;

      if (areas.has(areaKey)) {
        const area = areas.get(areaKey)!;
        const combinedZoomLevels = [...area.zoomLevels, ...cache.zoomLevels];
        area.zoomLevels = Array.from(new Set(combinedZoomLevels));
        area.sizeBytes += cache.sizeBytes;
        area.tileCount += 1;
      } else {
        areas.set(areaKey, {
          id: areaKey,
          name: `${cache.provider} area`,
          bounds: cache.bounds,
          zoomLevels: [...cache.zoomLevels],
          provider: cache.provider,
          cachedAt: cache.cachedAt,
          sizeBytes: cache.sizeBytes,
          tileCount: 1,
        });
      }
    });

    return Array.from(areas.values());
  }

  private async checkCacheSize(): Promise<void> {
    const currentSize = await this.getCacheSize();
    const threshold = this.config.maxSizeBytes * this.config.cleanupThreshold;

    if (currentSize > threshold) {
      await this.cleanupOldTiles();
    }
  }

  private async cleanupOldTiles(): Promise<void> {
    // Sort tiles by age (oldest first)
    const sortedTiles = Array.from(this.cacheIndex.entries()).sort(
      ([, a], [, b]) => a.cachedAt.getTime() - b.cachedAt.getTime()
    );

    const targetSize = this.config.maxSizeBytes * 0.7; // Clean up to 70% of max size
    let currentSize = await this.getCacheSize();

    for (const [key, cache] of sortedTiles) {
      if (currentSize <= targetSize) {
        break;
      }

      const [provider, z, x, y] = key.split('_');
      await this.removeTile(provider, parseInt(z), parseInt(x), parseInt(y));
      currentSize -= cache.sizeBytes;
    }
  }

  private buildTileUrl(
    provider: string,
    z: number,
    x: number,
    y: number
  ): string | null {
    // This would typically use the MapProviders configuration
    // For now, we'll use a simple OpenStreetMap URL
    switch (provider) {
      case 'openStreetMap':
        return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
      case 'openTopoMap':
        return `https://tile.opentopomap.org/${z}/${x}/${y}.png`;
      case 'satellite':
        return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;
      default:
        return null;
    }
  }

  private tileToBounds(z: number, x: number, y: number): MapBounds {
    const n = Math.pow(2, z);
    const lonDeg = (x / n) * 360.0 - 180.0;
    const latRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n)));
    const latDeg = (latRad * 180.0) / Math.PI;

    const lonDegNext = ((x + 1) / n) * 360.0 - 180.0;
    const latRadNext = Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + 1)) / n)));
    const latDegNext = (latRadNext * 180.0) / Math.PI;

    return {
      north: latDeg,
      south: latDegNext,
      east: lonDegNext,
      west: lonDeg,
    };
  }

  private boundsToTiles(
    bounds: MapBounds,
    zoom: number
  ): {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  } {
    const n = Math.pow(2, zoom);

    const minX = Math.floor(((bounds.west + 180) / 360) * n);
    const maxX = Math.floor(((bounds.east + 180) / 360) * n);

    const minY = Math.floor(
      ((1 -
        Math.log(
          Math.tan((bounds.north * Math.PI) / 180) +
            1 / Math.cos((bounds.north * Math.PI) / 180)
        ) /
          Math.PI) /
        2) *
        n
    );
    const maxY = Math.floor(
      ((1 -
        Math.log(
          Math.tan((bounds.south * Math.PI) / 180) +
            1 / Math.cos((bounds.south * Math.PI) / 180)
        ) /
          Math.PI) /
        2) *
        n
    );

    return {
      minX: Math.max(0, minX),
      maxX: Math.min(n - 1, maxX),
      minY: Math.max(0, minY),
      maxY: Math.min(n - 1, maxY),
    };
  }
}
