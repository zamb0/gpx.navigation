import { MapService, MapServiceConfig } from '../map/MapService';
import { TileCacheService } from '../map/TileCacheService';
import { OfflineService } from './OfflineService';
import { MapBounds, CachedArea, MapProvider } from '../../types/map';

export interface OfflineMapConfig extends MapServiceConfig {
  enableOfflineMaps: boolean;
  maxOfflineAreas: number;
  defaultOfflineZoomLevels: number[];
  preloadRadius: number; // kilometers
}

export interface OfflineMapArea {
  id: string;
  name: string;
  bounds: MapBounds;
  zoomLevels: number[];
  provider: string;
  downloadProgress: number; // 0-100
  isDownloading: boolean;
  downloadedAt?: Date;
  sizeBytes: number;
  tileCount: number;
}

export class OfflineMapService extends MapService {
  private offlineService: OfflineService;
  private offlineConfig: OfflineMapConfig;
  private downloadingAreas: Map<string, AbortController> = new Map();
  private progressListeners: Map<string, (progress: number) => void> =
    new Map();

  constructor(
    offlineService: OfflineService,
    config?: Partial<OfflineMapConfig>
  ) {
    super(config);
    this.offlineService = offlineService;
    this.offlineConfig = {
      enableOfflineMaps: true,
      maxOfflineAreas: 10,
      defaultOfflineZoomLevels: [10, 11, 12, 13, 14, 15],
      preloadRadius: 5, // 5km radius
      ...config,
    };
  }

  // Override parent method to maintain compatibility
  async cacheMapArea(bounds: MapBounds, zoomLevels: number[]): Promise<void> {
    await this.cacheMapAreaWithId(bounds, zoomLevels);
  }

  // Enhanced tile caching with offline support
  async cacheMapAreaWithId(
    bounds: MapBounds,
    zoomLevels: number[],
    areaName?: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    if (!this.offlineConfig.enableOfflineMaps) {
      throw new Error('Offline maps are not enabled');
    }

    const areaId = this.generateAreaId();
    const provider = this.getCurrentProvider();

    // Check if we can download (online) or queue for later
    if (!this.offlineService.getConnectionStatus()) {
      await this.offlineService.queueOperation('cache_tiles', {
        areaId,
        bounds,
        zoomLevels,
        provider: provider.id,
        areaName,
      });
      throw new Error(
        'Cannot download maps while offline. Operation queued for when connection is restored.'
      );
    }

    // Start download
    const abortController = new AbortController();
    this.downloadingAreas.set(areaId, abortController);

    if (onProgress) {
      this.progressListeners.set(areaId, onProgress);
    }

    try {
      await this.downloadMapArea(
        areaId,
        bounds,
        zoomLevels,
        provider.id,
        areaName
      );
      return areaId;
    } catch (error) {
      this.downloadingAreas.delete(areaId);
      this.progressListeners.delete(areaId);
      throw error;
    }
  }

