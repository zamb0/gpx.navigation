import {
  MapProvider,
  MapBounds,
  CachedArea,
  MapViewState,
  MapInteractionEvent,
} from '../../types/map';
import { GPXFileMetadata } from '../../types/gpx';
import { TileCacheService } from './TileCacheService';
import {
  MAP_PROVIDERS,
  DEFAULT_MAP_PROVIDER,
  getMapProvider,
} from './MapProviders';

export interface MapServiceConfig {
  defaultProvider?: string;
  enableCaching?: boolean;
  maxCacheSize?: number;
  autoFitPadding?: number;
}

export class MapService {
  private tileCacheService?: TileCacheService;
  private currentProvider: MapProvider;
  private config: MapServiceConfig;
  private interactionListeners: Array<(event: MapInteractionEvent) => void> =
    [];

  constructor(config?: MapServiceConfig) {
    this.config = {
      defaultProvider: 'openStreetMap',
      enableCaching: true,
      maxCacheSize: 500 * 1024 * 1024, // 500MB
      autoFitPadding: 50,
      ...config,
    };

    this.currentProvider =
      getMapProvider(this.config.defaultProvider!) || DEFAULT_MAP_PROVIDER;

    if (this.config.enableCaching) {
      this.tileCacheService = new TileCacheService({
        maxSizeBytes: this.config.maxCacheSize,
      });
    }
  }

  // Map Provider Management
  setMapProvider(providerId: string): boolean {
    const provider = getMapProvider(providerId);
    if (provider) {
      this.currentProvider = provider;
      return true;
    }
    return false;
  }

  getCurrentProvider(): MapProvider {
    return this.currentProvider;
  }

  getAllProviders(): MapProvider[] {
    return Object.values(MAP_PROVIDERS);
  }

  // Tile Caching
  async cacheMapArea(bounds: MapBounds, zoomLevels: number[]): Promise<void> {
    if (!this.config.enableCaching || !this.tileCacheService) {
      throw new Error('Tile caching is not enabled');
    }

    await this.tileCacheService.cacheMapArea(
      this.currentProvider.id,
      bounds,
      zoomLevels
    );
  }

  async getCachedAreas(): Promise<CachedArea[]> {
    if (!this.config.enableCaching || !this.tileCacheService) {
      return [];
    }

    return await this.tileCacheService.getCachedAreas();
  }

  async clearCache(): Promise<void> {
    if (!this.config.enableCaching || !this.tileCacheService) {
      return;
    }

    await this.tileCacheService.clearCache();
  }

  async getCacheSize(): Promise<number> {
    if (!this.config.enableCaching || !this.tileCacheService) {
      return 0;
    }

    return await this.tileCacheService.getCacheSize();
  }

  async isAreaCached(bounds: MapBounds, zoom: number): Promise<boolean> {
    if (!this.config.enableCaching || !this.tileCacheService) {
      return false;
    }

    // Check if the area is cached by sampling a few tiles
    const sampleTiles = this.getSampleTilesForBounds(bounds, zoom);

    for (const tile of sampleTiles) {
      const isCached = await this.tileCacheService.isTileCached(
        this.currentProvider.id,
        tile.z,
        tile.x,
        tile.y
      );
      if (!isCached) {
        return false;
      }
    }

    return true;
  }

  // Map Bounds Calculation
  calculateBoundsForGPXFiles(gpxFiles: GPXFileMetadata[]): MapBounds | null {
    if (gpxFiles.length === 0) {
      return null;
    }

    let north = -90;
    let south = 90;
    let east = -180;
    let west = 180;

    for (const file of gpxFiles) {
      const bounds = file.bounds;
      north = Math.max(north, bounds.north);
      south = Math.min(south, bounds.south);
      east = Math.max(east, bounds.east);
      west = Math.min(west, bounds.west);
    }

    return { north, south, east, west };
  }

  calculateBoundsForCoordinates(
    coordinates: Array<{ latitude: number; longitude: number }>
  ): MapBounds | null {
    if (coordinates.length === 0) {
      return null;
    }

    let north = coordinates[0].latitude;
    let south = coordinates[0].latitude;
    let east = coordinates[0].longitude;
    let west = coordinates[0].longitude;

    for (const coord of coordinates) {
      north = Math.max(north, coord.latitude);
      south = Math.min(south, coord.latitude);
      east = Math.max(east, coord.longitude);
      west = Math.min(west, coord.longitude);
    }

    return { north, south, east, west };
  }

