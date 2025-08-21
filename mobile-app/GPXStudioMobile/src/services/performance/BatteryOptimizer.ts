/**
 * Battery optimization service for adaptive GPS polling and power-saving modes
 */

import { AppState, AppStateStatus } from 'react-native';
import * as Battery from 'expo-battery';

export interface BatteryConfig {
  lowBatteryThreshold: number; // Battery level threshold (0-1)
  criticalBatteryThreshold: number; // Critical battery level (0-1)
  adaptiveGPSEnabled: boolean;
  powerSavingMode: 'off' | 'auto' | 'aggressive';
  backgroundLocationEnabled: boolean;
}

export interface GPSSettings {
  accuracy: 'low' | 'medium' | 'high' | 'best';
  updateInterval: number; // milliseconds
  minimumDistance: number; // meters
  enableBackgroundUpdates: boolean;
}

export interface PowerSavingSettings {
  reduceMapQuality: boolean;
  disableAnimations: boolean;
  limitBackgroundProcessing: boolean;
  reducedGPSAccuracy: boolean;
  extendedUpdateIntervals: boolean;
}

export interface BatteryStats {
  level: number; // 0-1
  isCharging: boolean;
  isLowPowerMode: boolean;
  estimatedTimeRemaining?: number; // minutes
  powerSavingActive: boolean;
  currentGPSSettings: GPSSettings;
}

export class BatteryOptimizer {
  private config: BatteryConfig;
  private currentGPSSettings: GPSSettings;
  private originalGPSSettings: GPSSettings;
  private powerSavingSettings: PowerSavingSettings;
  private batteryLevel: number = 1;
  private isCharging: boolean = false;
  private isLowPowerMode: boolean = false;
  private appState: AppStateStatus = 'active';
  private batterySubscription?: any;
  private appStateSubscription?: any;
  private optimizationListeners: Array<(settings: any) => void> = [];

