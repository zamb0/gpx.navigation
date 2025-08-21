/**
 * Lazy loading service for large GPX files and track data
 * Implements progressive loading and level-of-detail rendering
 */

import {
  MobileGPXFile,
  GPXFileMetadata,
  MobileTrackPoint,
} from '../../types/gpx';
import { MapBounds } from '../../types/map';

export interface LazyLoadingConfig {
  chunkSize: number; // Number of points to load per chunk
  maxPointsInMemory: number; // Maximum points to keep in memory
  levelOfDetailThreshold: number; // Point count threshold for LOD
  preloadDistance: number; // Distance ahead to preload (meters)
}

export interface TrackChunk {
  id: string;
  startIndex: number;
  endIndex: number;
  points: MobileTrackPoint[];
  bounds: MapBounds;
  isLoaded: boolean;
  lastAccessed: Date;
}

export interface LevelOfDetailConfig {
  zoomLevels: Array<{
    zoom: number;
    simplificationTolerance: number;
    maxPoints: number;
  }>;
}

export class LazyGPXLoader {
  private config: LazyLoadingConfig;
  private lodConfig: LevelOfDetailConfig;
  private loadedChunks: Map<string, TrackChunk> = new Map();
  private chunkCache: Map<string, TrackChunk[]> = new Map();
  private memoryUsage: number = 0;

  constructor(
    config?: Partial<LazyLoadingConfig>,
    lodConfig?: Partial<LevelOfDetailConfig>
  ) {
    this.config = {
      chunkSize: 1000,
      maxPointsInMemory: 10000,
      levelOfDetailThreshold: 5000,
      preloadDistance: 1000,
      ...config,
    };

    this.lodConfig = {
      zoomLevels: [
        { zoom: 1, simplificationTolerance: 0.01, maxPoints: 100 },
        { zoom: 5, simplificationTolerance: 0.005, maxPoints: 500 },
        { zoom: 10, simplificationTolerance: 0.001, maxPoints: 2000 },
        { zoom: 15, simplificationTolerance: 0.0005, maxPoints: 5000 },
        { zoom: 20, simplificationTolerance: 0, maxPoints: -1 }, // No limit at max zoom
      ],
      ...lodConfig,
    };
  }

  /**
   * Load GPX file with lazy loading strategy
   */
  async loadGPXFile(gpxFile: MobileGPXFile): Promise<void> {
    const fileId = gpxFile.id;

    // Check if file needs chunking
    const totalPoints = this.getTotalPointCount(gpxFile);

    if (totalPoints <= this.config.levelOfDetailThreshold) {
      // Small file, load entirely
      await this.loadCompleteFile(gpxFile);
    } else {
      // Large file, create chunks
      await this.createChunks(gpxFile);
    }
  }

  /**
   * Get track points for a specific viewport with level-of-detail
   */
  async getTrackPointsForViewport(
    fileId: string,
    bounds: MapBounds,
    zoom: number,
    userLocation?: { latitude: number; longitude: number }
  ): Promise<MobileTrackPoint[]> {
    const chunks = this.chunkCache.get(fileId);
    if (!chunks) {
      throw new Error(`GPX file ${fileId} not loaded`);
    }

    // If no chunks, return empty array
    if (chunks.length === 0) {
      return [];
    }

    // Find chunks that intersect with viewport
    const visibleChunks = chunks.filter((chunk) =>
      this.boundsIntersect(chunk.bounds, bounds)
    );

    // If no visible chunks, use all chunks for small files
    const chunksToLoad =
      visibleChunks.length > 0 ? visibleChunks : chunks.slice(0, 1);

    // Load visible chunks
    await this.loadChunks(chunksToLoad);

    // Preload nearby chunks if user location is available
    if (userLocation) {
      await this.preloadNearbyChunks(chunks, userLocation);
    }

    // Collect points from visible chunks
    let points: MobileTrackPoint[] = [];
    for (const chunk of chunksToLoad) {
      if (chunk.isLoaded) {
        points = points.concat(chunk.points);
      }
    }

    // Apply level-of-detail simplification
    return this.applyLevelOfDetail(points, zoom);
  }

  /**
   * Preload chunks near user location
   */
  private async preloadNearbyChunks(
    chunks: TrackChunk[],
    userLocation: { latitude: number; longitude: number }
  ): Promise<void> {
    const nearbyChunks = chunks.filter((chunk) => {
      const chunkCenter = this.getChunkCenter(chunk);
      const distance = this.calculateDistance(userLocation, chunkCenter);
      return distance <= this.config.preloadDistance && !chunk.isLoaded;
    });

    // Load nearby chunks in background
    this.loadChunks(nearbyChunks.slice(0, 3)); // Limit to 3 chunks
  }

