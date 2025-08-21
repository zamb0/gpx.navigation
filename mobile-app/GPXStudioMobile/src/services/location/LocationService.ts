import * as Location from 'expo-location';
import {
  LocationCoordinate,
  LocationAccuracy,
  LocationPermissionStatus,
  LocationPermissionResponse,
  LocationServiceStatus,
  LocationServiceInfo,
  LocationError,
  LocationErrorCode,
  TrackingOptions,
  LocationServiceConfig,
  LocationStats,
  SignalQuality,
  LocationUpdateCallback,
  LocationErrorCallback,
} from '../../types/location';

export class LocationService {
  private static instance: LocationService;
  private isTracking = false;
  private watchSubscription: Location.LocationSubscription | null = null;
  private locationCallbacks: LocationUpdateCallback[] = [];
  private errorCallbacks: LocationErrorCallback[] = [];
  private config: LocationServiceConfig;
  private stats: LocationStats;
  private lastKnownLocation: LocationCoordinate | null = null;

  private constructor() {
    this.config = {
      defaultAccuracy: LocationAccuracy.HIGH,
      defaultTimeInterval: 1000, // 1 second
      defaultDistanceInterval: 1, // 1 meter
      batteryOptimizationEnabled: true,
      backgroundLocationEnabled: false,
      maxLocationAge: 30000, // 30 seconds
      locationTimeout: 15000, // 15 seconds
    };

    this.stats = {
      totalUpdates: 0,
      averageAccuracy: 0,
      lastUpdateTime: 0,
      signalQuality: SignalQuality.POOR,
    };
  }

  public static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  /**
   * Request location permissions from the user
   */
  public async requestPermissions(): Promise<LocationPermissionResponse> {
    try {
      const { status, canAskAgain, expires } =
        await Location.requestForegroundPermissionsAsync();

      return {
        status: this.mapExpoPermissionStatus(status),
        canAskAgain,
        expires,
      };
    } catch (error) {
      throw this.createLocationError(
        LocationErrorCode.PERMISSION_DENIED,
        'Failed to request location permissions',
        error
      );
    }
  }

  /**
   * Request background location permissions (for track recording)
   */
  public async requestBackgroundPermissions(): Promise<LocationPermissionResponse> {
    try {
      const { status, canAskAgain, expires } =
        await Location.requestBackgroundPermissionsAsync();

      return {
        status: this.mapExpoPermissionStatus(status),
        canAskAgain,
        expires,
      };
    } catch (error) {
      throw this.createLocationError(
        LocationErrorCode.PERMISSION_DENIED,
        'Failed to request background location permissions',
        error
      );
    }
  }

  /**
   * Check current permission status
   */
  public async getPermissionStatus(): Promise<LocationPermissionResponse> {
    try {
      const { status, canAskAgain, expires } =
        await Location.getForegroundPermissionsAsync();

      return {
        status: this.mapExpoPermissionStatus(status),
        canAskAgain,
        expires,
      };
    } catch (error) {
      throw this.createLocationError(
        LocationErrorCode.UNKNOWN,
        'Failed to get permission status',
        error
      );
    }
  }

  /**
   * Check if location services are enabled on the device
   */
  public async getLocationServiceInfo(): Promise<LocationServiceInfo> {
    try {
      const isLocationEnabled = await Location.hasServicesEnabledAsync();

      return {
        isLocationEnabled,
        isGpsEnabled: isLocationEnabled, // Expo doesn't provide granular GPS info
        isNetworkEnabled: isLocationEnabled,
        isPassiveEnabled: isLocationEnabled,
      };
    } catch (error) {
      throw this.createLocationError(
        LocationErrorCode.LOCATION_DISABLED,
        'Failed to get location service info',
        error
      );
    }
  }

  /**
   * Get current location once
   */
  public async getCurrentLocation(
    options?: Partial<TrackingOptions>
  ): Promise<LocationCoordinate> {
    try {
      await this.ensurePermissions();

      const locationOptions = this.buildLocationOptions(options);
      const location = await Location.getCurrentPositionAsync(locationOptions);

      const coordinate = this.mapExpoLocation(location);
      this.updateStats(coordinate);
      this.lastKnownLocation = coordinate;

      return coordinate;
    } catch (error) {
      const locationError = this.handleLocationError(error);
      this.notifyErrorCallbacks(locationError);
      throw locationError;
    }
  }

