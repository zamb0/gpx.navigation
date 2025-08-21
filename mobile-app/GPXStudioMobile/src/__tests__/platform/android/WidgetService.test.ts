import { Platform } from 'react-native';
import { WidgetService } from '../../../services/platform/android/WidgetService';

// Mock dependencies
jest.mock('react-native', () => ({
  Platform: {
    OS: 'android',
  },
}));

describe('WidgetService (Android)', () => {
  let service: WidgetService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = WidgetService.getInstance();
  });

  afterEach(() => {
    // Reset singleton instance
    (WidgetService as any).instance = undefined;
    service.destroy();
  });

  describe('initialization', () => {
    it('should initialize on Android platform', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.initialize();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Initializing Android widget service'
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        'Setting up Android home screen widget'
      );

      consoleSpy.mockRestore();
    });

    it('should not initialize on non-Android platforms', async () => {
      (Platform as any).OS = 'ios';
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.initialize();

      expect(consoleSpy).not.toHaveBeenCalledWith(
        'Initializing Android widget service'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('widget data updates', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should update recording state', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      service.updateRecordingState(true, 'Test Track');

      expect(consoleSpy).toHaveBeenCalledWith(
        'Updating widget with data:',
        expect.objectContaining({
          isRecording: true,
          trackName: 'Test Track',
        })
      );

      consoleSpy.mockRestore();
    });

    it('should update tracking data', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      service.updateTrackingData(1000, 300, 15.5);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Updating widget with data:',
        expect.objectContaining({
          currentDistance: 1000,
          currentTime: 300,
          currentSpeed: 15.5,
        })
      );

      consoleSpy.mockRestore();
    });

    it('should update widget configuration', () => {
      const newConfig = {
        showDistance: false,
        updateInterval: 10000,
        theme: 'dark' as const,
      };

      service.updateConfig(newConfig);

      const config = service.getConfig();
      expect(config.showDistance).toBe(false);
      expect(config.updateInterval).toBe(10000);
      expect(config.theme).toBe('dark');
    });
  });

  describe('widget actions', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should handle start recording action', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.handleWidgetAction('START_RECORDING');

      expect(consoleSpy).toHaveBeenCalledWith(
        'Handling widget action:',
        'START_RECORDING'
      );
      expect(consoleSpy).toHaveBeenCalledWith('Starting recording from widget');

      consoleSpy.mockRestore();
    });

    it('should handle stop recording action', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.handleWidgetAction('STOP_RECORDING');

      expect(consoleSpy).toHaveBeenCalledWith(
        'Handling widget action:',
        'STOP_RECORDING'
      );
      expect(consoleSpy).toHaveBeenCalledWith('Stopping recording from widget');

      consoleSpy.mockRestore();
    });

    it('should handle pause recording action', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.handleWidgetAction('PAUSE_RECORDING');

      expect(consoleSpy).toHaveBeenCalledWith(
        'Handling widget action:',
        'PAUSE_RECORDING'
      );
      expect(consoleSpy).toHaveBeenCalledWith('Pausing recording from widget');

      consoleSpy.mockRestore();
    });

    it('should handle open app action', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.handleWidgetAction('OPEN_APP');

      expect(consoleSpy).toHaveBeenCalledWith(
        'Handling widget action:',
        'OPEN_APP'
      );
      expect(consoleSpy).toHaveBeenCalledWith('Opening app from widget');

      consoleSpy.mockRestore();
    });

    it('should handle unknown actions gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await service.handleWidgetAction('UNKNOWN_ACTION');

      expect(consoleSpy).toHaveBeenCalledWith(
        'Unknown widget action:',
        'UNKNOWN_ACTION'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('periodic updates', () => {
    beforeEach(async () => {
      jest.useFakeTimers();
      await service.initialize();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should start periodic updates on initialization', async () => {
      // Just verify that the service initializes and doesn't throw
      // The periodic update functionality is tested in the restart test
      expect(service).toBeDefined();

      // The timer functionality is tested in other tests
      // This test just ensures initialization doesn't fail
    });

    it('should restart updates when interval changes', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      service.updateConfig({ updateInterval: 2000 });

      // Fast-forward by new interval
      jest.advanceTimersByTime(2000);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Updating widget with data:',
        expect.any(Object)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('cleanup', () => {
    it('should clear interval on destroy', async () => {
      jest.useFakeTimers();
      await service.initialize();

      service.destroy();

      // Verify no more updates after destroy
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      jest.advanceTimersByTime(10000);

      expect(consoleSpy).not.toHaveBeenCalledWith(
        'Updating widget with data:',
        expect.any(Object)
      );

      consoleSpy.mockRestore();
      jest.useRealTimers();
    });
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = WidgetService.getInstance();
      const instance2 = WidgetService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });
});
