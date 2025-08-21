// Accessibility types
export * from './accessibility';

// Navigation types
export * from './navigation';

// GPX types
export * from './gpx';

// Location types (excluding conflicting names)
export {
  LocationCoordinate,
  TrackingOptions,
  LocationAccuracy,
  LocationPermissionStatus,
  LocationServiceConfig,
  LocationUpdateCallback,
  LocationErrorCallback,
  LocationPermissionCallback,
  LocationPermissionResponse,
  SignalQuality,
  LocationError,
} from './location';

// Map types
export * from './map';

// Editing types (excluding conflicting ValidationError)
export {
  EditingMode,
  EditOperation,
  EditOperationType,
  WaypointEditData,
  TrackEditData,
  TrackPointEditData,
  TrackPointSelection,
  SelectionState,
  EditingContext,
  ValidationResult,
  ValidationWarning,
  EditingConfig,
  DEFAULT_EDITING_CONFIG,
} from './editing';

// Error types (these take precedence over interface versions)
export * from './errors';
