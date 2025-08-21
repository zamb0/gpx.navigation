import { MobileGPXFile } from '../../types/gpx';
import {
  EditOperation,
  EditOperationType,
  WaypointEditData,
  TrackEditData,
  TrackPointEditData,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  EditingConfig,
  DEFAULT_EDITING_CONFIG,
  TrackPointSelection,
} from '../../types/editing';

/**
 * Service for editing GPX files with undo/redo functionality and validation
 */
export class GPXEditingService {
  private config: EditingConfig;
  private operations: EditOperation[] = [];
  private currentOperationIndex: number = -1;

  constructor(config: Partial<EditingConfig> = {}) {
    this.config = { ...DEFAULT_EDITING_CONFIG, ...config };
  }

  /**
   * Add a waypoint to the GPX file
   */
  addWaypoint(
    gpxFile: MobileGPXFile,
    waypointData: WaypointEditData
  ): { gpxFile: MobileGPXFile; operation: EditOperation } {
    // Validate waypoint data
    const validation = this.validateWaypointData(waypointData);
    if (!validation.isValid) {
      throw new Error(
        `Invalid waypoint data: ${validation.errors.map((e) => e.message).join(', ')}`
      );
    }

    // Check waypoint limit
    const currentWaypointCount = gpxFile.gpxFile.waypoints?.length || 0;
    if (currentWaypointCount >= this.config.maxWaypoints) {
      throw new Error(
        `Maximum waypoint limit (${this.config.maxWaypoints}) reached`
      );
    }

    // Create new waypoint
    const waypoint: any = {
      lat: waypointData.latitude,
      lon: waypointData.longitude,
      ele: waypointData.elevation,
      name: waypointData.name,
      desc: waypointData.description,
      cmt: waypointData.comment,
      sym: waypointData.symbol,
      type: waypointData.type,
      time: waypointData.time,
    };

    // Generate unique ID for the waypoint
    const waypointId = this.generateId();
    if (!waypoint.extensions) waypoint.extensions = {};
    waypoint.extensions.id = waypointId;

    // Clone GPX file and add waypoint
    const newGpxFile = this.cloneGPXFile(gpxFile);
    if (!newGpxFile.gpxFile.waypoints) {
      newGpxFile.gpxFile.waypoints = [];
    }
    newGpxFile.gpxFile.waypoints.push(waypoint);

    // Create operation for undo/redo
    const operation: EditOperation = {
      id: this.generateId(),
      type: 'add_waypoint',
      timestamp: new Date(),
      data: { waypointId, waypoint: { ...waypoint } },
      inverse: {
        id: this.generateId(),
        type: 'delete_waypoint',
        timestamp: new Date(),
        data: { waypointId },
      },
    };

    this.addOperation(operation);

    return { gpxFile: newGpxFile, operation };
  }

  /**
   * Delete a waypoint from the GPX file
   */
  deleteWaypoint(
    gpxFile: MobileGPXFile,
    waypointId: string
  ): { gpxFile: MobileGPXFile; operation: EditOperation } {
    const waypoints = gpxFile.gpxFile.waypoints || [];
    const waypointIndex = waypoints.findIndex(
      (wp: any) => wp.extensions?.id === waypointId
    );

    if (waypointIndex === -1) {
      throw new Error(`Waypoint with ID ${waypointId} not found`);
    }

    const waypoint = waypoints[waypointIndex];
    const newGpxFile = this.cloneGPXFile(gpxFile);
    newGpxFile.gpxFile.waypoints!.splice(waypointIndex, 1);

    const operation: EditOperation = {
      id: this.generateId(),
      type: 'delete_waypoint',
      timestamp: new Date(),
      data: { waypointId, waypointIndex },
      inverse: {
        id: this.generateId(),
        type: 'add_waypoint',
        timestamp: new Date(),
        data: {
          waypointId,
          waypoint: { ...waypoint },
          insertIndex: waypointIndex,
        },
      },
    };

    this.addOperation(operation);

    return { gpxFile: newGpxFile, operation };
  }

