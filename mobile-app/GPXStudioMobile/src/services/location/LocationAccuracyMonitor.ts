import {
  LocationCoordinate,
  LocationStats,
  SignalQuality,
  LocationError,
  LocationErrorCode,
} from '../../types/location';

export interface AccuracyThresholds {
  excellent: number;
  good: number;
  fair: number;
  poor: number;
}

export interface AccuracyAlert {
  quality: SignalQuality;
  message: string;
  shouldWarn: boolean;
  timestamp: number;
}

export type AccuracyAlertCallback = (alert: AccuracyAlert) => void;

export class LocationAccuracyMonitor {
  private static instance: LocationAccuracyMonitor;
  private accuracyHistory: number[] = [];
  private maxHistorySize = 10;
  private thresholds: AccuracyThresholds;
  private alertCallbacks: AccuracyAlertCallback[] = [];
  private lastAlertTime = 0;
  private alertCooldown = 30000; // 30 seconds between alerts
  private isMonitoring = false;

  private constructor() {
    this.thresholds = {
      excellent: 5, // <= 5 meters
      good: 10, // <= 10 meters
      fair: 20, // <= 20 meters
      poor: Infinity, // > 20 meters
    };
  }

  public static getInstance(): LocationAccuracyMonitor {
    if (!LocationAccuracyMonitor.instance) {
      LocationAccuracyMonitor.instance = new LocationAccuracyMonitor();
    }
    return LocationAccuracyMonitor.instance;
  }

  /**
   * Start monitoring location accuracy
   */
  public startMonitoring(): void {
    this.isMonitoring = true;
    this.accuracyHistory = [];
  }

  /**
   * Stop monitoring location accuracy
   */
  public stopMonitoring(): void {
    this.isMonitoring = false;
    this.accuracyHistory = [];
  }

  /**
   * Process a new location update
   */
  public processLocationUpdate(location: LocationCoordinate): void {
    if (!this.isMonitoring || !location.accuracy) {
      return;
    }

    // Add to accuracy history
    this.accuracyHistory.push(location.accuracy);

    // Maintain history size
    if (this.accuracyHistory.length > this.maxHistorySize) {
      this.accuracyHistory.shift();
    }

    // Calculate current signal quality
    const quality = this.calculateSignalQuality(location.accuracy);

    // Check if we should alert about poor accuracy
    this.checkForAccuracyAlert(quality, location.accuracy);
  }

  /**
   * Get current signal quality based on latest accuracy
   */
  public getCurrentSignalQuality(): SignalQuality {
    if (this.accuracyHistory.length === 0) {
      return SignalQuality.POOR;
    }

    const latestAccuracy =
      this.accuracyHistory[this.accuracyHistory.length - 1];
    return this.calculateSignalQuality(latestAccuracy);
  }

  /**
   * Get average accuracy over recent history
   */
  public getAverageAccuracy(): number {
    if (this.accuracyHistory.length === 0) {
      return 0;
    }

    const sum = this.accuracyHistory.reduce(
      (acc, accuracy) => acc + accuracy,
      0
    );
    return sum / this.accuracyHistory.length;
  }

  /**
   * Get accuracy statistics
   */
  public getAccuracyStats(): {
    current: number | null;
    average: number;
    best: number | null;
    worst: number | null;
    quality: SignalQuality;
    sampleCount: number;
  } {
    if (this.accuracyHistory.length === 0) {
      return {
        current: null,
        average: 0,
        best: null,
        worst: null,
        quality: SignalQuality.POOR,
        sampleCount: 0,
      };
    }

    const current = this.accuracyHistory[this.accuracyHistory.length - 1];
    const average = this.getAverageAccuracy();
    const best = Math.min(...this.accuracyHistory);
    const worst = Math.max(...this.accuracyHistory);
    const quality = this.calculateSignalQuality(current);

    return {
      current,
      average,
      best,
      worst,
      quality,
      sampleCount: this.accuracyHistory.length,
    };
  }

  /**
   * Check if current accuracy is acceptable for a given use case
   */
  public isAccuracyAcceptable(
    requiredQuality: SignalQuality = SignalQuality.FAIR
  ): boolean {
    const currentQuality = this.getCurrentSignalQuality();
    return this.compareSignalQuality(currentQuality, requiredQuality) >= 0;
  }

