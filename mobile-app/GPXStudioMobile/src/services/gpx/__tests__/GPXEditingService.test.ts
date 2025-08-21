import { GPXEditingService } from '../GPXEditingService';
import { MobileGPXFile } from '../../../types/gpx';
import { WaypointEditData, TrackEditData } from '../../../types/editing';

// Mock GPX file for testing
const createMockGPXFile = (): MobileGPXFile => ({
  id: 'test-gpx-1',
  metadata: {
    id: 'test-gpx-1',
    filename: 'test.gpx',
    name: 'Test GPX',
    createdAt: new Date(),
    modifiedAt: new Date(),
    fileSize: 1024,
    trackCount: 1,
    waypointCount: 1,
    totalDistance: 1000,
    elevationGain: 100,
    elevationLoss: 50,
    bounds: {
      north: 40.0,
      south: 39.0,
      east: -74.0,
      west: -75.0,
    },
    filePath: '/test/path/test.gpx',
  },
  gpxFile: {
    tracks: [
      {
        name: 'Test Track',
        extensions: { id: 'track-1' },
        segments: [
          {
            points: [
              { lat: 39.5, lon: -74.5, ele: 100 },
              { lat: 39.6, lon: -74.4, ele: 110 },
              { lat: 39.7, lon: -74.3, ele: 120 },
            ],
          },
        ],
      },
    ],
    waypoints: [
      {
        lat: 39.55,
        lon: -74.45,
        ele: 105,
        name: 'Test Waypoint',
        extensions: { id: 'waypoint-1' },
      },
    ],
    clone: jest.fn().mockReturnThis(),
  },
});

