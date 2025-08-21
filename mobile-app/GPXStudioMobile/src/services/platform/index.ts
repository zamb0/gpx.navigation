// Platform-specific services
export { PlatformService } from './PlatformService';
export { PlatformPermissionService } from './PlatformPermissionService';
export { PlatformOptimizer } from './PlatformOptimizer';

// iOS-specific services
export { BackgroundLocationService } from './ios/BackgroundLocationService';
export { SiriShortcutsService } from './ios/SiriShortcutsService';

// Android-specific services
export { WidgetService } from './android/WidgetService';
export { NotificationService } from './android/NotificationService';

// Platform-specific components
export {
  PlatformAdaptiveView,
  createPlatformStyles,
  getPlatformDesignTokens,
  getPlatformColors,
  getPlatformAnimations,
  platformComponentStyles,
  platformTypography,
} from '../../components/platform/PlatformAdaptiveComponent';

// Types
export type {
  PlatformFeatures,
  PermissionStatus,
  PermissionRequest,
  PlatformOptimizations,
  PerformanceMetrics,
} from './PlatformService';

export type { SiriShortcut } from './ios/SiriShortcutsService';

export type { WidgetData, WidgetConfig } from './android/WidgetService';

export type {
  NotificationAction,
  RecordingNotificationData,
} from './android/NotificationService';