  /**
   * Move a waypoint to a new position
   */
  moveWaypoint(
    gpxFile: MobileGPXFile,
    waypointId: string,
    newLatitude: number,
    newLongitude: number,
    newElevation?: number
  ): { gpxFile: MobileGPXFile; operation: EditOperation } {
    const waypoints = gpxFile.gpxFile.waypoints || [];
    const waypointIndex = waypoints.findIndex(
      (wp: any) => wp.extensions?.id === waypointId
    );

    if (waypointIndex === -1) {
      throw new Error(`Waypoint with ID ${waypointId} not found`);
    }

    const waypoint = waypoints[waypointIndex];
    const oldPosition = {
      latitude: waypoint.lat,
      longitude: waypoint.lon,
      elevation: waypoint.ele,
    };

    const newGpxFile = this.cloneGPXFile(gpxFile);
    const newWaypoint = newGpxFile.gpxFile.waypoints![waypointIndex];
    newWaypoint.lat = newLatitude;
    newWaypoint.lon = newLongitude;
    if (newElevation !== undefined) {
      newWaypoint.ele = newElevation;
    }

    const operation: EditOperation = {
      id: this.generateId(),
      type: 'move_waypoint',
      timestamp: new Date(),
      data: {
        waypointId,
        newPosition: { newLatitude, newLongitude, newElevation },
      },
      inverse: {
        id: this.generateId(),
        type: 'move_waypoint',
        timestamp: new Date(),
        data: { waypointId, newPosition: oldPosition },
      },
    };

    this.addOperation(operation);

    return { gpxFile: newGpxFile, operation };
  }

  /**
   * Edit waypoint properties
   */
  editWaypointProperties(
    gpxFile: MobileGPXFile,
    waypointId: string,
    properties: Partial<WaypointEditData>
  ): { gpxFile: MobileGPXFile; operation: EditOperation } {
    const waypoints = gpxFile.gpxFile.waypoints || [];
    const waypointIndex = waypoints.findIndex(
      (wp: any) => wp.extensions?.id === waypointId
    );

    if (waypointIndex === -1) {
      throw new Error(`Waypoint with ID ${waypointId} not found`);
    }

    const waypoint = waypoints[waypointIndex];
    const oldProperties = {
      name: waypoint.name,
      description: waypoint.desc,
      comment: waypoint.cmt,
      symbol: waypoint.sym,
      type: waypoint.type,
    };

    const newGpxFile = this.cloneGPXFile(gpxFile);
    const newWaypoint = newGpxFile.gpxFile.waypoints![waypointIndex];

    if (properties.name !== undefined) newWaypoint.name = properties.name;
    if (properties.description !== undefined)
      newWaypoint.desc = properties.description;
    if (properties.comment !== undefined) newWaypoint.cmt = properties.comment;
    if (properties.symbol !== undefined) newWaypoint.sym = properties.symbol;
    if (properties.type !== undefined) newWaypoint.type = properties.type;

    const operation: EditOperation = {
      id: this.generateId(),
      type: 'edit_waypoint_properties',
      timestamp: new Date(),
      data: { waypointId, properties },
      inverse: {
        id: this.generateId(),
        type: 'edit_waypoint_properties',
        timestamp: new Date(),
        data: { waypointId, properties: oldProperties },
      },
    };

    this.addOperation(operation);

    return { gpxFile: newGpxFile, operation };
  }

