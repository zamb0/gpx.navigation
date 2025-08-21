/**
 * Tests for AccessibleButton component
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { AccessibleButton } from '../../components/accessibility/AccessibleButton';

// Mock the accessibility services
jest.mock('../../services/accessibility/AccessibilityThemeService');
jest.mock('../../services/accessibility/AccessibilityService');

const mockTheme = {
  colors: {
    primary: '#007AFF',
    secondary: '#5856D6',
    background: '#FFFFFF',
    text: '#000000',
    border: '#C6C6C8',
  },
  fonts: {
    small: 12,
    medium: 16,
    large: 20,
    extraLarge: 24,
  },
  spacing: {
    padding: 16,
    margin: 8,
    touchTarget: 44,
  },
};

const mockAccessibilityService = {
  getSettings: () => ({
    hapticFeedback: true,
    touchTargetSize: 'standard',
  }),
};

const mockThemeService = {
  getTheme: () => mockTheme,
  getTouchTargetSize: () => 44,
  getFontSize: (size: string) =>
    mockTheme.fonts[size as keyof typeof mockTheme.fonts] || 16,
};

// Mock the service instances
require('../../services/accessibility/AccessibilityThemeService').AccessibilityThemeService =
  {
    getInstance: () => mockThemeService,
  };

require('../../services/accessibility/AccessibilityService').AccessibilityService =
  {
    getInstance: () => mockAccessibilityService,
  };

describe('AccessibleButton', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    mockOnPress.mockClear();
  });

  it('should render with basic props', () => {
    const { getByText, getByRole } = render(
      <AccessibleButton title="Test Button" onPress={mockOnPress} />
    );

    expect(getByText('Test Button')).toBeTruthy();
    expect(getByRole('button')).toBeTruthy();
  });

  it('should handle press events', () => {
    const { getByRole } = render(
      <AccessibleButton title="Test Button" onPress={mockOnPress} />
    );

    fireEvent.press(getByRole('button'));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('should not handle press when disabled', () => {
    const { getByRole } = render(
      <AccessibleButton
        title="Test Button"
        onPress={mockOnPress}
        disabled={true}
      />
    );

    fireEvent.press(getByRole('button'));
    expect(mockOnPress).not.toHaveBeenCalled();
  });

  it('should have proper accessibility properties', () => {
    const { getByRole } = render(
      <AccessibleButton
        title="Test Button"
        onPress={mockOnPress}
        accessibilityLabel="Custom label"
        accessibilityHint="Custom hint"
      />
    );

    const button = getByRole('button');
    expect(button.props.accessible).toBe(true);
    expect(button.props.accessibilityLabel).toBe('Custom label');
    expect(button.props.accessibilityHint).toBe('Custom hint');
    expect(button.props.accessibilityRole).toBe('button');
  });

  it('should use title as accessibility label when not provided', () => {
    const { getByRole } = render(
      <AccessibleButton title="Test Button" onPress={mockOnPress} />
    );

    const button = getByRole('button');
    expect(button.props.accessibilityLabel).toBe('Test Button');
  });

  it('should have disabled state in accessibility', () => {
    const { getByRole } = render(
      <AccessibleButton
        title="Test Button"
        onPress={mockOnPress}
        disabled={true}
      />
    );

    const button = getByRole('button');
    expect(button.props.accessibilityState).toEqual({ disabled: true });
  });

  it('should render different variants correctly', () => {
    const variants = ['primary', 'secondary', 'outline', 'text'] as const;

    variants.forEach((variant) => {
      const { getByRole } = render(
        <AccessibleButton
          title="Test Button"
          onPress={mockOnPress}
          variant={variant}
        />
      );

      expect(getByRole('button')).toBeTruthy();
    });
  });

  it('should render different sizes correctly', () => {
    const sizes = ['small', 'medium', 'large'] as const;

    sizes.forEach((size) => {
      const { getByRole } = render(
        <AccessibleButton
          title="Test Button"
          onPress={mockOnPress}
          size={size}
        />
      );

      expect(getByRole('button')).toBeTruthy();
    });
  });

  it('should render with icon', () => {
    const MockIcon = () => null;

    const { getByRole } = render(
      <AccessibleButton
        title="Test Button"
        onPress={mockOnPress}
        icon={<MockIcon />}
      />
    );

    expect(getByRole('button')).toBeTruthy();
  });

  it('should apply custom styles', () => {
    const customStyle = { backgroundColor: 'red' };
    const customTextStyle = { color: 'blue' };

    const { getByRole } = render(
      <AccessibleButton
        title="Test Button"
        onPress={mockOnPress}
        style={customStyle}
        textStyle={customTextStyle}
      />
    );

    expect(getByRole('button')).toBeTruthy();
  });
});
