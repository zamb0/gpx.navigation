/**
 * GPS Track Recording Service
 * Handles track recording with start, pause, stop, and resume functionality
 */

import { LocationService } from './LocationService';
import { TrackingSessionsRepository } from '../database/TrackingSessionsRepository';
import {
  TrackingSession,
  MobileTrackPoint,
  LocationCoordinate,
  LocationAccuracy,
  TrackingOptions,
  LocationError,
  SignalQuality,
} from '../../types';

export interface RecordingStats {
  distance: number;
  time: number;
  speed: number;
  averageSpeed: number;
  maxSpeed: number;
  elevation: number;
  elevationGain: number;
  elevationLoss: number;
  pointCount: number;
}

export interface RecordingQuality {
  signalQuality: SignalQuality;
  averageAccuracy: number;
  lastAccuracy?: number;
  gpsStatus: 'searching' | 'found' | 'lost';
}

export interface RecordingOptions extends Partial<TrackingOptions> {
  name?: string;
  description?: string;
  autoSave?: boolean;
  minAccuracy?: number;
  maxAccuracy?: number;
}

export enum RecordingState {
  STOPPED = 'stopped',
  RECORDING = 'recording',
  PAUSED = 'paused',
}

export type RecordingStateCallback = (state: RecordingState) => void;
export type RecordingStatsCallback = (stats: RecordingStats) => void;
export type RecordingQualityCallback = (quality: RecordingQuality) => void;
export type RecordingErrorCallback = (error: LocationError) => void;
export type TrackPointCallback = (point: MobileTrackPoint) => void;

export class TrackRecordingService {
  private static instance: TrackRecordingService;
  private locationService: LocationService;
  private repository: TrackingSessionsRepository;

  private currentSession: TrackingSession | null = null;
  private recordingState: RecordingState = RecordingState.STOPPED;
  private recordingOptions: RecordingOptions = {};

  // Statistics tracking
  private stats: RecordingStats = this.getInitialStats();
  private quality: RecordingQuality = this.getInitialQuality();
  private lastLocation: LocationCoordinate | null = null;
  private lastElevation: number | null = null;

  // Callbacks
  private stateCallbacks: RecordingStateCallback[] = [];
  private statsCallbacks: RecordingStatsCallback[] = [];
  private qualityCallbacks: RecordingQualityCallback[] = [];
  private errorCallbacks: RecordingErrorCallback[] = [];
  private trackPointCallbacks: TrackPointCallback[] = [];

  // Unsubscribe functions
  private locationUnsubscribe: (() => void) | null = null;
  private errorUnsubscribe: (() => void) | null = null;

  // Auto-save timer
  private autoSaveTimer: NodeJS.Timeout | null = null;
  private readonly AUTO_SAVE_INTERVAL = 30000; // 30 seconds

  private constructor() {
    this.locationService = LocationService.getInstance();
    this.repository = new TrackingSessionsRepository();
  }

  public static getInstance(): TrackRecordingService {
    if (!TrackRecordingService.instance) {
      TrackRecordingService.instance = new TrackRecordingService();
    }
    return TrackRecordingService.instance;
  }

  /**
   * Initialize the service and recover any active session
   */
  public async initialize(): Promise<void> {
    try {
      // Check for any active session from previous app run
      const activeSession = await this.repository.getActiveSession();
      if (activeSession) {
        this.currentSession = activeSession;
        this.recordingState = RecordingState.PAUSED; // Resume as paused
        this.calculateStatsFromSession(activeSession);
        this.notifyStateCallbacks();
        this.notifyStatsCallbacks();
      }
    } catch (error) {
      console.error('Failed to initialize track recording service:', error);
    }
  }

