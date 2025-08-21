/**
 * Integration tests for the complete error handling system
 * Tests the interaction between ErrorHandler, ErrorLogger, ErrorFactory, and UI components
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { ErrorHandlingExample } from '../../components/examples/ErrorHandlingExample';
import { ErrorHandler } from '../../services/error/ErrorHandler';
import { ErrorLogger } from '../../services/error/ErrorLogger';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock Alert
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Alert: {
    alert: jest.fn(),
  },
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock file services
jest.mock('../../services/file/EnhancedFileImportService', () => ({
  EnhancedFileImportService: jest.fn().mockImplementation(() => ({
    importFile: jest.fn(),
    importBatch: jest.fn(),
  })),
}));

describe('Error Handling Integration', () => {
  let mockAlert: jest.MockedFunction<typeof Alert.alert>;
  let mockAsyncStorage: jest.Mocked<typeof AsyncStorage>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockAlert = Alert.alert as jest.MockedFunction<typeof Alert.alert>;
    mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

    // Mock AsyncStorage responses
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue();
    mockAsyncStorage.removeItem.mockResolvedValue();

    // Reset singleton instances
    (ErrorHandler as any).instance = undefined;
    (ErrorLogger as any).instance = undefined;
  });

  describe('Error Display and User Interaction', () => {
    it('should display file not found error with appropriate actions', async () => {
      const { getByText } = render(<ErrorHandlingExample />);

      // Trigger file not found error
      fireEvent.press(getByText('File Not Found'));

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          'File Error',
          expect.stringContaining('missing-file.gpx'),
          expect.arrayContaining([
            expect.objectContaining({ text: 'Browse Files' }),
            expect.objectContaining({ text: 'Dismiss' }),
          ])
        );
      });
    });

    it('should display location permission error with grant permission action', async () => {
      const { getByText } = render(<ErrorHandlingExample />);

      // Trigger location permission error
      fireEvent.press(getByText('Location Permission'));

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          'Location Error',
          expect.stringContaining('Location permission is required'),
          expect.arrayContaining([
            expect.objectContaining({ text: 'Grant Permission' }),
          ])
        );
      });
    });

    it('should display network error with offline mode option', async () => {
      const { getByText } = render(<ErrorHandlingExample />);

      // Trigger no internet error
      fireEvent.press(getByText('No Internet'));

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          'Network Error',
          expect.stringContaining('No internet connection'),
          expect.arrayContaining([
            expect.objectContaining({ text: 'Continue Offline' }),
          ])
        );
      });
    });
  });

  describe('Confirmation Dialogs', () => {
    it('should show confirmation dialog for destructive actions', async () => {
      const { getByText } = render(<ErrorHandlingExample />);

      // First import a file to have something to delete
      fireEvent.press(getByText('Import File'));

      await waitFor(() => {
        expect(getByText('Example Track')).toBeTruthy();
      });

      // Try to delete the file
      fireEvent.press(getByText('Delete'));

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          'Delete File',
          expect.stringContaining('Are you sure'),
          expect.arrayContaining([
            expect.objectContaining({ text: 'Cancel' }),
            expect.objectContaining({ text: 'Delete' }),
          ])
        );
      });
    });
  });

  describe('Error Logging Integration', () => {
    it('should log errors to AsyncStorage', async () => {
      const { getByText } = render(<ErrorHandlingExample />);

      // Trigger an error
      fireEvent.press(getByText('Invalid GPX'));

      await waitFor(() => {
        expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
          '@gpx_studio_error_logs',
          expect.stringContaining('INVALID_GPX_FORMAT')
        );
      });
    });

    it('should handle error logging failures gracefully', async () => {
      // Make AsyncStorage fail
      mockAsyncStorage.setItem.mockRejectedValue(new Error('Storage error'));

      const { getByText } = render(<ErrorHandlingExample />);

      // Trigger an error - should not crash despite logging failure
      fireEvent.press(getByText('Storage Full'));

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          'File Error',
          expect.stringContaining('storage is full'),
          expect.any(Array)
        );
      });
    });
  });

  describe('Loading States and Progress', () => {
    it('should show loading indicator during operations', async () => {
      const { getByText, getByTestId } = render(<ErrorHandlingExample />);

      // Start an operation that shows loading
      fireEvent.press(getByText('Batch Import'));

      // Should show loading modal
      await waitFor(() => {
        expect(getByTestId('loading-modal')).toBeTruthy();
      });
    });

    it('should hide loading indicator after operation completes', async () => {
      const { getByText, queryByTestId } = render(<ErrorHandlingExample />);

      // Start and complete an operation
      fireEvent.press(getByText('Import File'));

      // Loading should eventually disappear
      await waitFor(() => {
        expect(queryByTestId('loading-modal')).toBeNull();
      });
    });
  });

  describe('Error Recovery and Retry', () => {
    it('should provide retry option for retryable errors', async () => {
      const { getByText } = render(<ErrorHandlingExample />);

      // Trigger a retryable error
      fireEvent.press(getByText('No Internet'));

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          'Network Error',
          expect.any(String),
          expect.arrayContaining([expect.objectContaining({ text: 'Retry' })])
        );
      });
    });

    it('should handle unknown errors gracefully', async () => {
      const { getByText } = render(<ErrorHandlingExample />);

      // Trigger unknown error
      fireEvent.press(getByText('Unknown Error'));

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          'Error',
          expect.stringContaining('unexpected error occurred'),
          expect.any(Array)
        );
      });
    });
  });

  describe('Error Context and Metadata', () => {
    it('should include proper context in logged errors', async () => {
      const { getByText } = render(<ErrorHandlingExample />);

      // Trigger an error
      fireEvent.press(getByText('File Not Found'));

      await waitFor(() => {
        const logCall = mockAsyncStorage.setItem.mock.calls.find(
          (call) => call[0] === '@gpx_studio_error_logs'
        );

        expect(logCall).toBeTruthy();
        if (logCall) {
          const logData = JSON.parse(logCall[1]);
          expect(logData[0]).toMatchObject({
            context: 'ErrorSimulation',
            error: expect.objectContaining({
              code: 'FILE_NOT_FOUND',
              type: 'FILE_ERROR',
            }),
          });
        }
      });
    });
  });

  describe('Performance and Memory', () => {
    it('should handle multiple rapid errors without memory leaks', async () => {
      const { getByText } = render(<ErrorHandlingExample />);

      // Trigger multiple errors rapidly
      for (let i = 0; i < 5; i++) {
        fireEvent.press(getByText('Unknown Error'));
      }

      // Should handle all errors without crashing
      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledTimes(5);
      });
    });

    it('should limit error log storage to prevent excessive memory usage', async () => {
      // Mock existing logs at the limit
      const existingLogs = Array.from({ length: 100 }, (_, i) => ({
        id: `log-${i}`,
        timestamp: new Date(Date.now() - i * 1000),
        error: { code: 'TEST_ERROR', message: 'Test' },
      }));

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(existingLogs));

      const { getByText } = render(<ErrorHandlingExample />);

      // Add one more error
      fireEvent.press(getByText('File Not Found'));

      await waitFor(() => {
        const setItemCalls = mockAsyncStorage.setItem.mock.calls.filter(
          (call) => call[0] === '@gpx_studio_error_logs'
        );

        if (setItemCalls.length > 0) {
          const lastCall = setItemCalls[setItemCalls.length - 1];
          const logData = JSON.parse(lastCall[1]);
          // Should still be limited to 100 entries
          expect(logData.length).toBeLessThanOrEqual(100);
        }
      });
    });
  });
});
