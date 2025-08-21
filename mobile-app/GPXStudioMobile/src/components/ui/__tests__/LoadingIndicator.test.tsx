/**
 * Unit tests for LoadingIndicator component
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import LoadingIndicator from '../LoadingIndicator';
import { LoadingState } from '../../../types/errors';

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

describe('LoadingIndicator', () => {
  const defaultLoadingState: LoadingState = {
    isLoading: false,
  };

  it('should not render when not loading', () => {
    const { queryByTestId } = render(
      <LoadingIndicator loading={defaultLoadingState} />
    );

    expect(queryByTestId('loading-modal')).toBeNull();
  });

  it('should render loading spinner when loading', () => {
    const loadingState: LoadingState = {
      isLoading: true,
    };

    const { getByTestId } = render(<LoadingIndicator loading={loadingState} />);

    expect(getByTestId('loading-spinner')).toBeTruthy();
  });

  it('should display loading message when provided', () => {
    const loadingState: LoadingState = {
      isLoading: true,
      message: 'Processing file...',
    };

    const { getByText } = render(<LoadingIndicator loading={loadingState} />);

    expect(getByText('Processing file...')).toBeTruthy();
  });

  it('should display progress bar when progress is provided', () => {
    const loadingState: LoadingState = {
      isLoading: true,
      progress: 0.75,
    };

    const { getByText, getByTestId } = render(
      <LoadingIndicator loading={loadingState} />
    );

    expect(getByText('75%')).toBeTruthy();
    expect(getByTestId('progress-bar')).toBeTruthy();
  });

  it('should show cancel button when cancellable', () => {
    const loadingState: LoadingState = {
      isLoading: true,
      cancellable: true,
    };

    const { getByText } = render(<LoadingIndicator loading={loadingState} />);

    expect(getByText('Cancel')).toBeTruthy();
  });

  it('should call onCancel when cancel button is pressed', () => {
    const onCancel = jest.fn();
    const loadingState: LoadingState = {
      isLoading: true,
      cancellable: true,
    };

    const { getByText } = render(
      <LoadingIndicator loading={loadingState} onCancel={onCancel} />
    );

    fireEvent.press(getByText('Cancel'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('should call loading.onCancel when no onCancel prop provided', () => {
    const onCancel = jest.fn();
    const loadingState: LoadingState = {
      isLoading: true,
      cancellable: true,
      onCancel,
    };

    const { getByText } = render(<LoadingIndicator loading={loadingState} />);

    fireEvent.press(getByText('Cancel'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('should not show cancel button when not cancellable', () => {
    const loadingState: LoadingState = {
      isLoading: true,
      cancellable: false,
    };

    const { queryByText } = render(<LoadingIndicator loading={loadingState} />);

    expect(queryByText('Cancel')).toBeNull();
  });

  it('should handle progress updates', () => {
    const { rerender, getByText } = render(
      <LoadingIndicator loading={{ isLoading: true, progress: 0.25 }} />
    );

    expect(getByText('25%')).toBeTruthy();

    rerender(
      <LoadingIndicator loading={{ isLoading: true, progress: 0.75 }} />
    );

    expect(getByText('75%')).toBeTruthy();
  });

  it('should handle complete loading state with all options', () => {
    const onCancel = jest.fn();
    const loadingState: LoadingState = {
      isLoading: true,
      message: 'Uploading file...',
      progress: 0.6,
      cancellable: true,
    };

    const { getByText, getByTestId } = render(
      <LoadingIndicator loading={loadingState} onCancel={onCancel} />
    );

    expect(getByText('Uploading file...')).toBeTruthy();
    expect(getByText('60%')).toBeTruthy();
    expect(getByText('Cancel')).toBeTruthy();
    expect(getByTestId('progress-bar')).toBeTruthy();
  });
});
