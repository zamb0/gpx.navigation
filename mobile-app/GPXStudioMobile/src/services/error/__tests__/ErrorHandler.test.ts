/**
 * Unit tests for ErrorHandler service
 */

import { ErrorHandler } from '../ErrorHandler';
import { ErrorLogger } from '../ErrorLogger';
import {
  FileError,
  LocationError,
  NetworkError,
  ErrorSeverity,
} from '../../../types/errors';
import { Alert } from 'react-native';

// Mock Alert
jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
}));

// Mock ErrorLogger
jest.mock('../ErrorLogger', () => ({
  ErrorLogger: {
    getInstance: jest.fn(),
  },
}));

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler;
  let mockLogger: jest.Mocked<ErrorLogger>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock ErrorLogger instance
    mockLogger = {
      logError: jest.fn().mockResolvedValue(undefined),
    } as any;

    (ErrorLogger.getInstance as jest.Mock).mockReturnValue(mockLogger);

    // Reset singleton instance
    (ErrorHandler as any).instance = undefined;
    errorHandler = ErrorHandler.getInstance();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = ErrorHandler.getInstance();
      const instance2 = ErrorHandler.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('handleError', () => {
    it('should log error and show user-friendly message', async () => {
      const error = new FileError(
        'FILE_NOT_FOUND',
        'File not found',
        'Technical message',
        ErrorSeverity.MEDIUM
      );

      await errorHandler.handleError(error, 'TestContext');

      expect(mockLogger.logError).toHaveBeenCalledWith(error, 'TestContext');
      expect(Alert.alert).toHaveBeenCalled();
    });

    it('should normalize standard errors to AppError', async () => {
      const standardError = new Error('Standard error message');

      await errorHandler.handleError(standardError, 'TestContext');

      expect(mockLogger.logError).toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenCalled();
    });
  });

  describe('handleFileError', () => {
    it('should handle FILE_NOT_FOUND error with browse action', async () => {
      const error = new FileError(
        'FILE_NOT_FOUND',
        'File not found',
        'Technical message'
      );

      await errorHandler.handleFileError(error);

      expect(mockLogger.logError).toHaveBeenCalledWith(error, 'FileOperation');
      expect(Alert.alert).toHaveBeenCalledWith(
        'File Error',
        'File not found',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Retry' }),
          expect.objectContaining({ text: 'Browse Files' }),
          expect.objectContaining({ text: 'Dismiss' }),
        ])
      );
    });

    it('should handle STORAGE_FULL error with manage storage action', async () => {
      const error = new FileError(
        'STORAGE_FULL',
        'Storage full',
        'Technical message'
      );

      await errorHandler.handleFileError(error);

      expect(Alert.alert).toHaveBeenCalledWith(
        'File Error',
        'Storage full',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Manage Storage' }),
        ])
      );
    });

    it('should handle PERMISSION_DENIED error with grant permission action', async () => {
      const error = new FileError(
        'PERMISSION_DENIED',
        'Permission denied',
        'Technical message'
      );

      await errorHandler.handleFileError(error);

      expect(Alert.alert).toHaveBeenCalledWith(
        'File Error',
        'Permission denied',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Grant Permission' }),
        ])
      );
    });
  });

  describe('handleLocationError', () => {
    it('should handle PERMISSION_DENIED error with grant permission action', async () => {
      const error = new LocationError(
        'PERMISSION_DENIED',
        'Location permission denied',
        'Technical message'
      );

      await errorHandler.handleLocationError(error);

      expect(mockLogger.logError).toHaveBeenCalledWith(
        error,
        'LocationService'
      );
      expect(Alert.alert).toHaveBeenCalledWith(
        'Location Error',
        'Location permission denied',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Grant Permission' }),
        ])
      );
    });

    it('should handle GPS_UNAVAILABLE error with open settings action', async () => {
      const error = new LocationError(
        'GPS_UNAVAILABLE',
        'GPS unavailable',
        'Technical message'
      );

      await errorHandler.handleLocationError(error);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Location Error',
        expect.stringContaining('GPS unavailable'),
        expect.arrayContaining([
          expect.objectContaining({ text: 'Open Settings' }),
        ])
      );
    });

    it('should handle POOR_ACCURACY error with wait for signal action', async () => {
      const error = new LocationError(
        'POOR_ACCURACY',
        'Poor GPS accuracy',
        'Technical message'
      );

      await errorHandler.handleLocationError(error);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Location Error',
        'Poor GPS accuracy',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Wait for Better Signal' }),
        ])
      );
    });
  });

  describe('handleNetworkError', () => {
    it('should handle NO_INTERNET error with continue offline action', async () => {
      const error = new NetworkError(
        'NO_INTERNET',
        'No internet connection',
        'Technical message'
      );

      await errorHandler.handleNetworkError(error);

      expect(mockLogger.logError).toHaveBeenCalledWith(
        error,
        'NetworkOperation'
      );
      expect(Alert.alert).toHaveBeenCalledWith(
        'Network Error',
        expect.stringContaining('No internet connection'),
        expect.arrayContaining([
          expect.objectContaining({ text: 'Continue Offline' }),
        ])
      );
    });

    it('should handle TIMEOUT error with check connection action', async () => {
      const error = new NetworkError(
        'TIMEOUT',
        'Request timeout',
        'Technical message'
      );

      await errorHandler.handleNetworkError(error);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Network Error',
        'Request timeout',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Check Connection' }),
        ])
      );
    });

    it('should add retry action for retryable errors', async () => {
      const error = new NetworkError(
        'SERVER_ERROR',
        'Server error',
        'Technical message',
        ErrorSeverity.MEDIUM,
        true,
        true
      );

      await errorHandler.handleNetworkError(error);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Network Error',
        'Server error',
        expect.arrayContaining([expect.objectContaining({ text: 'Retry' })])
      );
    });
  });

  describe('showConfirmationDialog', () => {
    it('should show confirmation dialog with confirm and cancel buttons', () => {
      const onConfirm = jest.fn();
      const onCancel = jest.fn();

      errorHandler.showConfirmationDialog(
        'Test Title',
        'Test Message',
        onConfirm,
        onCancel,
        false
      );

      expect(Alert.alert).toHaveBeenCalledWith(
        'Test Title',
        'Test Message',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: onCancel,
          },
          {
            text: 'Confirm',
            style: 'default',
            onPress: onConfirm,
          },
        ],
        { cancelable: true }
      );
    });

    it('should show destructive confirmation dialog', () => {
      const onConfirm = jest.fn();

      errorHandler.showConfirmationDialog(
        'Delete File',
        'Are you sure?',
        onConfirm,
        undefined,
        true
      );

      expect(Alert.alert).toHaveBeenCalledWith(
        'Delete File',
        'Are you sure?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: undefined,
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: onConfirm,
          },
        ],
        { cancelable: true }
      );
    });
  });

  describe('clearRetryAttempts', () => {
    it('should clear all retry attempts when no key provided', () => {
      // This is testing internal state, so we'll just ensure it doesn't throw
      expect(() => errorHandler.clearRetryAttempts()).not.toThrow();
    });

    it('should clear specific retry attempt when key provided', () => {
      expect(() => errorHandler.clearRetryAttempts('test-key')).not.toThrow();
    });
  });
});
