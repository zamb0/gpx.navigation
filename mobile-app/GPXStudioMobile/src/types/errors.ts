/**
 * Error types and interfaces for comprehensive error handling
 */

export enum ErrorType {
  FILE_ERROR = 'FILE_ERROR',
  LOCATION_ERROR = 'LOCATION_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  GPS_ERROR = 'GPS_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  PERMISSION_ERROR = 'PERMISSION_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface AppError extends Error {
  type: ErrorType;
  severity: ErrorSeverity;
  code: string;
  userMessage: string;
  technicalMessage: string;
  context?: Record<string, any>;
  recoverable: boolean;
  retryable: boolean;
  timestamp: Date;
}

export interface ErrorAction {
  label: string;
  action: () => void | Promise<void>;
  primary?: boolean;
}

export interface ErrorDisplayOptions {
  title?: string;
  message: string;
  actions?: ErrorAction[];
  dismissible?: boolean;
  autoHide?: boolean;
  duration?: number;
}

// File operation errors
export class FileError extends Error implements AppError {
  type = ErrorType.FILE_ERROR as const;
  severity: ErrorSeverity;
  code: string;
  userMessage: string;
  technicalMessage: string;
  context?: Record<string, any>;
  recoverable: boolean;
  retryable: boolean;
  timestamp: Date;

  constructor(
    code: string,
    userMessage: string,
    technicalMessage: string,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    recoverable: boolean = true,
    retryable: boolean = true,
    context?: Record<string, any>
  ) {
    super(technicalMessage);
    this.code = code;
    this.userMessage = userMessage;
    this.technicalMessage = technicalMessage;
    this.severity = severity;
    this.recoverable = recoverable;
    this.retryable = retryable;
    this.context = context;
    this.timestamp = new Date();
  }
}

// Location/GPS errors
export class LocationError extends Error implements AppError {
  type = ErrorType.LOCATION_ERROR as const;
  severity: ErrorSeverity;
  code: string;
  userMessage: string;
  technicalMessage: string;
  context?: Record<string, any>;
  recoverable: boolean;
  retryable: boolean;
  timestamp: Date;

  constructor(
    code: string,
    userMessage: string,
    technicalMessage: string,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    recoverable: boolean = true,
    retryable: boolean = true,
    context?: Record<string, any>
  ) {
    super(technicalMessage);
    this.code = code;
    this.userMessage = userMessage;
    this.technicalMessage = technicalMessage;
    this.severity = severity;
    this.recoverable = recoverable;
    this.retryable = retryable;
    this.context = context;
    this.timestamp = new Date();
  }
}

// Network errors
export class NetworkError extends Error implements AppError {
  type = ErrorType.NETWORK_ERROR as const;
  severity: ErrorSeverity;
  code: string;
  userMessage: string;
  technicalMessage: string;
  context?: Record<string, any>;
  recoverable: boolean;
  retryable: boolean;
  timestamp: Date;

  constructor(
    code: string,
    userMessage: string,
    technicalMessage: string,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    recoverable: boolean = true,
    retryable: boolean = true,
    context?: Record<string, any>
  ) {
    super(technicalMessage);
    this.code = code;
    this.userMessage = userMessage;
    this.technicalMessage = technicalMessage;
    this.severity = severity;
    this.recoverable = recoverable;
    this.retryable = retryable;
    this.context = context;
    this.timestamp = new Date();
  }
}

// Validation errors
export class ValidationError extends Error implements AppError {
  type = ErrorType.VALIDATION_ERROR as const;
  severity: ErrorSeverity;
  code: string;
  userMessage: string;
  technicalMessage: string;
  context?: Record<string, any>;
  recoverable: boolean;
  retryable: boolean;
  timestamp: Date;

  constructor(
    code: string,
    userMessage: string,
    technicalMessage: string,
    severity: ErrorSeverity = ErrorSeverity.LOW,
    recoverable: boolean = true,
    retryable: boolean = false,
    context?: Record<string, any>
  ) {
    super(technicalMessage);
    this.code = code;
    this.userMessage = userMessage;
    this.technicalMessage = technicalMessage;
    this.severity = severity;
    this.recoverable = recoverable;
    this.retryable = retryable;
    this.context = context;
    this.timestamp = new Date();
  }
}

export interface RetryOptions {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  exponentialBackoff: boolean;
}

export interface LoadingState {
  isLoading: boolean;
  message?: string;
  progress?: number;
  cancellable?: boolean;
  onCancel?: () => void;
}
