import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import { Platform, Text } from 'react-native';
import { usePlatform } from '../../hooks/usePlatform';
import { PlatformService } from '../../services/platform/PlatformService';

// Mock dependencies
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    Version: '15.0',
  },
  DeviceEventEmitter: {
    addListener: jest.fn(),
    removeAllListeners: jest.fn(),
  },
}));

jest.mock('../../services/platform/PlatformService');

const mockPlatformService = PlatformService as jest.MockedClass<
  typeof PlatformService
>;

// Test component that uses the platform hook
const TestComponent: React.FC = () => {
  const {
    isInitialized,
    features,
    performanceMetrics,
    startBackgroundTracking,
    stopBackgroundTracking,
    requestPermissions,
    optimizeForTask,
    isFeatureAvailable,
    error,
  } = usePlatform();

  return (
    <>
      <Text testID="initialized">{isInitialized.toString()}</Text>
      <Text testID="shortcuts-available">{features.shortcuts.toString()}</Text>
      <Text testID="widgets-available">{features.widgets.toString()}</Text>
      <Text testID="battery-level">
        {performanceMetrics.batteryLevel.toString()}
      </Text>
      <Text testID="low-power-mode">
        {performanceMetrics.batteryLevel > 0 ? 'false' : 'true'}
      </Text>
      <Text testID="error">{error || 'none'}</Text>
    </>
  );
};

