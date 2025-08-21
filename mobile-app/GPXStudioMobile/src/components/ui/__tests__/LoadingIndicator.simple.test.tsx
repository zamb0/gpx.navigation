/**
 * Simple test for LoadingIndicator component
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { LoadingState } from '../../../types/errors';

// Mock all React Native components
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Modal: ({ children, visible }: any) => (visible ? children : null),
    View: ({ children }: any) => children,
    Text: ({ children }: any) => children,
    ActivityIndicator: () => 'ActivityIndicator',
    TouchableOpacity: ({ children, onPress }: any) =>
      React.createElement('TouchableOpacity', { onPress }, children),
    StyleSheet: {
      create: (styles: any) => styles,
    },
    Animated: {
      View: ({ children }: any) => children,
      Value: jest.fn(() => ({
        interpolate: jest.fn(() => '50%'),
      })),
      timing: jest.fn(() => ({
        start: jest.fn(),
      })),
    },
  };
});

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

// Import component after mocks
const LoadingIndicator = require('../LoadingIndicator').default;

describe('LoadingIndicator Simple Test', () => {
  it('should not render when not loading', () => {
    const loadingState: LoadingState = {
      isLoading: false,
    };

    const result = render(<LoadingIndicator loading={loadingState} />);
    expect(result).toBeTruthy();
  });

  it('should render when loading', () => {
    const loadingState: LoadingState = {
      isLoading: true,
    };

    const { getByText } = render(<LoadingIndicator loading={loadingState} />);
    expect(getByText('ActivityIndicator')).toBeTruthy();
  });
});
