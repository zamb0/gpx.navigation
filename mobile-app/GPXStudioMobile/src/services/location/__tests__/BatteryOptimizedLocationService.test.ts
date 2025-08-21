import { BatteryOptimizedLocationService } from '../BatteryOptimizedLocationService';
import { LocationService } from '../LocationService';
import { LocationAccuracyMonitor } from '../LocationAccuracyMonitor';
import {
  LocationAccuracy,
  LocationCoordinate,
  SignalQuality,
} from '../../../types/location';

// Mock dependencies
jest.mock('../LocationService');
jest.mock('../LocationAccuracyMonitor');

describe('BatteryOptimizedLocationService', () => {
  let batteryService: BatteryOptimizedLocationService;
  let mockLocationService: jest.Mocked<LocationService>;
  let mockAccuracyMonitor: jest.Mocked<LocationAccuracyMonitor>;

  beforeEach(() => {
    // Reset singleton instances
    (BatteryOptimizedLocationService as any).instance = undefined;
    batteryService = BatteryOptimizedLocationService.getInstance();

    // Create mocks
    mockLocationService = {
      startTracking: jest.fn(),
      stopTracking: jest.fn(),
      isCurrentlyTracking: jest.fn(),
      onLocationUpdate: jest.fn().mockReturnValue(jest.fn()), // Return unsubscribe function
    } as any;

    mockAccuracyMonitor = {
      getCurrentSignalQuality: jest.fn(),
    } as any;

    // Reset all mocks first
    jest.clearAllMocks();

    // Then set up the mock return values
    (LocationService.getInstance as jest.Mock).mockReturnValue(
      mockLocationService
    );
    (LocationAccuracyMonitor.getInstance as jest.Mock).mockReturnValue(
      mockAccuracyMonitor
    );

    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = BatteryOptimizedLocationService.getInstance();
      const instance2 = BatteryOptimizedLocationService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Optimized Tracking', () => {
    it('should start optimized tracking with default options', async () => {
      mockAccuracyMonitor.getCurrentSignalQuality.mockReturnValue(
        SignalQuality.GOOD
      );

      await batteryService.startOptimizedTracking();

      expect(mockLocationService.startTracking).toHaveBeenCalledWith(
        expect.objectContaining({
          accuracy: LocationAccuracy.HIGH,
          timeInterval: 2000,
          distanceInterval: 1,
        })
      );
    });

    it('should start optimized tracking with custom options', async () => {
      mockAccuracyMonitor.getCurrentSignalQuality.mockReturnValue(
        SignalQuality.GOOD
      );

      const customOptions = {
        accuracy: LocationAccuracy.MEDIUM,
        timeInterval: 5000,
        distanceInterval: 10,
      };

      await batteryService.startOptimizedTracking(customOptions);

      expect(mockLocationService.startTracking).toHaveBeenCalledWith(
        expect.objectContaining(customOptions)
      );
    });

    it('should stop optimized tracking', async () => {
      await batteryService.stopOptimizedTracking();

      expect(mockLocationService.stopTracking).toHaveBeenCalled();
    });

    it('should setup location listener on construction', () => {
      expect(mockLocationService.onLocationUpdate).toHaveBeenCalled();
    });
  });

  describe('Battery Optimization Configuration', () => {
    it('should update optimization configuration', () => {
      const newConfig = {
        enableAdaptiveAccuracy: false,
        enableMovementDetection: false,
        stationaryThreshold: 20,
      };

      batteryService.updateOptimizationConfig(newConfig);
      const config = batteryService.getOptimizationConfig();

      expect(config.enableAdaptiveAccuracy).toBe(false);
      expect(config.enableMovementDetection).toBe(false);
      expect(config.stationaryThreshold).toBe(20);
    });

    it('should restart tracking when config changes during active tracking', async () => {
      mockLocationService.isCurrentlyTracking.mockReturnValue(true);
      mockAccuracyMonitor.getCurrentSignalQuality.mockReturnValue(
        SignalQuality.GOOD
      );

      // Start tracking first
      await batteryService.startOptimizedTracking();

      // Update config
      batteryService.updateOptimizationConfig({
        enablePowerSavingMode: false,
      });

      // Should restart tracking
      expect(mockLocationService.stopTracking).toHaveBeenCalledTimes(1);
      expect(mockLocationService.startTracking).toHaveBeenCalledTimes(2);
    });

    it('should enable and disable power saving mode', () => {
      batteryService.enablePowerSavingMode();
      expect(batteryService.getOptimizationConfig().enablePowerSavingMode).toBe(
        true
      );

      batteryService.disablePowerSavingMode();
      expect(batteryService.getOptimizationConfig().enablePowerSavingMode).toBe(
        false
      );
    });
  });

  describe('Movement Detection', () => {
    let locationUpdateCallback: (location: LocationCoordinate) => void;

    beforeEach(() => {
      // Capture the location update callback
      mockLocationService.onLocationUpdate.mockImplementation((callback) => {
        locationUpdateCallback = callback;
        return jest.fn();
      });

      // Recreate service to capture callback
      (BatteryOptimizedLocationService as any).instance = undefined;
      batteryService = BatteryOptimizedLocationService.getInstance();
    });

    it('should detect stationary state', () => {
      const baseLocation: LocationCoordinate = {
        latitude: 37.7749,
        longitude: -122.4194,
        timestamp: Date.now(),
      };

      // Add first location
      locationUpdateCallback(baseLocation);

      // Add second location very close to first (within threshold)
      locationUpdateCallback({
        ...baseLocation,
        latitude: baseLocation.latitude + 0.00001, // ~1 meter
        timestamp: Date.now() + 1000,
      });

      // Advance time past stationary threshold
      jest.advanceTimersByTime(61000);

      // Add third location still close
      locationUpdateCallback({
        ...baseLocation,
        latitude: baseLocation.latitude + 0.00002,
        timestamp: Date.now() + 62000,
      });

      const movementState = batteryService.getMovementState();
      expect(movementState.isStationary).toBe(true);
    });

    it('should detect movement', () => {
      const baseLocation: LocationCoordinate = {
        latitude: 37.7749,
        longitude: -122.4194,
        timestamp: Date.now(),
      };

      // Add first location
      locationUpdateCallback(baseLocation);

      // Add second location far from first (beyond threshold)
      locationUpdateCallback({
        ...baseLocation,
        latitude: baseLocation.latitude + 0.0001, // ~11 meters
        timestamp: Date.now() + 1000,
      });

      const movementState = batteryService.getMovementState();
      expect(movementState.isStationary).toBe(false);
    });

    it('should calculate average speed', () => {
      const baseLocation: LocationCoordinate = {
        latitude: 37.7749,
        longitude: -122.4194,
        timestamp: Date.now(),
      };

      // Add multiple locations to calculate speed
      for (let i = 0; i < 5; i++) {
        locationUpdateCallback({
          ...baseLocation,
          latitude: baseLocation.latitude + i * 0.0001, // Moving north
          timestamp: Date.now() + i * 1000, // 1 second intervals
        });
      }

      const movementState = batteryService.getMovementState();
      expect(movementState.averageSpeed).toBeGreaterThan(0);
    });
  });

  describe('Adaptive Intervals', () => {
    let locationUpdateCallback: (location: LocationCoordinate) => void;

    beforeEach(() => {
      mockLocationService.onLocationUpdate.mockImplementation((callback) => {
        locationUpdateCallback = callback;
        return jest.fn();
      });

      (BatteryOptimizedLocationService as any).instance = undefined;
      batteryService = BatteryOptimizedLocationService.getInstance();
    });

    it('should use stationary interval when not moving', async () => {
      mockAccuracyMonitor.getCurrentSignalQuality.mockReturnValue(
        SignalQuality.GOOD
      );

      // Simulate stationary state
      const stationaryLocation: LocationCoordinate = {
        latitude: 37.7749,
        longitude: -122.4194,
        timestamp: Date.now(),
      };

      locationUpdateCallback(stationaryLocation);
      locationUpdateCallback({
        ...stationaryLocation,
        timestamp: Date.now() + 1000,
      });

      // Advance time to trigger stationary state
      jest.advanceTimersByTime(61000);

      await batteryService.startOptimizedTracking();

      const stats = batteryService.getOptimizationStats();
      expect(stats.currentInterval).toBe(30000); // Stationary interval
    });

    it('should use fast movement interval for high speed', async () => {
      mockAccuracyMonitor.getCurrentSignalQuality.mockReturnValue(
        SignalQuality.GOOD
      );

      // Simulate fast movement by setting high average speed
      const movementState = batteryService.getMovementState();
      (movementState as any).averageSpeed = 3.0; // > 2.0 m/s threshold

      await batteryService.startOptimizedTracking();

      const stats = batteryService.getOptimizationStats();
      expect(stats.currentInterval).toBe(1000); // Fast movement interval
    });
  });

  describe('Power Saving Mode', () => {
    it('should apply power saving adjustments when enabled', async () => {
      mockAccuracyMonitor.getCurrentSignalQuality.mockReturnValue(
        SignalQuality.POOR
      );

      batteryService.enablePowerSavingMode();

      await batteryService.startOptimizedTracking({
        accuracy: LocationAccuracy.HIGH,
        timeInterval: 1000,
        distanceInterval: 1,
      });

      expect(mockLocationService.startTracking).toHaveBeenCalledWith(
        expect.objectContaining({
          accuracy: LocationAccuracy.MEDIUM,
          timeInterval: 5000, // Increased from 1000
          distanceInterval: 5, // Increased from 1
          enableHighAccuracy: false,
        })
      );
    });

    it('should not apply power saving when disabled', async () => {
      mockAccuracyMonitor.getCurrentSignalQuality.mockReturnValue(
        SignalQuality.GOOD
      );

      batteryService.disablePowerSavingMode();

      await batteryService.startOptimizedTracking({
        accuracy: LocationAccuracy.HIGH,
        timeInterval: 1000,
      });

      expect(mockLocationService.startTracking).toHaveBeenCalledWith(
        expect.objectContaining({
          accuracy: LocationAccuracy.HIGH,
          timeInterval: 2000, // Default normal interval
        })
      );
    });

    it('should check if power saving is active', () => {
      batteryService.enablePowerSavingMode();
      mockAccuracyMonitor.getCurrentSignalQuality.mockReturnValue(
        SignalQuality.POOR
      );

      expect(batteryService.isPowerSavingActive()).toBe(true);

      batteryService.disablePowerSavingMode();
      expect(batteryService.isPowerSavingActive()).toBe(false);
    });
  });

  describe('Optimization Statistics', () => {
    it('should provide optimization statistics', async () => {
      mockAccuracyMonitor.getCurrentSignalQuality.mockReturnValue(
        SignalQuality.GOOD
      );

      await batteryService.startOptimizedTracking();
      const stats = batteryService.getOptimizationStats();

      expect(stats).toHaveProperty('powerSavingsEnabled');
      expect(stats).toHaveProperty('currentInterval');
      expect(stats).toHaveProperty('movementState');
      expect(stats).toHaveProperty('optimizationLevel');
    });

    it('should calculate optimization level correctly', async () => {
      mockAccuracyMonitor.getCurrentSignalQuality.mockReturnValue(
        SignalQuality.GOOD
      );

      // Test no optimization
      batteryService.disablePowerSavingMode();
      await batteryService.startOptimizedTracking();
      expect(batteryService.getOptimizationStats().optimizationLevel).toBe(
        'none'
      );

      // Test high optimization (poor signal)
      batteryService.enablePowerSavingMode();
      mockAccuracyMonitor.getCurrentSignalQuality.mockReturnValue(
        SignalQuality.POOR
      );
      await batteryService.startOptimizedTracking();
      expect(batteryService.getOptimizationStats().optimizationLevel).toBe(
        'high'
      );
    });
  });

  describe('Optimization Monitoring', () => {
    it('should start optimization monitoring timer', async () => {
      mockAccuracyMonitor.getCurrentSignalQuality.mockReturnValue(
        SignalQuality.GOOD
      );

      await batteryService.startOptimizedTracking();

      // Check that timer is set
      expect((batteryService as any).optimizationTimer).toBeTruthy();
    });

    it('should stop optimization monitoring timer', async () => {
      mockAccuracyMonitor.getCurrentSignalQuality.mockReturnValue(
        SignalQuality.GOOD
      );

      await batteryService.startOptimizedTracking();
      await batteryService.stopOptimizedTracking();

      // Check that timer is cleared
      expect((batteryService as any).optimizationTimer).toBeNull();
    });

    it('should evaluate optimizations periodically', async () => {
      mockLocationService.isCurrentlyTracking.mockReturnValue(true);
      mockAccuracyMonitor.getCurrentSignalQuality.mockReturnValue(
        SignalQuality.GOOD
      );

      await batteryService.startOptimizedTracking();

      // Advance timer to trigger optimization evaluation
      jest.advanceTimersByTime(30000);

      // Should have evaluated optimizations (implementation detail)
      expect(mockLocationService.isCurrentlyTracking).toHaveBeenCalled();
    });
  });

  describe('Distance Calculation', () => {
    it('should calculate distance between coordinates correctly', () => {
      const loc1: LocationCoordinate = {
        latitude: 37.7749,
        longitude: -122.4194,
        timestamp: Date.now(),
      };

      const loc2: LocationCoordinate = {
        latitude: 37.7849, // ~1.1 km north
        longitude: -122.4194,
        timestamp: Date.now() + 1000,
      };

      // Access private method for testing
      const distance = (batteryService as any).calculateDistance(loc1, loc2);

      // Should be approximately 1111 meters (1 degree latitude ≈ 111 km)
      expect(distance).toBeGreaterThan(1000);
      expect(distance).toBeLessThan(1200);
    });
  });

  describe('Reset Functionality', () => {
    it('should reset all state when stopping', async () => {
      mockAccuracyMonitor.getCurrentSignalQuality.mockReturnValue(
        SignalQuality.GOOD
      );

      await batteryService.startOptimizedTracking();
      await batteryService.stopOptimizedTracking();

      const movementState = batteryService.getMovementState();
      expect(movementState.isStationary).toBe(false);
      expect(movementState.averageSpeed).toBe(0);
      expect(movementState.distanceTraveled).toBe(0);
    });
  });
});
