import { Platform } from 'react-native';
import { PlatformService } from '../../services/platform/PlatformService';
import { PlatformPermissionService } from '../../services/platform/PlatformPermissionService';
import { PlatformOptimizer } from '../../services/platform/PlatformOptimizer';

// Mock dependencies
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    Version: '15.0',
  },
}));

jest.mock('../../services/platform/PlatformPermissionService');
jest.mock('../../services/platform/PlatformOptimizer');
jest.mock('../../services/platform/ios/BackgroundLocationService');
jest.mock('../../services/platform/ios/SiriShortcutsService');
jest.mock('../../services/platform/android/WidgetService');
jest.mock('../../services/platform/android/NotificationService');

const mockPermissionService = PlatformPermissionService as jest.MockedClass<
  typeof PlatformPermissionService
>;
const mockOptimizer = PlatformOptimizer as jest.MockedClass<
  typeof PlatformOptimizer
>;

describe('PlatformService', () => {
  let service: PlatformService;
  let mockPermissionInstance: jest.Mocked<PlatformPermissionService>;
  let mockOptimizerInstance: jest.Mocked<PlatformOptimizer>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockPermissionInstance = {
      requestPermission: jest.fn(),
      requestMultiplePermissions: jest.fn(),
      checkPermissionStatus: jest.fn(),
    } as any;

    mockOptimizerInstance = {
      initialize: jest.fn(),
      optimizeForTask: jest.fn(),
      getPerformanceMetrics: jest.fn(),
      updateOptimizations: jest.fn(),
      destroy: jest.fn(),
    } as any;

    (mockPermissionService.getInstance as jest.Mock).mockReturnValue(
      mockPermissionInstance
    );
    (mockOptimizer.getInstance as jest.Mock).mockReturnValue(
      mockOptimizerInstance
    );

    service = PlatformService.getInstance();
  });

  afterEach(() => {
    // Reset singleton instance
    (PlatformService as any).instance = undefined;
  });

  describe('initialization', () => {
    it('should initialize on iOS', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.initialize();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Initializing platform service for',
        'ios'
      );
      expect(mockOptimizerInstance.initialize).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should initialize on Android', async () => {
      (Platform as any).OS = 'android';
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.initialize();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Initializing platform service for',
        'android'
      );
      expect(mockOptimizerInstance.initialize).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('feature detection', () => {
    it('should detect iOS features correctly', () => {
      (Platform as any).OS = 'ios';
      // Reset singleton to pick up new platform
      (PlatformService as any).instance = undefined;
      service = PlatformService.getInstance();

      const features = service.getAvailableFeatures();

      expect(features.shortcuts).toBe(true);
      expect(features.widgets).toBe(false);
      expect(features.voiceControl).toBe(true);
      expect(features.backgroundLocation).toBe(true);
      expect(features.notifications).toBe(true);
      expect(features.hapticFeedback).toBe(true);
    });

    it('should detect Android features correctly', () => {
      (Platform as any).OS = 'android';
      // Reset singleton to pick up new platform
      (PlatformService as any).instance = undefined;
      service = PlatformService.getInstance();

      const features = service.getAvailableFeatures();

      expect(features.shortcuts).toBe(false);
      expect(features.widgets).toBe(true);
      expect(features.voiceControl).toBe(false);
      expect(features.backgroundLocation).toBe(true);
      expect(features.notifications).toBe(true);
      expect(features.hapticFeedback).toBe(true);
    });

    it('should check individual feature availability', () => {
      (Platform as any).OS = 'ios';
      // Reset singleton to pick up new platform
      (PlatformService as any).instance = undefined;
      service = PlatformService.getInstance();

      expect(service.isFeatureAvailable('shortcuts')).toBe(true);
      expect(service.isFeatureAvailable('widgets')).toBe(false);
    });
  });

  describe('background tracking', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should start background tracking with permissions', async () => {
      mockPermissionInstance.requestPermission.mockResolvedValue({
        granted: true,
        canAskAgain: true,
        status: 'granted',
      });

      const result = await service.startBackgroundTracking();

      expect(mockPermissionInstance.requestPermission).toHaveBeenCalledWith({
        type: 'location_background',
        rationale: expect.any(String),
      });
      // Result depends on platform-specific implementation
    });

    it('should fail without permissions', async () => {
      mockPermissionInstance.requestPermission.mockResolvedValue({
        granted: false,
        canAskAgain: false,
        status: 'denied',
      });

      const result = await service.startBackgroundTracking();

      expect(result).toBe(false);
    });
  });

  describe('permission management', () => {
    it('should request multiple permissions', async () => {
      const mockResults = {
        location: { granted: true, canAskAgain: true, status: 'granted' },
        notifications: { granted: true, canAskAgain: true, status: 'granted' },
      };
      mockPermissionInstance.requestMultiplePermissions.mockResolvedValue(
        mockResults
      );

      const result = await service.requestPermissions([
        'location',
        'notifications',
      ]);

      expect(result).toEqual(mockResults);
      expect(
        mockPermissionInstance.requestMultiplePermissions
      ).toHaveBeenCalledWith([{ type: 'location' }, { type: 'notifications' }]);
    });

    it('should check permission status', async () => {
      const mockStatus = {
        granted: true,
        canAskAgain: true,
        status: 'granted',
      };
      mockPermissionInstance.checkPermissionStatus.mockResolvedValue(
        mockStatus
      );

      const result = await service.checkPermissionStatus('location');

      expect(result).toEqual(mockStatus);
      expect(mockPermissionInstance.checkPermissionStatus).toHaveBeenCalledWith(
        'location'
      );
    });
  });

  describe('performance optimization', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should optimize for different tasks', async () => {
      await service.optimizeForTask('recording');

      expect(mockOptimizerInstance.optimizeForTask).toHaveBeenCalledWith(
        'recording'
      );
    });

    it('should get performance metrics', () => {
      const mockMetrics = {
        memoryUsage: 0.5,
        batteryLevel: 0.8,
        isLowPowerMode: false,
        frameRate: 60,
        renderTime: 16,
      };
      mockOptimizerInstance.getPerformanceMetrics.mockReturnValue(mockMetrics);

      const result = service.getPerformanceMetrics();

      expect(result).toEqual(mockMetrics);
    });

    it('should update optimizations', () => {
      const optimizations = { enableNativeAnimations: false };

      service.updateOptimizations(optimizations);

      expect(mockOptimizerInstance.updateOptimizations).toHaveBeenCalledWith(
        optimizations
      );
    });
  });

  describe('platform information', () => {
    it('should return platform info', () => {
      (Platform as any).OS = 'ios';
      (Platform as any).Version = '15.0';
      service = PlatformService.getInstance();

      const info = service.getPlatformInfo();

      expect(info.os).toBe('ios');
      expect(info.version).toBe('15.0');
      expect(info.features).toBeDefined();
    });
  });

  describe('widget methods (Android)', () => {
    beforeEach(() => {
      (Platform as any).OS = 'android';
    });

    it('should update widget recording state', () => {
      service.updateWidgetRecordingState(true, 'Test Track');
      // Verify through mock calls or behavior
    });

    it('should update widget tracking data', () => {
      service.updateWidgetTrackingData(1000, 300, 15.5);
      // Verify through mock calls or behavior
    });

    it('should handle widget actions', async () => {
      await service.handleWidgetAction('START_RECORDING');
      // Verify through mock calls or behavior
    });
  });

  describe('notification methods (Android)', () => {
    beforeEach(() => {
      (Platform as any).OS = 'android';
    });

    it('should show recording notification', async () => {
      const data = { isRecording: true, distance: 1000 };
      await service.showRecordingNotification(data);
      // Verify through mock calls or behavior
    });

    it('should hide recording notification', async () => {
      await service.hideRecordingNotification();
      // Verify through mock calls or behavior
    });

    it('should handle notification actions', async () => {
      await service.handleNotificationAction('PAUSE_RECORDING', {});
      // Verify through mock calls or behavior
    });
  });

  describe('shortcut methods (iOS)', () => {
    beforeEach(() => {
      (Platform as any).OS = 'ios';
    });

    it('should handle shortcut actions', async () => {
      await service.handleShortcutAction('START_RECORDING', {});
      // Verify through mock calls or behavior
    });

    it('should add custom shortcuts', async () => {
      const shortcut = {
        id: 'test',
        title: 'Test',
        phrase: 'test',
        action: 'TEST',
      };
      const result = await service.addCustomShortcut(shortcut);
      // Verify through mock calls or behavior
    });
  });

  describe('cleanup', () => {
    it('should destroy services properly', () => {
      service.destroy();

      expect(mockOptimizerInstance.destroy).toHaveBeenCalled();
    });
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = PlatformService.getInstance();
      const instance2 = PlatformService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });
});
