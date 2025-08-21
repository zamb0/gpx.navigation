/**
 * Error logging service for debugging and crash reporting
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppError, ErrorSeverity } from '../../types/errors';

interface LogEntry {
  id: string;
  timestamp: Date;
  error: AppError;
  context?: string;
  deviceInfo?: DeviceInfo;
  appVersion?: string;
}

interface DeviceInfo {
  platform: string;
  version: string;
  model?: string;
  manufacturer?: string;
}

export class ErrorLogger {
  private static instance: ErrorLogger;
  private readonly MAX_LOG_ENTRIES = 100;
  private readonly LOG_STORAGE_KEY = '@gpx_studio_error_logs';

  private constructor() {}

  static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  /**
   * Log an error with context information
   */
  async logError(error: AppError, context?: string): Promise<void> {
    try {
      const logEntry: LogEntry = {
        id: this.generateLogId(),
        timestamp: new Date(),
        error: {
          ...error,
          // Sanitize sensitive information
          context: this.sanitizeContext(error.context),
        },
        context,
        deviceInfo: await this.getDeviceInfo(),
        appVersion: await this.getAppVersion(),
      };

      await this.saveLogEntry(logEntry);

      // Log to console in development
      if (__DEV__) {
        this.logToConsole(logEntry);
      }

      // Send to crash reporting service for critical errors
      if (error.severity === ErrorSeverity.CRITICAL) {
        await this.sendToCrashReporting(logEntry);
      }
    } catch (loggingError) {
      // Fallback to console logging if storage fails
      console.error('Failed to log error:', loggingError);
      console.error('Original error:', error);
    }
  }

  /**
   * Get all logged errors
   */
  async getLoggedErrors(): Promise<LogEntry[]> {
    try {
      const logsJson = await AsyncStorage.getItem(this.LOG_STORAGE_KEY);
      if (!logsJson) {
        return [];
      }

      const logs: LogEntry[] = JSON.parse(logsJson);
      return logs.map((log) => ({
        ...log,
        timestamp: new Date(log.timestamp),
      }));
    } catch (error) {
      console.error('Failed to retrieve error logs:', error);
      return [];
    }
  }

  /**
   * Clear all logged errors
   */
  async clearLogs(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.LOG_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear error logs:', error);
    }
  }

  /**
   * Get error statistics
   */
  async getErrorStatistics(): Promise<{
    totalErrors: number;
    errorsByType: Record<string, number>;
    errorsBySeverity: Record<string, number>;
    recentErrors: number;
  }> {
    const logs = await this.getLoggedErrors();
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const errorsByType: Record<string, number> = {};
    const errorsBySeverity: Record<string, number> = {};
    let recentErrors = 0;

    logs.forEach((log) => {
      // Count by type
      errorsByType[log.error.type] = (errorsByType[log.error.type] || 0) + 1;

      // Count by severity
      errorsBySeverity[log.error.severity] =
        (errorsBySeverity[log.error.severity] || 0) + 1;

      // Count recent errors
      if (log.timestamp > oneDayAgo) {
        recentErrors++;
      }
    });

    return {
      totalErrors: logs.length,
      errorsByType,
      errorsBySeverity,
      recentErrors,
    };
  }

  /**
   * Export logs for debugging
   */
  async exportLogs(): Promise<string> {
    const logs = await this.getLoggedErrors();
    return JSON.stringify(logs, null, 2);
  }

  /**
   * Save log entry to storage
   */
  private async saveLogEntry(logEntry: LogEntry): Promise<void> {
    const existingLogs = await this.getLoggedErrors();

    // Add new log entry
    existingLogs.push(logEntry);

    // Keep only the most recent entries
    const trimmedLogs = existingLogs
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, this.MAX_LOG_ENTRIES);

    await AsyncStorage.setItem(
      this.LOG_STORAGE_KEY,
      JSON.stringify(trimmedLogs)
    );
  }

  /**
   * Log to console in development mode
   */
  private logToConsole(logEntry: LogEntry): void {
    const { error, context } = logEntry;

    console.group(`🚨 ${error.severity} Error: ${error.type}`);
    console.log('Code:', error.code);
    console.log('User Message:', error.userMessage);
    console.log('Technical Message:', error.technicalMessage);
    console.log('Context:', context);
    console.log('Timestamp:', logEntry.timestamp.toISOString());
    console.log('Recoverable:', error.recoverable);
    console.log('Retryable:', error.retryable);

    if (error.context) {
      console.log('Error Context:', error.context);
    }

    console.groupEnd();
  }

  /**
   * Send critical errors to crash reporting service
   */
  private async sendToCrashReporting(logEntry: LogEntry): Promise<void> {
    // In a real implementation, this would send to services like:
    // - Crashlytics
    // - Sentry
    // - Bugsnag
    // For now, we'll just log it
    console.error('CRITICAL ERROR - Would send to crash reporting:', logEntry);
  }

  /**
   * Get device information
   */
  private async getDeviceInfo(): Promise<DeviceInfo> {
    // In a real implementation, this would use react-native-device-info
    // For now, return basic platform info
    return {
      platform: 'unknown',
      version: 'unknown',
    };
  }

  /**
   * Get app version
   */
  private async getAppVersion(): Promise<string> {
    // In a real implementation, this would get the actual app version
    return '1.0.0';
  }

  /**
   * Generate unique log ID
   */
  private generateLogId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sanitize context to remove sensitive information
   */
  private sanitizeContext(
    context?: Record<string, any>
  ): Record<string, any> | undefined {
    if (!context) {
      return undefined;
    }

    const sanitized = { ...context };

    // Remove potentially sensitive keys
    const sensitiveKeys = ['password', 'token', 'key', 'secret', 'auth'];

    Object.keys(sanitized).forEach((key) => {
      if (
        sensitiveKeys.some((sensitive) => key.toLowerCase().includes(sensitive))
      ) {
        sanitized[key] = '[REDACTED]';
      }
    });

    return sanitized;
  }
}
