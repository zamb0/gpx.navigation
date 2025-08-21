/**
 * RecordScreen Component Tests
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { RecordScreen } from '../RecordScreen';
import { useTrackRecording } from '../../../hooks/useTrackRecording';

// Mock dependencies
jest.mock('../../../hooks/useTrackRecording');
jest.mock('../../../services/location/LocationService');

const mockUseTrackRecording = useTrackRecording as jest.MockedFunction<
  typeof useTrackRecording
>;

const mockLocationService = {
  getInstance: jest.fn(),
  getCurrentLocation: jest.fn(),
  onLocationUpdate: jest.fn(),
};

describe('RecordScreen', () => {
  const defaultTrackRecordingState = {
    recordingState: 'stopped' as any,
    stats: {
      distance: 0,
      time: 0,
      speed: 0,
      averageSpeed: 0,
      maxSpeed: 0,
      elevation: 0,
      elevationGain: 0,
      elevationLoss: 0,
      pointCount: 0,
    },
    quality: {
      signalQuality: 'good' as any,
      averageAccuracy: 10,
      gpsStatus: 'found' as any,
    },
    currentSession: null,
    error: null,
    isInitialized: true,
    startRecording: jest.fn(),
    pauseRecording: jest.fn(),
    resumeRecording: jest.fn(),
    stopRecording: jest.fn(),
    cancelRecording: jest.fn(),
    clearError: jest.fn(),
    isRecording: false,
    isPaused: false,
    isStopped: true,
    canStart: true,
    canPause: false,
    canResume: false,
    canStop: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTrackRecording.mockReturnValue(defaultTrackRecordingState);
  });

  it('renders correctly', () => {
    const component = React.createElement(RecordScreen);
    const result = render(component);

    expect(result).toBeDefined();
  });

  it('handles auto-start prop', () => {
    const component = React.createElement(RecordScreen, { autoStart: true });
    const result = render(component);

    expect(result).toBeDefined();
  });
});
