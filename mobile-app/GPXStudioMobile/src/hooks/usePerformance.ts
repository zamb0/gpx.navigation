/**
 * React hook for performance monitoring and optimization
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { PerformanceManager, PerformanceStats } from '../services/performance';

export interface UsePerformanceOptions {
  enableAutoOptimization?: boolean;
  statsUpdateInterval?: number; // milliseconds
  memoryWarningThreshold?: number; // 0-1
}

export interface UsePerformanceReturn {
  // Stats
  stats: PerformanceStats | null;
  isLoading: boolean;

  // Memory management
  memoryUsagePercent: number;
  isMemoryWarning: boolean;
  isMemoryCritical: boolean;

  // Battery optimization
  batteryLevel: number;
  isPowerSavingActive: boolean;
  optimizedGPSSettings: any;

  // Performance actions
  forceCleanup: () => Promise<void>;
  clearCaches: () => Promise<void>;
  getRecommendations: () => Promise<string[]>;

  // Performance manager instance
  performanceManager: PerformanceManager | null;
}

export function usePerformance(
  options?: UsePerformanceOptions
): UsePerformanceReturn {
  const {
    enableAutoOptimization = true,
    statsUpdateInterval = 5000, // 5 seconds
    memoryWarningThreshold = 0.8, // 80%
  } = options || {};

  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [performanceManager, setPerformanceManager] =
    useState<PerformanceManager | null>(null);

  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastCleanupRef = useRef<number>(0);

  // Initialize performance manager
  useEffect(() => {
    const manager = new PerformanceManager({
      enableLazyLoading: true,
      enableMemoryManagement: true,
      enableBackgroundProcessing: true,
      enableBatteryOptimization: true,
      enableOptimizedTileCache: true,
    });

    setPerformanceManager(manager);
    setIsLoading(false);

    return () => {
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
      }
      manager.destroy();
    };
  }, []);

  // Update stats periodically
  useEffect(() => {
    if (!performanceManager) return;

    const updateStats = async () => {
      try {
        const newStats = await performanceManager.getPerformanceStats();
        setStats(newStats);

        // Auto-optimization based on stats
        if (enableAutoOptimization) {
          await handleAutoOptimization(newStats);
        }
      } catch (error) {
        console.error('Failed to update performance stats:', error);
      }
    };

    // Initial update
    updateStats();

    // Set up periodic updates
    statsIntervalRef.current = setInterval(updateStats, statsUpdateInterval);

    return () => {
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
      }
    };
  }, [performanceManager, enableAutoOptimization, statsUpdateInterval]);

  // Auto-optimization logic
  const handleAutoOptimization = useCallback(
    async (currentStats: PerformanceStats) => {
      if (!performanceManager) return;

      const memoryUsagePercent =
        currentStats.memory.usage / currentStats.memory.limit;
      const now = Date.now();

      // Memory-based optimizations
      if (memoryUsagePercent > 0.9) {
        // Critical memory - force cleanup immediately
        console.warn('Critical memory usage detected - forcing cleanup');
        await performanceManager.forceMemoryCleanup();
        lastCleanupRef.current = now;
      } else if (memoryUsagePercent > memoryWarningThreshold) {
        // Warning level - cleanup if not done recently
        const timeSinceLastCleanup = now - lastCleanupRef.current;
        if (timeSinceLastCleanup > 60000) {
          // 1 minute
          console.log('Memory warning - performing cleanup');
          await performanceManager.forceMemoryCleanup();
          lastCleanupRef.current = now;
        }
      }

      // Battery-based optimizations
      if (
        currentStats.battery.level < 0.15 &&
        !currentStats.battery.isCharging
      ) {
        // Very low battery - aggressive optimization
        console.log('Very low battery - enabling aggressive optimizations');
        await performanceManager.clearAllCaches();
      }

      // Processing queue optimizations
      if (currentStats.processing.tasksQueued > 20) {
        console.log(
          'High task queue - consider reducing background operations'
        );
      }
    },
    [performanceManager, memoryWarningThreshold]
  );

  // Computed values
  const memoryUsagePercent = stats
    ? (stats.memory.usage / stats.memory.limit) * 100
    : 0;
  const isMemoryWarning = memoryUsagePercent > memoryWarningThreshold * 100;
  const isMemoryCritical = memoryUsagePercent > 90;
  const batteryLevel = stats?.battery.level || 1;
  const isPowerSavingActive = stats?.battery.powerSavingActive || false;

  // Actions
  const forceCleanup = useCallback(async () => {
    if (!performanceManager) return;

    try {
      await performanceManager.forceMemoryCleanup();
      // Update stats immediately after cleanup
      const newStats = await performanceManager.getPerformanceStats();
      setStats(newStats);
    } catch (error) {
      console.error('Failed to force cleanup:', error);
    }
  }, [performanceManager]);

  const clearCaches = useCallback(async () => {
    if (!performanceManager) return;

    try {
      await performanceManager.clearAllCaches();
      // Update stats immediately after clearing caches
      const newStats = await performanceManager.getPerformanceStats();
      setStats(newStats);
    } catch (error) {
      console.error('Failed to clear caches:', error);
    }
  }, [performanceManager]);

  const getRecommendations = useCallback(async (): Promise<string[]> => {
    if (!performanceManager) return [];

    try {
      return await performanceManager.getPerformanceRecommendations();
    } catch (error) {
      console.error('Failed to get recommendations:', error);
      return [];
    }
  }, [performanceManager]);

  const optimizedGPSSettings =
    performanceManager?.getOptimizedGPSSettings() || null;

  return {
    // Stats
    stats,
    isLoading,

    // Memory management
    memoryUsagePercent,
    isMemoryWarning,
    isMemoryCritical,

    // Battery optimization
    batteryLevel,
    isPowerSavingActive,
    optimizedGPSSettings,

    // Performance actions
    forceCleanup,
    clearCaches,
    getRecommendations,

    // Performance manager instance
    performanceManager,
  };
}

/**
 * Hook for monitoring specific performance metrics
 */
