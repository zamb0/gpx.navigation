import {
  LocationCoordinate,
  LocationAccuracy,
  TrackingOptions,
  SignalQuality,
} from '../../types/location';
import { LocationService } from './LocationService';
import { LocationAccuracyMonitor } from './LocationAccuracyMonitor';

export interface BatteryOptimizationConfig {
  enableAdaptiveAccuracy: boolean;
  enableMovementDetection: boolean;
  enablePowerSavingMode: boolean;
  stationaryThreshold: number; // meters
  stationaryTimeThreshold: number; // milliseconds
  lowBatteryThreshold: number; // percentage (0-100)
  adaptiveIntervals: {
    stationary: number;
    slowMovement: number;
    normalMovement: number;
    fastMovement: number;
  };
}

export interface MovementState {
  isStationary: boolean;
  averageSpeed: number; // m/s
  lastMovementTime: number;
  distanceTraveled: number;
}

export interface BatteryOptimizationStats {
  powerSavingsEnabled: boolean;
  currentInterval: number;
  batteryLevel?: number;
  movementState: MovementState;
  optimizationLevel: 'none' | 'low' | 'medium' | 'high';
}

export class BatteryOptimizedLocationService {
  private static instance: BatteryOptimizedLocationService;
  private locationService: LocationService;
  private accuracyMonitor: LocationAccuracyMonitor;
  private config: BatteryOptimizationConfig;
  private movementState: MovementState;
  private locationHistory: LocationCoordinate[] = [];
  private maxHistorySize = 5;
  private currentTrackingOptions: TrackingOptions | null = null;
  private optimizationTimer: NodeJS.Timeout | null = null;

  private constructor() {
    this.locationService = LocationService.getInstance();
    this.accuracyMonitor = LocationAccuracyMonitor.getInstance();

    this.config = {
      enableAdaptiveAccuracy: true,
      enableMovementDetection: true,
      enablePowerSavingMode: true,
      stationaryThreshold: 10, // 10 meters
      stationaryTimeThreshold: 60000, // 1 minute
      lowBatteryThreshold: 20, // 20%
      adaptiveIntervals: {
        stationary: 30000, // 30 seconds when stationary
        slowMovement: 5000, // 5 seconds for slow movement
        normalMovement: 2000, // 2 seconds for normal movement
        fastMovement: 1000, // 1 second for fast movement
      },
    };

    this.movementState = {
      isStationary: false,
      averageSpeed: 0,
      lastMovementTime: Date.now(),
      distanceTraveled: 0,
    };

    this.setupLocationListener();
  }

  public static getInstance(): BatteryOptimizedLocationService {
    if (!BatteryOptimizedLocationService.instance) {
      BatteryOptimizedLocationService.instance =
        new BatteryOptimizedLocationService();
    }
    return BatteryOptimizedLocationService.instance;
  }

  /**
   * Start battery-optimized location tracking
   */
  public async startOptimizedTracking(
    options?: Partial<TrackingOptions>
  ): Promise<void> {
    this.currentTrackingOptions = {
      accuracy: LocationAccuracy.HIGH,
      timeInterval: 2000,
      distanceInterval: 1,
      enableHighAccuracy: true,
      ...options,
    };

    // Apply initial optimizations
    const optimizedOptions = this.applyBatteryOptimizations(
      this.currentTrackingOptions
    );

    await this.locationService.startTracking(optimizedOptions);

    // Start optimization monitoring
    this.startOptimizationMonitoring();
  }

  /**
   * Stop optimized tracking
   */
  public async stopOptimizedTracking(): Promise<void> {
    await this.locationService.stopTracking();
    this.stopOptimizationMonitoring();
    this.reset();
  }

  /**
   * Update battery optimization configuration
   */
  public updateOptimizationConfig(
    newConfig: Partial<BatteryOptimizationConfig>
  ): void {
    this.config = { ...this.config, ...newConfig };

    // Restart tracking with new config if currently tracking
    if (
      this.locationService.isCurrentlyTracking() &&
      this.currentTrackingOptions
    ) {
      this.restartTrackingWithOptimizations();
    }
  }

  /**
   * Get current optimization configuration
   */
  public getOptimizationConfig(): BatteryOptimizationConfig {
    return { ...this.config };
  }

  /**
   * Get battery optimization statistics
   */
  public getOptimizationStats(): BatteryOptimizationStats {
    const currentOptions = this.getCurrentOptimizedOptions();

    return {
      powerSavingsEnabled: this.config.enablePowerSavingMode,
      currentInterval: currentOptions?.timeInterval || 0,
      movementState: { ...this.movementState },
      optimizationLevel: this.getCurrentOptimizationLevel(),
    };
  }

