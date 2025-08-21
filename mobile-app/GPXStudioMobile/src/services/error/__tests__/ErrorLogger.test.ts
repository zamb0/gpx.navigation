/**
 * Unit tests for ErrorLogger service
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ErrorLogger } from '../ErrorLogger';
import { FileError, ErrorSeverity } from '../../../types/errors';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('ErrorLogger', () => {
  let errorLogger: ErrorLogger;
  const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

  beforeEach(() => {
    jest.clearAllMocks();
    errorLogger = ErrorLogger.getInstance();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = ErrorLogger.getInstance();
      const instance2 = ErrorLogger.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('logError', () => {
    it('should log error to storage', async () => {
      const error = new FileError(
        'TEST_ERROR',
        'Test user message',
        'Test technical message',
        ErrorSeverity.MEDIUM
      );

      mockAsyncStorage.getItem.mockResolvedValue(null);
      mockAsyncStorage.setItem.mockResolvedValue();

      await errorLogger.logError(error, 'TestContext');

      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith(
        '@gpx_studio_error_logs'
      );
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@gpx_studio_error_logs',
        expect.stringContaining('TEST_ERROR')
      );
    });

    it('should append to existing logs', async () => {
      const existingLogs = JSON.stringify([
        {
          id: 'existing-1',
          timestamp: new Date().toISOString(),
          error: {
            type: 'FILE_ERROR',
            code: 'EXISTING_ERROR',
            userMessage: 'Existing error',
            technicalMessage: 'Existing technical message',
            severity: 'MEDIUM',
          },
        },
      ]);

      const newError = new FileError(
        'NEW_ERROR',
        'New user message',
        'New technical message'
      );

      mockAsyncStorage.getItem.mockResolvedValue(existingLogs);
      mockAsyncStorage.setItem.mockResolvedValue();

      await errorLogger.logError(newError, 'TestContext');

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@gpx_studio_error_logs',
        expect.stringContaining('NEW_ERROR')
      );
    });

    it('should handle storage errors gracefully', async () => {
      const error = new FileError(
        'TEST_ERROR',
        'Test message',
        'Technical message'
      );

      mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

      // Should not throw
      await expect(errorLogger.logError(error)).resolves.not.toThrow();
    });

    it('should sanitize sensitive context information', async () => {
      const error = new FileError(
        'TEST_ERROR',
        'Test message',
        'Technical message',
        ErrorSeverity.MEDIUM,
        true,
        true,
        {
          password: 'secret123',
          token: 'abc123',
          normalData: 'safe-value',
        }
      );

      mockAsyncStorage.getItem.mockResolvedValue(null);
      mockAsyncStorage.setItem.mockResolvedValue();

      await errorLogger.logError(error);

      const setItemCall = mockAsyncStorage.setItem.mock.calls[0];
      const loggedData = JSON.parse(setItemCall[1]);

      expect(loggedData[0].error.context.password).toBe('[REDACTED]');
      expect(loggedData[0].error.context.token).toBe('[REDACTED]');
      expect(loggedData[0].error.context.normalData).toBe('safe-value');
    });
  });

  describe('getLoggedErrors', () => {
    it('should return empty array when no logs exist', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const logs = await errorLogger.getLoggedErrors();

      expect(logs).toEqual([]);
    });

    it('should return parsed logs with Date objects', async () => {
      const timestamp = new Date().toISOString();
      const storedLogs = JSON.stringify([
        {
          id: 'test-1',
          timestamp,
          error: {
            type: 'FILE_ERROR',
            code: 'TEST_ERROR',
            userMessage: 'Test message',
            technicalMessage: 'Technical message',
            severity: 'MEDIUM',
          },
        },
      ]);

      mockAsyncStorage.getItem.mockResolvedValue(storedLogs);

      const logs = await errorLogger.getLoggedErrors();

      expect(logs).toHaveLength(1);
      expect(logs[0].id).toBe('test-1');
      expect(logs[0].timestamp).toBeInstanceOf(Date);
      expect(logs[0].error.code).toBe('TEST_ERROR');
    });

    it('should handle storage errors gracefully', async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

      const logs = await errorLogger.getLoggedErrors();

      expect(logs).toEqual([]);
    });
  });

  describe('clearLogs', () => {
    it('should remove logs from storage', async () => {
      mockAsyncStorage.removeItem.mockResolvedValue();

      await errorLogger.clearLogs();

      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(
        '@gpx_studio_error_logs'
      );
    });

    it('should handle storage errors gracefully', async () => {
      mockAsyncStorage.removeItem.mockRejectedValue(new Error('Storage error'));

      await expect(errorLogger.clearLogs()).resolves.not.toThrow();
    });
  });

  describe('getErrorStatistics', () => {
    it('should return statistics for logged errors', async () => {
      const now = new Date();
      const recentTime = new Date(now.getTime() - 12 * 60 * 60 * 1000); // 12 hours ago
      const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

      const logs = [
        {
          id: 'recent-1',
          timestamp: now.toISOString(),
          error: { type: 'FILE_ERROR', severity: 'HIGH' },
        },
        {
          id: 'recent-2',
          timestamp: recentTime.toISOString(),
          error: { type: 'LOCATION_ERROR', severity: 'MEDIUM' },
        },
        {
          id: 'old-1',
          timestamp: twoDaysAgo.toISOString(),
          error: { type: 'FILE_ERROR', severity: 'LOW' },
        },
      ];

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(logs));

      const stats = await errorLogger.getErrorStatistics();

      expect(stats.totalErrors).toBe(3);
      expect(stats.errorsByType.FILE_ERROR).toBe(2);
      expect(stats.errorsByType.LOCATION_ERROR).toBe(1);
      expect(stats.errorsBySeverity.HIGH).toBe(1);
      expect(stats.errorsBySeverity.MEDIUM).toBe(1);
      expect(stats.errorsBySeverity.LOW).toBe(1);
      expect(stats.recentErrors).toBe(2);
    });

    it('should return zero statistics when no logs exist', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const stats = await errorLogger.getErrorStatistics();

      expect(stats.totalErrors).toBe(0);
      expect(stats.errorsByType).toEqual({});
      expect(stats.errorsBySeverity).toEqual({});
      expect(stats.recentErrors).toBe(0);
    });
  });

  describe('exportLogs', () => {
    it('should return formatted JSON string of logs', async () => {
      const logs = [
        {
          id: 'test-1',
          timestamp: new Date(),
          error: {
            type: 'FILE_ERROR',
            code: 'TEST_ERROR',
            userMessage: 'Test message',
          },
        },
      ];

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(logs));

      const exported = await errorLogger.exportLogs();

      expect(exported).toContain('TEST_ERROR');
      expect(exported).toContain('Test message');
      expect(() => JSON.parse(exported)).not.toThrow();
    });
  });
});