  /**
   * Start continuous location tracking
   */
  public async startTracking(
    options?: Partial<TrackingOptions>
  ): Promise<void> {
    if (this.isTracking) {
      return;
    }

    try {
      await this.ensurePermissions();

      const locationOptions = this.buildLocationOptions(options);

      this.watchSubscription = await Location.watchPositionAsync(
        locationOptions,
        (location) => {
          const coordinate = this.mapExpoLocation(location);
          this.updateStats(coordinate);
          this.lastKnownLocation = coordinate;
          this.notifyLocationCallbacks(coordinate);
        }
      );

      this.isTracking = true;
    } catch (error) {
      const locationError = this.handleLocationError(error);
      this.notifyErrorCallbacks(locationError);
      throw locationError;
    }
  }

  /**
   * Stop location tracking
   */
  public async stopTracking(): Promise<void> {
    if (!this.isTracking) {
      return;
    }

    if (this.watchSubscription) {
      this.watchSubscription.remove();
      this.watchSubscription = null;
    }

    this.isTracking = false;
  }

  /**
   * Check if currently tracking location
   */
  public isCurrentlyTracking(): boolean {
    return this.isTracking;
  }

  /**
   * Get the last known location
   */
  public getLastKnownLocation(): LocationCoordinate | null {
    return this.lastKnownLocation;
  }

