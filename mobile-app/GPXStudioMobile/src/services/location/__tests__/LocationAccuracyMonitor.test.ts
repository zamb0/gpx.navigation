import { LocationAccuracyMonitor } from '../LocationAccuracyMonitor';
import { LocationCoordinate, SignalQuality } from '../../../types/location';

describe('LocationAccuracyMonitor', () => {
  let accuracyMonitor: LocationAccuracyMonitor;

  beforeEach(() => {
    // Reset singleton instance
    (LocationAccuracyMonitor as any).instance = undefined;
    accuracyMonitor = LocationAccuracyMonitor.getInstance();
  });

  afterEach(() => {
    accuracyMonitor.reset();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = LocationAccuracyMonitor.getInstance();
      const instance2 = LocationAccuracyMonitor.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Monitoring Control', () => {
    it('should start and stop monitoring', () => {
      expect((accuracyMonitor as any).isMonitoring).toBe(false);

      accuracyMonitor.startMonitoring();
      expect((accuracyMonitor as any).isMonitoring).toBe(true);

      accuracyMonitor.stopMonitoring();
      expect((accuracyMonitor as any).isMonitoring).toBe(false);
    });

    it('should clear history when stopping monitoring', () => {
      accuracyMonitor.startMonitoring();

      const location: LocationCoordinate = {
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 5,
        timestamp: Date.now(),
      };

      accuracyMonitor.processLocationUpdate(location);
      expect(accuracyMonitor.getAverageAccuracy()).toBe(5);

      accuracyMonitor.stopMonitoring();
      expect(accuracyMonitor.getAverageAccuracy()).toBe(0);
    });
  });

  describe('Location Processing', () => {
    beforeEach(() => {
      accuracyMonitor.startMonitoring();
    });

    it('should process location updates when monitoring', () => {
      const location: LocationCoordinate = {
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 8,
        timestamp: Date.now(),
      };

      accuracyMonitor.processLocationUpdate(location);

      expect(accuracyMonitor.getCurrentSignalQuality()).toBe(
        SignalQuality.GOOD
      );
      expect(accuracyMonitor.getAverageAccuracy()).toBe(8);
    });

    it('should ignore location updates when not monitoring', () => {
      accuracyMonitor.stopMonitoring();

      const location: LocationCoordinate = {
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 8,
        timestamp: Date.now(),
      };

      accuracyMonitor.processLocationUpdate(location);

      expect(accuracyMonitor.getCurrentSignalQuality()).toBe(
        SignalQuality.POOR
      );
      expect(accuracyMonitor.getAverageAccuracy()).toBe(0);
    });

    it('should ignore location updates without accuracy', () => {
      const location: LocationCoordinate = {
        latitude: 37.7749,
        longitude: -122.4194,
        timestamp: Date.now(),
      };

      accuracyMonitor.processLocationUpdate(location);

      expect(accuracyMonitor.getCurrentSignalQuality()).toBe(
        SignalQuality.POOR
      );
      expect(accuracyMonitor.getAverageAccuracy()).toBe(0);
    });

    it('should maintain history size limit', () => {
      const maxHistorySize = 10;

      // Add more locations than the history limit
      for (let i = 0; i < 15; i++) {
        const location: LocationCoordinate = {
          latitude: 37.7749,
          longitude: -122.4194,
          accuracy: i + 1,
          timestamp: Date.now() + i,
        };
        accuracyMonitor.processLocationUpdate(location);
      }

      const stats = accuracyMonitor.getAccuracyStats();
      expect(stats.sampleCount).toBe(maxHistorySize);
      expect(stats.current).toBe(15); // Last added accuracy
    });
  });

  describe('Signal Quality Calculation', () => {
    beforeEach(() => {
      accuracyMonitor.startMonitoring();
    });

    it('should calculate excellent signal quality', () => {
      const location: LocationCoordinate = {
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 3,
        timestamp: Date.now(),
      };

      accuracyMonitor.processLocationUpdate(location);
      expect(accuracyMonitor.getCurrentSignalQuality()).toBe(
        SignalQuality.EXCELLENT
      );
    });

    it('should calculate good signal quality', () => {
      const location: LocationCoordinate = {
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 8,
        timestamp: Date.now(),
      };

      accuracyMonitor.processLocationUpdate(location);
      expect(accuracyMonitor.getCurrentSignalQuality()).toBe(
        SignalQuality.GOOD
      );
    });

    it('should calculate fair signal quality', () => {
      const location: LocationCoordinate = {
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 15,
        timestamp: Date.now(),
      };

      accuracyMonitor.processLocationUpdate(location);
      expect(accuracyMonitor.getCurrentSignalQuality()).toBe(
        SignalQuality.FAIR
      );
    });

    it('should calculate poor signal quality', () => {
      const location: LocationCoordinate = {
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 25,
        timestamp: Date.now(),
      };

      accuracyMonitor.processLocationUpdate(location);
      expect(accuracyMonitor.getCurrentSignalQuality()).toBe(
        SignalQuality.POOR
      );
    });
  });

  describe('Statistics Calculation', () => {
    beforeEach(() => {
      accuracyMonitor.startMonitoring();
    });

    it('should calculate average accuracy', () => {
      const accuracies = [5, 10, 15];

      accuracies.forEach((accuracy, index) => {
        const location: LocationCoordinate = {
          latitude: 37.7749,
          longitude: -122.4194,
          accuracy,
          timestamp: Date.now() + index,
        };
        accuracyMonitor.processLocationUpdate(location);
      });

      expect(accuracyMonitor.getAverageAccuracy()).toBe(10);
    });

    it('should provide comprehensive accuracy stats', () => {
      const accuracies = [5, 10, 15, 8, 12];

      accuracies.forEach((accuracy, index) => {
        const location: LocationCoordinate = {
          latitude: 37.7749,
          longitude: -122.4194,
          accuracy,
          timestamp: Date.now() + index,
        };
        accuracyMonitor.processLocationUpdate(location);
      });

      const stats = accuracyMonitor.getAccuracyStats();

      expect(stats.current).toBe(12);
      expect(stats.average).toBe(10);
      expect(stats.best).toBe(5);
      expect(stats.worst).toBe(15);
      expect(stats.quality).toBe(SignalQuality.FAIR); // 12m accuracy is fair, not good
      expect(stats.sampleCount).toBe(5);
    });

    it('should return empty stats when no data', () => {
      const stats = accuracyMonitor.getAccuracyStats();

      expect(stats.current).toBeNull();
      expect(stats.average).toBe(0);
      expect(stats.best).toBeNull();
      expect(stats.worst).toBeNull();
      expect(stats.quality).toBe(SignalQuality.POOR);
      expect(stats.sampleCount).toBe(0);
    });
  });

  describe('Accuracy Acceptability', () => {
    beforeEach(() => {
      accuracyMonitor.startMonitoring();
    });

    it('should check if accuracy is acceptable for required quality', () => {
      const excellentLocation: LocationCoordinate = {
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 3,
        timestamp: Date.now(),
      };

      accuracyMonitor.processLocationUpdate(excellentLocation);

      expect(
        accuracyMonitor.isAccuracyAcceptable(SignalQuality.EXCELLENT)
      ).toBe(true);
      expect(accuracyMonitor.isAccuracyAcceptable(SignalQuality.GOOD)).toBe(
        true
      );
      expect(accuracyMonitor.isAccuracyAcceptable(SignalQuality.FAIR)).toBe(
        true
      );
    });

    it('should reject poor accuracy for higher quality requirements', () => {
      const poorLocation: LocationCoordinate = {
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 25,
        timestamp: Date.now(),
      };

      accuracyMonitor.processLocationUpdate(poorLocation);

      expect(
        accuracyMonitor.isAccuracyAcceptable(SignalQuality.EXCELLENT)
      ).toBe(false);
      expect(accuracyMonitor.isAccuracyAcceptable(SignalQuality.GOOD)).toBe(
        false
      );
      expect(accuracyMonitor.isAccuracyAcceptable(SignalQuality.FAIR)).toBe(
        false
      );
    });

    it('should use fair quality as default requirement', () => {
      const fairLocation: LocationCoordinate = {
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 15,
        timestamp: Date.now(),
      };

      accuracyMonitor.processLocationUpdate(fairLocation);

      expect(accuracyMonitor.isAccuracyAcceptable()).toBe(true);
    });
  });

  describe('Improvement Suggestions', () => {
    beforeEach(() => {
      accuracyMonitor.startMonitoring();
    });

    it('should provide suggestions for poor accuracy', () => {
      const poorLocation: LocationCoordinate = {
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 30,
        timestamp: Date.now(),
      };

      accuracyMonitor.processLocationUpdate(poorLocation);
      const suggestions = accuracyMonitor.getAccuracyImprovementSuggestions();

      expect(suggestions).toContain(
        'Move to an open area away from buildings and trees'
      );
      expect(suggestions).toContain('Consider moving to a different location');
      expect(suggestions).toContain('Restart the app if GPS issues persist');
    });

    it('should provide basic suggestions for fair accuracy', () => {
      const fairLocation: LocationCoordinate = {
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 15,
        timestamp: Date.now(),
      };

      accuracyMonitor.processLocationUpdate(fairLocation);
      const suggestions = accuracyMonitor.getAccuracyImprovementSuggestions();

      expect(suggestions).toContain(
        'Move to an open area away from buildings and trees'
      );
      expect(suggestions).not.toContain(
        'Consider moving to a different location'
      );
    });

    it('should provide no suggestions for good accuracy', () => {
      const goodLocation: LocationCoordinate = {
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 8,
        timestamp: Date.now(),
      };

      accuracyMonitor.processLocationUpdate(goodLocation);
      const suggestions = accuracyMonitor.getAccuracyImprovementSuggestions();

      expect(suggestions).toHaveLength(0);
    });
  });

  describe('Alert System', () => {
    beforeEach(() => {
      accuracyMonitor.startMonitoring();
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should trigger alert for poor accuracy', () => {
      const alertCallback = jest.fn();
      accuracyMonitor.onAccuracyAlert(alertCallback);

      const poorLocation: LocationCoordinate = {
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 30,
        timestamp: Date.now(),
      };

      accuracyMonitor.processLocationUpdate(poorLocation);

      expect(alertCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          quality: SignalQuality.POOR,
          shouldWarn: true,
          message: expect.stringContaining('GPS accuracy is poor'),
        })
      );
    });

    it('should respect alert cooldown period', () => {
      const alertCallback = jest.fn();
      accuracyMonitor.onAccuracyAlert(alertCallback);

      const poorLocation: LocationCoordinate = {
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 30,
        timestamp: Date.now(),
      };

      // First alert
      accuracyMonitor.processLocationUpdate(poorLocation);
      expect(alertCallback).toHaveBeenCalledTimes(1);

      // Second alert immediately (should be ignored due to cooldown)
      accuracyMonitor.processLocationUpdate({
        ...poorLocation,
        timestamp: Date.now() + 1000,
      });
      expect(alertCallback).toHaveBeenCalledTimes(1);

      // Advance time past cooldown period
      jest.advanceTimersByTime(31000);

      // Third alert (should trigger)
      accuracyMonitor.processLocationUpdate({
        ...poorLocation,
        timestamp: Date.now() + 32000,
      });
      expect(alertCallback).toHaveBeenCalledTimes(2);
    });

    it('should unsubscribe alert callbacks', () => {
      const alertCallback = jest.fn();
      const unsubscribe = accuracyMonitor.onAccuracyAlert(alertCallback);

      const poorLocation: LocationCoordinate = {
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 30,
        timestamp: Date.now(),
      };

      accuracyMonitor.processLocationUpdate(poorLocation);
      expect(alertCallback).toHaveBeenCalledTimes(1);

      unsubscribe();

      accuracyMonitor.processLocationUpdate({
        ...poorLocation,
        timestamp: Date.now() + 32000,
      });
      expect(alertCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe('Threshold Management', () => {
    it('should update accuracy thresholds', () => {
      const newThresholds = {
        excellent: 3,
        good: 8,
        fair: 15,
      };

      accuracyMonitor.updateThresholds(newThresholds);
      const thresholds = accuracyMonitor.getThresholds();

      expect(thresholds.excellent).toBe(3);
      expect(thresholds.good).toBe(8);
      expect(thresholds.fair).toBe(15);
    });

    it('should use updated thresholds for quality calculation', () => {
      accuracyMonitor.startMonitoring();

      // Update thresholds to be more strict
      accuracyMonitor.updateThresholds({
        excellent: 2,
        good: 5,
        fair: 10,
      });

      const location: LocationCoordinate = {
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 8,
        timestamp: Date.now(),
      };

      accuracyMonitor.processLocationUpdate(location);

      // With stricter thresholds, 8m accuracy should be fair (between 5 and 10)
      expect(accuracyMonitor.getCurrentSignalQuality()).toBe(
        SignalQuality.FAIR
      );
    });
  });

  describe('Reset Functionality', () => {
    it('should reset all state', () => {
      accuracyMonitor.startMonitoring();

      const alertCallback = jest.fn();
      accuracyMonitor.onAccuracyAlert(alertCallback);

      const location: LocationCoordinate = {
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 8,
        timestamp: Date.now(),
      };

      accuracyMonitor.processLocationUpdate(location);
      expect(accuracyMonitor.getAverageAccuracy()).toBe(8);

      accuracyMonitor.reset();

      expect((accuracyMonitor as any).isMonitoring).toBe(false);
      expect(accuracyMonitor.getAverageAccuracy()).toBe(0);
      expect((accuracyMonitor as any).alertCallbacks).toHaveLength(0);
    });
  });
});