  /**
   * Add a track point to a track segment
   */
  addTrackPoint(
    gpxFile: MobileGPXFile,
    trackId: string,
    segmentIndex: number,
    insertIndex: number,
    pointData: TrackPointEditData
  ): { gpxFile: MobileGPXFile; operation: EditOperation } {
    const tracks = gpxFile.gpxFile.tracks || [];
    const trackIndex = tracks.findIndex(
      (t: any) => t.extensions?.id === trackId
    );

    if (trackIndex === -1) {
      throw new Error(`Track with ID ${trackId} not found`);
    }

    const track = tracks[trackIndex];
    const segments = track.segments || [];

    if (segmentIndex >= segments.length) {
      throw new Error(`Segment index ${segmentIndex} out of bounds`);
    }

    const segment = segments[segmentIndex];
    const points = segment.points || [];

    // Check track point limit
    if (points.length >= this.config.maxTrackPoints) {
      throw new Error(
        `Maximum track point limit (${this.config.maxTrackPoints}) reached`
      );
    }

    // Validate minimum distance if configured
    if (this.config.minTrackPointDistance > 0 && points.length > 0) {
      const nearbyPoints = [
        points[insertIndex - 1],
        points[insertIndex],
      ].filter(Boolean);

      for (const nearbyPoint of nearbyPoints) {
        const distance = this.calculateDistance(
          pointData.latitude,
          pointData.longitude,
          nearbyPoint.lat,
          nearbyPoint.lon
        );

        if (distance < this.config.minTrackPointDistance) {
          throw new Error(
            `Track point too close to existing point (minimum distance: ${this.config.minTrackPointDistance}m)`
          );
        }
      }
    }

    const trackPoint: any = {
      lat: pointData.latitude,
      lon: pointData.longitude,
      ele: pointData.elevation,
      time: pointData.time,
    };

    const newGpxFile = this.cloneGPXFile(gpxFile);
    const newSegment =
      newGpxFile.gpxFile.tracks![trackIndex].segments![segmentIndex];
    newSegment.points!.splice(insertIndex, 0, trackPoint);

    const operation: EditOperation = {
      id: this.generateId(),
      type: 'add_track_point',
      timestamp: new Date(),
      data: {
        trackId,
        segmentIndex,
        insertIndex,
        trackPoint: { ...trackPoint },
      },
      inverse: {
        id: this.generateId(),
        type: 'delete_track_point',
        timestamp: new Date(),
        data: { trackId, segmentIndex, pointIndex: insertIndex },
      },
    };

    this.addOperation(operation);

    return { gpxFile: newGpxFile, operation };
  }

  /**
   * Delete a track point
   */
  deleteTrackPoint(
    gpxFile: MobileGPXFile,
    trackId: string,
    segmentIndex: number,
    pointIndex: number
  ): { gpxFile: MobileGPXFile; operation: EditOperation } {
    const tracks = gpxFile.gpxFile.tracks || [];
    const trackIndex = tracks.findIndex(
      (t: any) => t.extensions?.id === trackId
    );

    if (trackIndex === -1) {
      throw new Error(`Track with ID ${trackId} not found`);
    }

    const track = tracks[trackIndex];
    const segments = track.segments || [];

    if (segmentIndex >= segments.length) {
      throw new Error(`Segment index ${segmentIndex} out of bounds`);
    }

    const segment = segments[segmentIndex];
    const points = segment.points || [];

    if (pointIndex >= points.length) {
      throw new Error(`Point index ${pointIndex} out of bounds`);
    }

    const trackPoint = points[pointIndex];
    const newGpxFile = this.cloneGPXFile(gpxFile);
    newGpxFile.gpxFile.tracks![trackIndex].segments![
      segmentIndex
    ].points!.splice(pointIndex, 1);

    const operation: EditOperation = {
      id: this.generateId(),
      type: 'delete_track_point',
      timestamp: new Date(),
      data: { trackId, segmentIndex, pointIndex },
      inverse: {
        id: this.generateId(),
        type: 'add_track_point',
        timestamp: new Date(),
        data: {
          trackId,
          segmentIndex,
          insertIndex: pointIndex,
          trackPoint: { ...trackPoint },
        },
      },
    };

    this.addOperation(operation);

    return { gpxFile: newGpxFile, operation };
  }

