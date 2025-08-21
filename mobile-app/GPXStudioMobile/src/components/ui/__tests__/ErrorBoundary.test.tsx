/**
 * Unit tests for ErrorBoundary component
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ErrorBoundary } from '../ErrorBoundary';
import { ErrorHandler } from '../../../services/error/ErrorHandler';

// Mock ErrorHandler
jest.mock('../../../services/error/ErrorHandler');

// Mock theme
jest.mock('../../../constants/theme', () => ({
  theme: {
    colors: {
      primary: '#007AFF',
      surface: '#FFFFFF',
      text: '#000000',
      textSecondary: '#666666',
      border: '#E0E0E0',
      background: '#F5F5F5',
    },
  },
}));

// Component that throws an error for testing
const ThrowError: React.FC<{ shouldThrow: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <Text>No error</Text>;
};

describe('ErrorBoundary', () => {
  let mockErrorHandler: jest.Mocked<ErrorHandler>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockErrorHandler = {
      handleError: jest.fn().mockResolvedValue(undefined),
    } as any;

    (ErrorHandler.getInstance as jest.Mock).mockReturnValue(mockErrorHandler);

    // Mock __DEV__ for tests
    (global as any).__DEV__ = false;

    // Suppress console.error for these tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    (console.error as jest.Mock).mockRestore();
  });

  it('should render children when no error occurs', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(getByText('No error')).toBeTruthy();
  });

  it('should render error UI when error occurs', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(getByText('Oops! Something went wrong')).toBeTruthy();
    expect(getByText(/An unexpected error occurred/)).toBeTruthy();
    expect(getByText('Try Again')).toBeTruthy();
  });

  it('should call ErrorHandler when error occurs', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(mockErrorHandler.handleError).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'REACT_ERROR_BOUNDARY',
        userMessage:
          'An unexpected error occurred in the app. Please restart the app.',
        technicalMessage: 'Test error',
      }),
      'ErrorBoundary'
    );
  });

  it('should call custom onError handler when provided', () => {
    const onError = jest.fn();

    render(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String),
      })
    );
  });

  it('should reset error state when retry button is pressed', () => {
    const { getByText, queryByText } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Error UI should be visible
    expect(getByText('Oops! Something went wrong')).toBeTruthy();

    // Press retry button
    fireEvent.press(getByText('Try Again'));

    // Error UI should be gone (component will re-render children)
    expect(queryByText('Oops! Something went wrong')).toBeNull();
  });

  it('should render custom fallback when provided', () => {
    const CustomFallback = () => <Text>Custom error message</Text>;

    const { getByText } = render(
      <ErrorBoundary fallback={<CustomFallback />}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(getByText('Custom error message')).toBeTruthy();
  });

  it('should show debug information in development mode', () => {
    // Mock __DEV__ to be true
    const originalDev = (global as any).__DEV__;
    (global as any).__DEV__ = true;

    const { getByText } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(getByText('Debug Information:')).toBeTruthy();
    expect(getByText('Test error')).toBeTruthy();

    // Restore original __DEV__
    (global as any).__DEV__ = originalDev;
  });

  it('should not show debug information in production mode', () => {
    // Mock __DEV__ to be false
    const originalDev = (global as any).__DEV__;
    (global as any).__DEV__ = false;

    const { queryByText } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(queryByText('Debug Information:')).toBeNull();

    // Restore original __DEV__
    (global as any).__DEV__ = originalDev;
  });

  it('should handle multiple error-recovery cycles', () => {
    let shouldThrow = true;

    const { getByText, queryByText, rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={shouldThrow} />
      </ErrorBoundary>
    );

    // First error
    expect(getByText('Oops! Something went wrong')).toBeTruthy();

    // Reset error
    fireEvent.press(getByText('Try Again'));

    // Should attempt to render children again
    shouldThrow = false;
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={shouldThrow} />
      </ErrorBoundary>
    );

    expect(queryByText('Oops! Something went wrong')).toBeNull();
  });

  it('should create error with correct context information', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(mockErrorHandler.handleError).toHaveBeenCalledWith(
      expect.objectContaining({
        context: expect.objectContaining({
          componentStack: expect.any(String),
          errorBoundary: true,
        }),
      }),
      'ErrorBoundary'
    );
  });
});
