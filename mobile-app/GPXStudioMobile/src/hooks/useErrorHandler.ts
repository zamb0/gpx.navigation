/**
 * Custom hook for error handling and loading states
 */

import { useState, useCallback, useRef } from 'react';
import { ErrorHandler } from '../services/error/ErrorHandler';
import { AppError, LoadingState } from '../types/errors';

interface UseErrorHandlerReturn {
  loading: LoadingState;
  setLoading: (loading: LoadingState) => void;
  handleError: (error: Error | AppError, context?: string) => Promise<void>;
  showConfirmation: (
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void,
    destructive?: boolean
  ) => void;
  executeWithErrorHandling: <T>(
    operation: () => Promise<T>,
    loadingMessage?: string,
    context?: string
  ) => Promise<T | null>;
}

export const useErrorHandler = (): UseErrorHandlerReturn => {
  const [loading, setLoadingState] = useState<LoadingState>({
    isLoading: false,
  });

  const errorHandler = useRef(ErrorHandler.getInstance()).current;

  const setLoading = useCallback((newLoading: LoadingState) => {
    setLoadingState(newLoading);
  }, []);

  const handleError = useCallback(
    async (error: Error | AppError, context?: string) => {
      // Hide loading state on error
      setLoadingState({ isLoading: false });

      await errorHandler.handleError(error, context);
    },
    [errorHandler]
  );

  const showConfirmation = useCallback(
    (
      title: string,
      message: string,
      onConfirm: () => void,
      onCancel?: () => void,
      destructive: boolean = false
    ) => {
      errorHandler.showConfirmationDialog(
        title,
        message,
        onConfirm,
        onCancel,
        destructive
      );
    },
    [errorHandler]
  );

  const executeWithErrorHandling = useCallback(
    async <T>(
      operation: () => Promise<T>,
      loadingMessage?: string,
      context?: string
    ): Promise<T | null> => {
      try {
        // Show loading state
        if (loadingMessage) {
          setLoadingState({
            isLoading: true,
            message: loadingMessage,
          });
        }

        const result = await operation();

        // Hide loading state on success
        setLoadingState({ isLoading: false });

        return result;
      } catch (error) {
        // Handle error and hide loading state
        await handleError(error as Error, context);
        return null;
      }
    },
    [handleError]
  );

  return {
    loading,
    setLoading,
    handleError,
    showConfirmation,
    executeWithErrorHandling,
  };
};