  /**
   * Apply level-of-detail simplification based on zoom level
   */
  private applyLevelOfDetail(
    points: MobileTrackPoint[],
    zoom: number
  ): MobileTrackPoint[] {
    if (points.length === 0) {
      return points;
    }

    // Find appropriate LOD configuration
    const lodLevel =
      [...this.lodConfig.zoomLevels]
        .reverse()
        .find((level) => zoom >= level.zoom) || this.lodConfig.zoomLevels[0];

    if (lodLevel.maxPoints === -1 || points.length <= lodLevel.maxPoints) {
      return points;
    }

    // Apply Douglas-Peucker simplification
    if (lodLevel.simplificationTolerance > 0) {
      const simplified = this.simplifyTrack(
        points,
        lodLevel.simplificationTolerance
      );
      // Ensure we have at least 2 points
      return simplified.length >= 2
        ? simplified
        : points.slice(0, Math.min(2, points.length));
    }

    // Simple point reduction by taking every nth point
    const step = Math.ceil(points.length / lodLevel.maxPoints);
    const filtered = points.filter((_, index) => index % step === 0);

    // Ensure we include the last point
    if (
      filtered.length > 0 &&
      filtered[filtered.length - 1] !== points[points.length - 1]
    ) {
      filtered.push(points[points.length - 1]);
    }

    return filtered;
  }

  /**
   * Douglas-Peucker line simplification algorithm
   */
  private simplifyTrack(
    points: MobileTrackPoint[],
    tolerance: number
  ): MobileTrackPoint[] {
    if (points.length <= 2) {
      return points;
    }

    const simplified = this.douglasPeucker(points, tolerance);
    return simplified;
  }

  private douglasPeucker(
    points: MobileTrackPoint[],
    tolerance: number
  ): MobileTrackPoint[] {
    if (points.length <= 2) {
      return points;
    }

    // Find the point with maximum distance from line between first and last
    let maxDistance = 0;
    let maxIndex = 0;
    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];

    for (let i = 1; i < points.length - 1; i++) {
      const distance = this.perpendicularDistance(
        points[i],
        firstPoint,
        lastPoint
      );
      if (distance > maxDistance) {
        maxDistance = distance;
        maxIndex = i;
      }
    }

    // If max distance is greater than tolerance, recursively simplify
    if (maxDistance > tolerance) {
      const leftSegment = this.douglasPeucker(
        points.slice(0, maxIndex + 1),
        tolerance
      );
      const rightSegment = this.douglasPeucker(
        points.slice(maxIndex),
        tolerance
      );

      // Combine segments (remove duplicate point at junction)
      return leftSegment.concat(rightSegment.slice(1));
    }

