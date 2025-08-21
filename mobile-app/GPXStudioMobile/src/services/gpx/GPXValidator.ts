import { GPXFile } from 'gpx';
import { GPXValidationResult } from '../../types/gpx';

/**
 * Validates GPX files and provides detailed error reporting
 */
export class GPXValidator {
  /**
   * Validate GPX string content
   */
  validateGPXString(gpxContent: string): GPXValidationResult {
    const result: GPXValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    try {
      // Basic XML structure validation
      if (!gpxContent.trim()) {
        result.errors.push('GPX content is empty');
        result.isValid = false;
        return result;
      }

      // Check for GPX root element
      if (!gpxContent.includes('<gpx')) {
        result.errors.push('Missing GPX root element');
        result.isValid = false;
      }

      // For React Native, skip complex XML validation
      // Let the GPX parser library handle XML validation
      // Just do basic sanity checks
      const trimmedContent = gpxContent.trim();
      if (!trimmedContent.startsWith('<') || !trimmedContent.endsWith('>')) {
        result.errors.push('Invalid XML structure');
        result.isValid = false;
        return result;
      }

      // Optional warnings (non-blocking)
      if (
        !gpxContent.includes('xmlns="http://www.topografix.com/GPX/1/1"') &&
        !gpxContent.includes('xmlns="http://www.topografix.com/GPX/1/0"')
      ) {
        result.warnings.push('Missing or non-standard GPX namespace');
      }

      if (
        !gpxContent.includes('version="1.1"') &&
        !gpxContent.includes('version="1.0"')
      ) {
        result.warnings.push('GPX version should be 1.0 or 1.1');
      }
    } catch (error) {
      result.errors.push(
        `Validation error: ${error instanceof Error ? error.message : String(error)}`
      );
      result.isValid = false;
    }

    return result;
  }

  /**
   * Validate parsed GPX file object
   */
  validateGPXFile(gpxFile: GPXFile): GPXValidationResult {
    const result: GPXValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    try {
      // Check if file has any content
      if (!gpxFile.trk || gpxFile.trk.length === 0) {
        if (!gpxFile.wpt || gpxFile.wpt.length === 0) {
          result.warnings.push('GPX file contains no tracks or waypoints');
        }
      }

      // Validate tracks
      gpxFile.trk.forEach((track, trackIndex) => {
        if (!track.trkseg || track.trkseg.length === 0) {
          result.warnings.push(`Track ${trackIndex + 1} has no segments`);
          return;
        }

        track.trkseg.forEach((segment, segmentIndex) => {
          if (!segment.trkpt || segment.trkpt.length === 0) {
            result.warnings.push(
              `Track ${trackIndex + 1}, segment ${segmentIndex + 1} has no points`
            );
            return;
          }

          // Validate track points
          segment.trkpt.forEach((point, pointIndex) => {
            if (
              typeof point.attributes.lat !== 'number' ||
              point.attributes.lat < -90 ||
              point.attributes.lat > 90
            ) {
              result.errors.push(
                `Invalid latitude in track ${trackIndex + 1}, segment ${segmentIndex + 1}, point ${pointIndex + 1}`
              );
              result.isValid = false;
            }

            if (
              typeof point.attributes.lon !== 'number' ||
              point.attributes.lon < -180 ||
              point.attributes.lon > 180
            ) {
              result.errors.push(
                `Invalid longitude in track ${trackIndex + 1}, segment ${segmentIndex + 1}, point ${pointIndex + 1}`
              );
              result.isValid = false;
            }

            // Check elevation if present
            if (
              point.ele !== undefined &&
              (typeof point.ele !== 'number' || isNaN(point.ele))
            ) {
              result.warnings.push(
                `Invalid elevation in track ${trackIndex + 1}, segment ${segmentIndex + 1}, point ${pointIndex + 1}`
              );
            }

            // Check timestamp if present
            if (point.time !== undefined && !(point.time instanceof Date)) {
              result.warnings.push(
                `Invalid timestamp in track ${trackIndex + 1}, segment ${segmentIndex + 1}, point ${pointIndex + 1}`
              );
            }
          });
        });
      });

      // Validate waypoints
      gpxFile.wpt.forEach((waypoint, waypointIndex) => {
        if (
          typeof waypoint.attributes.lat !== 'number' ||
          waypoint.attributes.lat < -90 ||
          waypoint.attributes.lat > 90
        ) {
          result.errors.push(
            `Invalid latitude in waypoint ${waypointIndex + 1}`
          );
          result.isValid = false;
        }

        if (
          typeof waypoint.attributes.lon !== 'number' ||
          waypoint.attributes.lon < -180 ||
          waypoint.attributes.lon > 180
        ) {
          result.errors.push(
            `Invalid longitude in waypoint ${waypointIndex + 1}`
          );
          result.isValid = false;
        }

        if (
          waypoint.ele !== undefined &&
          (typeof waypoint.ele !== 'number' || isNaN(waypoint.ele))
        ) {
          result.warnings.push(
            `Invalid elevation in waypoint ${waypointIndex + 1}`
          );
        }
      });

      // Check for reasonable file size (number of points)
      const totalPoints = gpxFile.getNumberOfTrackPoints();
      if (totalPoints > 50000) {
        result.warnings.push(
          `Large file: ${totalPoints} track points may impact performance`
        );
      }

      // Check for temporal consistency
      this.validateTemporalConsistency(gpxFile, result);
    } catch (error) {
      result.errors.push(
        `Validation error: ${error instanceof Error ? error.message : String(error)}`
      );
      result.isValid = false;
    }

    return result;
  }

