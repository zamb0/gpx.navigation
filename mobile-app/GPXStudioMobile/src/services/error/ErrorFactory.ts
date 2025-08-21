/**
 * Factory functions for creating specific error types
 */

import {
  FileError,
  LocationError,
  NetworkError,
  ValidationError,
  ErrorSeverity,
} from '../../types/errors';

export class ErrorFactory {
  // File operation errors
  static createFileNotFoundError(filename: string): FileError {
    return new FileError(
      'FILE_NOT_FOUND',
      `The file "${filename}" could not be found. It may have been moved or deleted.`,
      `File not found: ${filename}`,
      ErrorSeverity.MEDIUM,
      true,
      false,
      { filename }
    );
  }

  static createInvalidGPXError(filename: string, details?: string): FileError {
    return new FileError(
      'INVALID_GPX_FORMAT',
      `The file "${filename}" is not a valid GPX file. Please check the file format and try again.`,
      `Invalid GPX format: ${details || 'Unknown format error'}`,
      ErrorSeverity.MEDIUM,
      true,
      false,
      { filename, details }
    );
  }

  static createStorageFullError(): FileError {
    return new FileError(
      'STORAGE_FULL',
      'Your device storage is full. Please free up some space and try again.',
      'Insufficient storage space',
      ErrorSeverity.HIGH,
      true,
      false
    );
  }

  static createFilePermissionError(operation: string): FileError {
    return new FileError(
      'PERMISSION_DENIED',
      `Permission denied for ${operation}. Please grant file access permission in your device settings.`,
      `File permission denied for operation: ${operation}`,
      ErrorSeverity.HIGH,
      true,
      false,
      { operation }
    );
  }

  static createFileTooLargeError(
    filename: string,
    size: number,
    maxSize: number
  ): FileError {
    return new FileError(
      'FILE_TOO_LARGE',
      `The file "${filename}" is too large (${Math.round(size / 1024 / 1024)}MB). Maximum supported size is ${Math.round(maxSize / 1024 / 1024)}MB.`,
      `File size exceeds limit: ${size} > ${maxSize}`,
      ErrorSeverity.MEDIUM,
      true,
      false,
      { filename, size, maxSize }
    );
  }

  // Location/GPS errors
  static createLocationPermissionError(): LocationError {
    return new LocationError(
      'PERMISSION_DENIED',
      'Location permission is required to use GPS features. Please grant location access in your device settings.',
      'Location permission denied',
      ErrorSeverity.HIGH,
      true,
      false
    );
  }

  static createGPSUnavailableError(): LocationError {
    return new LocationError(
      'GPS_UNAVAILABLE',
      'GPS is not available on this device or is currently disabled. Please enable GPS in your device settings.',
      'GPS service unavailable',
      ErrorSeverity.HIGH,
      true,
      true
    );
  }

  static createPoorGPSAccuracyError(accuracy: number): LocationError {
    return new LocationError(
      'POOR_ACCURACY',
      `GPS accuracy is poor (±${Math.round(accuracy)}m). Consider moving to an area with better sky visibility for more accurate tracking.`,
      `Poor GPS accuracy: ${accuracy}m`,
      ErrorSeverity.LOW,
      true,
      true,
      { accuracy }
    );
  }

  static createLocationTimeoutError(): LocationError {
    return new LocationError(
      'LOCATION_TIMEOUT',
      'Unable to get your location. Please check that GPS is enabled and you have a clear view of the sky.',
      'Location request timeout',
      ErrorSeverity.MEDIUM,
      true,
      true
    );
  }

  // Network errors
  static createNoInternetError(): NetworkError {
    return new NetworkError(
      'NO_INTERNET',
      'No internet connection available. Some features may be limited in offline mode.',
      'No internet connection',
      ErrorSeverity.MEDIUM,
      true,
      true
    );
  }

  static createNetworkTimeoutError(operation: string): NetworkError {
    return new NetworkError(
      'TIMEOUT',
      `The ${operation} operation timed out. Please check your internet connection and try again.`,
      `Network timeout for operation: ${operation}`,
      ErrorSeverity.MEDIUM,
      true,
      true,
      { operation }
    );
  }

  static createServerError(
    statusCode: number,
    operation: string
  ): NetworkError {
    return new NetworkError(
      'SERVER_ERROR',
      `Server error occurred during ${operation}. Please try again later.`,
      `Server returned status ${statusCode} for operation: ${operation}`,
      ErrorSeverity.MEDIUM,
      true,
      true,
      { statusCode, operation }
    );
  }

  static createMapTileLoadError(tileUrl: string): NetworkError {
    return new NetworkError(
      'MAP_TILE_LOAD_FAILED',
      'Unable to load map tiles. Using cached tiles where available.',
      `Failed to load map tile: ${tileUrl}`,
      ErrorSeverity.LOW,
      true,
      true,
      { tileUrl }
    );
  }

  // Validation errors
  static createInvalidCoordinatesError(
    lat?: number,
    lon?: number
  ): ValidationError {
    return new ValidationError(
      'INVALID_COORDINATES',
      'The coordinates provided are not valid. Please check the latitude and longitude values.',
      `Invalid coordinates: lat=${lat}, lon=${lon}`,
      ErrorSeverity.MEDIUM,
      true,
      false,
      { latitude: lat, longitude: lon }
    );
  }

  static createEmptyTrackError(): ValidationError {
    return new ValidationError(
      'EMPTY_TRACK',
      'The track is empty or contains no valid points. Please add some track points before saving.',
      'Track contains no valid points',
      ErrorSeverity.MEDIUM,
      true,
      false
    );
  }

  static createInvalidDistanceError(distance: number): ValidationError {
    return new ValidationError(
      'INVALID_DISTANCE',
      `The distance value (${distance}) is not valid. Please enter a positive number.`,
      `Invalid distance value: ${distance}`,
      ErrorSeverity.LOW,
      true,
      false,
      { distance }
    );
  }

  static createDuplicateWaypointError(name: string): ValidationError {
    return new ValidationError(
      'DUPLICATE_WAYPOINT',
      `A waypoint with the name "${name}" already exists. Please choose a different name.`,
      `Duplicate waypoint name: ${name}`,
      ErrorSeverity.LOW,
      true,
      false,
      { waypointName: name }
    );
  }

  // Generic errors
  static createUnknownError(
    originalError: Error,
    context?: string
  ): ValidationError {
    return new ValidationError(
      'UNKNOWN_ERROR',
      'An unexpected error occurred. Please try again or contact support if the problem persists.',
      originalError.message,
      ErrorSeverity.MEDIUM,
      true,
      true,
      { context, originalErrorName: originalError.name }
    );
  }

  static createOperationCancelledError(operation: string): ValidationError {
    return new ValidationError(
      'OPERATION_CANCELLED',
      `The ${operation} operation was cancelled.`,
      `User cancelled operation: ${operation}`,
      ErrorSeverity.LOW,
      false,
      false,
      { operation }
    );
  }
}