  /**
   * Subscribe to location updates
   */
  public onLocationUpdate(callback: LocationUpdateCallback): () => void {
    this.locationCallbacks.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.locationCallbacks.indexOf(callback);
      if (index > -1) {
        this.locationCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to location errors
   */
  public onLocationError(callback: LocationErrorCallback): () => void {
    this.errorCallbacks.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.errorCallbacks.indexOf(callback);
      if (index > -1) {
        this.errorCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Get location accuracy and signal quality stats
   */
  public getLocationStats(): LocationStats {
    return { ...this.stats };
  }

  /**
   * Update service configuration
   */
  public updateConfig(newConfig: Partial<LocationServiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current service configuration
   */
  public getConfig(): LocationServiceConfig {
    return { ...this.config };
  }

  /**
   * Clear all callbacks and reset service
   */
  public reset(): void {
    this.stopTracking();
    this.locationCallbacks = [];
    this.errorCallbacks = [];
    this.lastKnownLocation = null;
    this.stats = {
      totalUpdates: 0,
      averageAccuracy: 0,
      lastUpdateTime: 0,
      signalQuality: SignalQuality.POOR,
    };
  }

  // Private helper methods

  private async ensurePermissions(): Promise<void> {
    const permissionResponse = await this.getPermissionStatus();

    if (permissionResponse.status !== LocationPermissionStatus.GRANTED) {
      const requestResponse = await this.requestPermissions();

      if (requestResponse.status !== LocationPermissionStatus.GRANTED) {
        throw this.createLocationError(
          LocationErrorCode.PERMISSION_DENIED,
          'Location permission is required for this feature'
        );
      }
    }

    const serviceInfo = await this.getLocationServiceInfo();
    if (!serviceInfo.isLocationEnabled) {
      throw this.createLocationError(
        LocationErrorCode.LOCATION_DISABLED,
        'Location services are disabled on this device'
      );
    }
  }

  private buildLocationOptions(
    options?: Partial<TrackingOptions>
  ): Location.LocationOptions {
    const mergedOptions = {
      accuracy: options?.accuracy || this.config.defaultAccuracy,
      timeInterval: options?.timeInterval || this.config.defaultTimeInterval,
      distanceInterval:
        options?.distanceInterval || this.config.defaultDistanceInterval,
      enableHighAccuracy: options?.enableHighAccuracy ?? true,
      timeout: options?.timeout || this.config.locationTimeout,
      maximumAge: options?.maximumAge || this.config.maxLocationAge,
    };

    return {
      accuracy: this.mapAccuracyToExpo(mergedOptions.accuracy),
      timeInterval: mergedOptions.timeInterval,
      distanceInterval: mergedOptions.distanceInterval,
      mayShowUserSettingsDialog: true,
    };
  }

  private mapAccuracyToExpo(accuracy: LocationAccuracy): Location.Accuracy {
    switch (accuracy) {
      case LocationAccuracy.LOW:
        return Location.Accuracy.Low;
      case LocationAccuracy.MEDIUM:
        return Location.Accuracy.Balanced;
      case LocationAccuracy.HIGH:
        return Location.Accuracy.High;
      case LocationAccuracy.HIGHEST:
        return Location.Accuracy.BestForNavigation;
      default:
        return Location.Accuracy.High;
    }
  }

  private mapExpoPermissionStatus(
    status: Location.PermissionStatus
  ): LocationPermissionStatus {
    switch (status) {
      case Location.PermissionStatus.UNDETERMINED:
        return LocationPermissionStatus.UNDETERMINED;
      case Location.PermissionStatus.DENIED:
        return LocationPermissionStatus.DENIED;
      case Location.PermissionStatus.GRANTED:
        return LocationPermissionStatus.GRANTED;
      default:
        return LocationPermissionStatus.DENIED;
    }
  }

  private mapExpoLocation(
    location: Location.LocationObject
  ): LocationCoordinate {
    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      altitude: location.coords.altitude || undefined,
      accuracy: location.coords.accuracy || undefined,
      altitudeAccuracy: location.coords.altitudeAccuracy || undefined,
      heading: location.coords.heading || undefined,
      speed: location.coords.speed || undefined,
      timestamp: location.timestamp,
    };
  }

  private updateStats(location: LocationCoordinate): void {
    this.stats.totalUpdates++;
    this.stats.lastUpdateTime = location.timestamp;

    if (location.accuracy) {
      // Update running average of accuracy
      const currentAvg = this.stats.averageAccuracy;
      const count = this.stats.totalUpdates;
      this.stats.averageAccuracy =
        (currentAvg * (count - 1) + location.accuracy) / count;

      // Update signal quality based on accuracy
      this.stats.signalQuality = this.calculateSignalQuality(location.accuracy);
    }
  }

  private calculateSignalQuality(accuracy: number): SignalQuality {
    if (accuracy <= 5) return SignalQuality.EXCELLENT;
    if (accuracy <= 10) return SignalQuality.GOOD;
    if (accuracy <= 20) return SignalQuality.FAIR;
    return SignalQuality.POOR;
  }

  private handleLocationError(error: any): LocationError {
    // Check if it's already a properly formatted LocationError
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      'message' in error &&
      Object.values(LocationErrorCode).includes(error.code)
    ) {
      return error as LocationError;
    }

    // Map common Expo location errors
    if (error?.code === 'E_LOCATION_SERVICES_DISABLED') {
      return this.createLocationError(
        LocationErrorCode.LOCATION_DISABLED,
        'Location services are disabled'
      );
    }

    if (error?.code === 'E_LOCATION_UNAVAILABLE') {
      return this.createLocationError(
        LocationErrorCode.POSITION_UNAVAILABLE,
        'Location is currently unavailable'
      );
    }

    if (error?.code === 'E_LOCATION_TIMEOUT') {
      return this.createLocationError(
        LocationErrorCode.TIMEOUT,
        'Location request timed out'
      );
    }

    return this.createLocationError(
      LocationErrorCode.UNKNOWN,
      error?.message || 'Unknown location error',
      error
    );
  }

  private createLocationError(
    code: LocationErrorCode,
    message: string,
    details?: any
  ): LocationError {
    return {
      code,
      message,
      details,
    };
  }

  private notifyLocationCallbacks(location: LocationCoordinate): void {
    this.locationCallbacks.forEach((callback) => {
      try {
        callback(location);
      } catch (error) {
        console.error('Error in location callback:', error);
      }
    });
  }

  private notifyErrorCallbacks(error: LocationError): void {
    this.errorCallbacks.forEach((callback) => {
      try {
        callback(error);
      } catch (callbackError) {
        console.error('Error in error callback:', callbackError);
      }
    });
  }
}
