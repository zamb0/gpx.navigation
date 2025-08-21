/**
 * Central error handling service for the GPX Studio Mobile app
 */

import { Alert } from 'react-native';
import {
  AppError,
  ErrorType,
  ErrorSeverity,
  ErrorDisplayOptions,
  FileError,
  LocationError,
  NetworkError,
  ValidationError,
  RetryOptions,
} from '../../types/errors';
import { ErrorLogger } from './ErrorLogger';

export class ErrorHandler {
  private static instance: ErrorHandler;
  private logger: ErrorLogger;
  private retryAttempts: Map<string, number> = new Map();

  private constructor() {
    this.logger = ErrorLogger.getInstance();
  }

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Handle any error and display appropriate user feedback
   */
  async handleError(error: Error | AppError, context?: string): Promise<void> {
    const appError = this.normalizeError(error, context);

    // Log the error
    await this.logger.logError(appError, context);

    // Display user-friendly error message
    this.showUserFriendlyError(appError);
  }

  /**
   * Handle file operation errors
   */
  async handleFileError(error: FileError): Promise<void> {
    await this.logger.logError(error, 'FileOperation');

    const options: ErrorDisplayOptions = {
      title: 'File Error',
      message: error.userMessage,
      actions: [],
    };

    // Add retry action if retryable
    if (error.retryable) {
      options.actions?.push({
        label: 'Retry',
        action: () => this.retryOperation(error),
        primary: true,
      });
    }

    // Add specific actions based on error code
    switch (error.code) {
      case 'FILE_NOT_FOUND':
        options.actions?.push({
          label: 'Browse Files',
          action: () => {
            // Navigate to files screen
          },
        });
        break;
      case 'STORAGE_FULL':
        options.actions?.push({
          label: 'Manage Storage',
          action: () => {
            // Navigate to storage management
          },
        });
        break;
      case 'PERMISSION_DENIED':
        options.actions?.push({
          label: 'Grant Permission',
          action: () => {
            // Open app settings
          },
        });
        break;
    }

    this.displayError(options);
  }

  /**
   * Handle location/GPS errors
   */
  async handleLocationError(error: LocationError): Promise<void> {
    await this.logger.logError(error, 'LocationService');

    const options: ErrorDisplayOptions = {
      title: 'Location Error',
      message: error.userMessage,
      actions: [],
    };

    switch (error.code) {
      case 'PERMISSION_DENIED':
        options.actions?.push({
          label: 'Grant Permission',
          action: () => {
            // Request location permission
          },
          primary: true,
        });
        break;
      case 'GPS_UNAVAILABLE':
        options.message +=
          '\n\nPlease check that GPS is enabled in your device settings.';
        options.actions?.push({
          label: 'Open Settings',
          action: () => {
            // Open device GPS settings
          },
          primary: true,
        });
        break;
      case 'POOR_ACCURACY':
        options.actions?.push({
          label: 'Wait for Better Signal',
          action: () => this.retryOperation(error),
          primary: true,
        });
        break;
    }

    this.displayError(options);
  }

  /**
   * Handle network errors
   */
  async handleNetworkError(error: NetworkError): Promise<void> {
    await this.logger.logError(error, 'NetworkOperation');

    const options: ErrorDisplayOptions = {
      title: 'Network Error',
      message: error.userMessage,
      actions: [],
    };

    if (error.retryable) {
      options.actions?.push({
        label: 'Retry',
        action: () => this.retryOperation(error),
        primary: true,
      });
    }

    switch (error.code) {
      case 'NO_INTERNET':
        options.message += '\n\nSome features may be limited in offline mode.';
        options.actions?.push({
          label: 'Continue Offline',
          action: () => {
            // Enable offline mode
          },
        });
        break;
      case 'TIMEOUT':
        options.actions?.push({
          label: 'Check Connection',
          action: () => {
            // Show network diagnostics
          },
        });
        break;
    }

    this.displayError(options);
  }

