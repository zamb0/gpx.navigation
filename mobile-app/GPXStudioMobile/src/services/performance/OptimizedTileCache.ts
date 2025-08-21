/**
 * Optimized map tile loading and caching for smooth user experience
 */

import * as FileSystem from 'expo-file-system';
import { MapBounds, MapTileCache } from '../../types/map';

export interface TileLoadingConfig {
  maxConcurrentLoads: number;
  preloadRadius: number; // Number of tiles to preload around viewport
  priorityLevels: number; // Number of priority levels for tile loading
  retryAttempts: number;
  retryDelay: number; // milliseconds
  compressionEnabled: boolean;
  adaptiveQuality: boolean; // Adjust quality based on connection speed
}

export interface TileRequest {
  id: string;
  provider: string;
  z: number;
  x: number;
  y: number;
  url: string;
  priority: number; // 0 = highest priority
  timestamp: number;
  retries: number;
}

export interface LoadingStats {
  tilesLoading: number;
  tilesQueued: number;
  tilesLoaded: number;
  tilesFailed: number;
  averageLoadTime: number;
  cacheHitRate: number;
}

export class OptimizedTileCache {
  private config: TileLoadingConfig;
  private cacheDir: string;
  private loadingQueue: TileRequest[] = [];
  private loadingTiles: Map<string, Promise<boolean>> = new Map();
  private loadStats: LoadingStats;
  private cacheIndex: Map<string, MapTileCache> = new Map();
  private connectionSpeed: 'slow' | 'medium' | 'fast' = 'medium';
  private processingInterval?: NodeJS.Timeout;

  constructor(config?: Partial<TileLoadingConfig>) {
    this.config = {
      maxConcurrentLoads: 6,
      preloadRadius: 1,
      priorityLevels: 3,
      retryAttempts: 3,
      retryDelay: 1000,
      compressionEnabled: true,
      adaptiveQuality: true,
      ...config,
    };

    this.cacheDir = `${FileSystem.documentDirectory}optimizedTiles/`;
    this.loadStats = {
      tilesLoading: 0,
      tilesQueued: 0,
      tilesLoaded: 0,
      tilesFailed: 0,
      averageLoadTime: 0,
      cacheHitRate: 0,
    };

    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      // Ensure cache directory exists
      const dirInfo = await FileSystem.getInfoAsync(this.cacheDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.cacheDir, {
          intermediates: true,
        });
      }

      // Load cache index
      await this.loadCacheIndex();

      // Start processing queue
      this.startProcessing();

