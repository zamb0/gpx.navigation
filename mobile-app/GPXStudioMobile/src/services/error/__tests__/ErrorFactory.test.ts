/**
 * Unit tests for ErrorFactory
 */

import { ErrorFactory } from '../ErrorFactory';
import { ErrorType, ErrorSeverity } from '../../../types/errors';

describe('ErrorFactory', () => {
  describe('File Errors', () => {
    describe('createFileNotFoundError', () => {
      it('should create file not found error with correct properties', () => {
        const error = ErrorFactory.createFileNotFoundError('test.gpx');

        expect(error.type).toBe(ErrorType.FILE_ERROR);
        expect(error.code).toBe('FILE_NOT_FOUND');
        expect(error.severity).toBe(ErrorSeverity.MEDIUM);
        expect(error.userMessage).toContain('test.gpx');
        expect(error.recoverable).toBe(true);
        expect(error.retryable).toBe(false);
        expect(error.context?.filename).toBe('test.gpx');
      });
    });

    describe('createInvalidGPXError', () => {
      it('should create invalid GPX error with details', () => {
        const error = ErrorFactory.createInvalidGPXError(
          'invalid.gpx',
          'Missing XML header'
        );

        expect(error.code).toBe('INVALID_GPX_FORMAT');
        expect(error.userMessage).toContain('invalid.gpx');
        expect(error.technicalMessage).toContain('Missing XML header');
        expect(error.context?.filename).toBe('invalid.gpx');
        expect(error.context?.details).toBe('Missing XML header');
      });

      it('should create invalid GPX error without details', () => {
        const error = ErrorFactory.createInvalidGPXError('invalid.gpx');

        expect(error.technicalMessage).toContain('Unknown format error');
      });
    });

    describe('createStorageFullError', () => {
      it('should create storage full error', () => {
        const error = ErrorFactory.createStorageFullError();

        expect(error.code).toBe('STORAGE_FULL');
        expect(error.severity).toBe(ErrorSeverity.HIGH);
        expect(error.userMessage).toContain('storage is full');
        expect(error.retryable).toBe(false);
      });
    });

    describe('createFilePermissionError', () => {
      it('should create file permission error', () => {
        const error = ErrorFactory.createFilePermissionError('read');

        expect(error.code).toBe('PERMISSION_DENIED');
        expect(error.severity).toBe(ErrorSeverity.HIGH);
        expect(error.userMessage).toContain('read');
        expect(error.context?.operation).toBe('read');
      });
    });

    describe('createFileTooLargeError', () => {
      it('should create file too large error with size information', () => {
        const error = ErrorFactory.createFileTooLargeError(
          'large.gpx',
          50 * 1024 * 1024,
          10 * 1024 * 1024
        );

        expect(error.code).toBe('FILE_TOO_LARGE');
        expect(error.userMessage).toContain('large.gpx');
        expect(error.userMessage).toContain('50MB');
        expect(error.userMessage).toContain('10MB');
        expect(error.context?.size).toBe(50 * 1024 * 1024);
        expect(error.context?.maxSize).toBe(10 * 1024 * 1024);
      });
    });
  });

  describe('Location Errors', () => {
    describe('createLocationPermissionError', () => {
      it('should create location permission error', () => {
        const error = ErrorFactory.createLocationPermissionError();

        expect(error.type).toBe(ErrorType.LOCATION_ERROR);
        expect(error.code).toBe('PERMISSION_DENIED');
        expect(error.severity).toBe(ErrorSeverity.HIGH);
        expect(error.userMessage).toContain('Location permission');
        expect(error.retryable).toBe(false);
      });
    });

    describe('createGPSUnavailableError', () => {
      it('should create GPS unavailable error', () => {
        const error = ErrorFactory.createGPSUnavailableError();

        expect(error.code).toBe('GPS_UNAVAILABLE');
        expect(error.severity).toBe(ErrorSeverity.HIGH);
        expect(error.userMessage).toContain('GPS is not available');
        expect(error.retryable).toBe(true);
      });
    });

    describe('createPoorGPSAccuracyError', () => {
      it('should create poor GPS accuracy error with accuracy value', () => {
        const error = ErrorFactory.createPoorGPSAccuracyError(25.5);

        expect(error.code).toBe('POOR_ACCURACY');
        expect(error.severity).toBe(ErrorSeverity.LOW);
        expect(error.userMessage).toContain('±26m');
        expect(error.context?.accuracy).toBe(25.5);
      });
    });

    describe('createLocationTimeoutError', () => {
      it('should create location timeout error', () => {
        const error = ErrorFactory.createLocationTimeoutError();

        expect(error.code).toBe('LOCATION_TIMEOUT');
        expect(error.severity).toBe(ErrorSeverity.MEDIUM);
        expect(error.userMessage).toContain('Unable to get your location');
        expect(error.retryable).toBe(true);
      });
    });
  });

  describe('Network Errors', () => {
    describe('createNoInternetError', () => {
      it('should create no internet error', () => {
        const error = ErrorFactory.createNoInternetError();

        expect(error.type).toBe(ErrorType.NETWORK_ERROR);
        expect(error.code).toBe('NO_INTERNET');
        expect(error.severity).toBe(ErrorSeverity.MEDIUM);
        expect(error.userMessage).toContain('No internet connection');
        expect(error.retryable).toBe(true);
      });
    });

    describe('createNetworkTimeoutError', () => {
      it('should create network timeout error with operation context', () => {
        const error = ErrorFactory.createNetworkTimeoutError('file upload');

        expect(error.code).toBe('TIMEOUT');
        expect(error.userMessage).toContain('file upload');
        expect(error.context?.operation).toBe('file upload');
      });
    });

    describe('createServerError', () => {
      it('should create server error with status code', () => {
        const error = ErrorFactory.createServerError(500, 'map tile request');

        expect(error.code).toBe('SERVER_ERROR');
        expect(error.userMessage).toContain('map tile request');
        expect(error.technicalMessage).toContain('500');
        expect(error.context?.statusCode).toBe(500);
        expect(error.context?.operation).toBe('map tile request');
      });
    });

    describe('createMapTileLoadError', () => {
      it('should create map tile load error', () => {
        const tileUrl = 'https://example.com/tile/1/2/3.png';
        const error = ErrorFactory.createMapTileLoadError(tileUrl);

        expect(error.code).toBe('MAP_TILE_LOAD_FAILED');
        expect(error.severity).toBe(ErrorSeverity.LOW);
        expect(error.userMessage).toContain('map tiles');
        expect(error.context?.tileUrl).toBe(tileUrl);
      });
    });
  });

  describe('Validation Errors', () => {
    describe('createInvalidCoordinatesError', () => {
      it('should create invalid coordinates error with lat/lon', () => {
        const error = ErrorFactory.createInvalidCoordinatesError(91, 181);

        expect(error.type).toBe(ErrorType.VALIDATION_ERROR);
        expect(error.code).toBe('INVALID_COORDINATES');
        expect(error.userMessage).toContain(
          'coordinates provided are not valid'
        );
        expect(error.context?.latitude).toBe(91);
        expect(error.context?.longitude).toBe(181);
        expect(error.retryable).toBe(false);
      });
    });

    describe('createEmptyTrackError', () => {
      it('should create empty track error', () => {
        const error = ErrorFactory.createEmptyTrackError();

        expect(error.code).toBe('EMPTY_TRACK');
        expect(error.userMessage).toContain('track is empty');
        expect(error.retryable).toBe(false);
      });
    });

    describe('createInvalidDistanceError', () => {
      it('should create invalid distance error', () => {
        const error = ErrorFactory.createInvalidDistanceError(-5);

        expect(error.code).toBe('INVALID_DISTANCE');
        expect(error.userMessage).toContain('-5');
        expect(error.context?.distance).toBe(-5);
      });
    });

    describe('createDuplicateWaypointError', () => {
      it('should create duplicate waypoint error', () => {
        const error = ErrorFactory.createDuplicateWaypointError('Summit');

        expect(error.code).toBe('DUPLICATE_WAYPOINT');
        expect(error.userMessage).toContain('Summit');
        expect(error.context?.waypointName).toBe('Summit');
      });
    });
  });

  describe('Generic Errors', () => {
    describe('createUnknownError', () => {
      it('should create unknown error from standard error', () => {
        const originalError = new Error('Something went wrong');
        const error = ErrorFactory.createUnknownError(
          originalError,
          'TestContext'
        );

        expect(error.code).toBe('UNKNOWN_ERROR');
        expect(error.technicalMessage).toBe('Something went wrong');
        expect(error.context?.context).toBe('TestContext');
        expect(error.context?.originalErrorName).toBe('Error');
        expect(error.retryable).toBe(true);
      });
    });

    describe('createOperationCancelledError', () => {
      it('should create operation cancelled error', () => {
        const error = ErrorFactory.createOperationCancelledError('file import');

        expect(error.code).toBe('OPERATION_CANCELLED');
        expect(error.userMessage).toContain('file import');
        expect(error.severity).toBe(ErrorSeverity.LOW);
        expect(error.recoverable).toBe(false);
        expect(error.retryable).toBe(false);
        expect(error.context?.operation).toBe('file import');
      });
    });
  });

  describe('Error Properties', () => {
    it('should set timestamp on all errors', () => {
      const error = ErrorFactory.createFileNotFoundError('test.gpx');

      expect(error.timestamp).toBeInstanceOf(Date);
      expect(error.timestamp.getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('should have consistent error structure', () => {
      const error = ErrorFactory.createLocationPermissionError();

      expect(error).toHaveProperty('type');
      expect(error).toHaveProperty('severity');
      expect(error).toHaveProperty('code');
      expect(error).toHaveProperty('userMessage');
      expect(error).toHaveProperty('technicalMessage');
      expect(error).toHaveProperty('recoverable');
      expect(error).toHaveProperty('retryable');
      expect(error).toHaveProperty('timestamp');
    });
  });
});
