import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { LocationCoordinate } from '../../../types/location';
import { MobileTrackPoint } from '../../../types/gpx';

const BACKGROUND_LOCATION_TASK = 'background-location';

interface BackgroundLocationOptions {
  accuracy: Location.Accuracy;
  timeInterval: number;
  distanceInterval: number;
}

export class BackgroundLocationService {
  private static instance: BackgroundLocationService;
  private isTracking = false;
  private trackingOptions: BackgroundLocationOptions = {
    accuracy: Location.Accuracy.High,
    timeInterval: 5000,
    distanceInterval: 10,
  };

  static getInstance(): BackgroundLocationService {
    if (!BackgroundLocationService.instance) {
      BackgroundLocationService.instance = new BackgroundLocationService();
    }
    return BackgroundLocationService.instance;
  }

  async initialize(): Promise<void> {
    if (Platform.OS !== 'ios') {
      return;
    }

    // Define the background task
    TaskManager.defineTask(
      BACKGROUND_LOCATION_TASK,
      async ({ data, error }) => {
        if (error) {
          console.error('Background location task error:', error);
          return;
        }
        if (data) {
          const { locations } = data as {
            locations: Location.LocationObject[];
          };
          await this.handleBackgroundLocations(locations);
        }
      }
    );
  }

  async startBackgroundTracking(
    options?: Partial<BackgroundLocationOptions>
  ): Promise<boolean> {
    if (Platform.OS !== 'ios') {
      return false;
    }

    try {
      // Request permissions
      const { status: foregroundStatus } =
        await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') {
        throw new Error('Foreground location permission not granted');
      }

      const { status: backgroundStatus } =
        await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus !== 'granted') {
        throw new Error('Background location permission not granted');
      }

      // Update tracking options
      if (options) {
        this.trackingOptions = { ...this.trackingOptions, ...options };
      }

      // Start background location updates
      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: this.trackingOptions.accuracy,
        timeInterval: this.trackingOptions.timeInterval,
        distanceInterval: this.trackingOptions.distanceInterval,
        deferredUpdatesInterval: 10000,
        deferredUpdatesDistance: 50,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: 'GPX Studio is recording your track',
          notificationBody: 'Recording GPS track in the background',
          notificationColor: '#007AFF',
        },
      });

      this.isTracking = true;
      return true;
    } catch (error) {
      console.error('Failed to start background tracking:', error);
      return false;
    }
  }

  async stopBackgroundTracking(): Promise<void> {
    if (Platform.OS !== 'ios' || !this.isTracking) {
      return;
    }

    try {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      this.isTracking = false;
    } catch (error) {
      console.error('Failed to stop background tracking:', error);
    }
  }

  private async handleBackgroundLocations(
    locations: Location.LocationObject[]
  ): Promise<void> {
    // Convert locations to track points and store them
    const trackPoints: MobileTrackPoint[] = locations.map((location) => ({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      elevation: location.coords.altitude || undefined,
      timestamp: new Date(location.timestamp),
      accuracy: location.coords.accuracy || undefined,
      speed: location.coords.speed || undefined,
      bearing: location.coords.heading || undefined,
    }));

    // Store track points in database or send to tracking service
    this.storeTrackPoints(trackPoints);
  }

  private async storeTrackPoints(
    trackPoints: MobileTrackPoint[]
  ): Promise<void> {
    // Implementation would integrate with the existing tracking service
    // This is a placeholder for the actual storage logic
    console.log('Storing background track points:', trackPoints.length);
  }

  isBackgroundTrackingActive(): boolean {
    return this.isTracking;
  }

  updateTrackingOptions(options: Partial<BackgroundLocationOptions>): void {
    this.trackingOptions = { ...this.trackingOptions, ...options };
  }
}
