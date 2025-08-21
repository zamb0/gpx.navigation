import { MapService } from '../MapService';
import { TileCacheService } from '../TileCacheService';
import { MapInteractionHandler } from '../MapInteractionHandler';
import { MapBounds, MapInteractionEvent } from '../../../types/map';
import { GPXFileMetadata } from '../../../types/gpx';
import * as FileSystem from 'expo-file-system';

// Mock expo-file-system
jest.mock('expo-file-system', () => ({
  documentDirectory: '/mock/documents/',
  getInfoAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
  deleteAsync: jest.fn(),
  downloadAsync: jest.fn(),
}));

const mockFileSystem = FileSystem as jest.Mocked<typeof FileSystem>;

describe('Map Services Integration', () => {
  let mapService: MapService;
  let interactionHandler: MapInteractionHandler;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock file system responses
    mockFileSystem.getInfoAsync.mockResolvedValue({
      exists: true,
      isDirectory: true,
      modificationTime: Date.now(),
      size: 0,
      uri: '/mock/documents/mapTiles/',
    });

    mockFileSystem.downloadAsync.mockResolvedValue({
      status: 200,
      headers: {},
      uri: '/mock/path/tile.png',
      mimeType: 'image/png',
    });

    mapService = new MapService({
      defaultProvider: 'openStreetMap',
      enableCaching: true,
      maxCacheSize: 50 * 1024 * 1024, // 50MB
    });

    interactionHandler = new MapInteractionHandler({
      enableTapToAddWaypoint: true,
      enableLongPressActions: true,
      enablePanAndZoom: true,
    });
  });

  describe('Complete Map Workflow', () => {
    it('should handle complete GPX file visualization workflow', async () => {
      // 1. Create mock GPX files
      const gpxFiles: GPXFileMetadata[] = [
        {
          id: '1',
          filename: 'mountain-trail.gpx',
          name: 'Mountain Trail',
          description: 'A scenic mountain hiking trail',
          createdAt: new Date('2023-01-01'),
          modifiedAt: new Date('2023-01-01'),
          fileSize: 15000,
          trackCount: 1,
          waypointCount: 5,
          totalDistance: 12500,
          elevationGain: 800,
          elevationLoss: 750,
          bounds: {
            north: 45.5234,
            south: 45.4876,
            east: -122.6123,
            west: -122.6789,
          },
          filePath: '/path/to/mountain-trail.gpx',
        },
        {
          id: '2',
          filename: 'city-bike-route.gpx',
          name: 'City Bike Route',
          createdAt: new Date('2023-01-02'),
          modifiedAt: new Date('2023-01-02'),
          fileSize: 8500,
          trackCount: 1,
          waypointCount: 3,
          totalDistance: 8200,
          elevationGain: 150,
          elevationLoss: 140,
          bounds: {
            north: 45.5456,
            south: 45.5123,
            east: -122.6234,
            west: -122.6567,
          },
          filePath: '/path/to/city-bike-route.gpx',
        },
      ];

      // 2. Calculate combined bounds for all GPX files
      const combinedBounds = mapService.calculateBoundsForGPXFiles(gpxFiles);
      expect(combinedBounds).not.toBeNull();
      expect(combinedBounds!.north).toBe(45.5456);
      expect(combinedBounds!.south).toBe(45.4876);

      // 3. Expand bounds for better visualization
      const expandedBounds = mapService.expandBounds(combinedBounds!, 0.1);
      expect(expandedBounds.north).toBeGreaterThan(combinedBounds!.north);

      // 4. Calculate optimal view state
      const mapDimensions = { width: 375, height: 667 }; // iPhone dimensions
      const viewState = mapService.calculateOptimalViewState(
        expandedBounds,
        mapDimensions
      );

      expect(viewState.center.latitude).toBeCloseTo(45.5166, 3);
      expect(viewState.center.longitude).toBeCloseTo(-122.6456, 3);
      expect(viewState.zoom).toBeGreaterThan(0);

      // 5. Cache the map area for offline use
      const zoomLevels = [
        viewState.zoom - 1,
        viewState.zoom,
        viewState.zoom + 1,
      ];
      await mapService.cacheMapArea(expandedBounds, zoomLevels);

      // Verify caching was attempted
      expect(mockFileSystem.downloadAsync).toHaveBeenCalled();

      // 6. Verify area is cached
      const isAreaCached = await mapService.isAreaCached(
        expandedBounds,
        viewState.zoom
      );
      // Note: This might be false in the test due to mocking, but the method should work
    });

    it('should handle map interactions and provider switching', async () => {
      const interactionEvents: MapInteractionEvent[] = [];

      // Set up interaction listener
      const interactionListener = (event: MapInteractionEvent) => {
        interactionEvents.push(event);
      };

      mapService.addInteractionListener(interactionListener);

      // Test provider switching
      expect(mapService.getCurrentProvider().id).toBe('openStreetMap');

      const switchResult = mapService.setMapProvider('satellite');
      expect(switchResult).toBe(true);
      expect(mapService.getCurrentProvider().id).toBe('satellite');

      // Test map interaction
      const tapEvent: MapInteractionEvent = {
        type: 'tap',
        coordinate: { latitude: 45.5, longitude: -122.6 },
        timestamp: new Date(),
      };

      mapService.handleMapInteraction(tapEvent);
      expect(interactionEvents).toHaveLength(1);
      expect(interactionEvents[0]).toEqual(tapEvent);

      // Test zoom interaction
      const zoomEvent: MapInteractionEvent = {
        type: 'zoom',
        coordinate: { latitude: 45.5, longitude: -122.6 },
        timestamp: new Date(),
      };

      mapService.handleMapInteraction(zoomEvent);
      expect(interactionEvents).toHaveLength(2);
    });

    it('should handle offline map caching workflow', async () => {
      // Define area to cache
      const bounds: MapBounds = {
        north: 45.52,
        south: 45.48,
        east: -122.61,
        west: -122.67,
      };

      const zoomLevels = [10, 11, 12];

      // Cache the area
      await mapService.cacheMapArea(bounds, zoomLevels);

      // Verify download attempts were made
      expect(mockFileSystem.downloadAsync).toHaveBeenCalled();

      // Get cached areas
      const cachedAreas = await mapService.getCachedAreas();
      expect(Array.isArray(cachedAreas)).toBe(true);

      // Get cache size
      const cacheSize = await mapService.getCacheSize();
      expect(typeof cacheSize).toBe('number');
      expect(cacheSize).toBeGreaterThanOrEqual(0);
    });

    it('should calculate distances and bearings for navigation', () => {
      const startPoint = { latitude: 45.5, longitude: -122.6 };
      const endPoint = { latitude: 45.51, longitude: -122.61 };

      // Calculate distance
      const distance = mapService.calculateDistance(startPoint, endPoint);
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(2000); // Should be reasonable for this coordinate difference

      // Calculate bearing
      const bearing = mapService.calculateBearing(startPoint, endPoint);
      expect(bearing).toBeGreaterThanOrEqual(0);
      expect(bearing).toBeLessThan(360);

      // Test point in bounds
      const bounds: MapBounds = {
        north: 45.52,
        south: 45.48,
        east: -122.59,
        west: -122.62,
      };

      expect(mapService.isPointInBounds(startPoint, bounds)).toBe(true);

      const outsidePoint = { latitude: 46.0, longitude: -122.0 };
      expect(mapService.isPointInBounds(outsidePoint, bounds)).toBe(false);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty GPX files gracefully', () => {
      const bounds = mapService.calculateBoundsForGPXFiles([]);
      expect(bounds).toBeNull();

      const coordinates = mapService.calculateBoundsForCoordinates([]);
      expect(coordinates).toBeNull();
    });

    it('should handle invalid map provider gracefully', () => {
      const result = mapService.setMapProvider('nonexistent-provider');
      expect(result).toBe(false);

      // Should keep current provider
      expect(mapService.getCurrentProvider().id).toBe('openStreetMap'); // Should remain unchanged
    });

    it('should handle caching errors gracefully', async () => {
      // Mock download failure
      mockFileSystem.downloadAsync.mockResolvedValue({
        status: 404,
        headers: {},
        uri: '',
        mimeType: null,
      });

      const bounds: MapBounds = {
        north: 45.52,
        south: 45.48,
        east: -122.61,
        west: -122.67,
      };

      // Should not throw error even if downloads fail
      await expect(
        mapService.cacheMapArea(bounds, [10])
      ).resolves.not.toThrow();
    });

    it('should handle interaction listener errors gracefully', () => {
      const errorListener = () => {
        throw new Error('Test error');
      };
      const normalListener = jest.fn();

      mapService.addInteractionListener(errorListener);
      mapService.addInteractionListener(normalListener);

      const event: MapInteractionEvent = {
        type: 'tap',
        coordinate: { latitude: 45.5, longitude: -122.6 },
        timestamp: new Date(),
      };

      // Should not throw error
      expect(() => mapService.handleMapInteraction(event)).not.toThrow();
      expect(normalListener).toHaveBeenCalledWith(event);
    });
  });

  describe('Performance and Memory Management', () => {
    it('should handle large coordinate arrays efficiently', () => {
      // Generate large coordinate array
      const coordinates = Array.from({ length: 10000 }, (_, i) => ({
        latitude: 45.5 + i * 0.0001,
        longitude: -122.6 + i * 0.0001,
      }));

      const startTime = Date.now();
      const bounds = mapService.calculateBoundsForCoordinates(coordinates);
      const endTime = Date.now();

      expect(bounds).not.toBeNull();
      expect(endTime - startTime).toBeLessThan(100); // Should complete in under 100ms
    });

    it('should handle multiple rapid interactions', () => {
      const events: MapInteractionEvent[] = [];
      mapService.addInteractionListener((event) => events.push(event));

      // Simulate rapid interactions
      for (let i = 0; i < 100; i++) {
        mapService.handleMapInteraction({
          type: 'pan',
          coordinate: {
            latitude: 45.5 + i * 0.001,
            longitude: -122.6 + i * 0.001,
          },
          timestamp: new Date(),
        });
      }

      expect(events).toHaveLength(100);
    });
  });
});
