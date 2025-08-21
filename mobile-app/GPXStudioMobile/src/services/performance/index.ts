/**
 * Performance optimization services exports
 */

export { LazyGPXLoader } from './LazyGPXLoader';
export {
  MemoryManager,
  type MemoryConsumer,
  type MemoryStats,
} from './MemoryManager';
export {
  BackgroundProcessor,
  type BackgroundTask,
} from './BackgroundProcessor';
export {
  BatteryOptimizer,
  type BatteryStats,
  type GPSSettings,
} from './BatteryOptimizer';
export { OptimizedTileCache, type LoadingStats } from './OptimizedTileCache';
export {
  PerformanceManager,
  type PerformanceStats,
  type PerformanceConfig,
} from './PerformanceManager';
