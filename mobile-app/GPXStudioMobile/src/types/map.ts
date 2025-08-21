export interface MapProvider {
  id: string;
  name: string;
  type: 'raster' | 'vector';
  urlTemplate?: string;
  attribution?: string;
  maxZoom?: number;
  minZoom?: number;
  tileSize?: number;
}

export interface MapTileCache {
  provider: string;
  bounds: MapBounds;
  zoomLevels: number[];
  cachedAt: Date;
  sizeBytes: number;
}

export interface CachedArea {
  id: string;
  name: string;
  bounds: MapBounds;
  zoomLevels: number[];
  provider: string;
  cachedAt: Date;
  sizeBytes: number;
  tileCount: number;
}

export interface MapInteractionEvent {
  type: 'tap' | 'longPress' | 'pan' | 'zoom';
  coordinate: {
    latitude: number;
    longitude: number;
  };
  timestamp: Date;
}

export interface MapViewState {
  center: {
    latitude: number;
    longitude: number;
  };
  zoom: number;
  bearing?: number;
  pitch?: number;
}

export interface MapStyleConfig {
  trackColor: string;
  trackWidth: number;
  waypointColor: string;
  waypointSize: number;
  userLocationColor: string;
  selectedTrackColor: string;
}

export interface TileCacheConfig {
  maxSizeBytes: number;
  maxAge: number; // in milliseconds
  compressionLevel: number;
  cleanupThreshold: number; // percentage of max size
}

// Define MapBounds here to avoid circular dependency
export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}
