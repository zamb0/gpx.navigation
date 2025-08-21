/**
 * Unit tests for useErrorHandler hook
 */

import { renderHook, act } from '@testing-library/react-native';
import { useErrorHandler } from '../useErrorHandler';
import { ErrorHandler } from '../../services/error/ErrorHandler';
import { FileError, ErrorSeverity } from '../../types/errors';

// Mock ErrorHandler
jest.mock('../../services/error/ErrorHandler');

describe('useErrorHandler', () => {
  let mockErrorHandler: jest.Mocked<ErrorHandler>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockErrorHandler = {
      handleError: jest.fn().mockResolvedValue(undefined),
      showConfirmationDialog: jest.fn(),
    } as any;

    (ErrorHandler.getInstance as jest.Mock).mockReturnValue(mockErrorHandler);
  });

  describe('loading state management', () => {
    it('should initialize with loading false', () => {
      const { result } = renderHook(() => useErrorHandler());

      expect(result.current.loading.isLoading).toBe(false);
    });

    it('should update loading state', () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        result.current.setLoading({
          isLoading: true,
          message: 'Loading...',
          progress: 0.5,
        });
      });

      expect(result.current.loading.isLoading).toBe(true);
      expect(result.current.loading.message).toBe('Loading...');
      expect(result.current.loading.progress).toBe(0.5);
    });
  });

  describe('handleError', () => {
    it('should handle error and hide loading state', async () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = new FileError(
        'TEST_ERROR',
        'Test message',
        'Technical message'
      );

      // Set loading state first
      act(() => {
        result.current.setLoading({
          isLoading: true,
          message: 'Processing...',
        });
      });

      await act(async () => {
        await result.current.handleError(error, 'TestContext');
      });

      expect(mockErrorHandler.handleError).toHaveBeenCalledWith(
        error,
        'TestContext'
      );
      expect(result.current.loading.isLoading).toBe(false);
    });

    it('should handle standard errors', async () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = new Error('Standard error');

      await act(async () => {
        await result.current.handleError(error);
      });

      expect(mockErrorHandler.handleError).toHaveBeenCalledWith(
        error,
        undefined
      );
    });
  });

  describe('showConfirmation', () => {
    it('should show confirmation dialog', () => {
      const { result } = renderHook(() => useErrorHandler());
      const onConfirm = jest.fn();
      const onCancel = jest.fn();

      act(() => {
        result.current.showConfirmation(
          'Test Title',
          'Test Message',
          onConfirm,
          onCancel,
          true
        );
      });

      expect(mockErrorHandler.showConfirmationDialog).toHaveBeenCalledWith(
        'Test Title',
        'Test Message',
        onConfirm,
        onCancel,
        true
      );
    });

    it('should show confirmation dialog with default parameters', () => {
      const { result } = renderHook(() => useErrorHandler());
      const onConfirm = jest.fn();

      act(() => {
        result.current.showConfirmation('Title', 'Message', onConfirm);
      });

      expect(mockErrorHandler.showConfirmationDialog).toHaveBeenCalledWith(
        'Title',
        'Message',
        onConfirm,
        undefined,
        false
      );
    });
  });

  describe('executeWithErrorHandling', () => {
    it('should execute operation successfully and hide loading', async () => {
      const { result } = renderHook(() => useErrorHandler());
      const mockOperation = jest.fn().mockResolvedValue('success');

      let operationResult: string | null = null;

      await act(async () => {
        operationResult = await result.current.executeWithErrorHandling(
          mockOperation,
          'Processing...',
          'TestContext'
        );
      });

      expect(mockOperation).toHaveBeenCalled();
      expect(operationResult).toBe('success');
      expect(result.current.loading.isLoading).toBe(false);
    });

    it('should handle operation errors and return null', async () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = new Error('Operation failed');
      const mockOperation = jest.fn().mockRejectedValue(error);

      let operationResult: string | null = 'initial';

      await act(async () => {
        operationResult = await result.current.executeWithErrorHandling(
          mockOperation,
          'Processing...',
          'TestContext'
        );
      });

      expect(mockOperation).toHaveBeenCalled();
      expect(operationResult).toBeNull();
      expect(mockErrorHandler.handleError).toHaveBeenCalledWith(
        error,
        'TestContext'
      );
      expect(result.current.loading.isLoading).toBe(false);
    });

    it('should show loading state during operation', async () => {
      const { result } = renderHook(() => useErrorHandler());

      // Test that loading state is set before operation starts
      const mockOperation = jest.fn().mockImplementation(() => {
        // Check loading state is true during operation
        expect(result.current.loading.isLoading).toBe(true);
        expect(result.current.loading.message).toBe('Processing...');
        return Promise.resolve('success');
      });

      await act(async () => {
        await result.current.executeWithErrorHandling(
          mockOperation,
          'Processing...',
          'TestContext'
        );
      });

      // Loading should be false after completion
      expect(result.current.loading.isLoading).toBe(false);
    });

    it('should work without loading message', async () => {
      const { result } = renderHook(() => useErrorHandler());
      const mockOperation = jest.fn().mockResolvedValue('success');

      let operationResult: string | null = null;

      await act(async () => {
        operationResult =
          await result.current.executeWithErrorHandling(mockOperation);
      });

      expect(operationResult).toBe('success');
      expect(result.current.loading.isLoading).toBe(false);
    });
  });

  describe('hook stability', () => {
    it('should maintain stable function references', () => {
      const { result, rerender } = renderHook(() => useErrorHandler());

      const firstRender = {
        setLoading: result.current.setLoading,
        handleError: result.current.handleError,
        showConfirmation: result.current.showConfirmation,
        executeWithErrorHandling: result.current.executeWithErrorHandling,
      };

      rerender({});

      expect(result.current.setLoading).toBe(firstRender.setLoading);
      expect(result.current.handleError).toBe(firstRender.handleError);
      expect(result.current.showConfirmation).toBe(
        firstRender.showConfirmation
      );
      expect(result.current.executeWithErrorHandling).toBe(
        firstRender.executeWithErrorHandling
      );
    });
  });
});