describe('Platform Integration', () => {
  let mockServiceInstance: jest.Mocked<PlatformService>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockServiceInstance = {
      initialize: jest.fn(),
      getAvailableFeatures: jest.fn(),
      getPerformanceMetrics: jest.fn(),
      startBackgroundTracking: jest.fn(),
      stopBackgroundTracking: jest.fn(),
      requestPermissions: jest.fn(),
      checkPermissionStatus: jest.fn(),
      optimizeForTask: jest.fn(),
      updateWidgetRecordingState: jest.fn(),
      updateWidgetTrackingData: jest.fn(),
      showRecordingNotification: jest.fn(),
      hideRecordingNotification: jest.fn(),
      handleShortcutAction: jest.fn(),
      addCustomShortcut: jest.fn(),
      isFeatureAvailable: jest.fn(),
      getPlatformInfo: jest.fn(),
      destroy: jest.fn(),
    } as any;

    (mockPlatformService.getInstance as jest.Mock).mockReturnValue(
      mockServiceInstance
    );
  });

  describe('iOS Platform', () => {
    beforeEach(() => {
      (Platform as any).OS = 'ios';
      mockServiceInstance.getAvailableFeatures.mockReturnValue({
        backgroundLocation: true,
        shortcuts: true,
        widgets: false,
        notifications: true,
        voiceControl: true,
        hapticFeedback: true,
      });
      mockServiceInstance.getPerformanceMetrics.mockReturnValue({
        memoryUsage: 0.5,
        batteryLevel: 0.8,
        isLowPowerMode: false,
        frameRate: 60,
        renderTime: 16,
      });
    });

    it('should initialize with iOS features', async () => {
      mockServiceInstance.initialize.mockResolvedValue();

      const { getByTestId } = render(<TestComponent />);

      await waitFor(() => {
        expect(getByTestId('initialized').children[0]).toBe('true');
        expect(getByTestId('shortcuts-available').children[0]).toBe('true');
        expect(getByTestId('widgets-available').children[0]).toBe('false');
      });

      expect(mockServiceInstance.initialize).toHaveBeenCalled();
    });

    it('should handle initialization errors', async () => {
      const error = new Error('Initialization failed');
      mockServiceInstance.initialize.mockRejectedValue(error);

      const { getByTestId } = render(<TestComponent />);

      await waitFor(() => {
        expect(getByTestId('error').children[0]).toBe('Initialization failed');
      });
    });

    it('should display performance metrics', async () => {
      mockServiceInstance.initialize.mockResolvedValue();

      const { getByTestId } = render(<TestComponent />);

      await waitFor(() => {
        expect(getByTestId('battery-level').children[0]).toBe('0.8');
        expect(getByTestId('low-power-mode').children[0]).toBe('false');
      });
    });
  });

  describe('Android Platform', () => {
    beforeEach(() => {
      (Platform as any).OS = 'android';
      mockServiceInstance.getAvailableFeatures.mockReturnValue({
        backgroundLocation: true,
        shortcuts: false,
        widgets: true,
        notifications: true,
        voiceControl: false,
        hapticFeedback: true,
      });
    });

    it('should initialize with Android features', async () => {
      mockServiceInstance.initialize.mockResolvedValue();

      const { getByTestId } = render(<TestComponent />);

      await waitFor(() => {
        expect(getByTestId('initialized').children[0]).toBe('true');
        expect(getByTestId('shortcuts-available').children[0]).toBe('false');
        expect(getByTestId('widgets-available').children[0]).toBe('true');
      });
    });
  });

  describe('Background Tracking', () => {
    beforeEach(() => {
      mockServiceInstance.initialize.mockResolvedValue();
      mockServiceInstance.getAvailableFeatures.mockReturnValue({
        backgroundLocation: true,
        shortcuts: false,
        widgets: false,
        notifications: false,
        voiceControl: false,
        hapticFeedback: false,
      });
      mockServiceInstance.getPerformanceMetrics.mockReturnValue({
        memoryUsage: 0,
        batteryLevel: 1,
        isLowPowerMode: false,
        frameRate: 60,
        renderTime: 0,
      });
    });

    it('should start background tracking successfully', async () => {
      mockServiceInstance.startBackgroundTracking.mockResolvedValue(true);

      const TestComponentWithTracking: React.FC = () => {
        const { startBackgroundTracking, isBackgroundTrackingActive } =
          usePlatform();

        React.useEffect(() => {
          startBackgroundTracking();
        }, []);

        return (
          <Text testID="tracking-active">
            {isBackgroundTrackingActive.toString()}
          </Text>
        );
      };

      const { getByTestId } = render(<TestComponentWithTracking />);

      await waitFor(() => {
        expect(getByTestId('tracking-active').children[0]).toBe('true');
      });

      expect(mockServiceInstance.startBackgroundTracking).toHaveBeenCalled();
    });

    it('should handle background tracking failure', async () => {
      mockServiceInstance.startBackgroundTracking.mockResolvedValue(false);

      const TestComponentWithTracking: React.FC = () => {
        const { startBackgroundTracking, isBackgroundTrackingActive } =
          usePlatform();

        React.useEffect(() => {
          startBackgroundTracking();
        }, []);

        return (
          <Text testID="tracking-active">
            {isBackgroundTrackingActive.toString()}
          </Text>
        );
      };

      const { getByTestId } = render(<TestComponentWithTracking />);

      await waitFor(() => {
        expect(getByTestId('tracking-active').children[0]).toBe('false');
      });
    });
  });

  describe('Permission Management', () => {
    beforeEach(() => {
      mockServiceInstance.initialize.mockResolvedValue();
      mockServiceInstance.getAvailableFeatures.mockReturnValue({
        backgroundLocation: true,
        shortcuts: false,
        widgets: false,
        notifications: false,
        voiceControl: false,
        hapticFeedback: false,
      });
      mockServiceInstance.getPerformanceMetrics.mockReturnValue({
        memoryUsage: 0,
        batteryLevel: 1,
        isLowPowerMode: false,
        frameRate: 60,
        renderTime: 0,
      });
    });

    it('should request permissions', async () => {
      const mockPermissions = {
        location: { granted: true, canAskAgain: true, status: 'granted' },
      };
      mockServiceInstance.requestPermissions.mockResolvedValue(mockPermissions);

      const TestComponentWithPermissions: React.FC = () => {
        const { requestPermissions } = usePlatform();
        const [permissions, setPermissions] = React.useState<any>(null);

        React.useEffect(() => {
          requestPermissions(['location']).then(setPermissions);
        }, []);

        return <Text testID="permissions">{JSON.stringify(permissions)}</Text>;
      };

      const { getByTestId } = render(<TestComponentWithPermissions />);

      await waitFor(() => {
        const permissionsText = getByTestId('permissions')
          .children[0] as string;
        expect(JSON.parse(permissionsText)).toEqual(mockPermissions);
      });
    });
  });

  describe('Performance Optimization', () => {
    beforeEach(() => {
      mockServiceInstance.initialize.mockResolvedValue();
      mockServiceInstance.getAvailableFeatures.mockReturnValue({
        backgroundLocation: false,
        shortcuts: false,
        widgets: false,
        notifications: false,
        voiceControl: false,
        hapticFeedback: false,
      });
      mockServiceInstance.getPerformanceMetrics.mockReturnValue({
        memoryUsage: 0,
        batteryLevel: 1,
        isLowPowerMode: false,
        frameRate: 60,
        renderTime: 0,
      });
    });

    it('should optimize for different tasks', async () => {
      mockServiceInstance.optimizeForTask.mockResolvedValue();

      const TestComponentWithOptimization: React.FC = () => {
        const { optimizeForTask } = usePlatform();

        React.useEffect(() => {
          optimizeForTask('recording');
        }, []);

        return <Text testID="optimized">true</Text>;
      };

      render(<TestComponentWithOptimization />);

      await waitFor(() => {
        expect(mockServiceInstance.optimizeForTask).toHaveBeenCalledWith(
          'recording'
        );
      });
    });
  });

  describe('Cleanup', () => {
    it('should cleanup on unmount', () => {
      mockServiceInstance.initialize.mockResolvedValue();
      mockServiceInstance.getAvailableFeatures.mockReturnValue({
        backgroundLocation: false,
        shortcuts: false,
        widgets: false,
        notifications: false,
        voiceControl: false,
        hapticFeedback: false,
      });
      mockServiceInstance.getPerformanceMetrics.mockReturnValue({
        memoryUsage: 0,
        batteryLevel: 1,
        isLowPowerMode: false,
        frameRate: 60,
        renderTime: 0,
      });

      const { unmount } = render(<TestComponent />);

      unmount();

      expect(mockServiceInstance.destroy).toHaveBeenCalled();
    });
  });
});