    // If max distance is within tolerance, return simplified line
    return [firstPoint, lastPoint];
  }

  private perpendicularDistance(
    point: MobileTrackPoint,
    lineStart: MobileTrackPoint,
    lineEnd: MobileTrackPoint
  ): number {
    const A = point.latitude - lineStart.latitude;
    const B = point.longitude - lineStart.longitude;
    const C = lineEnd.latitude - lineStart.latitude;
    const D = lineEnd.longitude - lineStart.longitude;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;

    if (lenSq === 0) {
      return Math.sqrt(A * A + B * B);
    }

    const param = dot / lenSq;
    let xx: number, yy: number;

    if (param < 0) {
      xx = lineStart.latitude;
      yy = lineStart.longitude;
    } else if (param > 1) {
      xx = lineEnd.latitude;
      yy = lineEnd.longitude;
    } else {
      xx = lineStart.latitude + param * C;
      yy = lineStart.longitude + param * D;
    }

    const dx = point.latitude - xx;
    const dy = point.longitude - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Create chunks for large GPX file
   */
  private async createChunks(gpxFile: MobileGPXFile): Promise<void> {
    const chunks: TrackChunk[] = [];
    const tracks = gpxFile.gpxFile.tracks;

    for (let trackIndex = 0; trackIndex < tracks.length; trackIndex++) {
      const track = tracks[trackIndex];

      for (
        let segmentIndex = 0;
        segmentIndex < track.segments.length;
        segmentIndex++
      ) {
        const segment = track.segments[segmentIndex];
        const points = segment.points;

        // Create chunks for this segment
        for (let i = 0; i < points.length; i += this.config.chunkSize) {
          const endIndex = Math.min(i + this.config.chunkSize, points.length);
          const chunkPoints = points.slice(i, endIndex);

          const chunk: TrackChunk = {
            id: `${gpxFile.id}_${trackIndex}_${segmentIndex}_${i}`,
            startIndex: i,
            endIndex: endIndex,
            points: this.convertToMobilePoints(chunkPoints),
            bounds: this.calculateChunkBounds(chunkPoints),
            isLoaded: false,
            lastAccessed: new Date(),
          };

          chunks.push(chunk);
        }
      }
    }

    this.chunkCache.set(gpxFile.id, chunks);
  }

  /**
   * Load complete file for small GPX files
   */
  private async loadCompleteFile(gpxFile: MobileGPXFile): Promise<void> {
    const allPoints: MobileTrackPoint[] = [];
    const tracks = gpxFile.gpxFile.tracks;

    for (const track of tracks) {
      for (const segment of track.segments) {
        allPoints.push(...this.convertToMobilePoints(segment.points));
      }
    }

    const chunk: TrackChunk = {
      id: `${gpxFile.id}_complete`,
      startIndex: 0,
      endIndex: allPoints.length,
      points: allPoints,
      bounds: gpxFile.metadata.bounds,
      isLoaded: true,
      lastAccessed: new Date(),
    };

    this.chunkCache.set(gpxFile.id, [chunk]);
    this.loadedChunks.set(chunk.id, chunk);
    this.updateMemoryUsage();
  }

  /**
   * Load specific chunks into memory
   */
  private async loadChunks(chunks: TrackChunk[]): Promise<void> {
    for (const chunk of chunks) {
      if (!chunk.isLoaded) {
        // Check memory limit before loading
        await this.ensureMemoryLimit();

        chunk.isLoaded = true;
        chunk.lastAccessed = new Date();
        this.loadedChunks.set(chunk.id, chunk);
      } else {
        // Update access time
        chunk.lastAccessed = new Date();
      }
    }

    this.updateMemoryUsage();
  }

  /**
   * Ensure memory usage stays within limits
   */
  private async ensureMemoryLimit(): Promise<void> {
    while (this.memoryUsage > this.config.maxPointsInMemory) {
      // Find least recently used chunk
      let oldestChunk: TrackChunk | null = null;
      let oldestTime = Date.now();

      for (const chunk of this.loadedChunks.values()) {
        if (chunk.lastAccessed.getTime() < oldestTime) {
          oldestTime = chunk.lastAccessed.getTime();
          oldestChunk = chunk;
        }
      }

      if (oldestChunk) {
        this.unloadChunk(oldestChunk);
      } else {
        break; // No chunks to unload
      }
    }
  }

  /**
   * Unload chunk from memory
   */
  private unloadChunk(chunk: TrackChunk): void {
    chunk.isLoaded = false;
    chunk.points = []; // Clear points to free memory
    this.loadedChunks.delete(chunk.id);
    this.updateMemoryUsage();
  }

  /**
   * Update memory usage counter
   */
  private updateMemoryUsage(): void {
    this.memoryUsage = 0;
    for (const chunk of this.loadedChunks.values()) {
      this.memoryUsage += chunk.points.length;
    }
  }

  /**
   * Utility methods
   */
  private getTotalPointCount(gpxFile: MobileGPXFile): number {
    let count = 0;
    for (const track of gpxFile.gpxFile.tracks) {
      for (const segment of track.segments) {
        count += segment.points.length;
      }
    }
    return count;
  }

  private convertToMobilePoints(points: any[]): MobileTrackPoint[] {
    return points.map((point, index) => ({
      id: `point_${index}`,
      latitude: point.lat,
      longitude: point.lon,
      elevation: point.ele,
      timestamp: point.time ? new Date(point.time) : undefined,
      accuracy: point.extensions?.accuracy,
      speed: point.extensions?.speed,
      bearing: point.extensions?.bearing,
    }));
  }

  private calculateChunkBounds(points: any[]): MapBounds {
    if (points.length === 0) {
      return { north: 0, south: 0, east: 0, west: 0 };
    }

    let north = points[0].lat;
    let south = points[0].lat;
    let east = points[0].lon;
    let west = points[0].lon;

    for (const point of points) {
      north = Math.max(north, point.lat);
      south = Math.min(south, point.lat);
      east = Math.max(east, point.lon);
      west = Math.min(west, point.lon);
    }

    return { north, south, east, west };
  }

  private boundsIntersect(bounds1: MapBounds, bounds2: MapBounds): boolean {
    return !(
      bounds1.east < bounds2.west ||
      bounds1.west > bounds2.east ||
      bounds1.north < bounds2.south ||
      bounds1.south > bounds2.north
    );
  }

  private getChunkCenter(chunk: TrackChunk): {
    latitude: number;
    longitude: number;
  } {
    return {
      latitude: (chunk.bounds.north + chunk.bounds.south) / 2,
      longitude: (chunk.bounds.east + chunk.bounds.west) / 2,
    };
  }

  private calculateDistance(
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

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.loadedChunks.clear();
    this.chunkCache.clear();
    this.memoryUsage = 0;
  }

  /**
   * Get memory usage statistics
   */
  getMemoryStats(): {
    pointsInMemory: number;
    chunksLoaded: number;
    totalChunks: number;
    memoryUsagePercent: number;
  } {
    let totalChunks = 0;
    for (const chunks of this.chunkCache.values()) {
      totalChunks += chunks.length;
    }

    return {
      pointsInMemory: this.memoryUsage,
      chunksLoaded: this.loadedChunks.size,
      totalChunks,
      memoryUsagePercent:
        (this.memoryUsage / this.config.maxPointsInMemory) * 100,
    };
  }
}