describe('GPXEditingService', () => {
  let editingService: GPXEditingService;
  let mockGpxFile: MobileGPXFile;

  beforeEach(() => {
    editingService = new GPXEditingService();
    mockGpxFile = createMockGPXFile();
  });

  describe('Waypoint Operations', () => {
    describe('addWaypoint', () => {
      it('should add a waypoint to the GPX file', () => {
        const waypointData: WaypointEditData = {
          latitude: 40.0,
          longitude: -75.0,
          elevation: 200,
          name: 'New Waypoint',
          description: 'A test waypoint',
        };

        const { gpxFile, operation } = editingService.addWaypoint(
          mockGpxFile,
          waypointData
        );

        expect(gpxFile.gpxFile.waypoints).toHaveLength(2);
        expect(gpxFile.gpxFile.waypoints[1]).toMatchObject({
          lat: 40.0,
          lon: -75.0,
          ele: 200,
          name: 'New Waypoint',
          desc: 'A test waypoint',
        });
        expect(operation.type).toBe('add_waypoint');
        expect(operation.inverse?.type).toBe('delete_waypoint');
      });

      it('should throw error for invalid coordinates', () => {
        const waypointData: WaypointEditData = {
          latitude: 91, // Invalid latitude
          longitude: -75.0,
        };

        expect(() =>
          editingService.addWaypoint(mockGpxFile, waypointData)
        ).toThrow('Invalid waypoint data');
      });
    });

    describe('deleteWaypoint', () => {
      it('should delete a waypoint from the GPX file', () => {
        const { gpxFile, operation } = editingService.deleteWaypoint(
          mockGpxFile,
          'waypoint-1'
        );

        expect(gpxFile.gpxFile.waypoints).toHaveLength(0);
        expect(operation.type).toBe('delete_waypoint');
        expect(operation.inverse?.type).toBe('add_waypoint');
      });

      it('should throw error for non-existent waypoint', () => {
        expect(() =>
          editingService.deleteWaypoint(mockGpxFile, 'non-existent')
        ).toThrow('Waypoint with ID non-existent not found');
      });
    });

    describe('moveWaypoint', () => {
      it('should move a waypoint to new coordinates', () => {
        const { gpxFile, operation } = editingService.moveWaypoint(
          mockGpxFile,
          'waypoint-1',
          40.0,
          -75.0,
          150
        );

        const waypoint = gpxFile.gpxFile.waypoints[0];
        expect(waypoint.lat).toBe(40.0);
        expect(waypoint.lon).toBe(-75.0);
        expect(waypoint.ele).toBe(150);
        expect(operation.type).toBe('move_waypoint');
      });
    });

    describe('editWaypointProperties', () => {
      it('should update waypoint properties', () => {
        const properties = {
          name: 'Updated Waypoint',
          description: 'Updated description',
        };

        const { gpxFile, operation } = editingService.editWaypointProperties(
          mockGpxFile,
          'waypoint-1',
          properties
        );

        const waypoint = gpxFile.gpxFile.waypoints[0];
        expect(waypoint.name).toBe('Updated Waypoint');
        expect(waypoint.desc).toBe('Updated description');
        expect(operation.type).toBe('edit_waypoint_properties');
      });
    });
  });

  describe('Track Point Operations', () => {
    describe('addTrackPoint', () => {
      it('should add a track point to a track segment', () => {
        const pointData = {
          trackId: 'track-1',
          segmentIndex: 0,
          pointIndex: 1,
          latitude: 39.55,
          longitude: -74.45,
          elevation: 105,
        };

        const { gpxFile, operation } = editingService.addTrackPoint(
          mockGpxFile,
          'track-1',
          0,
          1,
          pointData
        );

        const points = gpxFile.gpxFile.tracks[0].segments[0].points;
        expect(points).toHaveLength(4);
        expect(points[1]).toMatchObject({
          lat: 39.55,
          lon: -74.45,
          ele: 105,
        });
        expect(operation.type).toBe('add_track_point');
      });

      it('should throw error for non-existent track', () => {
        const pointData = {
          trackId: 'non-existent',
          segmentIndex: 0,
          pointIndex: 0,
          latitude: 39.55,
          longitude: -74.45,
        };

        expect(() =>
          editingService.addTrackPoint(
            mockGpxFile,
            'non-existent',
            0,
            0,
            pointData
          )
        ).toThrow('Track with ID non-existent not found');
      });
    });

    describe('deleteTrackPoint', () => {
      it('should delete a track point from a track segment', () => {
        const { gpxFile, operation } = editingService.deleteTrackPoint(
          mockGpxFile,
          'track-1',
          0,
          1
        );

        const points = gpxFile.gpxFile.tracks[0].segments[0].points;
        expect(points).toHaveLength(2);
        expect(operation.type).toBe('delete_track_point');
      });
    });

    describe('moveTrackPoint', () => {
      it('should move a track point to new coordinates', () => {
        const { gpxFile, operation } = editingService.moveTrackPoint(
          mockGpxFile,
          'track-1',
          0,
          1,
          40.0,
          -75.0,
          200
        );

        const point = gpxFile.gpxFile.tracks[0].segments[0].points[1];
        expect(point.lat).toBe(40.0);
        expect(point.lon).toBe(-75.0);
        expect(point.ele).toBe(200);
        expect(operation.type).toBe('move_track_point');
      });
    });
  });

  describe('Track Operations', () => {
    describe('editTrackProperties', () => {
      it('should update track properties', () => {
        const properties: Partial<TrackEditData> = {
          name: 'Updated Track',
          description: 'Updated description',
          color: '#FF0000',
          width: 5,
          opacity: 0.8,
        };

        const { gpxFile, operation } = editingService.editTrackProperties(
          mockGpxFile,
          'track-1',
          properties
        );

        const track = gpxFile.gpxFile.tracks[0];
        expect(track.name).toBe('Updated Track');
        expect(track.desc).toBe('Updated description');
        expect(track.extensions.line_style.color).toBe('#FF0000');
        expect(track.extensions.line_style.width).toBe(5);
        expect(track.extensions.line_style.opacity).toBe(0.8);
        expect(operation.type).toBe('edit_track_properties');
      });
    });
  });

  describe('Undo/Redo Operations', () => {
    it('should support undo functionality', () => {
      const waypointData: WaypointEditData = {
        latitude: 40.0,
        longitude: -75.0,
        name: 'Test Waypoint',
      };

      // Add waypoint
      editingService.addWaypoint(mockGpxFile, waypointData);

      // Check undo is available
      expect(editingService.canUndo()).toBe(true);
      expect(editingService.canRedo()).toBe(false);

      // Perform undo
      const undoOperation = editingService.undo();
      expect(undoOperation).toBeTruthy();
      expect(undoOperation?.type).toBe('delete_waypoint');

      // Check redo is now available
      expect(editingService.canUndo()).toBe(false);
      expect(editingService.canRedo()).toBe(true);
    });

    it('should support redo functionality', () => {
      const waypointData: WaypointEditData = {
        latitude: 40.0,
        longitude: -75.0,
        name: 'Test Waypoint',
      };

      // Add waypoint and undo
      editingService.addWaypoint(mockGpxFile, waypointData);
      editingService.undo();

      // Perform redo
      const redoOperation = editingService.redo();
      expect(redoOperation).toBeTruthy();
      expect(redoOperation?.type).toBe('add_waypoint');

      // Check undo is available again
      expect(editingService.canUndo()).toBe(true);
      expect(editingService.canRedo()).toBe(false);
    });

    it('should clear operations', () => {
      const waypointData: WaypointEditData = {
        latitude: 40.0,
        longitude: -75.0,
        name: 'Test Waypoint',
      };

      editingService.addWaypoint(mockGpxFile, waypointData);
      expect(editingService.canUndo()).toBe(true);

      editingService.clearOperations();
      expect(editingService.canUndo()).toBe(false);
      expect(editingService.canRedo()).toBe(false);
    });
  });

  describe('Validation', () => {
    it('should validate GPX file successfully', () => {
      const result = editingService.validateGPXFile(mockGpxFile);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid coordinates', () => {
      // Create GPX file with invalid coordinates
      const invalidGpxFile = createMockGPXFile();
      invalidGpxFile.gpxFile.waypoints[0].lat = 91; // Invalid latitude

      const result = editingService.validateGPXFile(invalidGpxFile);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Invalid latitude');
    });

    it('should detect tracks with insufficient points', () => {
      const invalidGpxFile = createMockGPXFile();
      invalidGpxFile.gpxFile.tracks[0].segments[0].points = [
        { lat: 39.5, lon: -74.5, ele: 100 },
      ]; // Only one point

      const result = editingService.validateGPXFile(invalidGpxFile);

      expect(result.isValid).toBe(true); // Should be valid but with warnings
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].message).toContain('fewer than 2 points');
    });
  });

  describe('Configuration', () => {
    it('should respect maximum undo operations limit', () => {
      const limitedService = new GPXEditingService({ maxUndoOperations: 2 });

      const waypointData: WaypointEditData = {
        latitude: 40.0,
        longitude: -75.0,
        name: 'Test Waypoint',
      };

      // Add 3 operations
      limitedService.addWaypoint(mockGpxFile, waypointData);
      limitedService.addWaypoint(mockGpxFile, {
        ...waypointData,
        latitude: 41.0,
      });
      limitedService.addWaypoint(mockGpxFile, {
        ...waypointData,
        latitude: 42.0,
      });

      const operations = limitedService.getOperations();
      expect(operations).toHaveLength(2); // Should be limited to 2
    });

    it('should respect minimum track point distance', () => {
      const strictService = new GPXEditingService({
        minTrackPointDistance: 100,
      });

      const pointData = {
        trackId: 'track-1',
        segmentIndex: 0,
        pointIndex: 1,
        latitude: 39.5001, // Very close to existing point
        longitude: -74.5001,
      };

      expect(() =>
        strictService.addTrackPoint(mockGpxFile, 'track-1', 0, 1, pointData)
      ).toThrow('Track point too close to existing point');
    });
  });
});
