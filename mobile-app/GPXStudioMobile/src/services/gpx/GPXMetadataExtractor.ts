import { GPXFile } from 'gpx';
import { GPXFileMetadata, MapBounds } from '../../types/gpx';
import { GPXConverter } from './GPXConverter';

/**
 * Extracts metadata from GPX files for mobile app use
 */
export class GPXMetadataExtractor {
  private converter: GPXConverter;

  constructor() {
    this.converter = new GPXConverter();
  }

  /**
   * Extract comprehensive metadata from GPX file
   */
  async extractMetadata(
    gpxFile: GPXFile,
    filename: string,
    id: string,
    generateThumbnail: boolean = false
  ): Promise<GPXFileMetadata> {
    const stats = this.converter.convertStatisticsToMobile(gpxFile);
    const bounds = this.converter.extractBounds(gpxFile);

    // Extract name from GPX metadata or use filename
    const name = this.extractName(gpxFile, filename);
    const description = this.extractDescription(gpxFile);

    const metadata: GPXFileMetadata = {
      id,
      filename,
      name,
      description,
      createdAt: new Date(),
      modifiedAt: new Date(),
      fileSize: 0, // Will be set by the calling code that knows the actual file size
      trackCount: gpxFile.trk.length,
      waypointCount: gpxFile.wpt.length,
      totalDistance: stats.totalDistance,
      elevationGain: stats.elevationGain,
      elevationLoss: stats.elevationLoss,
      bounds,
      filePath: '', // Will be set by the calling code
    };

    // Generate thumbnail if requested
    if (generateThumbnail) {
      metadata.thumbnail = await this.generateThumbnail(gpxFile, bounds);
    }

    return metadata;
  }

  /**
   * Extract name from GPX file
   */
  private extractName(gpxFile: GPXFile, filename: string): string {
    // Try GPX metadata name first
    if (gpxFile.metadata?.name) {
      return gpxFile.metadata.name;
    }

    // Try first track name
    if (gpxFile.trk.length > 0 && gpxFile.trk[0].name) {
      return gpxFile.trk[0].name;
    }

    // Fall back to filename without extension
    return filename.replace(/\.[^/.]+$/, '');
  }

  /**
   * Extract description from GPX file
   */
  private extractDescription(gpxFile: GPXFile): string | undefined {
    // Try GPX metadata description first
    if (gpxFile.metadata?.desc) {
      return gpxFile.metadata.desc;
    }

    // Try first track description
    if (gpxFile.trk.length > 0 && gpxFile.trk[0].desc) {
      return gpxFile.trk[0].desc;
    }

    return undefined;
  }

  /**
   * Generate a simple thumbnail representation
   * This is a basic implementation - in a real app you might want to generate
   * an actual image thumbnail of the track
   */
  private async generateThumbnail(
    gpxFile: GPXFile,
    bounds: MapBounds
  ): Promise<string> {
    // For now, we'll create a simple SVG representation
    // In a production app, you might want to use a proper map rendering library

    const width = 100;
    const height = 100;
    const padding = 10;

    // Calculate scale factors
    const latRange = bounds.north - bounds.south;
    const lonRange = bounds.east - bounds.west;
    const scaleX = (width - 2 * padding) / lonRange;
    const scaleY = (height - 2 * padding) / latRange;

    let pathData = '';

    // Convert track points to SVG path
    gpxFile.trk.forEach((track) => {
      track.trkseg.forEach((segment) => {
        if (segment.trkpt.length > 0) {
          const firstPoint = segment.trkpt[0];
          const x =
            padding + (firstPoint.attributes.lon - bounds.west) * scaleX;
          const y =
            height -
            padding -
            (firstPoint.attributes.lat - bounds.south) * scaleY;
          pathData += `M ${x} ${y} `;

          segment.trkpt.slice(1).forEach((point) => {
            const px = padding + (point.attributes.lon - bounds.west) * scaleX;
            const py =
              height - padding - (point.attributes.lat - bounds.south) * scaleY;
            pathData += `L ${px} ${py} `;
          });
        }
      });
    });

    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${width}" height="${height}" fill="#f0f0f0"/>
        <path d="${pathData}" stroke="#007AFF" stroke-width="2" fill="none"/>
      </svg>
    `;

    // Convert SVG to base64
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }

  /**
   * Update metadata with file system information
   */
  updateWithFileInfo(
    metadata: GPXFileMetadata,
    filePath: string,
    fileSize: number
  ): GPXFileMetadata {
    return {
      ...metadata,
      filePath,
      fileSize,
    };
  }

  /**
   * Extract activity type from GPX file
   */
  extractActivityType(gpxFile: GPXFile): string {
    // Check track type
    if (gpxFile.trk.length > 0 && gpxFile.trk[0].type) {
      return gpxFile.trk[0].type;
    }

    // Try to infer from track characteristics
    const stats = this.converter.convertStatisticsToMobile(gpxFile);

    if (stats.averageSpeed > 25) {
      return 'cycling';
    } else if (stats.averageSpeed > 8) {
      return 'running';
    } else {
      return 'hiking';
    }
  }

  /**
   * Extract time range from GPX file
   */
  extractTimeRange(gpxFile: GPXFile): {
    startTime?: Date;
    endTime?: Date;
    duration?: number;
  } {
    const stats = gpxFile.getStatistics();

    return {
      startTime: stats.global.time.start,
      endTime: stats.global.time.end,
      duration: stats.global.time.total,
    };
  }

  /**
   * Check if GPX file has elevation data
   */
  hasElevationData(gpxFile: GPXFile): boolean {
    return gpxFile.trk.some((track) =>
      track.trkseg.some((segment) =>
        segment.trkpt.some((point) => point.ele !== undefined)
      )
    );
  }

  /**
   * Check if GPX file has timestamp data
   */
  hasTimestampData(gpxFile: GPXFile): boolean {
    return gpxFile.trk.some((track) =>
      track.trkseg.some((segment) =>
        segment.trkpt.some((point) => point.time !== undefined)
      )
    );
  }

  /**
   * Extract quality metrics
   */
  extractQualityMetrics(gpxFile: GPXFile): {
    hasElevation: boolean;
    hasTimestamps: boolean;
    pointDensity: number;
    averageAccuracy?: number;
  } {
    const stats = gpxFile.getStatistics();
    const pointCount = gpxFile.getNumberOfTrackPoints();

    return {
      hasElevation: this.hasElevationData(gpxFile),
      hasTimestamps: this.hasTimestampData(gpxFile),
      pointDensity:
        pointCount / Math.max(stats.global?.distance?.total || 0.1, 0.1), // points per km
    };
  }
}