  /**
   * Start a new recording session
   */
  public async startRecording(options: RecordingOptions = {}): Promise<void> {
    if (this.recordingState === RecordingState.RECORDING) {
      throw new Error('Recording is already in progress');
    }

    try {
      this.recordingOptions = {
        accuracy: LocationAccuracy.HIGH,
        timeInterval: 1000,
        distanceInterval: 1,
        enableHighAccuracy: true,
        minAccuracy: 20,
        maxAccuracy: 100,
        autoSave: true,
        ...options,
      };

      // Create new session if not resuming
      if (!this.currentSession) {
        this.currentSession = {
          id: this.generateSessionId(),
          startTime: new Date(),
          isActive: true,
          trackPoints: [],
          totalDistance: 0,
          totalTime: 0,
          averageSpeed: 0,
          maxSpeed: 0,
          elevationGain: 0,
          elevationLoss: 0,
        };

        await this.repository.createSession(this.currentSession);
      } else {
        // Resume existing session
        await this.repository.updateSession(this.currentSession.id, {
          isActive: true,
        });
      }

      // Reset stats if starting fresh
      if (this.recordingState === RecordingState.STOPPED) {
        this.stats = this.getInitialStats();
        this.quality = this.getInitialQuality();
        this.lastLocation = null;
        this.lastElevation = null;
      }

      // Start location tracking
      await this.startLocationTracking();

      this.recordingState = RecordingState.RECORDING;
      this.notifyStateCallbacks();

      // Start auto-save timer if enabled
      if (this.recordingOptions.autoSave) {
        this.startAutoSave();
      }
    } catch (error) {
      console.error('Failed to start recording:', error);
      this.notifyErrorCallbacks(error as LocationError);
      throw error;
    }
  }

  /**
   * Pause the current recording session
   */
  public async pauseRecording(): Promise<void> {
    if (this.recordingState !== RecordingState.RECORDING) {
      throw new Error('No active recording to pause');
    }

    try {
      await this.stopLocationTracking();
      this.recordingState = RecordingState.PAUSED;

      if (this.currentSession) {
        await this.repository.updateSession(this.currentSession.id, {
          isActive: false,
        });
      }

      this.stopAutoSave();
      this.notifyStateCallbacks();
    } catch (error) {
      console.error('Failed to pause recording:', error);
      throw error;
    }
  }

  /**
   * Resume a paused recording session
   */
  public async resumeRecording(): Promise<void> {
    if (this.recordingState !== RecordingState.PAUSED) {
      throw new Error('No paused recording to resume');
    }

    await this.startRecording(this.recordingOptions);
  }

  /**
   * Stop and save the current recording session
   */
  public async stopRecording(): Promise<TrackingSession | null> {
    if (this.recordingState === RecordingState.STOPPED) {
      return null;
    }

    try {
      await this.stopLocationTracking();
      this.stopAutoSave();

      if (this.currentSession) {
        // Update final session data
        const endTime = new Date();
        const totalTime =
          endTime.getTime() - this.currentSession.startTime.getTime();

        await this.repository.updateSession(this.currentSession.id, {
          endTime,
          isActive: false,
          totalDistance: this.stats.distance,
          totalTime,
          averageSpeed: this.stats.averageSpeed,
          maxSpeed: this.stats.maxSpeed,
          elevationGain: this.stats.elevationGain,
          elevationLoss: this.stats.elevationLoss,
        });

        const finalSession = await this.repository.getSessionById(
          this.currentSession.id
        );
        this.currentSession = null;
        this.recordingState = RecordingState.STOPPED;
        this.notifyStateCallbacks();

        return finalSession;
      }

      this.recordingState = RecordingState.STOPPED;
      this.notifyStateCallbacks();
      return null;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      throw error;
    }
  }

  /**
   * Cancel the current recording session without saving
   */
  public async cancelRecording(): Promise<void> {
    if (this.recordingState === RecordingState.STOPPED) {
      return;
    }

    try {
      await this.stopLocationTracking();
      this.stopAutoSave();

      if (this.currentSession) {
        await this.repository.deleteSession(this.currentSession.id);
        this.currentSession = null;
      }

      this.recordingState = RecordingState.STOPPED;
      this.stats = this.getInitialStats();
      this.quality = this.getInitialQuality();
      this.notifyStateCallbacks();
      this.notifyStatsCallbacks();
      this.notifyQualityCallbacks();
    } catch (error) {
      console.error('Failed to cancel recording:', error);
      throw error;
    }
  }

  /**
   * Get current recording state
   */
  public getRecordingState(): RecordingState {
    return this.recordingState;
  }

  /**
   * Get current recording statistics
   */
  public getRecordingStats(): RecordingStats {
    return { ...this.stats };
  }

  /**
   * Get current recording quality metrics
   */
  public getRecordingQuality(): RecordingQuality {
    return { ...this.quality };
  }

