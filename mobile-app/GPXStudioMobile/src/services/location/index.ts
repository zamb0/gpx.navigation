export { LocationService } from './LocationService';
export { LocationPermissionManager } from './LocationPermissionManager';
export { LocationAccuracyMonitor } from './LocationAccuracyMonitor';
export { BatteryOptimizedLocationService } from './BatteryOptimizedLocationService';
export { TrackRecordingService } from './TrackRecordingService';

export type { PermissionPromptConfig } from './LocationPermissionManager';
export type {
  AccuracyThresholds,
  AccuracyAlert,
  AccuracyAlertCallback,
} from './LocationAccuracyMonitor';
export type {
  BatteryOptimizationConfig,
  MovementState,
  BatteryOptimizationStats,
} from './BatteryOptimizedLocationService';
export type {
  RecordingStats,
  RecordingQuality,
  RecordingOptions,
  RecordingState,
  RecordingStateCallback,
  RecordingStatsCallback,
  RecordingQualityCallback,
  RecordingErrorCallback,
  TrackPointCallback,
} from './TrackRecordingService';