  expandBounds(bounds: MapBounds, paddingPercent: number = 0.1): MapBounds {
    const latPadding = (bounds.north - bounds.south) * paddingPercent;
    const lonPadding = (bounds.east - bounds.west) * paddingPercent;

    return {
      north: bounds.north + latPadding,
      south: bounds.south - latPadding,
      east: bounds.east + lonPadding,
      west: bounds.west - lonPadding,
    };
  }

  // Map View State Management
  calculateOptimalViewState(
    bounds: MapBounds,
    mapDimensions: { width: number; height: number }
  ): MapViewState {
    const center = {
      latitude: (bounds.north + bounds.south) / 2,
      longitude: (bounds.east + bounds.west) / 2,
    };

    // Calculate zoom level to fit bounds
    const latDiff = bounds.north - bounds.south;
    const lonDiff = bounds.east - bounds.west;

    // Rough calculation for zoom level based on bounds and map dimensions
    const latZoom =
      Math.log2(360 / latDiff) - Math.log2(mapDimensions.height / 256);
    const lonZoom =
      Math.log2(360 / lonDiff) - Math.log2(mapDimensions.width / 256);

    const zoom = Math.max(
      1,
      Math.min(20, Math.floor(Math.min(latZoom, lonZoom)) - 1)
    );

    return {
      center,
      zoom,
      bearing: 0,
      pitch: 0,
    };
  }

  // Interaction Handling
  addInteractionListener(listener: (event: MapInteractionEvent) => void): void {
    this.interactionListeners.push(listener);
  }

  removeInteractionListener(
    listener: (event: MapInteractionEvent) => void
  ): void {
    const index = this.interactionListeners.indexOf(listener);
    if (index > -1) {
      this.interactionListeners.splice(index, 1);
    }
  }

  handleMapInteraction(event: MapInteractionEvent): void {
    for (const listener of this.interactionListeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in map interaction listener:', error);
      }
    }
  }

  // Utility Methods
  private getSampleTilesForBounds(
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

    // Sample a few tiles from corners and center
    const samples = [
      { z: zoom, x: minX, y: minY }, // Top-left
      { z: zoom, x: maxX, y: minY }, // Top-right
      { z: zoom, x: minX, y: maxY }, // Bottom-left
      { z: zoom, x: maxX, y: maxY }, // Bottom-right
      {
        z: zoom,
        x: Math.floor((minX + maxX) / 2),
        y: Math.floor((minY + maxY) / 2),
      }, // Center
    ];

    return samples.filter(
      (tile) => tile.x >= 0 && tile.x < n && tile.y >= 0 && tile.y < n
    );
  }

  // Distance and Coordinate Utilities
  calculateDistance(
    coord1: { latitude: number; longitude: number },
    coord2: { latitude: number; longitude: number }
  ): number {
    const R = 6371000; // Earth's radius in meters
    const lat1Rad = (coord1.latitude * Math.PI) / 180;
    const lat2Rad = (coord2.latitude * Math.PI) / 180;
    const deltaLatRad = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
    const deltaLonRad = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

    const a =
      Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
      Math.cos(lat1Rad) *
        Math.cos(lat2Rad) *
        Math.sin(deltaLonRad / 2) *
        Math.sin(deltaLonRad / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  calculateBearing(
    coord1: { latitude: number; longitude: number },
    coord2: { latitude: number; longitude: number }
  ): number {
    const lat1Rad = (coord1.latitude * Math.PI) / 180;
    const lat2Rad = (coord2.latitude * Math.PI) / 180;
    const deltaLonRad = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

    const y = Math.sin(deltaLonRad) * Math.cos(lat2Rad);
    const x =
      Math.cos(lat1Rad) * Math.sin(lat2Rad) -
      Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(deltaLonRad);

    const bearingRad = Math.atan2(y, x);
    return ((bearingRad * 180) / Math.PI + 360) % 360;
  }

  isPointInBounds(
    point: { latitude: number; longitude: number },
    bounds: MapBounds
  ): boolean {
    return (
      point.latitude >= bounds.south &&
      point.latitude <= bounds.north &&
      point.longitude >= bounds.west &&
      point.longitude <= bounds.east
    );
  }
}
