import * as Location from 'expo-location';
import { LocationService } from '../LocationService';
import {
  LocationAccuracy,
  LocationPermissionStatus,
  LocationErrorCode,
  SignalQuality,
} from '../../../types/location';

// Mock expo-location
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  requestBackgroundPermissionsAsync: jest.fn(),
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

describe('LocationService', () => {
  let locationService: LocationService;
  let mockLocationSubscription: { remove: jest.Mock };

  beforeEach(() => {
    // Reset singleton instance
    (LocationService as any).instance = undefined;
    locationService = LocationService.getInstance();

    mockLocationSubscription = {
      remove: jest.fn(),
    };

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    locationService.reset();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = LocationService.getInstance();
      const instance2 = LocationService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Permission Management', () => {
    it('should request foreground permissions', async () => {
      const mockResponse = {
        status: Location.PermissionStatus.GRANTED,
        canAskAgain: true,
        expires: 'never' as const,
      };

      (
        Location.requestForegroundPermissionsAsync as jest.Mock
      ).mockResolvedValue(mockResponse);

      const result = await locationService.requestPermissions();

      expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalled();
      expect(result.status).toBe(LocationPermissionStatus.GRANTED);
      expect(result.canAskAgain).toBe(true);
    });

    it('should request background permissions', async () => {
      const mockResponse = {
        status: Location.PermissionStatus.GRANTED,
        canAskAgain: true,
        expires: 'never' as const,
      };

      (
        Location.requestBackgroundPermissionsAsync as jest.Mock
      ).mockResolvedValue(mockResponse);

      const result = await locationService.requestBackgroundPermissions();

      expect(Location.requestBackgroundPermissionsAsync).toHaveBeenCalled();
      expect(result.status).toBe(LocationPermissionStatus.GRANTED);
    });

    it('should get current permission status', async () => {
      const mockResponse = {
        status: Location.PermissionStatus.DENIED,
        canAskAgain: false,
        expires: 'never' as const,
      };

      (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue(
        mockResponse
      );

      const result = await locationService.getPermissionStatus();

      expect(Location.getForegroundPermissionsAsync).toHaveBeenCalled();
      expect(result.status).toBe(LocationPermissionStatus.DENIED);
      expect(result.canAskAgain).toBe(false);
    });

    it('should handle permission request errors', async () => {
      (
        Location.requestForegroundPermissionsAsync as jest.Mock
      ).mockRejectedValue(new Error('Permission request failed'));

      await expect(locationService.requestPermissions()).rejects.toMatchObject({
        code: LocationErrorCode.PERMISSION_DENIED,
        message: 'Failed to request location permissions',
      });
    });
  });

  describe('Location Service Info', () => {
    it('should get location service info when enabled', async () => {
      (Location.hasServicesEnabledAsync as jest.Mock).mockResolvedValue(true);

      const result = await locationService.getLocationServiceInfo();

      expect(Location.hasServicesEnabledAsync).toHaveBeenCalled();
      expect(result.isLocationEnabled).toBe(true);
      expect(result.isGpsEnabled).toBe(true);
    });

    it('should get location service info when disabled', async () => {
      (Location.hasServicesEnabledAsync as jest.Mock).mockResolvedValue(false);

      const result = await locationService.getLocationServiceInfo();

      expect(result.isLocationEnabled).toBe(false);
      expect(result.isGpsEnabled).toBe(false);
    });

    it('should handle location service info errors', async () => {
      (Location.hasServicesEnabledAsync as jest.Mock).mockRejectedValue(
        new Error('Service check failed')
      );

      await expect(
        locationService.getLocationServiceInfo()
      ).rejects.toMatchObject({
        code: LocationErrorCode.LOCATION_DISABLED,
        message: 'Failed to get location service info',
      });
    });
  });

  describe('Current Location', () => {
    const mockLocationObject = {
      coords: {
        latitude: 37.7749,
        longitude: -122.4194,
        altitude: 10,
        accuracy: 5,
        altitudeAccuracy: 3,
        heading: 90,
        speed: 2.5,
      },
      timestamp: Date.now(),
    };

    beforeEach(() => {
      // Mock successful permissions and location services
      (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: Location.PermissionStatus.GRANTED,
        canAskAgain: true,
        expires: 'never',
      });
      (Location.hasServicesEnabledAsync as jest.Mock).mockResolvedValue(true);
    });

    it('should get current location successfully', async () => {
      (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue(
        mockLocationObject
      );

      const result = await locationService.getCurrentLocation();

      expect(Location.getCurrentPositionAsync).toHaveBeenCalled();
      expect(result.latitude).toBe(37.7749);
      expect(result.longitude).toBe(-122.4194);
      expect(result.altitude).toBe(10);
      expect(result.accuracy).toBe(5);
      expect(result.speed).toBe(2.5);
    });

    it('should get current location with custom options', async () => {
      (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue(
        mockLocationObject
      );

      await locationService.getCurrentLocation({
        accuracy: LocationAccuracy.HIGH,
        timeout: 10000,
      });

      expect(Location.getCurrentPositionAsync).toHaveBeenCalledWith({
        accuracy: Location.Accuracy.High,
        timeInterval: 1000,
        distanceInterval: 1,
        mayShowUserSettingsDialog: true,
      });
    });

    it('should handle location retrieval errors', async () => {
      (Location.getCurrentPositionAsync as jest.Mock).mockRejectedValue({
        code: 'E_LOCATION_UNAVAILABLE',
        message: 'Location unavailable',
      });

      await expect(locationService.getCurrentLocation()).rejects.toMatchObject({
        code: LocationErrorCode.POSITION_UNAVAILABLE,
        message: 'Location is currently unavailable',
      });
    });

    it('should update stats when getting location', async () => {
      (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue(
        mockLocationObject
      );

      await locationService.getCurrentLocation();
      const stats = locationService.getLocationStats();

      expect(stats.totalUpdates).toBe(1);
      expect(stats.averageAccuracy).toBe(5);
      expect(stats.signalQuality).toBe(SignalQuality.EXCELLENT);
    });
  });

  describe('Location Tracking', () => {
    const mockLocationObject = {
      coords: {
        latitude: 37.7749,
        longitude: -122.4194,
        altitude: 10,
        accuracy: 8,
        speed: 1.5,
      },
      timestamp: Date.now(),
    };

    beforeEach(() => {
      // Mock successful permissions and location services
      (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: Location.PermissionStatus.GRANTED,
        canAskAgain: true,
        expires: 'never',
      });
      (Location.hasServicesEnabledAsync as jest.Mock).mockResolvedValue(true);
      (Location.watchPositionAsync as jest.Mock).mockResolvedValue(
        mockLocationSubscription
      );
    });

    it('should start location tracking', async () => {
      await locationService.startTracking();

      expect(Location.watchPositionAsync).toHaveBeenCalled();
      expect(locationService.isCurrentlyTracking()).toBe(true);
    });

    it('should start tracking with custom options', async () => {
      await locationService.startTracking({
        accuracy: LocationAccuracy.MEDIUM,
        timeInterval: 5000,
        distanceInterval: 10,
      });

      expect(Location.watchPositionAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 5000,
          distanceInterval: 10,
        }),
        expect.any(Function)
      );
    });

    it('should not start tracking if already tracking', async () => {
      await locationService.startTracking();
      await locationService.startTracking();

      expect(Location.watchPositionAsync).toHaveBeenCalledTimes(1);
    });

    it('should stop location tracking', async () => {
      await locationService.startTracking();
      await locationService.stopTracking();

      expect(mockLocationSubscription.remove).toHaveBeenCalled();
      expect(locationService.isCurrentlyTracking()).toBe(false);
    });

    it('should handle tracking start errors', async () => {
      (Location.watchPositionAsync as jest.Mock).mockRejectedValue(
        new Error('Tracking failed')
      );

      await expect(locationService.startTracking()).rejects.toMatchObject({
        code: LocationErrorCode.UNKNOWN,
      });
    });

    it('should call location callbacks during tracking', async () => {
      const locationCallback = jest.fn();
      locationService.onLocationUpdate(locationCallback);

      // Start tracking and simulate location update
      await locationService.startTracking();
      const watchCallback = (Location.watchPositionAsync as jest.Mock).mock
        .calls[0][1];
      watchCallback(mockLocationObject);

      expect(locationCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          latitude: 37.7749,
          longitude: -122.4194,
        })
      );
    });
  });

  describe('Callback Management', () => {
    it('should add and remove location update callbacks', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      const unsubscribe1 = locationService.onLocationUpdate(callback1);
      const unsubscribe2 = locationService.onLocationUpdate(callback2);

      // Simulate location update
      const mockLocation = {
        latitude: 37.7749,
        longitude: -122.4194,
        timestamp: Date.now(),
      };

      // Access private method for testing
      (locationService as any).notifyLocationCallbacks(mockLocation);

      expect(callback1).toHaveBeenCalledWith(mockLocation);
      expect(callback2).toHaveBeenCalledWith(mockLocation);

      // Unsubscribe first callback
      unsubscribe1();
      (locationService as any).notifyLocationCallbacks(mockLocation);

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(2);
    });

    it('should add and remove error callbacks', () => {
      const errorCallback = jest.fn();
      const unsubscribe = locationService.onLocationError(errorCallback);

      const mockError = {
        code: LocationErrorCode.TIMEOUT,
        message: 'Test error',
      };

      // Access private method for testing
      (locationService as any).notifyErrorCallbacks(mockError);

      expect(errorCallback).toHaveBeenCalledWith(mockError);

      // Unsubscribe
      unsubscribe();
      (locationService as any).notifyErrorCallbacks(mockError);

      expect(errorCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe('Configuration Management', () => {
    it('should update service configuration', () => {
      const newConfig = {
        defaultAccuracy: LocationAccuracy.LOW,
        defaultTimeInterval: 5000,
        batteryOptimizationEnabled: false,
      };

      locationService.updateConfig(newConfig);
      const config = locationService.getConfig();

      expect(config.defaultAccuracy).toBe(LocationAccuracy.LOW);
      expect(config.defaultTimeInterval).toBe(5000);
      expect(config.batteryOptimizationEnabled).toBe(false);
    });

    it('should get current configuration', () => {
      const config = locationService.getConfig();

      expect(config).toHaveProperty('defaultAccuracy');
      expect(config).toHaveProperty('defaultTimeInterval');
      expect(config).toHaveProperty('batteryOptimizationEnabled');
    });
  });

  describe('Statistics and State', () => {
    it('should track location statistics', async () => {
      const mockLocation = {
        coords: {
          latitude: 37.7749,
          longitude: -122.4194,
          accuracy: 5,
        },
        timestamp: Date.now(),
      };

      (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: Location.PermissionStatus.GRANTED,
        canAskAgain: true,
        expires: 'never',
      });
      (Location.hasServicesEnabledAsync as jest.Mock).mockResolvedValue(true);
      (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue(
        mockLocation
      );

      await locationService.getCurrentLocation();
      const stats = locationService.getLocationStats();

      expect(stats.totalUpdates).toBe(1);
      expect(stats.averageAccuracy).toBe(5);
      expect(stats.signalQuality).toBe(SignalQuality.EXCELLENT);
      expect(stats.lastUpdateTime).toBe(mockLocation.timestamp);
    });

    it('should get last known location', async () => {
      const mockLocation = {
        coords: {
          latitude: 37.7749,
          longitude: -122.4194,
        },
        timestamp: Date.now(),
      };

      (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: Location.PermissionStatus.GRANTED,
        canAskAgain: true,
        expires: 'never',
      });
      (Location.hasServicesEnabledAsync as jest.Mock).mockResolvedValue(true);
      (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue(
        mockLocation
      );

      expect(locationService.getLastKnownLocation()).toBeNull();

      await locationService.getCurrentLocation();
      const lastKnown = locationService.getLastKnownLocation();

      expect(lastKnown).toMatchObject({
        latitude: 37.7749,
        longitude: -122.4194,
      });
    });
  });

  describe('Reset Functionality', () => {
    it('should reset service state', async () => {
      const callback = jest.fn();
      locationService.onLocationUpdate(callback);

      // Mock tracking
      (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: Location.PermissionStatus.GRANTED,
        canAskAgain: true,
        expires: 'never',
      });
      (Location.hasServicesEnabledAsync as jest.Mock).mockResolvedValue(true);
      (Location.watchPositionAsync as jest.Mock).mockResolvedValue(
        mockLocationSubscription
      );

      await locationService.startTracking();

      locationService.reset();

      expect(locationService.isCurrentlyTracking()).toBe(false);
      expect(locationService.getLastKnownLocation()).toBeNull();

      const stats = locationService.getLocationStats();
      expect(stats.totalUpdates).toBe(0);
      expect(stats.averageAccuracy).toBe(0);
    });
  });
});
