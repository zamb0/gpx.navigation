import { MapService } from '../MapService';
import { MapBounds, MapProvider } from '../../../types/map';
import { GPXFileMetadata } from '../../../types/gpx';

// Mock the TileCacheService
jest.mock('../TileCacheService');

describe('MapService', () => {
  let mapService: MapService;

  beforeEach(() => {
    mapService = new MapService({
      defaultProvider: 'openStreetMap',
      enableCaching: true,
      maxCacheSize: 100 * 1024 * 1024, // 100MB for testing
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Map Provider Management', () => {
    it('should initialize with default provider', () => {
      const currentProvider = mapService.getCurrentProvider();
      expect(currentProvider.id).toBe('openStreetMap');
      expect(currentProvider.name).toBe('OpenStreetMap');
    });

    it('should set map provider successfully', () => {
      const result = mapService.setMapProvider('satellite');
      expect(result).toBe(true);

      const currentProvider = mapService.getCurrentProvider();
      expect(currentProvider.id).toBe('satellite');
    });

    it('should fail to set invalid map provider', () => {
      const result = mapService.setMapProvider('invalidProvider');
      expect(result).toBe(false);

      // Should keep current provider
      const currentProvider = mapService.getCurrentProvider();
      expect(currentProvider.id).toBe('openStreetMap');
    });

    it('should return all available providers', () => {
      const providers = mapService.getAllProviders();
      expect(providers.length).toBeGreaterThan(0);
      expect(providers.some((p) => p.id === 'openStreetMap')).toBe(true);
      expect(providers.some((p) => p.id === 'satellite')).toBe(true);
    });
  });

  describe('Bounds Calculation', () => {
    it('should calculate bounds for GPX files', () => {
      const gpxFiles: GPXFileMetadata[] = [
        {
          id: '1',
          filename: 'track1.gpx',
          createdAt: new Date(),
          modifiedAt: new Date(),
          fileSize: 1000,
          trackCount: 1,
          waypointCount: 0,
          totalDistance: 5000,
          elevationGain: 100,
          elevationLoss: 50,
          bounds: { north: 45.5, south: 45.4, east: -122.6, west: -122.7 },
          filePath: '/path/to/track1.gpx',
        },
        {
          id: '2',
          filename: 'track2.gpx',
          createdAt: new Date(),
          modifiedAt: new Date(),
          fileSize: 1500,
          trackCount: 1,
          waypointCount: 2,
          totalDistance: 3000,
          elevationGain: 200,
          elevationLoss: 150,
          bounds: { north: 45.6, south: 45.3, east: -122.5, west: -122.8 },
          filePath: '/path/to/track2.gpx',
        },
      ];

      const bounds = mapService.calculateBoundsForGPXFiles(gpxFiles);

      expect(bounds).not.toBeNull();
      expect(bounds!.north).toBe(45.6);
      expect(bounds!.south).toBe(45.3);
      expect(bounds!.east).toBe(-122.5);
      expect(bounds!.west).toBe(-122.8);
    });

    it('should return null for empty GPX files array', () => {
      const bounds = mapService.calculateBoundsForGPXFiles([]);
      expect(bounds).toBeNull();
    });

    it('should calculate bounds for coordinates', () => {
      const coordinates = [
        { latitude: 45.5, longitude: -122.6 },
        { latitude: 45.4, longitude: -122.7 },
        { latitude: 45.6, longitude: -122.5 },
      ];

      const bounds = mapService.calculateBoundsForCoordinates(coordinates);

      expect(bounds).not.toBeNull();
      expect(bounds!.north).toBe(45.6);
      expect(bounds!.south).toBe(45.4);
      expect(bounds!.east).toBe(-122.5);
      expect(bounds!.west).toBe(-122.7);
    });

    it('should expand bounds with padding', () => {
      const originalBounds: MapBounds = {
        north: 45.5,
        south: 45.4,
        east: -122.6,
        west: -122.7,
      };

      const expandedBounds = mapService.expandBounds(originalBounds, 0.1);

      expect(expandedBounds.north).toBeGreaterThan(originalBounds.north);
      expect(expandedBounds.south).toBeLessThan(originalBounds.south);
      expect(expandedBounds.east).toBeGreaterThan(originalBounds.east);
      expect(expandedBounds.west).toBeLessThan(originalBounds.west);
    });
  });

  describe('View State Calculation', () => {
    it('should calculate optimal view state for bounds', () => {
      const bounds: MapBounds = {
        north: 45.5,
        south: 45.4,
        east: -122.6,
        west: -122.7,
      };
      const mapDimensions = { width: 400, height: 600 };

      const viewState = mapService.calculateOptimalViewState(
        bounds,
        mapDimensions
      );

      expect(viewState.center.latitude).toBe(45.45);
      expect(viewState.center.longitude).toBe(-122.65);
      expect(viewState.zoom).toBeGreaterThan(0);
      expect(viewState.zoom).toBeLessThanOrEqual(20);
      expect(viewState.bearing).toBe(0);
      expect(viewState.pitch).toBe(0);
    });
  });

  describe('Distance and Bearing Calculations', () => {
    it('should calculate distance between coordinates', () => {
      const coord1 = { latitude: 45.5, longitude: -122.6 };
      const coord2 = { latitude: 45.4, longitude: -122.7 };

      const distance = mapService.calculateDistance(coord1, coord2);

      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(20000); // Should be reasonable distance
    });

    it('should calculate bearing between coordinates', () => {
      const coord1 = { latitude: 45.5, longitude: -122.6 };
      const coord2 = { latitude: 45.4, longitude: -122.7 };

      const bearing = mapService.calculateBearing(coord1, coord2);

      expect(bearing).toBeGreaterThanOrEqual(0);
      expect(bearing).toBeLessThan(360);
    });

    it('should check if point is in bounds', () => {
      const bounds: MapBounds = {
        north: 45.5,
        south: 45.4,
        east: -122.6,
        west: -122.7,
      };

      const pointInside = { latitude: 45.45, longitude: -122.65 };
      const pointOutside = { latitude: 46.0, longitude: -122.0 };

      expect(mapService.isPointInBounds(pointInside, bounds)).toBe(true);
      expect(mapService.isPointInBounds(pointOutside, bounds)).toBe(false);
    });
  });

  describe('Interaction Handling', () => {
    it('should add and remove interaction listeners', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      mapService.addInteractionListener(listener1);
      mapService.addInteractionListener(listener2);

      const event = {
        type: 'tap' as const,
        coordinate: { latitude: 45.5, longitude: -122.6 },
        timestamp: new Date(),
      };

      mapService.handleMapInteraction(event);

      expect(listener1).toHaveBeenCalledWith(event);
      expect(listener2).toHaveBeenCalledWith(event);

      mapService.removeInteractionListener(listener1);
      mapService.handleMapInteraction(event);

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(2);
    });

    it('should handle listener errors gracefully', () => {
      const errorListener = jest.fn(() => {
        throw new Error('Test error');
      });
      const normalListener = jest.fn();

      mapService.addInteractionListener(errorListener);
      mapService.addInteractionListener(normalListener);

      const event = {
        type: 'tap' as const,
        coordinate: { latitude: 45.5, longitude: -122.6 },
        timestamp: new Date(),
      };

      // Should not throw error
      expect(() => mapService.handleMapInteraction(event)).not.toThrow();

      expect(errorListener).toHaveBeenCalled();
      expect(normalListener).toHaveBeenCalled();
    });
  });
});