  constructor(config?: Partial<BatteryConfig>) {
    this.config = {
      lowBatteryThreshold: 0.2, // 20%
      criticalBatteryThreshold: 0.1, // 10%
      adaptiveGPSEnabled: true,
      powerSavingMode: 'auto',
      backgroundLocationEnabled: true,
      ...config,
    };

    this.originalGPSSettings = {
      accuracy: 'high',
      updateInterval: 1000, // 1 second
      minimumDistance: 5, // 5 meters
      enableBackgroundUpdates: true,
    };

    this.currentGPSSettings = { ...this.originalGPSSettings };

    this.powerSavingSettings = {
      reduceMapQuality: false,
      disableAnimations: false,
      limitBackgroundProcessing: false,
      reducedGPSAccuracy: false,
      extendedUpdateIntervals: false,
    };

    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      // Get initial battery state
      this.batteryLevel = await Battery.getBatteryLevelAsync();
      this.isCharging =
        (await Battery.getBatteryStateAsync()) ===
        Battery.BatteryState.CHARGING;
      this.isLowPowerMode = await Battery.isLowPowerModeEnabledAsync();

      // Set up battery monitoring
      this.batterySubscription = Battery.addBatteryLevelListener(
        this.handleBatteryLevelChange.bind(this)
      );

      // Set up app state monitoring
      this.appStateSubscription = AppState.addEventListener(
        'change',
        this.handleAppStateChange.bind(this)
      );

      // Apply initial optimizations
      this.updateOptimizations();
    } catch (error) {
      console.error('Failed to initialize battery optimizer:', error);
    }
  }

  /**
   * Get current battery statistics
   */
  async getBatteryStats(): Promise<BatteryStats> {
    try {
      const level = await Battery.getBatteryLevelAsync();
      const state = await Battery.getBatteryStateAsync();
      const isCharging = state === Battery.BatteryState.CHARGING;
      const isLowPowerMode = await Battery.isLowPowerModeEnabledAsync();

      return {
        level,
        isCharging,
        isLowPowerMode,
        powerSavingActive: this.isPowerSavingActive(),
        currentGPSSettings: { ...this.currentGPSSettings },
      };
    } catch (error) {
      console.error('Failed to get battery stats:', error);
      return {
        level: this.batteryLevel,
        isCharging: this.isCharging,
        isLowPowerMode: this.isLowPowerMode,
        powerSavingActive: this.isPowerSavingActive(),
        currentGPSSettings: { ...this.currentGPSSettings },
      };
    }
  }

  /**
   * Update GPS settings based on current conditions
   */
  updateGPSSettings(baseSettings: Partial<GPSSettings>): GPSSettings {
    // Update original settings
    this.originalGPSSettings = { ...this.originalGPSSettings, ...baseSettings };

    // Apply optimizations
    this.updateOptimizations();

    return { ...this.currentGPSSettings };
  }

  /**
   * Get optimized GPS settings for current battery state
   */
  getOptimizedGPSSettings(): GPSSettings {
    return { ...this.currentGPSSettings };
  }

  /**
   * Get current power saving settings
   */
  getPowerSavingSettings(): PowerSavingSettings {
    return { ...this.powerSavingSettings };
  }

  /**
   * Force enable/disable power saving mode
   */
  setPowerSavingMode(enabled: boolean): void {
    if (enabled) {
      this.enablePowerSaving();
    } else {
      this.disablePowerSaving();
    }
  }

  /**
   * Add optimization change listener
   */
  addOptimizationListener(listener: (settings: any) => void): void {
    this.optimizationListeners.push(listener);
  }

  /**
   * Remove optimization change listener
   */
  removeOptimizationListener(listener: (settings: any) => void): void {
    const index = this.optimizationListeners.indexOf(listener);
    if (index > -1) {
      this.optimizationListeners.splice(index, 1);
    }
  }

  /**
   * Calculate optimal GPS update interval based on movement speed
   */
  calculateOptimalUpdateInterval(
    currentSpeed: number, // m/s
    baseInterval: number = 1000
  ): number {
    if (!this.config.adaptiveGPSEnabled) {
      return baseInterval;
    }

    // Adjust interval based on speed and battery level
    let multiplier = 1;

    // Speed-based adjustment
    if (currentSpeed < 0.5) {
      // Stationary or very slow (< 1.8 km/h)
      multiplier = 4; // Update every 4 seconds
    } else if (currentSpeed < 2) {
      // Walking speed (< 7.2 km/h)
      multiplier = 2; // Update every 2 seconds
    } else if (currentSpeed < 10) {
      // Cycling speed (< 36 km/h)
      multiplier = 1; // Normal interval
    } else {
      // High speed
      multiplier = 0.5; // More frequent updates
    }

    // Battery-based adjustment
    if (this.batteryLevel < this.config.criticalBatteryThreshold) {
      multiplier *= 8; // Very infrequent updates
    } else if (this.batteryLevel < this.config.lowBatteryThreshold) {
      multiplier *= 3; // Less frequent updates
    }

    // Charging adjustment
    if (this.isCharging) {
      multiplier *= 0.5; // More frequent when charging
    }

    // App state adjustment
    if (this.appState === 'background') {
      multiplier *= 4; // Less frequent in background
    }

    return Math.max(1000, Math.min(60000, baseInterval * multiplier)); // 1s to 60s range
  }

  /**
   * Calculate optimal GPS accuracy based on battery level
   */
  calculateOptimalAccuracy(): 'low' | 'medium' | 'high' | 'best' {
    if (!this.config.adaptiveGPSEnabled) {
      return this.originalGPSSettings.accuracy;
    }

    if (this.batteryLevel < this.config.criticalBatteryThreshold) {
      return 'low';
    } else if (this.batteryLevel < this.config.lowBatteryThreshold) {
      return 'medium';
    } else if (this.isCharging) {
      return 'best';
    } else {
      return this.originalGPSSettings.accuracy;
    }
  }

  /**
   * Private methods
   */

  private handleBatteryLevelChange(event: { batteryLevel: number }): void {
    const batteryLevel = event.batteryLevel;
    const previousLevel = this.batteryLevel;
    this.batteryLevel = batteryLevel;

    // Check if we crossed a threshold
    const crossedLowThreshold =
      previousLevel >= this.config.lowBatteryThreshold &&
      batteryLevel < this.config.lowBatteryThreshold;

    const crossedCriticalThreshold =
      previousLevel >= this.config.criticalBatteryThreshold &&
      batteryLevel < this.config.criticalBatteryThreshold;

    if (crossedLowThreshold || crossedCriticalThreshold) {
      console.log(
        `Battery level changed to ${Math.round(batteryLevel * 100)}% - updating optimizations`
      );
      this.updateOptimizations();
    }
  }

  private handleAppStateChange(nextAppState: AppStateStatus): void {
    const previousState = this.appState;
    this.appState = nextAppState;

    if (previousState !== nextAppState) {
      console.log(
        `App state changed to ${nextAppState} - updating optimizations`
      );
      this.updateOptimizations();
    }
  }

  private updateOptimizations(): void {
    const shouldEnablePowerSaving = this.shouldEnablePowerSaving();

    if (shouldEnablePowerSaving && !this.isPowerSavingActive()) {
      this.enablePowerSaving();
    } else if (!shouldEnablePowerSaving && this.isPowerSavingActive()) {
      this.disablePowerSaving();
    }

    // Update GPS settings
    this.updateGPSOptimizations();

    // Notify listeners
    this.notifyOptimizationChange();
  }

  private shouldEnablePowerSaving(): boolean {
    if (this.config.powerSavingMode === 'off') {
      return false;
    }

    if (this.config.powerSavingMode === 'aggressive') {
      return true;
    }

    // Auto mode
    return (
      this.batteryLevel < this.config.lowBatteryThreshold ||
      this.isLowPowerMode ||
      this.appState === 'background'
    );
  }

  private enablePowerSaving(): void {
    console.log('Enabling power saving optimizations');

    this.powerSavingSettings = {
      reduceMapQuality: true,
      disableAnimations:
        this.batteryLevel < this.config.criticalBatteryThreshold,
      limitBackgroundProcessing: true,
      reducedGPSAccuracy: true,
      extendedUpdateIntervals: true,
    };
  }

  private disablePowerSaving(): void {
    console.log('Disabling power saving optimizations');

    this.powerSavingSettings = {
      reduceMapQuality: false,
      disableAnimations: false,
      limitBackgroundProcessing: false,
      reducedGPSAccuracy: false,
      extendedUpdateIntervals: false,
    };
  }

  private updateGPSOptimizations(): void {
    // Calculate optimal settings
    const optimalAccuracy = this.calculateOptimalAccuracy();
    const optimalInterval = this.calculateOptimalUpdateInterval(
      0, // Default speed, would be passed from location service
      this.originalGPSSettings.updateInterval
    );

    // Update current GPS settings
    this.currentGPSSettings = {
      ...this.originalGPSSettings,
      accuracy: optimalAccuracy,
      updateInterval: optimalInterval,
      enableBackgroundUpdates:
        this.config.backgroundLocationEnabled &&
        this.batteryLevel > this.config.criticalBatteryThreshold,
    };

    // Adjust minimum distance based on battery level
    if (this.batteryLevel < this.config.lowBatteryThreshold) {
      this.currentGPSSettings.minimumDistance =
        this.originalGPSSettings.minimumDistance * 2;
    }
  }

  private isPowerSavingActive(): boolean {
    return (
      this.powerSavingSettings.reduceMapQuality ||
      this.powerSavingSettings.limitBackgroundProcessing ||
      this.powerSavingSettings.reducedGPSAccuracy ||
      this.powerSavingSettings.extendedUpdateIntervals
    );
  }

  private notifyOptimizationChange(): void {
    const settings = {
      gps: { ...this.currentGPSSettings },
      powerSaving: { ...this.powerSavingSettings },
      battery: {
        level: this.batteryLevel,
        isCharging: this.isCharging,
        isLowPowerMode: this.isLowPowerMode,
      },
    };

    for (const listener of this.optimizationListeners) {
      try {
        listener(settings);
      } catch (error) {
        console.error('Error in optimization listener:', error);
      }
    }
  }

  /**
   * Get battery usage estimation for different GPS settings
   */
  estimateBatteryUsage(gpsSettings: GPSSettings): {
    estimatedHours: number;
    relativeUsage: number; // Compared to baseline
  } {
    // Base battery usage per hour (arbitrary units)
    let baseUsage = 100;

    // Accuracy impact
    const accuracyMultiplier = {
      low: 0.5,
      medium: 0.7,
      high: 1.0,
      best: 1.5,
    };
    baseUsage *= accuracyMultiplier[gpsSettings.accuracy];

    // Update interval impact (more frequent = more battery)
    const intervalMultiplier = 5000 / gpsSettings.updateInterval; // 5s baseline
    baseUsage *= intervalMultiplier;

    // Background updates impact
    if (gpsSettings.enableBackgroundUpdates) {
      baseUsage *= 1.3;
    }

    // Estimate hours based on current battery level
    const estimatedHours = (this.batteryLevel * 1000) / baseUsage; // Rough estimation

    return {
      estimatedHours,
      relativeUsage: baseUsage / 100, // Relative to baseline
    };
  }

  /**
   * Cleanup and destroy the optimizer
   */
  destroy(): void {
    if (this.batterySubscription) {
      this.batterySubscription.remove();
    }

    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }

    this.optimizationListeners = [];
  }
}