  /**
   * Move a track point to a new position
   */
  moveTrackPoint(
    gpxFile: MobileGPXFile,
    trackId: string,
    segmentIndex: number,
    pointIndex: number,
    newLatitude: number,
    newLongitude: number,
    newElevation?: number
  ): { gpxFile: MobileGPXFile; operation: EditOperation } {
    const tracks = gpxFile.gpxFile.tracks || [];
    const trackIndex = tracks.findIndex(
      (t: any) => t.extensions?.id === trackId
    );

    if (trackIndex === -1) {
      throw new Error(`Track with ID ${trackId} not found`);
    }

    const track = tracks[trackIndex];
    const segments = track.segments || [];

    if (segmentIndex >= segments.length) {
      throw new Error(`Segment index ${segmentIndex} out of bounds`);
    }

    const segment = segments[segmentIndex];
    const points = segment.points || [];

    if (pointIndex >= points.length) {
      throw new Error(`Point index ${pointIndex} out of bounds`);
    }

    const trackPoint = points[pointIndex];
    const oldPosition = {
      latitude: trackPoint.lat,
      longitude: trackPoint.lon,
      elevation: trackPoint.ele,
    };

    const newGpxFile = this.cloneGPXFile(gpxFile);
    const newTrackPoint =
      newGpxFile.gpxFile.tracks![trackIndex].segments![segmentIndex].points![
        pointIndex
      ];
    newTrackPoint.lat = newLatitude;
    newTrackPoint.lon = newLongitude;
    if (newElevation !== undefined) {
      newTrackPoint.ele = newElevation;
    }

    const operation: EditOperation = {
      id: this.generateId(),
      type: 'move_track_point',
      timestamp: new Date(),
      data: {
        trackId,
        segmentIndex,
        pointIndex,
        newPosition: { newLatitude, newLongitude, newElevation },
      },
      inverse: {
        id: this.generateId(),
        type: 'move_track_point',
        timestamp: new Date(),
        data: { trackId, segmentIndex, pointIndex, newPosition: oldPosition },
      },
    };

    this.addOperation(operation);

    return { gpxFile: newGpxFile, operation };
  }

  /**
   * Edit track properties
   */
  editTrackProperties(
    gpxFile: MobileGPXFile,
    trackId: string,
    properties: Partial<TrackEditData>
  ): { gpxFile: MobileGPXFile; operation: EditOperation } {
    const tracks = gpxFile.gpxFile.tracks || [];
    const trackIndex = tracks.findIndex(
      (t: any) => t.extensions?.id === trackId
    );

    if (trackIndex === -1) {
      throw new Error(`Track with ID ${trackId} not found`);
    }

    const track = tracks[trackIndex];
    const oldProperties = {
      name: track.name,
      description: track.desc,
      comment: track.cmt,
      color: track.extensions?.line_style?.color,
      width: track.extensions?.line_style?.width,
      opacity: track.extensions?.line_style?.opacity,
    };

    const newGpxFile = this.cloneGPXFile(gpxFile);
    const newTrack = newGpxFile.gpxFile.tracks![trackIndex];

    if (properties.name !== undefined) newTrack.name = properties.name;
    if (properties.description !== undefined)
      newTrack.desc = properties.description;
    if (properties.comment !== undefined) newTrack.cmt = properties.comment;

    // Handle styling properties
    if (
      properties.color !== undefined ||
      properties.width !== undefined ||
      properties.opacity !== undefined
    ) {
      if (!newTrack.extensions) newTrack.extensions = {};
      if (!newTrack.extensions.line_style) newTrack.extensions.line_style = {};

      if (properties.color !== undefined)
        newTrack.extensions.line_style.color = properties.color;
      if (properties.width !== undefined)
        newTrack.extensions.line_style.width = properties.width;
      if (properties.opacity !== undefined)
        newTrack.extensions.line_style.opacity = properties.opacity;
    }

    const operation: EditOperation = {
      id: this.generateId(),
      type: 'edit_track_properties',
      timestamp: new Date(),
      data: { trackId, properties },
      inverse: {
        id: this.generateId(),
        type: 'edit_track_properties',
        timestamp: new Date(),
        data: { trackId, properties: oldProperties },
      },
    };

    this.addOperation(operation);

    return { gpxFile: newGpxFile, operation };
  }

  /**
   * Undo the last operation
   */
  undo(): EditOperation | null {
    if (!this.canUndo()) {
      return null;
    }

    const operation = this.operations[this.currentOperationIndex];
    this.currentOperationIndex--;
    return operation.inverse || null;
  }

  /**
   * Redo the next operation
   */
  redo(): EditOperation | null {
    if (!this.canRedo()) {
      return null;
    }

    this.currentOperationIndex++;
    const operation = this.operations[this.currentOperationIndex];
    return operation;
  }

  /**
   * Check if undo is possible
   */
  canUndo(): boolean {
    return this.currentOperationIndex >= 0;
  }

  /**
   * Check if redo is possible
   */
  canRedo(): boolean {
    return this.currentOperationIndex < this.operations.length - 1;
  }

  /**
   * Clear all operations
   */
  clearOperations(): void {
    this.operations = [];
    this.currentOperationIndex = -1;
  }

