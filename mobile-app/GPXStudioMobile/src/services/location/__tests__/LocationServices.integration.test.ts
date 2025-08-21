import * as Location from 'expo-location';
import { LocationService } from '../LocationService';
import { LocationPermissionManager } from '../LocationPermissionManager';
import { LocationAccuracyMonitor } from '../LocationAccuracyMonitor';
import { BatteryOptimizedLocationService } from '../BatteryOptimizedLocationService';
import {
  LocationAccuracy,
  LocationPermissionStatus,
  SignalQuality,
  LocationCoordinate,
} from '../../../types/location';

// Mock expo-location
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getForegroundPermissionsAsync: jest.fn(),
  hasServicesEnabledAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
  Accuracy: {
    Low: 1,
    Balanced: 2,
    High: 3,
    BestForNavigation: 4,
  },
  PermissionStatus: {
    UNDETERMINED: 'undetermined',
    DENIED: 'denied',
    GRANTED: 'granted',
  },
}));

// Mock React Native Alert
jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
  Linking: {
    openSettings: jest.fn(),
  },
}));

describe('Location Services Integration', () => {
  let locationService: LocationService;
  let permissionManager: LocationPermissionManager;
  let accuracyMonitor: LocationAccuracyMonitor;
  let batteryService: BatteryOptimizedLocationService;
  let mockLocationSubscription: { remove: jest.Mock };

  beforeEach(() => {
    // Reset all singleton instances
    (LocationService as any).instance = undefined;
    (LocationPermissionManager as any).instance = undefined;
    (LocationAccuracyMonitor as any).instance = undefined;
    (BatteryOptimizedLocationService as any).instance = undefined;

    locationService = LocationService.getInstance();
    permissionManager = LocationPermissionManager.getInstance();
    accuracyMonitor = LocationAccuracyMonitor.getInstance();
    batteryService = BatteryOptimizedLocationService.getInstance();

    mockLocationSubscription = {
      remove: jest.fn(),
    };

    // Setup default mocks
    (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: Location.PermissionStatus.GRANTED,
      canAskAgain: true,
      expires: 'never',
    });

    (Location.hasServicesEnabledAsync as jest.Mock).mockResolvedValue(true);
    (Location.watchPositionAsync as jest.Mock).mockResolvedValue(
      mockLocationSubscription
    );

    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    locationService.reset();
    accuracyMonitor.reset();
    jest.useRealTimers();
  });

  describe('Complete Location Workflow', () => {
    it('should handle complete location tracking workflow with permissions', async () => {
      // Mock permission request
      (
        Location.requestForegroundPermissionsAsync as jest.Mock
      ).mockResolvedValue({
        status: Location.PermissionStatus.GRANTED,
        canAskAgain: true,
        expires: 'never',
      });

      // Mock user accepting permission dialog
      const { Alert } = require('react-native');
      Alert.alert.mockImplementation(
        (title: string, message: string, buttons: any[]) => {
          const acceptButton = buttons.find(
            (b: any) => b.text === 'Allow Location Access'
          );
          if (acceptButton) {
            acceptButton.onPress();
          }
        }
      );

      // Request permissions through manager
      const permissionResponse =
        await permissionManager.requestLocationPermission();
      expect(permissionResponse.status).toBe(LocationPermissionStatus.GRANTED);

      // Start location tracking
      await locationService.startTracking({
        accuracy: LocationAccuracy.HIGH,
        timeInterval: 2000,
      });

      expect(locationService.isCurrentlyTracking()).toBe(true);
      expect(Location.watchPositionAsync).toHaveBeenCalled();
    });

    it('should integrate accuracy monitoring with location updates', async () => {
      const mockLocation: Location.LocationObject = {
        coords: {
          latitude: 37.7749,
          longitude: -122.4194,
          accuracy: 8,
          altitude: 10,
          altitudeAccuracy: 5,
          heading: 90,
          speed: 1.5,
        },
        timestamp: Date.now(),
      };

      let locationUpdateCallback: (location: Location.LocationObject) => void;

      (Location.watchPositionAsync as jest.Mock).mockImplementation(
        (options, callback) => {
          locationUpdateCallback = callback;
          return Promise.resolve(mockLocationSubscription);
        }
      );

      // Start accuracy monitoring
      accuracyMonitor.startMonitoring();

      // Start location tracking
      await locationService.startTracking();

      // Simulate location update
      locationUpdateCallback!(mockLocation);

      // Check that accuracy monitor processed the update
      expect(accuracyMonitor.getCurrentSignalQuality()).toBe(
        SignalQuality.GOOD
      );
      expect(accuracyMonitor.getAverageAccuracy()).toBe(8);

      // Check that location service updated stats
      const stats = locationService.getLocationStats();
      expect(stats.totalUpdates).toBe(1);
      expect(stats.averageAccuracy).toBe(8);
    });

    it('should integrate battery optimization with location tracking', async () => {
      const mockLocations: Location.LocationObject[] = [
        {
          coords: {
            latitude: 37.7749,
            longitude: -122.4194,
            accuracy: 5,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now(),
        },
        {
          coords: {
            latitude: 37.7749,
            longitude: -122.4194,
            accuracy: 6,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now() + 1000,
        },
        {
          coords: {
            latitude: 37.7749,
            longitude: -122.4194,
            accuracy: 7,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now() + 2000,
        },
      ];

      let locationUpdateCallback: (location: Location.LocationObject) => void;

      (Location.watchPositionAsync as jest.Mock).mockImplementation(
        (options, callback) => {
          locationUpdateCallback = callback;
          return Promise.resolve(mockLocationSubscription);
        }
      );

      // Start battery optimized tracking
      await batteryService.startOptimizedTracking({
        accuracy: LocationAccuracy.HIGH,
        timeInterval: 1000,
      });

      // Simulate location updates to trigger movement detection
      mockLocations.forEach((location, index) => {
        setTimeout(() => locationUpdateCallback!(location), index * 1000);
      });

      // Advance time to process all locations
      jest.advanceTimersByTime(3000);

      // Check that battery service detected stationary state
      const movementState = batteryService.getMovementState();
      expect(movementState.isStationary).toBe(false); // Initially not stationary

      // Advance time to trigger stationary detection
      jest.advanceTimersByTime(61000);

      // Add another stationary location
      locationUpdateCallback!({
        coords: {
          latitude: 37.7749,
          longitude: -122.4194,
          accuracy: 5,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now() + 65000,
      });

      const updatedMovementState = batteryService.getMovementState();
      expect(updatedMovementState.isStationary).toBe(true);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle permission denied gracefully across services', async () => {
      // Mock permission denied
      (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: Location.PermissionStatus.DENIED,
        canAskAgain: false,
        expires: 'never',
      });

      // Mock user canceling permission dialog
      const { Alert } = require('react-native');
      Alert.alert.mockImplementation(
        (title: string, message: string, buttons: any[]) => {
          const cancelButton = buttons.find((b: any) => b.text === 'Cancel');
          if (cancelButton) {
            cancelButton.onPress();
          }
        }
      );

      // Try to request permissions
      const permissionResponse =
        await permissionManager.requestLocationPermission();
      expect(permissionResponse.status).toBe(LocationPermissionStatus.DENIED);

      // Try to start tracking (should fail)
      await expect(locationService.startTracking()).rejects.toMatchObject({
        code: 'PERMISSION_DENIED',
      });

      // Battery service should also fail
      await expect(
        batteryService.startOptimizedTracking()
      ).rejects.toMatchObject({
        code: 'PERMISSION_DENIED',
      });
    });

    it('should handle location services disabled across services', async () => {
      // Mock location services disabled
      (Location.hasServicesEnabledAsync as jest.Mock).mockResolvedValue(false);

      // Try to get current location
      await expect(locationService.getCurrentLocation()).rejects.toMatchObject({
        code: 'LOCATION_DISABLED',
      });

      // Permission manager should show appropriate dialog
      await permissionManager.showLocationServicesDisabledPrompt();

      const { Alert } = require('react-native');
      expect(Alert.alert).toHaveBeenCalledWith(
        'Location Services Disabled',
        expect.stringContaining('Location services are turned off'),
        expect.any(Array),
        { cancelable: false }
      );
    });
  });

  describe('Accuracy Monitoring Integration', () => {
    it('should trigger accuracy alerts and handle them appropriately', async () => {
      const alertCallback = jest.fn();
      accuracyMonitor.onAccuracyAlert(alertCallback);
      accuracyMonitor.startMonitoring();

      let locationUpdateCallback: (location: Location.LocationObject) => void;

      (Location.watchPositionAsync as jest.Mock).mockImplementation(
        (options, callback) => {
          locationUpdateCallback = callback;
          return Promise.resolve(mockLocationSubscription);
        }
      );

      await locationService.startTracking();

      // Simulate poor accuracy location
      const poorLocation: Location.LocationObject = {
        coords: {
          latitude: 37.7749,
          longitude: -122.4194,
          accuracy: 30, // Poor accuracy
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      };

      locationUpdateCallback!(poorLocation);

      // Should trigger accuracy alert
      expect(alertCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          quality: SignalQuality.POOR,
          shouldWarn: true,
        })
      );

      // Permission manager should be able to show accuracy warning
      const shouldContinue = await new Promise<boolean>((resolve) => {
        const { Alert } = require('react-native');
        Alert.alert.mockImplementation(
          (title: any, message: any, buttons: any) => {
            expect(title).toBe('GPS Accuracy Warning');
            const continueButton = buttons.find(
              (b: any) => b.text === 'Continue Anyway'
            );
            continueButton.onPress();
            resolve(true);
          }
        );

        permissionManager.showAccuracyWarning(30);
      });

      expect(shouldContinue).toBe(true);
    });
  });

  describe('Battery Optimization Integration', () => {
    it('should adapt tracking based on signal quality and movement', async () => {
      let locationUpdateCallback: (location: Location.LocationObject) => void;

      (Location.watchPositionAsync as jest.Mock).mockImplementation(
        (options, callback) => {
          locationUpdateCallback = callback;
          return Promise.resolve(mockLocationSubscription);
        }
      );

      // Start battery optimized tracking
      await batteryService.startOptimizedTracking({
        accuracy: LocationAccuracy.HIGH,
        timeInterval: 1000,
      });

      // Simulate movement with varying accuracy
      const locations: Location.LocationObject[] = [
        {
          coords: {
            latitude: 37.7749,
            longitude: -122.4194,
            accuracy: 5,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now(),
        },
        {
          coords: {
            latitude: 37.7759,
            longitude: -122.4194,
            accuracy: 25,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now() + 1000,
        },
        {
          coords: {
            latitude: 37.7769,
            longitude: -122.4194,
            accuracy: 8,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now() + 2000,
        },
      ];

      // Process locations
      locations.forEach((location) => {
        locationUpdateCallback!(location);
      });

      // Battery service should adapt to poor accuracy
      const stats = batteryService.getOptimizationStats();
      expect(stats.optimizationLevel).toBeDefined();

      // Movement should be detected
      const movementState = batteryService.getMovementState();
      expect(movementState.averageSpeed).toBeGreaterThan(0);
    });

    it('should handle power saving mode activation', async () => {
      // Enable power saving mode
      batteryService.enablePowerSavingMode();

      await batteryService.startOptimizedTracking({
        accuracy: LocationAccuracy.HIGH,
        timeInterval: 1000,
      });

      // Should have applied power saving optimizations
      expect(Location.watchPositionAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          accuracy: Location.Accuracy.Balanced, // Reduced from High
          timeInterval: expect.any(Number),
        }),
        expect.any(Function)
      );

      expect(batteryService.isPowerSavingActive()).toBe(true);
    });
  });

  describe('Service Coordination', () => {
    it('should coordinate between all services for optimal tracking', async () => {
      const locationCallback = jest.fn();
      const accuracyCallback = jest.fn();

      // Setup callbacks
      locationService.onLocationUpdate(locationCallback);
      accuracyMonitor.onAccuracyAlert(accuracyCallback);
      accuracyMonitor.startMonitoring();

      let locationUpdateCallback: (location: Location.LocationObject) => void;

      (Location.watchPositionAsync as jest.Mock).mockImplementation(
        (options, callback) => {
          locationUpdateCallback = callback;
          return Promise.resolve(mockLocationSubscription);
        }
      );

      // Start battery optimized tracking
      await batteryService.startOptimizedTracking();

      // Simulate a series of location updates
      const testLocations: Location.LocationObject[] = [
        {
          coords: {
            latitude: 37.7749,
            longitude: -122.4194,
            accuracy: 5,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now(),
        },
        {
          coords: {
            latitude: 37.7759,
            longitude: -122.4194,
            accuracy: 8,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now() + 1000,
        },
        {
          coords: {
            latitude: 37.7769,
            longitude: -122.4194,
            accuracy: 12,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now() + 2000,
        },
        {
          coords: {
            latitude: 37.7779,
            longitude: -122.4194,
            accuracy: 6,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now() + 3000,
        },
      ];

      testLocations.forEach((location) => {
        locationUpdateCallback!(location);
      });

      // Verify all services received and processed updates
      expect(locationCallback).toHaveBeenCalledTimes(4);

      const locationStats = locationService.getLocationStats();
      expect(locationStats.totalUpdates).toBe(4);

      const accuracyStats = accuracyMonitor.getAccuracyStats();
      expect(accuracyStats.sampleCount).toBe(4);
      expect(accuracyStats.average).toBeCloseTo(7.75); // (5+8+12+6)/4

      const movementState = batteryService.getMovementState();
      expect(movementState.averageSpeed).toBeGreaterThan(0);
    });
  });

  describe('Cleanup and Reset', () => {
    it('should properly cleanup all services', async () => {
      const locationCallback = jest.fn();
      const accuracyCallback = jest.fn();

      locationService.onLocationUpdate(locationCallback);
      accuracyMonitor.onAccuracyAlert(accuracyCallback);
      accuracyMonitor.startMonitoring();

      await batteryService.startOptimizedTracking();

      // Stop all services
      await batteryService.stopOptimizedTracking();
      locationService.reset();
      accuracyMonitor.reset();

      // Verify cleanup
      expect(locationService.isCurrentlyTracking()).toBe(false);
      expect(locationService.getLastKnownLocation()).toBeNull();

      const locationStats = locationService.getLocationStats();
      expect(locationStats.totalUpdates).toBe(0);

      const accuracyStats = accuracyMonitor.getAccuracyStats();
      expect(accuracyStats.sampleCount).toBe(0);

      const movementState = batteryService.getMovementState();
      expect(movementState.isStationary).toBe(false);
      expect(movementState.averageSpeed).toBe(0);
    });
  });
});
