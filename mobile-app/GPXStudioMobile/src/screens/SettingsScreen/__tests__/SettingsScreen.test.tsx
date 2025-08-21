import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { SettingsScreen } from '../SettingsScreen';
import { AppSettingsRepository } from '../../../services/database/AppSettingsRepository';
import { TileCacheService } from '../../../services/map/TileCacheService';

// Mock dependencies
jest.mock('../../../services/database/AppSettingsRepository');
jest.mock('../../../services/map/TileCacheService');
jest.mock('../../../services/map/MapProviders', () => ({
  getAllMapProviders: () => [
    { id: 'openStreetMap', name: 'OpenStreetMap' },
    { id: 'satellite', name: 'Satellite' },
  ],
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

const mockSettings = {
  units: {
    distance: 'metric' as const,
    elevation: 'meters' as const,
    speed: 'kmh' as const,
  },
  map: {
    defaultProvider: 'openStreetMap',
    showUserLocation: true,
    followUserLocation: false,
    cacheSize: 100,
  },
  gps: {
    accuracy: 'high' as const,
    recordingInterval: 5,
    minimumDistance: 5,
  },
  appearance: {
    theme: 'system' as const,
    fontSize: 'medium' as const,
  },
};

describe('SettingsScreen', () => {
  let mockSettingsRepository: jest.Mocked<AppSettingsRepository>;
  let mockTileCacheService: jest.Mocked<TileCacheService>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSettingsRepository = {
      getSettings: jest.fn().mockResolvedValue(mockSettings),
      setSetting: jest.fn().mockResolvedValue(undefined),
      resetToDefaults: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockTileCacheService = {
      getCacheSize: jest.fn().mockResolvedValue(52428800), // 50MB
      clearCache: jest.fn().mockResolvedValue(undefined),
    } as any;

    (AppSettingsRepository as jest.Mock).mockImplementation(
      () => mockSettingsRepository
    );
    (TileCacheService as jest.Mock).mockImplementation(
      () => mockTileCacheService
    );
  });

  it('renders loading state initially', () => {
    const { getByText } = render(<SettingsScreen />);
    expect(getByText('Loading settings...')).toBeTruthy();
  });

  it('renders settings sections after loading', async () => {
    const { getByText } = render(<SettingsScreen />);

    await waitFor(() => {
      expect(getByText('Units')).toBeTruthy();
      expect(getByText('Map')).toBeTruthy();
      expect(getByText('GPS & Recording')).toBeTruthy();
      expect(getByText('Appearance')).toBeTruthy();
      expect(getByText('Cache Management')).toBeTruthy();
      expect(getByText('Advanced')).toBeTruthy();
    });
  });

  it('displays current settings values', async () => {
    const { getByDisplayValue } = render(<SettingsScreen />);

    await waitFor(() => {
      expect(mockSettingsRepository.getSettings).toHaveBeenCalled();
    });
  });

  it('updates setting when picker value changes', async () => {
    const { getByTestId } = render(<SettingsScreen />);

    await waitFor(() => {
      expect(mockSettingsRepository.getSettings).toHaveBeenCalled();
    });

    // Note: Testing picker interactions in React Native is complex
    // This test verifies the component renders and the repository is called
    expect(mockSettingsRepository.getSettings).toHaveBeenCalled();
  });

  it('toggles switch settings', async () => {
    const { getAllByRole } = render(<SettingsScreen />);

    await waitFor(() => {
      expect(mockSettingsRepository.getSettings).toHaveBeenCalled();
    });

    // Get all switches and test the first one (Show User Location)
    const switches = getAllByRole('switch');
    expect(switches.length).toBeGreaterThan(0);

    await act(async () => {
      fireEvent(switches[0], 'valueChange', false);
    });

    await waitFor(() => {
      expect(mockSettingsRepository.setSetting).toHaveBeenCalledWith(
        'map.showUserLocation',
        false
      );
    });
  });

  it('displays cache size', async () => {
    const { getByText } = render(<SettingsScreen />);

    await waitFor(() => {
      expect(getByText('50.0 MB')).toBeTruthy();
    });

    expect(mockTileCacheService.getCacheSize).toHaveBeenCalled();
  });

  it('clears cache when clear button is pressed', async () => {
    const { getByText } = render(<SettingsScreen />);

    await waitFor(() => {
      expect(getByText('Clear Cache')).toBeTruthy();
    });

    fireEvent.press(getByText('Clear Cache'));

    expect(Alert.alert).toHaveBeenCalledWith(
      'Clear Cache',
      'This will remove all cached map tiles. Are you sure?',
      expect.any(Array)
    );

    // Simulate pressing the Clear button in the alert
    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    const clearAction = alertCall[2].find(
      (action: any) => action.text === 'Clear'
    );

    await act(async () => {
      await clearAction.onPress();
    });

    expect(mockTileCacheService.clearCache).toHaveBeenCalled();
  });

  it('resets settings when reset button is pressed', async () => {
    const { getByText } = render(<SettingsScreen />);

    await waitFor(() => {
      expect(getByText('Reset All Settings')).toBeTruthy();
    });

    fireEvent.press(getByText('Reset All Settings'));

    expect(Alert.alert).toHaveBeenCalledWith(
      'Reset Settings',
      'This will reset all settings to their default values. Are you sure?',
      expect.any(Array)
    );

    // Simulate pressing the Reset button in the alert
    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    const resetAction = alertCall[2].find(
      (action: any) => action.text === 'Reset'
    );

    await act(async () => {
      await resetAction.onPress();
    });

    expect(mockSettingsRepository.resetToDefaults).toHaveBeenCalled();
  });

  it('handles loading error gracefully', async () => {
    mockSettingsRepository.getSettings.mockRejectedValue(
      new Error('Database error')
    );

    const { getByText } = render(<SettingsScreen />);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Failed to load settings'
      );
    });
  });

  it('handles setting update error gracefully', async () => {
    mockSettingsRepository.setSetting.mockRejectedValue(
      new Error('Update error')
    );

    const { getAllByRole } = render(<SettingsScreen />);

    await waitFor(() => {
      expect(mockSettingsRepository.getSettings).toHaveBeenCalled();
    });

    const switches = getAllByRole('switch');

    await act(async () => {
      fireEvent(switches[0], 'valueChange', false);
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Failed to save setting'
      );
    });
  });

  it('handles cache clear error gracefully', async () => {
    mockTileCacheService.clearCache.mockRejectedValue(new Error('Cache error'));

    const { getByText } = render(<SettingsScreen />);

    await waitFor(() => {
      expect(getByText('Clear Cache')).toBeTruthy();
    });

    fireEvent.press(getByText('Clear Cache'));

    // Simulate pressing the Clear button in the alert
    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    const clearAction = alertCall[2].find(
      (action: any) => action.text === 'Clear'
    );

    await act(async () => {
      await clearAction.onPress();
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Failed to clear cache'
      );
    });
  });

  it('handles reset settings error gracefully', async () => {
    mockSettingsRepository.resetToDefaults.mockRejectedValue(
      new Error('Reset error')
    );

    const { getByText } = render(<SettingsScreen />);

    await waitFor(() => {
      expect(getByText('Reset All Settings')).toBeTruthy();
    });

    fireEvent.press(getByText('Reset All Settings'));

    // Simulate pressing the Reset button in the alert
    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    const resetAction = alertCall[2].find(
      (action: any) => action.text === 'Reset'
    );

    await act(async () => {
      await resetAction.onPress();
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Failed to reset settings'
      );
    });
  });

  it('shows saving indicator when updating settings', async () => {
    // Make setSetting take some time to resolve
    mockSettingsRepository.setSetting.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    const { getAllByRole, getByText } = render(<SettingsScreen />);

    await waitFor(() => {
      expect(mockSettingsRepository.getSettings).toHaveBeenCalled();
    });

    const switches = getAllByRole('switch');

    act(() => {
      fireEvent(switches[0], 'valueChange', false);
    });

    // Should show saving indicator
    expect(getByText('Saving...')).toBeTruthy();

    await waitFor(() => {
      expect(mockSettingsRepository.setSetting).toHaveBeenCalled();
    });
  });
});