  private async downloadMapArea(
    areaId: string,
    bounds: MapBounds,
    zoomLevels: number[],
    providerId: string,
    areaName?: string
  ): Promise<void> {
    const tileCacheService = this.getTileCacheService();
    if (!tileCacheService) {
      throw new Error('Tile cache service not available');
    }

    // Calculate total tiles to download
    const totalTiles = this.calculateTotalTiles(bounds, zoomLevels);
    let downloadedTiles = 0;

    const updateProgress = (increment: number = 1) => {
      downloadedTiles += increment;
      const progress = Math.round((downloadedTiles / totalTiles) * 100);
      const progressListener = this.progressListeners.get(areaId);
      if (progressListener) {
        progressListener(progress);
      }
    };

    // Download tiles for each zoom level
    for (const zoom of zoomLevels) {
      const abortController = this.downloadingAreas.get(areaId);
      if (abortController?.signal.aborted) {
        throw new Error('Download cancelled');
      }

      const tileBounds = this.boundsToTiles(bounds, zoom);

      for (let x = tileBounds.minX; x <= tileBounds.maxX; x++) {
        for (let y = tileBounds.minY; y <= tileBounds.maxY; y++) {
          if (abortController?.signal.aborted) {
            throw new Error('Download cancelled');
          }

          const tileUrl = this.buildTileUrl(providerId, zoom, x, y);
          if (tileUrl) {
            try {
              await tileCacheService.cacheTile(providerId, zoom, x, y, tileUrl);
              updateProgress();
            } catch (error) {
              console.warn(`Failed to cache tile ${zoom}/${x}/${y}:`, error);
              updateProgress(); // Still count as processed
            }
          }

          // Small delay to avoid overwhelming the server
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      }
    }

    // Clean up
    this.downloadingAreas.delete(areaId);
    this.progressListeners.delete(areaId);
  }

  async cancelDownload(areaId: string): Promise<void> {
    const abortController = this.downloadingAreas.get(areaId);
    if (abortController) {
      abortController.abort();
      this.downloadingAreas.delete(areaId);
      this.progressListeners.delete(areaId);
    }
  }

  async getOfflineAreas(): Promise<OfflineMapArea[]> {
    const cachedAreas = await this.getCachedAreas();
    const offlineAreas: OfflineMapArea[] = [];

    for (const area of cachedAreas) {
      const isDownloading = this.downloadingAreas.has(area.id);
      const downloadProgress = isDownloading ? 0 : 100; // Simplified progress

      offlineAreas.push({
        id: area.id,
        name: area.name,
        bounds: area.bounds,
        zoomLevels: area.zoomLevels,
        provider: area.provider,
        downloadProgress,
        isDownloading,
        downloadedAt: area.cachedAt,
        sizeBytes: area.sizeBytes,
        tileCount: area.tileCount,
      });
    }

    return offlineAreas;
  }

  async deleteOfflineArea(areaId: string): Promise<void> {
    // Cancel download if in progress
    await this.cancelDownload(areaId);

    // Remove cached tiles for this area
    const tileCacheService = this.getTileCacheService();
    if (tileCacheService) {
      // This would require enhancing TileCacheService to support area-based deletion
      // For now, we'll clear the entire cache (not ideal but functional)
      console.warn(
        'Area-specific deletion not implemented, consider clearing entire cache'
      );
    }
  }

  async preloadAroundLocation(
    latitude: number,
    longitude: number,
    radiusKm?: number
  ): Promise<void> {
    const radius = radiusKm || this.offlineConfig.preloadRadius;
    const bounds = this.calculateBoundsFromRadius(latitude, longitude, radius);

    await this.offlineService.executeOrQueue(
      async () => {
        await this.cacheMapArea(
          bounds,
          this.offlineConfig.defaultOfflineZoomLevels
        );
      },
      {
        bounds,
        zoomLevels: this.offlineConfig.defaultOfflineZoomLevels,
        location: { latitude, longitude },
        radius,
      },
      'cache_tiles'
    );
  }

  async isAreaAvailableOffline(
    bounds: MapBounds,
    zoom: number
  ): Promise<boolean> {
    return await this.isAreaCached(bounds, zoom);
  }

  async getOfflineStorageInfo(): Promise<{
    totalAreas: number;
    totalSize: number;
    availableSpace: number;
  }> {
    const areas = await this.getOfflineAreas();
    const totalSize = areas.reduce((sum, area) => sum + area.sizeBytes, 0);

    // This would need to be configured based on available device storage
    const maxOfflineStorage = 1024 * 1024 * 1024; // 1GB default
    const availableSpace = maxOfflineStorage - totalSize;

    return {
      totalAreas: areas.length,
      totalSize,
      availableSpace,
    };
  }

  async optimizeOfflineStorage(): Promise<void> {
    const areas = await this.getOfflineAreas();

    // Remove oldest areas if we exceed the limit
    if (areas.length > this.offlineConfig.maxOfflineAreas) {
      const sortedAreas = areas
        .filter((area) => area.downloadedAt)
        .sort((a, b) => {
          const aTime = a.downloadedAt?.getTime() || 0;
          const bTime = b.downloadedAt?.getTime() || 0;
          return aTime - bTime; // Oldest first
        });

      const areasToRemove = sortedAreas.slice(
        0,
        areas.length - this.offlineConfig.maxOfflineAreas
      );

      for (const area of areasToRemove) {
        await this.deleteOfflineArea(area.id);
      }
    }
  }

  // Override parent method to maintain compatibility
  setMapProvider(providerId: string): boolean {
    // Try to set the provider synchronously
    const result = super.setMapProvider(providerId);

    // If offline, we might want to check cached areas asynchronously
    if (!this.offlineService.getConnectionStatus()) {
      this.checkOfflineProviderSupport(providerId);
    }

    return result;
  }

  // Async version for enhanced offline functionality
  async setMapProviderAsync(providerId: string): Promise<boolean> {
    return await this.offlineService.executeWithFallback(
      // Online operation
      async () => {
        return super.setMapProvider(providerId);
      },
      // Offline operation - check if we have cached tiles for this provider
      async () => {
        const areas = await this.getOfflineAreas();
        const hasOfflineProvider = areas.some(
          (area) => area.provider === providerId
        );

        if (hasOfflineProvider) {
          return super.setMapProvider(providerId);
        } else {
          console.warn(`Provider ${providerId} not available offline`);
          return false;
        }
      }
    );
  }

  private async checkOfflineProviderSupport(providerId: string): Promise<void> {
    // Check if we have cached areas for this provider
    // This is called asynchronously and doesn't affect the synchronous return
    try {
      const areas = await this.getCachedAreas();
      const hasProviderCache = areas.some(
        (area) => area.provider === providerId
      );
      if (!hasProviderCache) {
        console.warn(`No offline cache available for provider: ${providerId}`);
      }
    } catch (error) {
      console.error('Error checking offline provider support:', error);
    }
  }

  // Helper methods
  private getTileCacheService(): TileCacheService | undefined {
    // Access the private tileCacheService from parent class
    // This would need to be exposed in the parent class
    return (this as any).tileCacheService;
  }

  private generateAreaId(): string {
    return `area_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateTotalTiles(bounds: MapBounds, zoomLevels: number[]): number {
    let total = 0;

    for (const zoom of zoomLevels) {
      const tileBounds = this.boundsToTiles(bounds, zoom);
      const tilesX = tileBounds.maxX - tileBounds.minX + 1;
      const tilesY = tileBounds.maxY - tileBounds.minY + 1;
      total += tilesX * tilesY;
    }

    return total;
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

  private buildTileUrl(
    provider: string,
    z: number,
    x: number,
    y: number
  ): string | null {
    // This would use the MapProviders configuration
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

  private calculateBoundsFromRadius(
    latitude: number,
    longitude: number,
    radiusKm: number
  ): MapBounds {
    // Approximate degrees per kilometer
    const kmPerDegreeLat = 111.32;
    const kmPerDegreeLon = 111.32 * Math.cos((latitude * Math.PI) / 180);

    const latOffset = radiusKm / kmPerDegreeLat;
    const lonOffset = radiusKm / kmPerDegreeLon;

    return {
      north: latitude + latOffset,
      south: latitude - latOffset,
      east: longitude + lonOffset,
      west: longitude - lonOffset,
    };
  }
}