export function usePerformanceMetrics(metrics: Array<keyof PerformanceStats>) {
  const { stats } = usePerformance();

  const selectedMetrics = metrics.reduce((acc, metric) => {
    if (stats && stats[metric]) {
      (acc as any)[metric] = stats[metric];
    }
    return acc;
  }, {} as Partial<PerformanceStats>);

  return selectedMetrics;
}

/**
 * Hook for performance-aware component rendering
 */
export function usePerformanceAwareRendering() {
  const { stats, isMemoryCritical, isPowerSavingActive } = usePerformance();

  // Determine rendering quality based on performance state
  const renderingQuality = (() => {
    if (isMemoryCritical || isPowerSavingActive) {
      return 'low';
    }

    if (stats && stats.memory.usage > stats.memory.limit * 0.7) {
      return 'medium';
    }

    return 'high';
  })();

  // Rendering configuration based on quality
  const renderingConfig = {
    low: {
      enableAnimations: false,
      maxMapPoints: 500,
      tileQuality: 'low',
      updateFrequency: 'slow',
    },
    medium: {
      enableAnimations: true,
      maxMapPoints: 2000,
      tileQuality: 'medium',
      updateFrequency: 'normal',
    },
    high: {
      enableAnimations: true,
      maxMapPoints: 10000,
      tileQuality: 'high',
      updateFrequency: 'fast',
    },
  };

  return {
    quality: renderingQuality,
    config: renderingConfig[renderingQuality],
    shouldReduceQuality: renderingQuality !== 'high',
  };
}

/**
 * Hook for battery-aware GPS settings
 */
export function useBatteryAwareGPS() {
  const { optimizedGPSSettings, batteryLevel, isPowerSavingActive } =
    usePerformance();

  const getGPSConfig = useCallback(
    (baseConfig: any) => {
      if (!optimizedGPSSettings) {
        return baseConfig;
      }

      return {
        ...baseConfig,
        ...optimizedGPSSettings,
        // Additional battery-aware adjustments
        enableBackgroundUpdates: batteryLevel > 0.2 && !isPowerSavingActive,
        highAccuracy: batteryLevel > 0.3 && !isPowerSavingActive,
      };
    },
    [optimizedGPSSettings, batteryLevel, isPowerSavingActive]
  );

  return {
    getGPSConfig,
    batteryLevel,
    isPowerSavingActive,
    recommendedSettings: optimizedGPSSettings,
  };
}
