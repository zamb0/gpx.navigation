/**
 * RecordingSettingsModal Component Tests
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { RecordingSettingsModal } from '../RecordingSettingsModal';
import { DatabaseService } from '../../../services/database/DatabaseService';
import { LocationAccuracy } from '../../../types/location';

// Mock dependencies
jest.mock('../../../services/database/DatabaseService');

const mockDatabaseService = {
  getInstance: jest.fn(),
  getAppSettings: jest.fn(),
  updateAppSettings: jest.fn(),
};

(DatabaseService.getInstance as jest.Mock).mockReturnValue(mockDatabaseService);

describe('RecordingSettingsModal', () => {
  const defaultProps = {
    visible: true,
    onClose: jest.fn(),
    onSettingsChanged: jest.fn(),
  };

  const mockAppSettings = {
    gps: {
      accuracy: LocationAccuracy.HIGH,
      recordingInterval: 1,
      minimumDistance: 1,
      enableHighAccuracy: true,
      autoSave: true,
      pauseOnLowAccuracy: false,
      minimumAccuracy: 10,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockDatabaseService.getAppSettings.mockResolvedValue(mockAppSettings);
    mockDatabaseService.updateAppSettings.mockResolvedValue(undefined);
  });

  it('renders correctly when visible', () => {
    const component = React.createElement(RecordingSettingsModal, defaultProps);
    const { getByText } = render(component);

    expect(getByText('Recording Settings')).toBeTruthy();
  });

  it('does not render when not visible', () => {
    const component = React.createElement(RecordingSettingsModal, {
      ...defaultProps,
      visible: false,
    });
    const { queryByText } = render(component);

    expect(queryByText('Recording Settings')).toBeNull();
  });
});