  /**
   * Force power saving mode
   */
  public enablePowerSavingMode(): void {
    this.config.enablePowerSavingMode = true;
    if (this.locationService.isCurrentlyTracking()) {
      this.restartTrackingWithOptimizations();
    }
  }

  /**
   * Disable power saving mode
   */
  public disablePowerSavingMode(): void {
    this.config.enablePowerSavingMode = false;
    if (this.locationService.isCurrentlyTracking()) {
      this.restartTrackingWithOptimizations();
    }
  }

  /**
   * Get movement detection state
   */
  public getMovementState(): MovementState {
    return { ...this.movementState };
  }

  /**
   * Check if currently in power saving mode
   */
  public isPowerSavingActive(): boolean {
    return this.config.enablePowerSavingMode && this.shouldUsePowerSaving();
  }

  // Private helper methods

  private setupLocationListener(): void {
    this.locationService.onLocationUpdate((location) => {
      this.processLocationForOptimization(location);
    });
  }

  private processLocationForOptimization(location: LocationCoordinate): void {
    // Add to history
    this.locationHistory.push(location);
    if (this.locationHistory.length > this.maxHistorySize) {
      this.locationHistory.shift();
    }

    // Update movement state
    this.updateMovementState(location);

    // Check if we need to adjust tracking parameters
    if (
      this.config.enableAdaptiveAccuracy ||
      this.config.enableMovementDetection
    ) {
      this.evaluateOptimizationAdjustments();
    }
  }

  private updateMovementState(location: LocationCoordinate): void {
    if (this.locationHistory.length < 2) {
      return;
    }

    const previousLocation =
      this.locationHistory[this.locationHistory.length - 2];
    const distance = this.calculateDistance(previousLocation, location);
    const timeDiff = (location.timestamp - previousLocation.timestamp) / 1000; // seconds
    const speed = timeDiff > 0 ? distance / timeDiff : 0;

    // Update movement state
    this.movementState.distanceTraveled += distance;

    // Calculate average speed over recent history
    if (this.locationHistory.length >= 3) {
      const speeds: number[] = [];
      for (let i = 1; i < this.locationHistory.length; i++) {
        const prev = this.locationHistory[i - 1];
        const curr = this.locationHistory[i];
        const dist = this.calculateDistance(prev, curr);
        const time = (curr.timestamp - prev.timestamp) / 1000;
        if (time > 0) {
          speeds.push(dist / time);
        }
      }
      this.movementState.averageSpeed =
        speeds.length > 0
          ? speeds.reduce((sum, s) => sum + s, 0) / speeds.length
          : 0;
    }

    // Check if stationary
    const isCurrentlyStationary = distance < this.config.stationaryThreshold;
    const timeSinceLastMovement =
      Date.now() - this.movementState.lastMovementTime;

    if (!isCurrentlyStationary) {
      this.movementState.lastMovementTime = Date.now();
      this.movementState.isStationary = false;
    } else if (timeSinceLastMovement > this.config.stationaryTimeThreshold) {
      this.movementState.isStationary = true;
    }
  }

  private evaluateOptimizationAdjustments(): void {
    if (!this.currentTrackingOptions) {
      return;
    }

    const currentOptions = this.getCurrentOptimizedOptions();
    const newOptions = this.applyBatteryOptimizations(
      this.currentTrackingOptions
    );

    // Check if we need to restart tracking with new options
    if (this.shouldRestartTracking(currentOptions, newOptions)) {
      this.restartTrackingWithOptimizations();
    }
  }

  private applyBatteryOptimizations(
    baseOptions: TrackingOptions
  ): TrackingOptions {
    let optimizedOptions = { ...baseOptions };

    // Apply movement-based interval optimization
    if (this.config.enableMovementDetection) {
      optimizedOptions.timeInterval = this.getOptimalInterval();
    }

    // Apply accuracy optimization based on signal quality and battery
    if (this.config.enableAdaptiveAccuracy) {
      optimizedOptions.accuracy = this.getOptimalAccuracy();
    }

    // Apply power saving mode adjustments
    if (this.config.enablePowerSavingMode && this.shouldUsePowerSaving()) {
      optimizedOptions = this.applyPowerSavingAdjustments(optimizedOptions);
    }

    return optimizedOptions;
  }

