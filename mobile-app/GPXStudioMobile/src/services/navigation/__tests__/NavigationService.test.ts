import { NavigationService } from '../NavigationService';
import { LocationService } from '../../location/LocationService';
import {
  NavigationMode,
  NavigationState,
  NavigationSettings,
} from '../../../types/navigation';
import { MobileGPXFile } from '../../../types/gpx';
import { LocationCoordinate } from '../../../types/location';

// Mock LocationService
jest.mock('../../location/LocationService', () => ({
  LocationService: {
    getInstance: jest.fn(() => ({
      startTracking: jest.fn(),
      stopTracking: jest.fn(),
      onLocationUpdate: jest.fn(),
      onLocationError: jest.fn(),
      getCurrentLocation: jest.fn(),
      getPermissionStatus: jest.fn(),
      requestPermissions: jest.fn(),
    })),
  },
}));

describe('NavigationService', () => {
  let navigationService: NavigationService;
  let mockLocationService: jest.Mocked<LocationService>;
  let mockGPXFile: MobileGPXFile;

  beforeEach(() => {
    // Setup LocationService mock first
    mockLocationService = {
      startTracking: jest.fn().mockResolvedValue(undefined),
      stopTracking: jest.fn().mockResolvedValue(undefined),
      onLocationUpdate: jest.fn().mockReturnValue(() => {}),
      onLocationError: jest.fn().mockReturnValue(() => {}),
      getCurrentLocation: jest.fn().mockResolvedValue({
        latitude: 37.7749,
        longitude: -122.4194,
        timestamp: Date.now(),
      }),
      getPermissionStatus: jest.fn().mockResolvedValue({
        status: 'granted',
        canAskAgain: true,
        expires: 'never',
      }),
      requestPermissions: jest.fn().mockResolvedValue({
        status: 'granted',
        canAskAgain: true,
        expires: 'never',
      }),
    } as any;

    (LocationService.getInstance as jest.Mock).mockReturnValue(
      mockLocationService
    );

    // Reset singleton instance and create new one with mocked LocationService
    (NavigationService as any).instance = undefined;
    navigationService = NavigationService.getInstance();

    // Create mock GPX file
    mockGPXFile = {
      id: 'test-gpx-1',
      metadata: {
        id: 'test-gpx-1',
        filename: 'test-route.gpx',
        name: 'Test Route',
        description: 'A test route for navigation',
        createdAt: new Date(),
        modifiedAt: new Date(),
        fileSize: 1024,
        trackCount: 1,
        waypointCount: 3,
        totalDistance: 5000, // 5km
        elevationGain: 200,
        elevationLoss: 150,
        bounds: {
          north: 37.7849,
          south: 37.7649,
          east: -122.4094,
          west: -122.4294,
        },
        filePath: '/path/to/test-route.gpx',
      },
      gpxFile: {
        waypoints: [
          {
            lat: 37.7749,
            lon: -122.4194,
            name: 'Start Point',
            desc: 'Starting waypoint',
            ele: 100,
          },
          {
            lat: 37.7799,
            lon: -122.4144,
            name: 'Mid Point',
            desc: 'Middle waypoint',
            ele: 150,
          },
          {
            lat: 37.7849,
            lon: -122.4094,
            name: 'End Point',
            desc: 'Ending waypoint',
            ele: 120,
          },
        ],
        tracks: [
          {
            segments: [
              {
                points: [
                  {
                    lat: 37.7749,
                    lon: -122.4194,
                    ele: 100,
                    time: new Date('2024-01-01T10:00:00Z'),
                  },
                  {
                    lat: 37.7759,
                    lon: -122.4184,
                    ele: 110,
                    time: new Date('2024-01-01T10:01:00Z'),
                  },
                  {
                    lat: 37.7769,
                    lon: -122.4174,
                    ele: 120,
                    time: new Date('2024-01-01T10:02:00Z'),
                  },
                  {
                    lat: 37.7779,
                    lon: -122.4164,
                    ele: 130,
                    time: new Date('2024-01-01T10:03:00Z'),
                  },
                  {
                    lat: 37.7789,
                    lon: -122.4154,
                    ele: 140,
                    time: new Date('2024-01-01T10:04:00Z'),
                  },
                  {
                    lat: 37.7799,
                    lon: -122.4144,
                    ele: 150,
                    time: new Date('2024-01-01T10:05:00Z'),
                  },
                  {
                    lat: 37.7809,
                    lon: -122.4134,
                    ele: 145,
                    time: new Date('2024-01-01T10:06:00Z'),
                  },
                  {
                    lat: 37.7819,
                    lon: -122.4124,
                    ele: 140,
                    time: new Date('2024-01-01T10:07:00Z'),
                  },
                  {
                    lat: 37.7829,
                    lon: -122.4114,
                    ele: 135,
                    time: new Date('2024-01-01T10:08:00Z'),
                  },
                  {
                    lat: 37.7839,
                    lon: -122.4104,
                    ele: 125,
                    time: new Date('2024-01-01T10:09:00Z'),
                  },
                  {
                    lat: 37.7849,
                    lon: -122.4094,
                    ele: 120,
                    time: new Date('2024-01-01T10:10:00Z'),
                  },
                ],
              },
            ],
          },
        ],
      },
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = NavigationService.getInstance();
      const instance2 = NavigationService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Navigation State Management', () => {
    it('should initialize with default state', () => {
      const state = navigationService.getNavigationState();
      expect(state.isNavigating).toBe(false);
      expect(state.currentRoute).toBeNull();
      expect(state.currentPosition).toBeNull();
      expect(state.distanceToTrack).toBe(0);
      expect(state.progress).toBe(0);
    });

    it('should start navigation successfully', async () => {
      await navigationService.startNavigation(
        mockGPXFile,
        NavigationMode.FOLLOW_TRACK
      );

      const state = navigationService.getNavigationState();
      expect(state.isNavigating).toBe(true);
      expect(state.currentRoute).toBeDefined();
      expect(state.currentRoute?.id).toBe(mockGPXFile.id);
      expect(state.currentRoute?.name).toBe('Test Route');
      expect(mockLocationService.startTracking).toHaveBeenCalled();
    });

    it('should stop navigation successfully', async () => {
      await navigationService.startNavigation(
        mockGPXFile,
        NavigationMode.FOLLOW_TRACK
      );
      await navigationService.stopNavigation();

      const state = navigationService.getNavigationState();
      expect(state.isNavigating).toBe(false);
      expect(state.currentRoute).toBeNull();
    });

    it('should handle navigation mode changes', async () => {
      await navigationService.startNavigation(
        mockGPXFile,
        NavigationMode.WAYPOINT_NAVIGATION
      );

      const state = navigationService.getNavigationState();
      expect(state.isNavigating).toBe(true);
    });
  });

  describe('Distance Calculations', () => {
    it('should calculate distance between two points correctly', () => {
      const point1 = { latitude: 37.7749, longitude: -122.4194 };
      const point2 = { latitude: 37.7759, longitude: -122.4184 };

      const distance = NavigationService.calculateDistance(point1, point2);
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(2000); // Should be less than 2km
    });

    it('should calculate bearing between two points correctly', () => {
      const point1 = { latitude: 37.7749, longitude: -122.4194 };
      const point2 = { latitude: 37.7759, longitude: -122.4184 };

      const bearing = NavigationService.calculateBearing(point1, point2);
      expect(bearing).toBeGreaterThanOrEqual(0);
      expect(bearing).toBeLessThan(360);
    });

    it('should find closest point on track', () => {
      const currentPosition = { latitude: 37.7754, longitude: -122.4189 };
      const trackPoints = mockGPXFile.gpxFile.tracks[0].segments[0].points.map(
        (p: any) => ({
          latitude: p.lat,
          longitude: p.lon,
          elevation: p.ele,
        })
      );

      const result = navigationService.findClosestPointOnTrack(
        currentPosition,
        trackPoints
      );
      expect(result.point).toBeDefined();
      expect(result.distance).toBeGreaterThan(0);
      expect(result.index).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Route Following', () => {
    let mockLocationCallback: (location: LocationCoordinate) => void;

    beforeEach(async () => {
      mockLocationService.onLocationUpdate.mockImplementation((callback) => {
        mockLocationCallback = callback;
        return () => {};
      });

      await navigationService.startNavigation(
        mockGPXFile,
        NavigationMode.FOLLOW_TRACK
      );
    });

    it('should update navigation state on location change', () => {
      const mockLocation: LocationCoordinate = {
        latitude: 37.7754,
        longitude: -122.4189,
        altitude: 105,
        accuracy: 5,
        speed: 2.5, // 2.5 m/s
        heading: 45,
        timestamp: Date.now(),
      };

      mockLocationCallback(mockLocation);

      const state = navigationService.getNavigationState();
      expect(state.currentPosition).toBeDefined();
      expect(state.currentPosition?.latitude).toBe(mockLocation.latitude);
      expect(state.currentSpeed).toBe(mockLocation.speed);
      expect(state.bearing).toBe(mockLocation.heading);
    });

    it('should detect off-route condition', () => {
      // Position far from the track
      const offRouteLocation: LocationCoordinate = {
        latitude: 37.8, // Far north of the track
        longitude: -122.4,
        timestamp: Date.now(),
      };

      mockLocationCallback(offRouteLocation);

      const state = navigationService.getNavigationState();
      expect(state.isOffRoute).toBe(true);
      expect(state.distanceToTrack).toBeGreaterThan(50); // Default threshold
    });

    it('should calculate progress along route', () => {
      // Position at the middle of the track
      const midRouteLocation: LocationCoordinate = {
        latitude: 37.7799,
        longitude: -122.4144,
        timestamp: Date.now(),
      };

      mockLocationCallback(midRouteLocation);

      const state = navigationService.getNavigationState();
      expect(state.progress).toBeGreaterThan(0);
      expect(state.progress).toBeLessThan(1);
      expect(state.distanceAlongTrack).toBeGreaterThan(0);
      expect(state.remainingDistance).toBeLessThan(
        mockGPXFile.metadata.totalDistance
      );
    });
  });

  describe('Waypoint Navigation', () => {
    beforeEach(async () => {
      await navigationService.startNavigation(
        mockGPXFile,
        NavigationMode.WAYPOINT_NAVIGATION
      );
    });

    it('should identify next waypoint', () => {
      // Simulate a location update to trigger waypoint calculation
      const mockLocationCallback =
        mockLocationService.onLocationUpdate.mock.calls[0][0];
      const currentLocation: LocationCoordinate = {
        latitude: 37.77, // Different from waypoint locations
        longitude: -122.42,
        timestamp: Date.now(),
      };
      mockLocationCallback(currentLocation);

      const state = navigationService.getNavigationState();
      expect(state.nextWaypoint).toBeDefined();
      expect(state.distanceToNextWaypoint).toBeGreaterThan(0);
      expect(state.bearingToNextWaypoint).toBeGreaterThanOrEqual(0);
    });

    it('should update next waypoint as user progresses', () => {
      const mockLocationCallback =
        mockLocationService.onLocationUpdate.mock.calls[0][0];

      // Move close to first waypoint
      const nearFirstWaypoint: LocationCoordinate = {
        latitude: 37.775,
        longitude: -122.4193,
        timestamp: Date.now(),
      };

      mockLocationCallback(nearFirstWaypoint);

      const state = navigationService.getNavigationState();
      expect(state.distanceToNextWaypoint).toBeLessThan(100);
    });
  });

  describe('Settings Management', () => {
    it('should update settings correctly', () => {
      const newSettings: Partial<NavigationSettings> = {
        offRouteThreshold: 100,
        voiceGuidanceEnabled: false,
        waypointAlertDistance: 200,
      };

      navigationService.updateSettings(newSettings);
      const settings = navigationService.getSettings();

      expect(settings.offRouteThreshold).toBe(100);
      expect(settings.voiceGuidanceEnabled).toBe(false);
      expect(settings.waypointAlertDistance).toBe(200);
    });

    it('should use updated settings for navigation', async () => {
      navigationService.updateSettings({ offRouteThreshold: 25 });

      await navigationService.startNavigation(
        mockGPXFile,
        NavigationMode.FOLLOW_TRACK
      );

      const mockLocationCallback =
        mockLocationService.onLocationUpdate.mock.calls[0][0];

      // Position slightly off route (within old threshold but outside new one)
      const slightlyOffRoute: LocationCoordinate = {
        latitude: 37.7749,
        longitude: -122.42, // Slightly west
        timestamp: Date.now(),
      };

      mockLocationCallback(slightlyOffRoute);

      const state = navigationService.getNavigationState();
      // Should be off route with the tighter threshold
      expect(state.isOffRoute).toBe(true);
    });
  });

  describe('Alert System', () => {
    beforeEach(async () => {
      await navigationService.startNavigation(
        mockGPXFile,
        NavigationMode.FOLLOW_TRACK
      );
    });

    it('should generate off-route alerts', () => {
      const alerts: any[] = [];
      navigationService.onNavigationAlert((alert) => {
        alerts.push(alert);
      });

      const mockLocationCallback =
        mockLocationService.onLocationUpdate.mock.calls[0][0];

      // Move off route
      const offRouteLocation: LocationCoordinate = {
        latitude: 37.8,
        longitude: -122.4,
        timestamp: Date.now(),
      };

      mockLocationCallback(offRouteLocation);

      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts.some((alert) => alert.type === 'off_route')).toBe(true);
    });

    it('should generate waypoint approach alerts', () => {
      navigationService.updateSettings({
        waypointAlertEnabled: true,
        waypointAlertDistance: 50,
      });

      const alerts: any[] = [];
      navigationService.onNavigationAlert((alert) => {
        alerts.push(alert);
      });

      const mockLocationCallback =
        mockLocationService.onLocationUpdate.mock.calls[0][0];

      // Move close to a waypoint
      const nearWaypoint: LocationCoordinate = {
        latitude: 37.775,
        longitude: -122.4193,
        timestamp: Date.now(),
      };

      mockLocationCallback(nearWaypoint);

      expect(alerts.some((alert) => alert.type === 'waypoint_approach')).toBe(
        true
      );
    });

    it('should acknowledge alerts', () => {
      const alert = {
        id: 'test-alert',
        type: 'off_route' as const,
        message: 'Test alert',
        timestamp: new Date(),
        acknowledged: false,
        priority: 'medium' as const,
      };

      // Manually add alert for testing
      (navigationService as any).alerts.push(alert);

      navigationService.acknowledgeAlert('test-alert');

      const alerts = navigationService.getAlerts();
      const acknowledgedAlert = alerts.find((a) => a.id === 'test-alert');
      expect(acknowledgedAlert?.acknowledged).toBe(true);
    });
  });

  describe('Statistics Tracking', () => {
    beforeEach(async () => {
      await navigationService.startNavigation(
        mockGPXFile,
        NavigationMode.FOLLOW_TRACK
      );
    });

    it('should track navigation statistics', () => {
      const stats = navigationService.getNavigationStats();
      expect(stats.startTime).toBeDefined();
      expect(stats.elapsedTime).toBeGreaterThanOrEqual(0);
      expect(stats.totalDistance).toBe(0); // No movement yet
      expect(stats.averageSpeed).toBe(0);
    });

    it('should update statistics on location changes', () => {
      const mockLocationCallback =
        mockLocationService.onLocationUpdate.mock.calls[0][0];

      const baseTime = Date.now();
      const location1: LocationCoordinate = {
        latitude: 37.7749,
        longitude: -122.4194,
        speed: 5, // 5 m/s
        timestamp: baseTime,
      };

      const location2: LocationCoordinate = {
        latitude: 37.7759,
        longitude: -122.4184,
        speed: 7, // 7 m/s
        timestamp: baseTime + 5000, // 5 seconds later
      };

      mockLocationCallback(location1);

      // Manually set the start time to simulate elapsed time
      (navigationService as any).stats.startTime = new Date(baseTime - 5000);

      mockLocationCallback(location2);

      const updatedStats = navigationService.getNavigationStats();
      expect(updatedStats.maxSpeed).toBe(7);
      expect(updatedStats.elapsedTime).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle location service errors gracefully', async () => {
      mockLocationService.startTracking.mockRejectedValue(
        new Error('Location unavailable')
      );

      await expect(
        navigationService.startNavigation(
          mockGPXFile,
          NavigationMode.FOLLOW_TRACK
        )
      ).rejects.toThrow('Failed to start navigation');
    });

    it('should handle invalid GPX files', async () => {
      const invalidGPXFile = {
        ...mockGPXFile,
        gpxFile: null,
      };

      await expect(
        navigationService.startNavigation(
          invalidGPXFile as any,
          NavigationMode.FOLLOW_TRACK
        )
      ).rejects.toThrow();
    });
  });

  describe('Performance', () => {
    it('should handle frequent location updates efficiently', async () => {
      await navigationService.startNavigation(
        mockGPXFile,
        NavigationMode.FOLLOW_TRACK
      );

      const mockLocationCallback =
        mockLocationService.onLocationUpdate.mock.calls[0][0];
      const startTime = Date.now();

      // Simulate 100 rapid location updates
      for (let i = 0; i < 100; i++) {
        const location: LocationCoordinate = {
          latitude: 37.7749 + i * 0.0001,
          longitude: -122.4194 + i * 0.0001,
          timestamp: Date.now() + i * 100,
        };
        mockLocationCallback(location);
      }

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Should process 100 updates in less than 1 second
      expect(processingTime).toBeLessThan(1000);

      const state = navigationService.getNavigationState();
      expect(state.currentPosition).toBeDefined();
    });

    it('should handle large track files efficiently', async () => {
      // Create a large track with 1000 points
      const largeTrack = {
        ...mockGPXFile,
        gpxFile: {
          ...mockGPXFile.gpxFile,
          tracks: [
            {
              segments: [
                {
                  points: Array.from({ length: 1000 }, (_, i) => ({
                    lat: 37.7749 + i * 0.0001,
                    lon: -122.4194 + i * 0.0001,
                    ele: 100 + i * 0.1,
                    time: new Date(Date.now() + i * 1000),
                  })),
                },
              ],
            },
          ],
        },
      };

      const startTime = Date.now();
      await navigationService.startNavigation(
        largeTrack,
        NavigationMode.FOLLOW_TRACK
      );
      const endTime = Date.now();

      // Should start navigation with large track in reasonable time
      expect(endTime - startTime).toBeLessThan(500);

      const state = navigationService.getNavigationState();
      expect(state.isNavigating).toBe(true);
    });
  });
});
