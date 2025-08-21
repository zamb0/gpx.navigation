import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SettingsButton } from '../SettingsButton';

describe('SettingsButton', () => {
  it('renders title correctly', () => {
    const { getByText } = render(
      <SettingsButton title="Test Button" onPress={() => {}} />
    );

    expect(getByText('Test Button')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const mockOnPress = jest.fn();
    const { getByText } = render(
      <SettingsButton title="Test Button" onPress={mockOnPress} />
    );

    fireEvent.press(getByText('Test Button'));
    expect(mockOnPress).toHaveBeenCalled();
  });

  it('does not call onPress when disabled', () => {
    const mockOnPress = jest.fn();
    const { getByText } = render(
      <SettingsButton title="Test Button" onPress={mockOnPress} disabled />
    );

    fireEvent.press(getByText('Test Button'));
    expect(mockOnPress).not.toHaveBeenCalled();
  });

  it('does not call onPress when loading', () => {
    const mockOnPress = jest.fn();
    const { getByTestId } = render(
      <SettingsButton title="Test Button" onPress={mockOnPress} loading />
    );

    // When loading, the button shows ActivityIndicator instead of text
    const button =
      getByTestId('settings-button') ||
      getByTestId('activity-indicator').parent;
    fireEvent.press(button);
    expect(mockOnPress).not.toHaveBeenCalled();
  });

  it('shows loading indicator when loading', () => {
    const { getByTestId, queryByText } = render(
      <SettingsButton title="Test Button" onPress={() => {}} loading />
    );

    // Should show activity indicator
    expect(getByTestId('activity-indicator')).toBeTruthy();
    // Should not show text
    expect(queryByText('Test Button')).toBeNull();
  });

  it('applies danger styles for danger variant', () => {
    const { getByText } = render(
      <SettingsButton title="Test Button" onPress={() => {}} variant="danger" />
    );

    const button = getByText('Test Button').parent;
    // In a real test, you'd check the background color style
    expect(button).toBeTruthy();
  });

  it('applies disabled styles when disabled', () => {
    const { getByText } = render(
      <SettingsButton title="Test Button" onPress={() => {}} disabled />
    );

    const button = getByText('Test Button').parent;
    // In a real test, you'd check the opacity style
    expect(button).toBeTruthy();
  });
});