  private getOptimalInterval(): number {
    if (this.movementState.isStationary) {
      return this.config.adaptiveIntervals.stationary;
    }

    const speed = this.movementState.averageSpeed;

    // Speed thresholds (m/s)
    if (speed < 0.5) {
      // < 1.8 km/h (walking slowly)
      return this.config.adaptiveIntervals.slowMovement;
    } else if (speed < 2.0) {
      // < 7.2 km/h (walking/jogging)
      return this.config.adaptiveIntervals.normalMovement;
    } else {
      // > 7.2 km/h (running/cycling)
      return this.config.adaptiveIntervals.fastMovement;
    }
  }

  private getOptimalAccuracy(): LocationAccuracy {
    const signalQuality = this.accuracyMonitor.getCurrentSignalQuality();

    // If signal is poor, don't waste battery on high accuracy
    if (signalQuality === SignalQuality.POOR) {
      return LocationAccuracy.MEDIUM;
    }

    // If stationary and power saving is enabled, use lower accuracy
    if (this.movementState.isStationary && this.shouldUsePowerSaving()) {
      return LocationAccuracy.MEDIUM;
    }

    // Default to high accuracy for moving activities
    return LocationAccuracy.HIGH;
  }

  private applyPowerSavingAdjustments(
    options: TrackingOptions
  ): TrackingOptions {
    return {
      ...options,
      accuracy: LocationAccuracy.MEDIUM,
      timeInterval: Math.max(options.timeInterval || 2000, 5000), // At least 5 seconds
      distanceInterval: Math.max(options.distanceInterval || 1, 5), // At least 5 meters
      enableHighAccuracy: false,
    };
  }

  private shouldUsePowerSaving(): boolean {
    // This would typically check battery level, but React Native doesn't have
    // a built-in battery API. In a real implementation, you'd use a library
    // like react-native-device-info or implement native modules.

    // For now, use movement state and signal quality as indicators
    const signalQuality = this.accuracyMonitor.getCurrentSignalQuality();
    return (
      this.movementState.isStationary || signalQuality === SignalQuality.POOR
    );
  }

  private getCurrentOptimizationLevel(): 'none' | 'low' | 'medium' | 'high' {
    if (!this.config.enablePowerSavingMode) {
      return 'none';
    }

    if (this.shouldUsePowerSaving()) {
      return 'high';
    }

    if (this.movementState.averageSpeed < 1.0) {
      return 'medium';
    }

    return 'low';
  }

  private getCurrentOptimizedOptions(): TrackingOptions | null {
    if (!this.currentTrackingOptions) {
      return null;
    }
    return this.applyBatteryOptimizations(this.currentTrackingOptions);
  }

  private shouldRestartTracking(
    currentOptions: TrackingOptions | null,
    newOptions: TrackingOptions
  ): boolean {
    if (!currentOptions) {
      return false;
    }

    // Restart if significant changes in interval or accuracy
    const intervalDiff = Math.abs(
      (currentOptions.timeInterval || 0) - (newOptions.timeInterval || 0)
    );
    const accuracyChanged = currentOptions.accuracy !== newOptions.accuracy;

    return intervalDiff > 1000 || accuracyChanged; // 1 second threshold for interval changes
  }

  private async restartTrackingWithOptimizations(): Promise<void> {
    if (!this.currentTrackingOptions) {
      return;
    }

    await this.locationService.stopTracking();

    const optimizedOptions = this.applyBatteryOptimizations(
      this.currentTrackingOptions
    );
    await this.locationService.startTracking(optimizedOptions);
  }

  private startOptimizationMonitoring(): void {
    // Check for optimization adjustments every 30 seconds
    this.optimizationTimer = setInterval(() => {
      this.evaluateOptimizationAdjustments();
    }, 30000);
  }

  private stopOptimizationMonitoring(): void {
    if (this.optimizationTimer) {
      clearInterval(this.optimizationTimer);
      this.optimizationTimer = null;
    }
  }

  private calculateDistance(
    loc1: LocationCoordinate,
    loc2: LocationCoordinate
  ): number {
    const R = 6371000; // Earth's radius in meters
    const lat1Rad = (loc1.latitude * Math.PI) / 180;
    const lat2Rad = (loc2.latitude * Math.PI) / 180;
    const deltaLatRad = ((loc2.latitude - loc1.latitude) * Math.PI) / 180;
    const deltaLonRad = ((loc2.longitude - loc1.longitude) * Math.PI) / 180;

    const a =
      Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
      Math.cos(lat1Rad) *
        Math.cos(lat2Rad) *
        Math.sin(deltaLonRad / 2) *
        Math.sin(deltaLonRad / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private reset(): void {
    this.locationHistory = [];
    this.movementState = {
      isStationary: false,
      averageSpeed: 0,
      lastMovementTime: Date.now(),
      distanceTraveled: 0,
    };
    this.currentTrackingOptions = null;
  }
}