  /**
   * Validate temporal consistency of timestamps
   */
  private validateTemporalConsistency(
    gpxFile: GPXFile,
    result: GPXValidationResult
  ): void {
    gpxFile.trk.forEach((track, trackIndex) => {
      track.trkseg.forEach((segment, segmentIndex) => {
        let lastTime: Date | undefined;

        segment.trkpt.forEach((point, pointIndex) => {
          if (point.time && lastTime) {
            if (point.time < lastTime) {
              result.warnings.push(
                `Timestamp goes backwards in track ${trackIndex + 1}, segment ${segmentIndex + 1}, point ${pointIndex + 1}`
              );
            }

            // Check for unreasonable time gaps (more than 24 hours)
            const timeDiff = point.time.getTime() - lastTime.getTime();
            if (timeDiff > 24 * 60 * 60 * 1000) {
              result.warnings.push(
                `Large time gap (${Math.round(timeDiff / (60 * 60 * 1000))} hours) in track ${trackIndex + 1}, segment ${segmentIndex + 1}`
              );
            }
          }

          if (point.time) {
            lastTime = point.time;
          }
        });
      });
    });
  }

  /**
   * Check if GPX file is suitable for mobile use
   */
  validateForMobile(gpxFile: GPXFile): GPXValidationResult {
    const result = this.validateGPXFile(gpxFile);

    // Additional mobile-specific validations
    const totalPoints = gpxFile.getNumberOfTrackPoints();

    if (totalPoints > 10000) {
      result.warnings.push(
        'Large number of points may impact mobile performance'
      );
    }

    if (totalPoints === 0) {
      result.errors.push(
        'GPX file has no track points - not suitable for mobile display'
      );
      result.isValid = false;
    }

    // Check for complex extensions that might not be supported
    gpxFile.trk.forEach((track, trackIndex) => {
      track.trkseg.forEach((segment) => {
        segment.trkpt.forEach((point) => {
          if (point.extensions && Object.keys(point.extensions).length > 3) {
            result.warnings.push(
              `Track ${trackIndex + 1} has complex extensions that may not be fully supported on mobile`
            );
          }
        });
      });
    });

    return result;
  }
}
