// Import and re-export MapBounds from map types
import type { MapBounds } from './map';
export type { MapBounds };

// Re-export core GPX library types
export type {
  WaypointType,
  TrackSegment,
  TrackPoint,
  Coordinates,
  LineStyleExtension,
} from 'gpx';

// Mobile-specific GPX types and interfaces
export interface GPXFileMetadata {
  id: string;
  filename: string;
  name?: string;
  description?: string;
  createdAt: Date;
  modifiedAt: Date;
  fileSize: number;
  trackCount: number;
  waypointCount: number;
  totalDistance: number;
  elevationGain: number;
  elevationLoss: number;
  bounds: MapBounds;
  thumbnail?: string;
  filePath: string;
}

export interface MobileTrackPoint {
  latitude: number;
  longitude: number;
  elevation?: number;
  timestamp?: Date;
  accuracy?: number;
  speed?: number;
  bearing?: number;
}

export interface TrackingSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  isActive: boolean;
  trackPoints: MobileTrackPoint[];
  totalDistance: number;
  totalTime: number;
  averageSpeed: number;
  maxSpeed: number;
  elevationGain: number;
  elevationLoss: number;
}

export interface MobileGPXFile {
  id: string;
  metadata: GPXFileMetadata;
  gpxFile: any; // Will be the actual GPXFile instance from the library
}

// Extended metadata for offline functionality
export interface OfflineGPXFileMetadata extends GPXFileMetadata {
  isAvailableOffline: boolean;
}

export interface GPXValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface GPXImportOptions {
  validateOnImport?: boolean;
  generateThumbnail?: boolean;
  extractMetadata?: boolean;
}

export interface GPXExportOptions {
  excludeTimestamps?: boolean;
  excludeElevation?: boolean;
  excludeExtensions?: boolean;
  format?: 'gpx' | 'kml' | 'tcx';
  filename?: string;
}