  /**
   * Get current session
   */
  public getCurrentSession(): TrackingSession | null {
    return this.currentSession ? { ...this.currentSession } : null;
  }

  /**
   * Subscribe to recording state changes
   */
  public onStateChange(callback: RecordingStateCallback): () => void {
    this.stateCallbacks.push(callback);
    return () => {
      const index = this.stateCallbacks.indexOf(callback);
      if (index > -1) {
        this.stateCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to recording statistics updates
   */
  public onStatsUpdate(callback: RecordingStatsCallback): () => void {
    this.statsCallbacks.push(callback);
    return () => {
      const index = this.statsCallbacks.indexOf(callback);
      if (index > -1) {
        this.statsCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to recording quality updates
   */
  public onQualityUpdate(callback: RecordingQualityCallback): () => void {
    this.qualityCallbacks.push(callback);
    return () => {
      const index = this.qualityCallbacks.indexOf(callback);
      if (index > -1) {
        this.qualityCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to recording errors
   */
  public onError(callback: RecordingErrorCallback): () => void {
    this.errorCallbacks.push(callback);
    return () => {
      const index = this.errorCallbacks.indexOf(callback);
      if (index > -1) {
        this.errorCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to new track points
   */
  public onTrackPoint(callback: TrackPointCallback): () => void {
    this.trackPointCallbacks.push(callback);
    return () => {
      const index = this.trackPointCallbacks.indexOf(callback);
      if (index > -1) {
        this.trackPointCallbacks.splice(index, 1);
      }
    };
  }

  // Private methods

  private async startLocationTracking(): Promise<void> {
    // Subscribe to location updates
    this.locationUnsubscribe = this.locationService.onLocationUpdate(
      this.handleLocationUpdate.bind(this)
    );

    // Subscribe to location errors
    this.errorUnsubscribe = this.locationService.onLocationError(
      this.handleLocationError.bind(this)
    );

    // Start tracking with configured options
    await this.locationService.startTracking(this.recordingOptions);
  }

  private async stopLocationTracking(): Promise<void> {
    await this.locationService.stopTracking();

    if (this.locationUnsubscribe) {
      this.locationUnsubscribe();
      this.locationUnsubscribe = null;
    }

    if (this.errorUnsubscribe) {
      this.errorUnsubscribe();
      this.errorUnsubscribe = null;
    }
  }

  private async handleLocationUpdate(
    location: LocationCoordinate
  ): Promise<void> {
    if (
      this.recordingState !== RecordingState.RECORDING ||
      !this.currentSession
    ) {
      return;
    }

    // Check accuracy requirements
    if (location.accuracy && this.recordingOptions.minAccuracy) {
      if (location.accuracy > this.recordingOptions.minAccuracy) {
        this.updateQuality(location);
        return; // Skip this point due to poor accuracy
      }
    }

    // Create track point
    const trackPoint: MobileTrackPoint = {
      latitude: location.latitude,
      longitude: location.longitude,
      elevation: location.altitude,
      timestamp: new Date(location.timestamp),
      accuracy: location.accuracy,
      speed: location.speed,
      bearing: location.heading,
    };

    try {
      // Add to database
      await this.repository.addTrackPoint(this.currentSession.id, trackPoint);

      // Add to current session
      this.currentSession.trackPoints.push(trackPoint);

      // Update statistics
      this.updateStats(location, trackPoint);
      this.updateQuality(location);

      // Notify callbacks
      this.notifyTrackPointCallbacks(trackPoint);
      this.notifyStatsCallbacks();
      this.notifyQualityCallbacks();

      this.lastLocation = location;
    } catch (error) {
      console.error('Failed to save track point:', error);
    }
  }

  private handleLocationError(error: LocationError): void {
    this.quality.gpsStatus = 'lost';
    this.notifyQualityCallbacks();
    this.notifyErrorCallbacks(error);
  }

  private updateStats(
    location: LocationCoordinate,
    trackPoint: MobileTrackPoint
  ): void {
    this.stats.pointCount++;

    // Update distance
    if (this.lastLocation) {
      const distance = this.calculateDistance(
        this.lastLocation.latitude,
        this.lastLocation.longitude,
        location.latitude,
        location.longitude
      );
      this.stats.distance += distance;
    }

    // Update time
    if (this.currentSession) {
      this.stats.time = Date.now() - this.currentSession.startTime.getTime();
    }

    // Update speed
    if (location.speed !== undefined) {
      this.stats.speed = location.speed;
      this.stats.maxSpeed = Math.max(this.stats.maxSpeed, location.speed);

      // Calculate average speed
      if (this.stats.time > 0) {
        this.stats.averageSpeed =
          this.stats.distance / (this.stats.time / 1000) || 0;
      }
    }

    // Update elevation
    if (location.altitude !== undefined) {
      this.stats.elevation = location.altitude;

      if (this.lastElevation !== null) {
        const elevationDiff = location.altitude - this.lastElevation;
        if (elevationDiff > 0) {
          this.stats.elevationGain += elevationDiff;
        } else {
          this.stats.elevationLoss += Math.abs(elevationDiff);
        }
      }

      this.lastElevation = location.altitude;
    }
  }

  private updateQuality(location: LocationCoordinate): void {
    const locationStats = this.locationService.getLocationStats();

    this.quality.signalQuality = locationStats.signalQuality;
    this.quality.averageAccuracy = locationStats.averageAccuracy;
    this.quality.lastAccuracy = location.accuracy;
    this.quality.gpsStatus = 'found';
  }

  private calculateStatsFromSession(session: TrackingSession): void {
    this.stats = {
      distance: session.totalDistance,
      time: session.totalTime,
      speed: 0,
      averageSpeed: session.averageSpeed,
      maxSpeed: session.maxSpeed,
      elevation: 0,
      elevationGain: session.elevationGain,
      elevationLoss: session.elevationLoss,
      pointCount: session.trackPoints.length,
    };

    // Get last point for current elevation and speed
    if (session.trackPoints.length > 0) {
      const lastPoint = session.trackPoints[session.trackPoints.length - 1];
      this.stats.elevation = lastPoint.elevation || 0;
      this.stats.speed = lastPoint.speed || 0;
      this.lastElevation = lastPoint.elevation || null;
    }
  }

  private startAutoSave(): void {
    this.stopAutoSave(); // Clear any existing timer

    this.autoSaveTimer = setInterval(async () => {
      if (
        this.currentSession &&
        this.recordingState === RecordingState.RECORDING
      ) {
        try {
          await this.repository.updateSession(this.currentSession.id, {
            totalDistance: this.stats.distance,
            totalTime: this.stats.time,
            averageSpeed: this.stats.averageSpeed,
            maxSpeed: this.stats.maxSpeed,
            elevationGain: this.stats.elevationGain,
            elevationLoss: this.stats.elevationLoss,
          });
        } catch (error) {
          console.error('Auto-save failed:', error);
        }
      }
    }, this.AUTO_SAVE_INTERVAL);
  }

  private stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private getInitialStats(): RecordingStats {
    return {
      distance: 0,
      time: 0,
      speed: 0,
      averageSpeed: 0,
      maxSpeed: 0,
      elevation: 0,
      elevationGain: 0,
      elevationLoss: 0,
      pointCount: 0,
    };
  }

  private getInitialQuality(): RecordingQuality {
    return {
      signalQuality: SignalQuality.POOR,
      averageAccuracy: 0,
      gpsStatus: 'searching',
    };
  }

  // Notification methods
  private notifyStateCallbacks(): void {
    this.stateCallbacks.forEach((callback) => {
      try {
        callback(this.recordingState);
      } catch (error) {
        console.error('Error in state callback:', error);
      }
    });
  }

  private notifyStatsCallbacks(): void {
    this.statsCallbacks.forEach((callback) => {
      try {
        callback(this.stats);
      } catch (error) {
        console.error('Error in stats callback:', error);
      }
    });
  }

  private notifyQualityCallbacks(): void {
    this.qualityCallbacks.forEach((callback) => {
      try {
        callback(this.quality);
      } catch (error) {
        console.error('Error in quality callback:', error);
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

  private notifyTrackPointCallbacks(trackPoint: MobileTrackPoint): void {
    this.trackPointCallbacks.forEach((callback) => {
      try {
        callback(trackPoint);
      } catch (error) {
        console.error('Error in track point callback:', error);
      }
    });
  }
}
