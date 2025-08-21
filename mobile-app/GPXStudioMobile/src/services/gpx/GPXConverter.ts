import { GPXFile, TrackPoint, Waypoint } from 'gpx';
import { MobileTrackPoint, Coordinates } from '../../types/gpx';

/**
 * Converts between GPX library types and mobile-specific types
 */
export class GPXConverter {
  /**
   * Convert GPX library track points to mobile format
   */
  convertTrackPointsToMobile(gpxFile: GPXFile): MobileTrackPoint[] {
    const mobilePoints: MobileTrackPoint[] = [];

    gpxFile.trk.forEach((track) => {
      track.trkseg.forEach((segment) => {
        segment.trkpt.forEach((point) => {
          mobilePoints.push(this.convertTrackPointToMobile(point));
        });
      });
    });

    return mobilePoints;
  }

  /**
   * Convert single GPX track point to mobile format
   */
  convertTrackPointToMobile(point: TrackPoint): MobileTrackPoint {
    return {
      latitude: point.attributes.lat,
      longitude: point.attributes.lon,
      elevation: point.ele,
      timestamp: point.time,
      // Note: accuracy, speed, and bearing are not standard GPX fields
      // but may be present in extensions - we'll handle this in a future enhancement
    };
  }

  /**
   * Convert mobile track points to GPX format
   */
  convertMobileTrackPointsToGPX(points: MobileTrackPoint[]): any[] {
    return points.map((point) => ({
      attributes: {
        lat: point.latitude,
        lon: point.longitude,
      },
      ele: point.elevation,
      time: point.timestamp,
    }));
  }

  /**
   * Convert GPX waypoints to mobile format
   */
  convertWaypointsToMobile(gpxFile: GPXFile): Array<{
    latitude: number;
    longitude: number;
    elevation?: number;
    name?: string;
    description?: string;
    symbol?: string;
    type?: string;
  }> {
    return gpxFile.wpt.map((waypoint) => ({
      latitude: waypoint.attributes.lat,
      longitude: waypoint.attributes.lon,
      elevation: waypoint.ele,
      name: waypoint.name,
      description: waypoint.desc,
      symbol: waypoint.sym,
      type: waypoint.type,
    }));
  }

  /**
   * Convert coordinates to different formats
   */
  convertCoordinates(coords: Coordinates): {
    decimal: { lat: number; lon: number };
    dms: { lat: string; lon: string };
    utm: string;
  } {
    return {
      decimal: {
        lat: coords.lat,
        lon: coords.lon,
      },
      dms: {
        lat: this.decimalToDMS(coords.lat, 'lat'),
        lon: this.decimalToDMS(coords.lon, 'lon'),
      },
      utm: this.decimalToUTM(coords.lat, coords.lon),
    };
  }

  /**
   * Convert decimal degrees to degrees, minutes, seconds
   */
  private decimalToDMS(decimal: number, type: 'lat' | 'lon'): string {
    const absolute = Math.abs(decimal);
    const degrees = Math.floor(absolute);
    const minutesFloat = (absolute - degrees) * 60;
    const minutes = Math.floor(minutesFloat);
    const seconds = (minutesFloat - minutes) * 60;

    const direction =
      type === 'lat' ? (decimal >= 0 ? 'N' : 'S') : decimal >= 0 ? 'E' : 'W';

    return `${degrees}°${minutes}'${seconds.toFixed(2)}"${direction}`;
  }

  /**
   * Convert decimal degrees to UTM (simplified)
   */
  private decimalToUTM(lat: number, lon: number): string {
    // This is a simplified UTM conversion for display purposes
    // For production use, consider using a proper UTM conversion library
    const zone = Math.floor((lon + 180) / 6) + 1;
    const hemisphere = lat >= 0 ? 'N' : 'S';
    return `${zone}${hemisphere}`;
  }

  /**
   * Extract bounds from GPX file
   */
  extractBounds(gpxFile: GPXFile): {
    north: number;
    south: number;
    east: number;
    west: number;
  } {
    const statistics = gpxFile.getStatistics();

    return {
      north: statistics.global.bounds.northEast.lat,
      south: statistics.global.bounds.southWest.lat,
      east: statistics.global.bounds.northEast.lon,
      west: statistics.global.bounds.southWest.lon,
    };
  }

  /**
   * Convert GPX statistics to mobile-friendly format
   */
  convertStatisticsToMobile(gpxFile: GPXFile) {
    const stats = gpxFile.getStatistics();

    return {
      totalDistance: stats.global.distance.total,
      movingDistance: stats.global.distance.moving,
      totalTime: stats.global.time.total,
      movingTime: stats.global.time.moving,
      elevationGain: stats.global.elevation.gain,
      elevationLoss: stats.global.elevation.loss,
      averageSpeed:
        stats.global.distance.moving / (stats.global.time.moving / 3600),
      maxSpeed: 0, // Will be calculated from actual speed data when GPX library is available
      startTime: stats.global.time.start,
      endTime: stats.global.time.end,
      bounds: this.extractBounds(gpxFile),
      pointCount: gpxFile.getNumberOfTrackPoints(),
    };
  }

  /**
   * Simplify track points for mobile display
   */
  simplifyTrackPoints(
    points: MobileTrackPoint[],
    tolerance: number = 0.0001
  ): MobileTrackPoint[] {
    if (points.length <= 2) {
      return points;
    }

    // Simple Douglas-Peucker-like algorithm for point reduction
    // This is a basic implementation - the GPX library has more sophisticated methods
    const simplified: MobileTrackPoint[] = [points[0]];

    for (let i = 1; i < points.length - 1; i++) {
      const prev = points[i - 1];
      const current = points[i];
      const next = points[i + 1];

      // Calculate distance from current point to line between prev and next
      const distance = this.pointToLineDistance(current, prev, next);

      if (distance > tolerance) {
        simplified.push(current);
      }
    }

    simplified.push(points[points.length - 1]);
    return simplified;
  }

  /**
   * Calculate distance from point to line (simplified)
   */
  private pointToLineDistance(
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
}