  /**
   * Get current operations for debugging
   */
  getOperations(): EditOperation[] {
    return [...this.operations];
  }

  /**
   * Validate GPX file after editing
   */
  validateGPXFile(gpxFile: MobileGPXFile): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate tracks
    const tracks = gpxFile.gpxFile.tracks || [];
    tracks.forEach((track: any, trackIndex: number) => {
      if (!track.segments || track.segments.length === 0) {
        warnings.push({
          type: 'track',
          message: `Track ${trackIndex + 1} has no segments`,
          details: { trackIndex },
        });
        return;
      }

      track.segments.forEach((segment: any, segmentIndex: number) => {
        if (!segment.points || segment.points.length < 2) {
          warnings.push({
            type: 'track',
            message: `Track ${trackIndex + 1}, segment ${segmentIndex + 1} has fewer than 2 points`,
            details: { trackIndex, segmentIndex },
          });
        }

        // Validate track points
        segment.points?.forEach((point: any, pointIndex: number) => {
          if (typeof point.lat !== 'number' || typeof point.lon !== 'number') {
            errors.push({
              type: 'track',
              message: `Invalid coordinates in track ${trackIndex + 1}, segment ${segmentIndex + 1}, point ${pointIndex + 1}`,
              details: { trackIndex, segmentIndex, pointIndex },
            });
          }

          if (Math.abs(point.lat) > 90) {
            errors.push({
              type: 'track',
              message: `Invalid latitude ${point.lat} in track ${trackIndex + 1}`,
              details: {
                trackIndex,
                segmentIndex,
                pointIndex,
                latitude: point.lat,
              },
            });
          }

          if (Math.abs(point.lon) > 180) {
            errors.push({
              type: 'track',
              message: `Invalid longitude ${point.lon} in track ${trackIndex + 1}`,
              details: {
                trackIndex,
                segmentIndex,
                pointIndex,
                longitude: point.lon,
              },
            });
          }
        });
      });
    });

    // Validate waypoints
    const waypoints = gpxFile.gpxFile.waypoints || [];
    waypoints.forEach((waypoint: any, waypointIndex: number) => {
      if (
        typeof waypoint.lat !== 'number' ||
        typeof waypoint.lon !== 'number'
      ) {
        errors.push({
          type: 'waypoint',
          message: `Invalid coordinates in waypoint ${waypointIndex + 1}`,
          details: { waypointIndex },
        });
      }

      if (Math.abs(waypoint.lat) > 90) {
        errors.push({
          type: 'waypoint',
          message: `Invalid latitude ${waypoint.lat} in waypoint ${waypointIndex + 1}`,
          details: { waypointIndex, latitude: waypoint.lat },
        });
      }

      if (Math.abs(waypoint.lon) > 180) {
        errors.push({
          type: 'waypoint',
          message: `Invalid longitude ${waypoint.lon} in waypoint ${waypointIndex + 1}`,
          details: { waypointIndex, longitude: waypoint.lon },
        });
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Private helper methods
   */
  private addOperation(operation: EditOperation): void {
    // Remove any operations after current index (for redo functionality)
    this.operations = this.operations.slice(0, this.currentOperationIndex + 1);

    // Add new operation
    this.operations.push(operation);
    this.currentOperationIndex++;

    // Limit operations to max count
    if (this.operations.length > this.config.maxUndoOperations) {
      this.operations.shift();
      this.currentOperationIndex--;
    }
  }

  private cloneGPXFile(gpxFile: MobileGPXFile): MobileGPXFile {
    return {
      ...gpxFile,
      gpxFile: gpxFile.gpxFile.clone(),
    };
  }

  private generateId(): string {
    return `edit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private validateWaypointData(data: WaypointEditData): ValidationResult {
    const errors: ValidationError[] = [];

    if (typeof data.latitude !== 'number' || Math.abs(data.latitude) > 90) {
      errors.push({
        type: 'waypoint',
        message: 'Invalid latitude',
        details: { latitude: data.latitude },
      });
    }

    if (typeof data.longitude !== 'number' || Math.abs(data.longitude) > 180) {
      errors.push({
        type: 'waypoint',
        message: 'Invalid longitude',
        details: { longitude: data.longitude },
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: [],
    };
  }

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}
