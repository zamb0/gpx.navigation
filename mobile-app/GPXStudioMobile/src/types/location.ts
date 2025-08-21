export interface LocationCoordinate {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
  altitudeAccuracy?: number;
  heading?: number;
  speed?: number;
  timestamp: number;
}

export interface TrackingOptions {
  accuracy: LocationAccuracy;
  timeInterval?: number;
  distanceInterval?: number;
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

export enum LocationAccuracy {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  HIGHEST = 'highest',
}

export enum LocationPermissionStatus {
  UNDETERMINED = 'undetermined',
  DENIED = 'denied',
  GRANTED = 'granted',
  RESTRICTED = 'restricted',
}

export interface LocationPermissionResponse {
  status: LocationPermissionStatus;
  canAskAgain: boolean;
  expires: 'never' | number;
}

export enum LocationServiceStatus {
  DISABLED = 'disabled',
  ENABLED = 'enabled',
  UNKNOWN = 'unknown',
}

export interface LocationServiceInfo {
  isLocationEnabled: boolean;
  isGpsEnabled: boolean;
  isNetworkEnabled: boolean;
  isPassiveEnabled: boolean;
}

export interface LocationError {
  code: LocationErrorCode;
  message: string;
  details?: any;
}

export enum LocationErrorCode {
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  POSITION_UNAVAILABLE = 'POSITION_UNAVAILABLE',
  TIMEOUT = 'TIMEOUT',
  LOCATION_DISABLED = 'LOCATION_DISABLED',
  ACCURACY_TOO_LOW = 'ACCURACY_TOO_LOW',
  UNKNOWN = 'UNKNOWN',
}

export interface LocationServiceConfig {
  defaultAccuracy: LocationAccuracy;
  defaultTimeInterval: number;
  defaultDistanceInterval: number;
  batteryOptimizationEnabled: boolean;
  backgroundLocationEnabled: boolean;
  maxLocationAge: number;
  locationTimeout: number;
}

export interface LocationStats {
  totalUpdates: number;
  averageAccuracy: number;
  lastUpdateTime: number;
  signalQuality: SignalQuality;
}

export enum SignalQuality {
  POOR = 'poor',
  FAIR = 'fair',
  GOOD = 'good',
  EXCELLENT = 'excellent',
}

export type LocationUpdateCallback = (location: LocationCoordinate) => void;
export type LocationErrorCallback = (error: LocationError) => void;
export type LocationPermissionCallback = (
  response: LocationPermissionResponse
) => void;
