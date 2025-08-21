/**
 * Error boundary component to catch and handle React errors
 */

import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ErrorHandler } from '../../services/error/ErrorHandler';
import { ValidationError, ErrorSeverity } from '../../types/errors';
import { theme } from '../../constants/theme';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  private errorHandler: ErrorHandler;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
    this.errorHandler = ErrorHandler.getInstance();
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error
    const appError = new ValidationError(
      'REACT_ERROR_BOUNDARY',
      'An unexpected error occurred in the app. Please restart the app.',
      error.message,
      ErrorSeverity.HIGH,
      true,
      false,
      {
        componentStack: errorInfo.componentStack,
        errorBoundary: true,
      }
    );

    this.errorHandler.handleError(appError, 'ErrorBoundary');

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <View style={styles.content}>
            <Text style={styles.title}>Oops! Something went wrong</Text>
            <Text style={styles.message}>
              An unexpected error occurred. The app will try to recover
              automatically.
            </Text>

            {(typeof __DEV__ !== 'undefined' ? __DEV__ : false) &&
              this.state.error && (
                <View style={styles.debugContainer}>
                  <Text style={styles.debugTitle}>Debug Information:</Text>
                  <Text style={styles.debugText}>
                    {this.state.error.message}
                  </Text>
                  <Text style={styles.debugText}>{this.state.error.stack}</Text>
                </View>
              )}

            <TouchableOpacity
              style={styles.retryButton}
              onPress={this.handleRetry}
            >
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    alignItems: 'center',
    maxWidth: 300,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  debugContainer: {
    backgroundColor: theme.colors.surface,
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
    width: '100%',
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  debugText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontFamily: 'monospace',
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: theme.colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ErrorBoundary;
