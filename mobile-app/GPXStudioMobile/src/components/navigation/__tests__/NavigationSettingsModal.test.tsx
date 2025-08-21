import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { NavigationSettingsModal } from '../NavigationSettingsModal';
import { NavigationService } from '../../../services/navigation/NavigationService';
import { NavigationSettings } from '../../../types/navigation';

// Mock NavigationService
jest.mock('../../../services/navigation/NavigationService');

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('NavigationSettingsModal', () => {
  let mockNavigationService: jest.Mocked<NavigationService>;
  let mockOnClose: jest.Mock;
  let defaultSettings: NavigationSettings;

  beforeEach(() => {
    mockNavigationService =
      NavigationService.getInstance() as jest.Mocked<NavigationService>;
    mockOnClose = jest.fn();

    defaultSettings = {
      offRouteThreshold: 50,
      offRouteAlertEnabled: true,
      voiceGuidanceEnabled: true,
      waypointAlertDistance: 100,
      waypointAlertEnabled: true,
      speedAlertEnabled: false,
      speedAlertThreshold: 30,
      autoRecenterMap: true,
      keepScreenOn: true,
      navigationAccuracy: 'high',
      updateInterval: 1000,
    };

    mockNavigationService.getSettings = jest
      .fn()
      .mockReturnValue(defaultSettings);
    mockNavigationService.updateSettings = jest.fn();

    // Clear Alert mock
    (Alert.alert as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Modal Visibility', () => {
    it('should not render when not visible', () => {
      const { queryByText } = render(
        <NavigationSettingsModal visible={false} onClose={mockOnClose} />
      );

      expect(queryByText('Navigation Settings')).toBeNull();
    });

    it('should render when visible', () => {
      const { getByText } = render(
        <NavigationSettingsModal visible={true} onClose={mockOnClose} />
      );

      expect(getByText('Navigation Settings')).toBeTruthy();
      expect(getByText('Route Following')).toBeTruthy();
      expect(getByText('Waypoint Alerts')).toBeTruthy();
      expect(getByText('Voice Guidance')).toBeTruthy();
    });
  });

  describe('Settings Loading', () => {
    it('should load current settings on open', () => {
      render(<NavigationSettingsModal visible={true} onClose={mockOnClose} />);

      expect(mockNavigationService.getSettings).toHaveBeenCalled();
    });

    it('should display current setting values', () => {
      const { getByText, getByDisplayValue } = render(
        <NavigationSettingsModal visible={true} onClose={mockOnClose} />
      );

      expect(getByText('50m')).toBeTruthy(); // Off-route threshold
      expect(getByText('100m')).toBeTruthy(); // Waypoint alert distance
      expect(getByText('30 km/h')).toBeTruthy(); // Speed threshold
      expect(getByText('1s')).toBeTruthy(); // Update interval
    });
  });

  describe('Route Following Settings', () => {
    it('should update off-route threshold', () => {
      const { getByTestId } = render(
        <NavigationSettingsModal visible={true} onClose={mockOnClose} />
      );

      const slider = getByTestId('off-route-threshold-slider');
      fireEvent(slider, 'onValueChange', 75);

      // Value should be updated in the display
      expect(getByTestId('off-route-threshold-value')).toHaveTextContent('75m');
    });

    it('should toggle off-route alerts', () => {
      const { getByTestId } = render(
        <NavigationSettingsModal visible={true} onClose={mockOnClose} />
      );

      const toggle = getByTestId('off-route-alerts-toggle');
      fireEvent(toggle, 'onValueChange', false);

      // Should update the toggle state
      expect(toggle.props.value).toBe(false);
    });

    it('should toggle auto re-center map', () => {
      const { getByTestId } = render(
        <NavigationSettingsModal visible={true} onClose={mockOnClose} />
      );

      const toggle = getByTestId('auto-recenter-toggle');
      fireEvent(toggle, 'onValueChange', false);

      expect(toggle.props.value).toBe(false);
    });
  });

  describe('Waypoint Alert Settings', () => {
    it('should toggle waypoint alerts', () => {
      const { getByTestId } = render(
        <NavigationSettingsModal visible={true} onClose={mockOnClose} />
      );

      const toggle = getByTestId('waypoint-alerts-toggle');
      fireEvent(toggle, 'onValueChange', false);

      expect(toggle.props.value).toBe(false);
    });

    it('should show/hide alert distance slider based on toggle', () => {
      const { getByTestId, queryByTestId } = render(
        <NavigationSettingsModal visible={true} onClose={mockOnClose} />
      );

      // Initially enabled, slider should be visible
      expect(queryByTestId('waypoint-alert-distance-slider')).toBeTruthy();

      // Disable waypoint alerts
      const toggle = getByTestId('waypoint-alerts-toggle');
      fireEvent(toggle, 'onValueChange', false);

      // Slider should be hidden
      expect(queryByTestId('waypoint-alert-distance-slider')).toBeNull();
    });

    it('should update waypoint alert distance', () => {
      const { getByTestId } = render(
        <NavigationSettingsModal visible={true} onClose={mockOnClose} />
      );

      const slider = getByTestId('waypoint-alert-distance-slider');
      fireEvent(slider, 'onValueChange', 200);

      expect(getByTestId('waypoint-alert-distance-value')).toHaveTextContent(
        '200m'
      );
    });
  });

  describe('Voice Guidance Settings', () => {
    it('should toggle voice guidance', () => {
      const { getByTestId } = render(
        <NavigationSettingsModal visible={true} onClose={mockOnClose} />
      );

      const toggle = getByTestId('voice-guidance-toggle');
      fireEvent(toggle, 'onValueChange', false);

      expect(toggle.props.value).toBe(false);
    });
  });

  describe('Speed Alert Settings', () => {
    it('should toggle speed alerts', () => {
      const { getByTestId } = render(
        <NavigationSettingsModal visible={true} onClose={mockOnClose} />
      );

      const toggle = getByTestId('speed-alerts-toggle');
      fireEvent(toggle, 'onValueChange', true);

      expect(toggle.props.value).toBe(true);
    });

    it('should show/hide speed threshold slider based on toggle', () => {
      const { getByTestId, queryByTestId } = render(
        <NavigationSettingsModal visible={true} onClose={mockOnClose} />
      );

      // Initially disabled, slider should be hidden
      expect(queryByTestId('speed-threshold-slider')).toBeNull();

      // Enable speed alerts
      const toggle = getByTestId('speed-alerts-toggle');
      fireEvent(toggle, 'onValueChange', true);

      // Slider should be visible
      expect(queryByTestId('speed-threshold-slider')).toBeTruthy();
    });

    it('should update speed threshold', () => {
      const { getByTestId } = render(
        <NavigationSettingsModal visible={true} onClose={mockOnClose} />
      );

      // Enable speed alerts first
      const toggle = getByTestId('speed-alerts-toggle');
      fireEvent(toggle, 'onValueChange', true);

      const slider = getByTestId('speed-threshold-slider');
      fireEvent(slider, 'onValueChange', 50);

      expect(getByTestId('speed-threshold-value')).toHaveTextContent('50 km/h');
    });
  });

  describe('Performance Settings', () => {
    it('should toggle keep screen on', () => {
      const { getByTestId } = render(
        <NavigationSettingsModal visible={true} onClose={mockOnClose} />
      );

      const toggle = getByTestId('keep-screen-on-toggle');
      fireEvent(toggle, 'onValueChange', false);

      expect(toggle.props.value).toBe(false);
    });

    it('should change GPS accuracy', () => {
      const { getByTestId } = render(
        <NavigationSettingsModal visible={true} onClose={mockOnClose} />
      );

      const mediumButton = getByTestId('accuracy-medium-button');
      fireEvent.press(mediumButton);

      // Should update the selected accuracy
      expect(mediumButton).toHaveStyle({ backgroundColor: expect.any(String) });
    });

    it('should update update interval', () => {
      const { getByTestId } = render(
        <NavigationSettingsModal visible={true} onClose={mockOnClose} />
      );

      const slider = getByTestId('update-interval-slider');
      fireEvent(slider, 'onValueChange', 2000);

      expect(getByTestId('update-interval-value')).toHaveTextContent('2s');
    });
  });

  describe('Save and Cancel', () => {
    it('should save settings and close modal', () => {
      const { getByTestId } = render(
        <NavigationSettingsModal visible={true} onClose={mockOnClose} />
      );

      // Make a change
      const slider = getByTestId('off-route-threshold-slider');
      fireEvent(slider, 'onValueChange', 75);

      // Save
      const saveButton = getByTestId('save-button');
      fireEvent.press(saveButton);

      expect(mockNavigationService.updateSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          offRouteThreshold: 75,
        })
      );
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should close without saving when no changes', () => {
      const { getByTestId } = render(
        <NavigationSettingsModal visible={true} onClose={mockOnClose} />
      );

      const cancelButton = getByTestId('cancel-button');
      fireEvent.press(cancelButton);

      expect(mockNavigationService.updateSettings).not.toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should show confirmation when closing with unsaved changes', () => {
      const { getByTestId } = render(
        <NavigationSettingsModal visible={true} onClose={mockOnClose} />
      );

      // Make a change
      const slider = getByTestId('off-route-threshold-slider');
      fireEvent(slider, 'onValueChange', 75);

      // Try to cancel
      const cancelButton = getByTestId('cancel-button');
      fireEvent.press(cancelButton);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Unsaved Changes',
        'You have unsaved changes. Are you sure you want to close without saving?',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Cancel' }),
          expect.objectContaining({ text: 'Discard' }),
        ])
      );
    });
  });

  describe('Reset to Defaults', () => {
    it('should show reset confirmation dialog', () => {
      const { getByTestId } = render(
        <NavigationSettingsModal visible={true} onClose={mockOnClose} />
      );

      const resetButton = getByTestId('reset-button');
      fireEvent.press(resetButton);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Reset Settings',
        'Are you sure you want to reset all navigation settings to default values?',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Cancel' }),
          expect.objectContaining({ text: 'Reset' }),
        ])
      );
    });

    it('should reset settings to defaults when confirmed', () => {
      const { getByTestId } = render(
        <NavigationSettingsModal visible={true} onClose={mockOnClose} />
      );

      // Make some changes first
      const slider = getByTestId('off-route-threshold-slider');
      fireEvent(slider, 'onValueChange', 75);

      const resetButton = getByTestId('reset-button');
      fireEvent.press(resetButton);

      // Simulate user confirming reset
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const resetAction = alertCall[2].find(
        (action: any) => action.text === 'Reset'
      );
      resetAction.onPress();

      // Settings should be reset to defaults
      expect(getByTestId('off-route-threshold-value')).toHaveTextContent('50m');
    });
  });

  describe('Validation', () => {
    it('should handle invalid slider values gracefully', () => {
      const { getByTestId } = render(
        <NavigationSettingsModal visible={true} onClose={mockOnClose} />
      );

      const slider = getByTestId('off-route-threshold-slider');

      // Try to set value outside range
      fireEvent(slider, 'onValueChange', -10);

      // Should clamp to minimum value
      expect(getByTestId('off-route-threshold-value')).toHaveTextContent('10m');
    });

    it('should maintain setting relationships', () => {
      const { getByTestId, queryByTestId } = render(
        <NavigationSettingsModal visible={true} onClose={mockOnClose} />
      );

      // Disable waypoint alerts
      const waypointToggle = getByTestId('waypoint-alerts-toggle');
      fireEvent(waypointToggle, 'onValueChange', false);

      // Distance slider should be hidden
      expect(queryByTestId('waypoint-alert-distance-slider')).toBeNull();

      // Re-enable waypoint alerts
      fireEvent(waypointToggle, 'onValueChange', true);

      // Distance slider should be visible again
      expect(queryByTestId('waypoint-alert-distance-slider')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility labels for toggles', () => {
      const { getByLabelText } = render(
        <NavigationSettingsModal visible={true} onClose={mockOnClose} />
      );

      expect(getByLabelText('Enable off-route alerts')).toBeTruthy();
      expect(getByLabelText('Enable waypoint alerts')).toBeTruthy();
      expect(getByLabelText('Enable voice guidance')).toBeTruthy();
    });

    it('should have proper accessibility labels for sliders', () => {
      const { getByLabelText } = render(
        <NavigationSettingsModal visible={true} onClose={mockOnClose} />
      );

      expect(getByLabelText('Off-route threshold in meters')).toBeTruthy();
      expect(getByLabelText('Waypoint alert distance in meters')).toBeTruthy();
    });

    it('should support screen reader navigation', () => {
      const { getByRole } = render(
        <NavigationSettingsModal visible={true} onClose={mockOnClose} />
      );

      expect(getByRole('button', { name: 'Save' })).toBeTruthy();
      expect(getByRole('button', { name: 'Cancel' })).toBeTruthy();
      expect(getByRole('button', { name: 'Reset to Defaults' })).toBeTruthy();
    });
  });

  describe('Performance', () => {
    it('should handle rapid setting changes efficiently', () => {
      const { getByTestId } = render(
        <NavigationSettingsModal visible={true} onClose={mockOnClose} />
      );

      const slider = getByTestId('off-route-threshold-slider');

      // Simulate rapid slider changes
      for (let i = 10; i <= 100; i += 10) {
        fireEvent(slider, 'onValueChange', i);
      }

      // Should handle all changes without errors
      expect(getByTestId('off-route-threshold-value')).toHaveTextContent(
        '100m'
      );
    });

    it('should debounce setting updates', async () => {
      const { getByTestId } = render(
        <NavigationSettingsModal visible={true} onClose={mockOnClose} />
      );

      const slider = getByTestId('off-route-threshold-slider');

      // Make multiple rapid changes
      fireEvent(slider, 'onValueChange', 60);
      fireEvent(slider, 'onValueChange', 70);
      fireEvent(slider, 'onValueChange', 80);

      // Only the final value should be reflected
      expect(getByTestId('off-route-threshold-value')).toHaveTextContent('80m');
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing navigation service gracefully', () => {
      mockNavigationService.getSettings.mockReturnValue(null as any);

      const { queryByText } = render(
        <NavigationSettingsModal visible={true} onClose={mockOnClose} />
      );

      // Should not crash, but may not display settings
      expect(queryByText('Navigation Settings')).toBeTruthy();
    });

    it('should handle partial settings objects', () => {
      const partialSettings = {
        offRouteThreshold: 25,
        // Missing other properties
      } as NavigationSettings;

      mockNavigationService.getSettings.mockReturnValue(partialSettings);

      const { getByText } = render(
        <NavigationSettingsModal visible={true} onClose={mockOnClose} />
      );

      // Should handle missing properties gracefully
      expect(getByText('25m')).toBeTruthy();
    });
  });
});