  /**
   * Show confirmation dialog for destructive actions
   */
  showConfirmationDialog(
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void,
    destructive: boolean = false
  ): void {
    Alert.alert(
      title,
      message,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: onCancel,
        },
        {
          text: destructive ? 'Delete' : 'Confirm',
          style: destructive ? 'destructive' : 'default',
          onPress: onConfirm,
        },
      ],
      { cancelable: true }
    );
  }

  /**
   * Retry an operation with exponential backoff
   */
  private async retryOperation(
    error: AppError,
    options: RetryOptions = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      exponentialBackoff: true,
    }
  ): Promise<void> {
    const key = `${error.type}_${error.code}`;
    const currentAttempts = this.retryAttempts.get(key) || 0;

    if (currentAttempts >= options.maxAttempts) {
      this.retryAttempts.delete(key);
      this.displayError({
        title: 'Operation Failed',
        message: 'Maximum retry attempts reached. Please try again later.',
        dismissible: true,
      });
      return;
    }

    this.retryAttempts.set(key, currentAttempts + 1);

    // Calculate delay with exponential backoff
    let delay = options.baseDelay;
    if (options.exponentialBackoff) {
      delay = Math.min(
        options.baseDelay * Math.pow(2, currentAttempts),
        options.maxDelay
      );
    }

    // Show retry indicator
    this.displayError({
      message: `Retrying in ${Math.ceil(delay / 1000)} seconds...`,
      autoHide: true,
      duration: delay,
    });

    setTimeout(() => {
      // The actual retry logic would be implemented by the calling service
      // This is just the retry mechanism framework
    }, delay);
  }

  /**
   * Normalize any error to AppError format
   */
  private normalizeError(error: Error | AppError, context?: string): AppError {
    if (this.isAppError(error)) {
      return error;
    }

    // Convert standard errors to AppError
    return new ValidationError(
      'UNKNOWN_ERROR',
      'An unexpected error occurred. Please try again.',
      error.message,
      ErrorSeverity.MEDIUM,
      true,
      true,
      { context, originalError: error.name }
    );
  }

  /**
   * Check if error is already an AppError
   */
  private isAppError(error: Error | AppError): error is AppError {
    return 'type' in error && 'severity' in error && 'code' in error;
  }

  /**
   * Display error to user using appropriate UI method
   */
  private displayError(options: ErrorDisplayOptions): void {
    if (options.actions && options.actions.length > 0) {
      // Use Alert for errors with actions
      const buttons = options.actions.map((action) => ({
        text: action.label,
        onPress: action.action,
        style: (action.primary ? 'default' : 'cancel') as
          | 'default'
          | 'cancel'
          | 'destructive',
      }));

      if (options.dismissible !== false) {
        buttons.push({
          text: 'Dismiss',
          style: 'cancel',
          onPress: () => {},
        });
      }

      Alert.alert(options.title || 'Error', options.message, buttons);
    } else {
      // Use simple alert for basic errors
      Alert.alert(options.title || 'Error', options.message, [{ text: 'OK' }]);
    }
  }

  /**
   * Show user-friendly error message
   */
  private showUserFriendlyError(error: AppError): void {
    const options: ErrorDisplayOptions = {
      title: this.getErrorTitle(error.type),
      message: error.userMessage,
      dismissible: true,
    };

    // Add retry action for retryable errors
    if (error.retryable) {
      options.actions = [
        {
          label: 'Retry',
          action: () => this.retryOperation(error),
          primary: true,
        },
      ];
    }

    this.displayError(options);
  }

  /**
   * Get appropriate title for error type
   */
  private getErrorTitle(type: ErrorType): string {
    switch (type) {
      case ErrorType.FILE_ERROR:
        return 'File Error';
      case ErrorType.LOCATION_ERROR:
      case ErrorType.GPS_ERROR:
        return 'Location Error';
      case ErrorType.NETWORK_ERROR:
        return 'Network Error';
      case ErrorType.VALIDATION_ERROR:
        return 'Validation Error';
      case ErrorType.PERMISSION_ERROR:
        return 'Permission Required';
      case ErrorType.STORAGE_ERROR:
        return 'Storage Error';
      default:
        return 'Error';
    }
  }

  /**
   * Clear retry attempts for a specific error
   */
  clearRetryAttempts(errorKey?: string): void {
    if (errorKey) {
      this.retryAttempts.delete(errorKey);
    } else {
      this.retryAttempts.clear();
    }
  }
}
