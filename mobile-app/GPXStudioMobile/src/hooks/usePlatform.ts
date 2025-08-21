import { useEffect, useState, useCallback } from 'react';
import { Platform, DeviceEventEmitter } from 'react-native';
import {
  PlatformService,
  PlatformFeatures,
  PerformanceMetrics,
} from '../services/platform';

export interface PlatformHookState {
  isInitialized: boolean;
  features: PlatformFeatures;
  performanceMetrics: PerformanceMetrics;
  isBackgroundTrackingActive: boolean;
  error: string | null;
}

export const usePlatform = () => {
  const [state, setState] = useState<PlatformHookState>({
    isInitialized: false,
    features: {
      backgroundLocation: false,
      shortcuts: false,
      widgets: false,
      notifications: false,
      voiceControl: false,
      hapticFeedback: false,
    },
    performanceMetrics: {
      memoryUsage: 0,
      batteryLevel: 1,
      cpuUsage: 0,
    },
    isBackgroundTrackingActive: false,
    error: null,
  });

  const platformService = PlatformService.getInstance();

  // Initialize platform service
  useEffect(() => {
    const initializePlatform = async () => {
      try {
        await platformService.initialize();

        setState((prev) => ({
          ...prev,
          isInitialized: true,
          features: platformService.getAvailableFeatures(),
          performanceMetrics: platformService.getPerformanceMetrics(),
        }));
      } catch (error) {
        console.error('Failed to initialize platform service:', error);
        setState((prev) => ({
          ...prev,
          error:
            error instanceof Error
              ? error.message
              : 'Platform initialization failed',
        }));
      }
    };

    initializePlatform();

    // Cleanup on unmount
    return () => {
      platformService.destroy();
    };
  }, []);

  // Listen for performance updates
  useEffect(() => {
    const handleLowPowerMode = () => {
      setState((prev) => ({
        ...prev,
        performanceMetrics: {
          ...prev.performanceMetrics,
          isLowPowerMode: true,
        },
      }));
    };

    const handleHighPerformanceMode = () => {
      setState((prev) => ({
        ...prev,
        performanceMetrics: {
          ...prev.performanceMetrics,
          isLowPowerMode: false,
        },
      }));
    };

    const handleMemoryPressure = () => {
      console.log('Memory pressure detected');
      // Update UI to reflect memory optimization
    };

    DeviceEventEmitter.addListener('lowPowerModeEnabled', handleLowPowerMode);
    DeviceEventEmitter.addListener(
      'highPerformanceModeEnabled',
      handleHighPerformanceMode
    );
    DeviceEventEmitter.addListener('memoryPressure', handleMemoryPressure);

    return () => {
      DeviceEventEmitter.removeAllListeners('lowPowerModeEnabled');
      DeviceEventEmitter.removeAllListeners('highPerformanceModeEnabled');
      DeviceEventEmitter.removeAllListeners('memoryPressure');
    };
  }, []);

  // Background tracking methods
  const startBackgroundTracking = useCallback(async (): Promise<boolean> => {
    try {
      const success = await platformService.startBackgroundTracking();
      setState((prev) => ({
        ...prev,
        isBackgroundTrackingActive: success,
      }));
      return success;
    } catch (error) {
      console.error('Failed to start background tracking:', error);
      setState((prev) => ({
        ...prev,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to start background tracking',
      }));
      return false;
    }
  }, []);

  const stopBackgroundTracking = useCallback(async (): Promise<void> => {
    try {
      await platformService.stopBackgroundTracking();
      setState((prev) => ({
        ...prev,
        isBackgroundTrackingActive: false,
      }));
    } catch (error) {
      console.error('Failed to stop background tracking:', error);
      setState((prev) => ({
        ...prev,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to stop background tracking',
      }));
    }
  }, []);

  // Permission methods
  const requestPermissions = useCallback(
    async (types: string[]): Promise<Record<string, any>> => {
      try {
        return await platformService.requestPermissions(types);
      } catch (error) {
        console.error('Failed to request permissions:', error);
        setState((prev) => ({
          ...prev,
          error:
            error instanceof Error
              ? error.message
              : 'Failed to request permissions',
        }));
        return {};
      }
    },
    []
  );

  const checkPermissionStatus = useCallback(
    async (type: string): Promise<any> => {
      try {
        return await platformService.checkPermissionStatus(type);
      } catch (error) {
        console.error('Failed to check permission status:', error);
        return { granted: false, canAskAgain: false, status: 'error' };
      }
    },
    []
  );

  // Performance optimization methods
  const optimizeForTask = useCallback(
    async (
      taskType: 'recording' | 'navigation' | 'editing' | 'idle'
    ): Promise<void> => {
      try {
        await platformService.optimizeForTask(taskType);
        setState((prev) => ({
          ...prev,
          performanceMetrics: platformService.getPerformanceMetrics(),
        }));
      } catch (error) {
        console.error('Failed to optimize for task:', error);
      }
    },
    []
  );

  // Widget methods (Android)
  const updateWidgetRecordingState = useCallback(
    (isRecording: boolean, trackName?: string): void => {
      if (Platform.OS === 'android') {
        platformService.updateWidgetRecordingState(isRecording, trackName);
      }
    },
    []
  );

  const updateWidgetTrackingData = useCallback(
    (distance: number, time: number, speed: number): void => {
      if (Platform.OS === 'android') {
        platformService.updateWidgetTrackingData(distance, time, speed);
      }
    },
    []
  );

  // Notification methods (Android)
  const showRecordingNotification = useCallback(
    async (data: any): Promise<void> => {
      if (Platform.OS === 'android') {
        await platformService.showRecordingNotification(data);
      }
    },
    []
  );

  const hideRecordingNotification = useCallback(async (): Promise<void> => {
    if (Platform.OS === 'android') {
      await platformService.hideRecordingNotification();
    }
  }, []);

  // Shortcut methods (iOS)
  const handleShortcutAction = useCallback(
    async (action: string, parameters?: Record<string, any>): Promise<void> => {
      if (Platform.OS === 'ios') {
        await platformService.handleShortcutAction(action, parameters);
      }
    },
    []
  );

  const addCustomShortcut = useCallback(
    async (shortcut: any): Promise<boolean> => {
      if (Platform.OS === 'ios') {
        return await platformService.addCustomShortcut(shortcut);
      }
      return false;
    },
    []
  );

  // Utility methods
  const isFeatureAvailable = useCallback(
    (feature: keyof PlatformFeatures): boolean => {
      return state.features[feature];
    },
    [state.features]
  );

  const getPlatformInfo = useCallback(() => {
    return platformService.getPlatformInfo();
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    // State
    ...state,

    // Background tracking
    startBackgroundTracking,
    stopBackgroundTracking,

    // Permissions
    requestPermissions,
    checkPermissionStatus,

    // Performance
    optimizeForTask,

    // Widget (Android)
    updateWidgetRecordingState,
    updateWidgetTrackingData,

    // Notifications (Android)
    showRecordingNotification,
    hideRecordingNotification,

    // Shortcuts (iOS)
    handleShortcutAction,
    addCustomShortcut,

    // Utilities
    isFeatureAvailable,
    getPlatformInfo,
    clearError,
  };
};