      // Monitor connection speed
      this.monitorConnectionSpeed();
    } catch (error) {
      console.error('Failed to initialize optimized tile cache:', error);
    }
  }

  /**
   * Load tiles for viewport with intelligent preloading
   */
  async loadTilesForViewport(
    provider: string,
    bounds: MapBounds,
    zoom: number,
    userLocation?: { latitude: number; longitude: number }
  ): Promise<void> {
    // Calculate visible tiles
    const visibleTiles = this.calculateTilesForBounds(bounds, zoom);

    // Add visible tiles with highest priority
    for (const tile of visibleTiles) {
      await this.requestTile(provider, tile.z, tile.x, tile.y, 0);
    }

    // Preload surrounding tiles with lower priority
    if (this.config.preloadRadius > 0) {
      const preloadTiles = this.calculatePreloadTiles(
        visibleTiles,
        this.config.preloadRadius
      );

      for (const tile of preloadTiles) {
        await this.requestTile(provider, tile.z, tile.x, tile.y, 1);
      }
    }

    // Predictive preloading based on user location and movement
    if (userLocation) {
      const predictiveTiles = this.calculatePredictiveTiles(
        provider,
        userLocation,
        zoom
      );

      for (const tile of predictiveTiles) {
        await this.requestTile(provider, tile.z, tile.x, tile.y, 2);
      }
    }
  }

  /**
   * Request a tile with priority-based loading
   */
  async requestTile(
    provider: string,
    z: number,
    x: number,
    y: number,
    priority: number = 0
  ): Promise<string | null> {
    const tileKey = this.getTileKey(provider, z, x, y);

    // Check if already cached
    if (await this.isTileCached(provider, z, x, y)) {
      this.loadStats.cacheHitRate =
        (this.loadStats.cacheHitRate * this.loadStats.tilesLoaded + 1) /
        (this.loadStats.tilesLoaded + 1);
      return this.getTilePath(provider, z, x, y);
    }

    // Check if already loading
    if (this.loadingTiles.has(tileKey)) {
      return await this.loadingTiles
        .get(tileKey)!
        .then(() => this.getTilePath(provider, z, x, y));
    }

    // Add to queue
    const request: TileRequest = {
      id: tileKey,
      provider,
      z,
      x,
      y,
      url: this.buildTileUrl(provider, z, x, y),
      priority,
      timestamp: Date.now(),
      retries: 0,
    };

    this.addToQueue(request);
    return null;
  }

  /**
   * Get loading statistics
   */
  getLoadingStats(): LoadingStats {
    return { ...this.loadStats };
  }

  /**
   * Clear cache and reset statistics
   */
  async clearCache(): Promise<void> {
    try {
      // Cancel all pending requests
      this.loadingQueue = [];
      this.loadingTiles.clear();

      // Clear cache directory
      const dirInfo = await FileSystem.getInfoAsync(this.cacheDir);
      if (dirInfo.exists) {
        await FileSystem.deleteAsync(this.cacheDir);
        await FileSystem.makeDirectoryAsync(this.cacheDir, {
          intermediates: true,
        });
      }

      // Reset cache index and stats
      this.cacheIndex.clear();
      this.resetStats();
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  /**
   * Private methods
   */

  private addToQueue(request: TileRequest): void {
    // Remove existing request for same tile
    this.loadingQueue = this.loadingQueue.filter((r) => r.id !== request.id);

    // Insert based on priority
    let insertIndex = this.loadingQueue.length;
    for (let i = 0; i < this.loadingQueue.length; i++) {
      if (request.priority < this.loadingQueue[i].priority) {
        insertIndex = i;
        break;
      }
    }

    this.loadingQueue.splice(insertIndex, 0, request);
    this.loadStats.tilesQueued = this.loadingQueue.length;
  }

  private startProcessing(): void {
    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, 50); // Process every 50ms
  }

  private async processQueue(): Promise<void> {
    // Don't exceed max concurrent loads
    if (this.loadingTiles.size >= this.config.maxConcurrentLoads) {
      return;
    }

    // Get next request from queue
    const request = this.loadingQueue.shift();
    if (!request) {
      return;
    }

    this.loadStats.tilesQueued = this.loadingQueue.length;

    // Start loading
    const loadPromise = this.loadTile(request);
    this.loadingTiles.set(request.id, loadPromise);
    this.loadStats.tilesLoading = this.loadingTiles.size;

    // Handle completion
    loadPromise.finally(() => {
      this.loadingTiles.delete(request.id);
      this.loadStats.tilesLoading = this.loadingTiles.size;
    });
  }

  private async loadTile(request: TileRequest): Promise<boolean> {
    const startTime = Date.now();

    try {
      // Adjust URL based on connection speed and adaptive quality
      const optimizedUrl = this.optimizeUrlForConnection(request.url);

      // Download tile
      const tilePath = this.getTilePath(
        request.provider,
        request.z,
        request.x,
        request.y
      );
      await this.ensureTileDirectory(request.provider, request.z, request.x);

      const downloadResult = await FileSystem.downloadAsync(
        optimizedUrl,
        tilePath
      );

      if (downloadResult.status === 200) {
        // Update cache index
        const fileInfo = await FileSystem.getInfoAsync(tilePath);
        const tileCache: MapTileCache = {
          provider: request.provider,
          bounds: this.tileToBounds(request.z, request.x, request.y),
          zoomLevels: [request.z],
          cachedAt: new Date(),
          sizeBytes: fileInfo.exists && 'size' in fileInfo ? fileInfo.size : 0,
        };

        this.cacheIndex.set(request.id, tileCache);
        await this.saveCacheIndex();

        // Update stats
        const loadTime = Date.now() - startTime;
        this.updateLoadStats(true, loadTime);

        return true;
      } else {
        throw new Error(`HTTP ${downloadResult.status}`);
      }
    } catch (error) {
      console.error(`Failed to load tile ${request.id}:`, error);

      // Retry if attempts remaining
      if (request.retries < this.config.retryAttempts) {
        request.retries++;

        // Add back to queue with delay
        setTimeout(() => {
          this.addToQueue(request);
        }, this.config.retryDelay * request.retries);

        return false;
      }

      // Update stats for failed tile
      this.updateLoadStats(false, Date.now() - startTime);
      return false;
    }
  }

  private optimizeUrlForConnection(url: string): string {
    if (!this.config.adaptiveQuality) {
      return url;
    }

    // Adjust tile quality based on connection speed
    switch (this.connectionSpeed) {
      case 'slow':
        // Use lower quality or compressed tiles if available
        return url
          .replace(/\.png$/, '@0.5x.png')
          .replace(/\.jpg$/, '@0.5x.jpg');
      case 'medium':
        return url;
      case 'fast':
        // Use higher quality tiles if available
        return url.replace(/\.png$/, '@2x.png').replace(/\.jpg$/, '@2x.jpg');
      default:
        return url;
    }
  }

  private calculateTilesForBounds(
    bounds: MapBounds,
    zoom: number
  ): Array<{ z: number; x: number; y: number }> {
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

    const tiles: Array<{ z: number; x: number; y: number }> = [];

    for (let x = Math.max(0, minX); x <= Math.min(n - 1, maxX); x++) {
      for (let y = Math.max(0, minY); y <= Math.min(n - 1, maxY); y++) {
        tiles.push({ z: zoom, x, y });
      }
    }

    return tiles;
  }

  private calculatePreloadTiles(
    visibleTiles: Array<{ z: number; x: number; y: number }>,
    radius: number
  ): Array<{ z: number; x: number; y: number }> {
    const preloadTiles: Array<{ z: number; x: number; y: number }> = [];
    const tileSet = new Set(visibleTiles.map((t) => `${t.z}_${t.x}_${t.y}`));

    for (const tile of visibleTiles) {
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          if (dx === 0 && dy === 0) continue; // Skip visible tiles

          const x = tile.x + dx;
          const y = tile.y + dy;
          const tileKey = `${tile.z}_${x}_${y}`;

          if (!tileSet.has(tileKey) && x >= 0 && y >= 0) {
            preloadTiles.push({ z: tile.z, x, y });
            tileSet.add(tileKey);
          }
        }
      }
    }

    return preloadTiles;
  }

  private calculatePredictiveTiles(
    provider: string,
    userLocation: { latitude: number; longitude: number },
    zoom: number
  ): Array<{ z: number; x: number; y: number }> {
    // Simple predictive loading - load tiles in direction of movement
    // This would be enhanced with actual movement vector calculation
    const n = Math.pow(2, zoom);
    const x = Math.floor(((userLocation.longitude + 180) / 360) * n);
    const y = Math.floor(
      ((1 -
        Math.log(
          Math.tan((userLocation.latitude * Math.PI) / 180) +
            1 / Math.cos((userLocation.latitude * Math.PI) / 180)
        ) /
          Math.PI) /
        2) *
        n
    );

    // Load tiles in a small radius around user location
    const predictiveTiles: Array<{ z: number; x: number; y: number }> = [];
    const radius = 2;

    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const tileX = x + dx;
        const tileY = y + dy;

        if (tileX >= 0 && tileX < n && tileY >= 0 && tileY < n) {
          predictiveTiles.push({ z: zoom, x: tileX, y: tileY });
        }
      }
    }

    return predictiveTiles;
  }

  private monitorConnectionSpeed(): void {
    // Simple connection speed monitoring
    // In a real implementation, this would measure actual download speeds
    setInterval(() => {
      const avgLoadTime = this.loadStats.averageLoadTime;

      if (avgLoadTime < 500) {
        this.connectionSpeed = 'fast';
      } else if (avgLoadTime < 2000) {
        this.connectionSpeed = 'medium';
      } else {
        this.connectionSpeed = 'slow';
      }
    }, 10000); // Check every 10 seconds
  }

  private updateLoadStats(success: boolean, loadTime: number): void {
    if (success) {
      this.loadStats.tilesLoaded++;

      // Update average load time
      const totalTiles = this.loadStats.tilesLoaded;
      this.loadStats.averageLoadTime =
        (this.loadStats.averageLoadTime * (totalTiles - 1) + loadTime) /
        totalTiles;
    } else {
      this.loadStats.tilesFailed++;
    }
  }

  private resetStats(): void {
    this.loadStats = {
      tilesLoading: 0,
      tilesQueued: 0,
      tilesLoaded: 0,
      tilesFailed: 0,
      averageLoadTime: 0,
      cacheHitRate: 0,
    };
  }

  // Utility methods (similar to TileCacheService)
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

  private async isTileCached(
    provider: string,
    z: number,
    x: number,
    y: number
  ): Promise<boolean> {
    const tileKey = this.getTileKey(provider, z, x, y);
    const cacheEntry = this.cacheIndex.get(tileKey);

    if (!cacheEntry) {
      return false;
    }

    const tilePath = this.getTilePath(provider, z, x, y);
    const fileInfo = await FileSystem.getInfoAsync(tilePath);
    return fileInfo.exists;
  }

  private buildTileUrl(
    provider: string,
    z: number,
    x: number,
    y: number
  ): string {
    // Use same URL building logic as TileCacheService
    switch (provider) {
      case 'openStreetMap':
        return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
      case 'openTopoMap':
        return `https://tile.opentopomap.org/${z}/${x}/${y}.png`;
      case 'satellite':
        return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;
      default:
        return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
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

  /**
   * Cleanup and destroy the cache
   */
  destroy(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }

    this.loadingQueue = [];
    this.loadingTiles.clear();
    this.cacheIndex.clear();
  }
}