  /**
   * Get accuracy improvement suggestions
   */
  public getAccuracyImprovementSuggestions(): string[] {
    const quality = this.getCurrentSignalQuality();
    const suggestions: string[] = [];

    if (quality === SignalQuality.POOR || quality === SignalQuality.FAIR) {
      suggestions.push('Move to an open area away from buildings and trees');
      suggestions.push('Ensure you have a clear view of the sky');
      suggestions.push('Wait a few moments for GPS to acquire more satellites');
      suggestions.push('Check that location services are enabled');
    }

    if (quality === SignalQuality.POOR) {
      suggestions.push('Consider moving to a different location');
      suggestions.push('Restart the app if GPS issues persist');
    }

    return suggestions;
  }

  /**
   * Subscribe to accuracy alerts
   */
  public onAccuracyAlert(callback: AccuracyAlertCallback): () => void {
    this.alertCallbacks.push(callback);

    return () => {
      const index = this.alertCallbacks.indexOf(callback);
      if (index > -1) {
        this.alertCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Update accuracy thresholds
   */
  public updateThresholds(thresholds: Partial<AccuracyThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  /**
   * Get current thresholds
   */
  public getThresholds(): AccuracyThresholds {
    return { ...this.thresholds };
  }

  /**
   * Reset monitoring state
   */
  public reset(): void {
    this.stopMonitoring();
    this.alertCallbacks = [];
    this.lastAlertTime = 0;
  }

  // Private helper methods

  private calculateSignalQuality(accuracy: number): SignalQuality {
    if (accuracy <= this.thresholds.excellent) return SignalQuality.EXCELLENT;
    if (accuracy <= this.thresholds.good) return SignalQuality.GOOD;
    if (accuracy <= this.thresholds.fair) return SignalQuality.FAIR;
    return SignalQuality.POOR;
  }

  private compareSignalQuality(
    quality1: SignalQuality,
    quality2: SignalQuality
  ): number {
    const qualityOrder = {
      [SignalQuality.POOR]: 0,
      [SignalQuality.FAIR]: 1,
      [SignalQuality.GOOD]: 2,
      [SignalQuality.EXCELLENT]: 3,
    };

    return qualityOrder[quality1] - qualityOrder[quality2];
  }

  private checkForAccuracyAlert(
    quality: SignalQuality,
    accuracy: number
  ): void {
    const now = Date.now();

    // Don't alert too frequently
    if (now - this.lastAlertTime < this.alertCooldown) {
      return;
    }

    let shouldAlert = false;
    let message = '';

    switch (quality) {
      case SignalQuality.POOR:
        shouldAlert = true;
        message = `GPS accuracy is poor (${accuracy.toFixed(1)}m). Consider moving to an open area for better signal.`;
        break;
      case SignalQuality.FAIR:
        // Only alert for fair quality if it's been consistently fair
        if (this.isConsistentlyPoor()) {
          shouldAlert = true;
          message = `GPS accuracy is fair (${accuracy.toFixed(1)}m). You may want to wait for better signal quality.`;
        }
        break;
      case SignalQuality.GOOD:
      case SignalQuality.EXCELLENT:
        // No alerts for good accuracy
        break;
    }

    if (shouldAlert) {
      this.lastAlertTime = now;
      const alert: AccuracyAlert = {
        quality,
        message,
        shouldWarn: quality === SignalQuality.POOR,
        timestamp: now,
      };

      this.notifyAlertCallbacks(alert);
    }
  }

  private isConsistentlyPoor(): boolean {
    if (this.accuracyHistory.length < 3) {
      return false;
    }

    // Check if the last 3 readings are all fair or poor
    const recentReadings = this.accuracyHistory.slice(-3);
    return recentReadings.every(
      (accuracy) =>
        this.calculateSignalQuality(accuracy) === SignalQuality.FAIR ||
        this.calculateSignalQuality(accuracy) === SignalQuality.POOR
    );
  }

  private notifyAlertCallbacks(alert: AccuracyAlert): void {
    this.alertCallbacks.forEach((callback) => {
      try {
        callback(alert);
      } catch (error) {
        console.error('Error in accuracy alert callback:', error);
      }
    });
  }
}
