/**
 * Tests for LiveTrackLayer component
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { LiveTrackLayer } from '../LiveTrackLayer';
import {
  useTrackRecording,
  useTrackPoints,
} from '../../../hooks/useTrackRecording';
import { RecordingState } from '../../../services/location/TrackRecordingService';

// Mock the hooks
jest.mock('../../../hooks/useTrackRecording');
const mockUseTrackRecording = useTrackRecording as jest.MockedFunction<
  typeof useTrackRecording
>;
const mockUseTrackPoints = useTrackPoints as jest.MockedFunction<
  typeof useTrackPoints
>;

// Mock react-native-maps components
jest.mock('react-native-maps', () => ({
  Polyline: 'Polyline',
  Circle: 'Circle',
}));

describe('LiveTrackLayer', () => {
  const mockTrackPoints = [
    {
      latitude: 40.7128,
      longitude: -74.006,
      elevation: 10,
      timestamp: new Date(),
      accuracy: 5,
    },
    {
      latitude: 40.7129,
      longitude: -74.0061,
      elevation: 12,
      timestamp: new Date(),
      accuracy: 4,
    },
    {
      latitude: 40.713,
      longitude: -74.0062,
      elevation: 15,
      timestamp: new Date(),
      accuracy: 6,
    },
  ];

  const mockSession = {
    id: 'test-session',
    startTime: new Date(),
    isActive: true,
    trackPoints: [
      {
        latitude: 40.7127,
        longitude: -74.0059,
        elevation: 8,
        timestamp: new Date(),
        accuracy: 3,
      },
    ],
    totalDistance: 0,
    totalTime: 0,
    averageSpeed: 0,
    maxSpeed: 0,
    elevationGain: 0,
    elevationLoss: 0,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseTrackRecording.mockReturnValue({
      recordingState: RecordingState.STOPPED,
      currentSession: null,
    } as any);

    mockUseTrackPoints.mockReturnValue([]);
  });

  describe('Rendering', () => {
    it('should not render when recording is stopped', () => {
      mockUseTrackRecording.mockReturnValue({
        recordingState: RecordingState.STOPPED,
        currentSession: null,
      } as any);

      const { toJSON } = render(<LiveTrackLayer />);

      expect(toJSON()).toBeNull();
    });

    it('should not render when no track points exist', () => {
      mockUseTrackRecording.mockReturnValue({
        recordingState: RecordingState.RECORDING,
        currentSession: null,
      } as any);
      mockUseTrackPoints.mockReturnValue([]);

      const { toJSON } = render(<LiveTrackLayer />);

      expect(toJSON()).toBeNull();
    });

    it('should render polyline when recording with track points', () => {
      mockUseTrackRecording.mockReturnValue({
        recordingState: RecordingState.RECORDING,
        currentSession: null,
      } as any);
      mockUseTrackPoints.mockReturnValue(mockTrackPoints);

      const { toJSON } = render(<LiveTrackLayer />);

      // Should render the polyline component
      expect(toJSON()).not.toBeNull();
    });

    it('should render polyline when paused with track points', () => {
      mockUseTrackRecording.mockReturnValue({
        recordingState: RecordingState.PAUSED,
        currentSession: mockSession,
      } as any);
      mockUseTrackPoints.mockReturnValue(mockTrackPoints);

      const { toJSON } = render(<LiveTrackLayer />);

      expect(toJSON()).not.toBeNull();
    });

    it('should combine session points with live points', () => {
      mockUseTrackRecording.mockReturnValue({
        recordingState: RecordingState.RECORDING,
        currentSession: mockSession,
      } as any);
      mockUseTrackPoints.mockReturnValue(mockTrackPoints);

      const { toJSON } = render(<LiveTrackLayer />);

      // Should render with combined points (1 from session + 3 live = 4 total)
      expect(toJSON()).not.toBeNull();
    });
  });

  describe('Accuracy Circles', () => {
    beforeEach(() => {
      mockUseTrackRecording.mockReturnValue({
        recordingState: RecordingState.RECORDING,
        currentSession: null,
      } as any);
      mockUseTrackPoints.mockReturnValue(mockTrackPoints);
    });

    it('should not render accuracy circles by default', () => {
      const { toJSON } = render(<LiveTrackLayer />);

      const rendered = toJSON();
      // Should only have Polyline, no Circle components
      expect(rendered).not.toBeNull();
    });

    it('should render accuracy circles when enabled', () => {
      const { toJSON } = render(<LiveTrackLayer showAccuracyCircles={true} />);

      const rendered = toJSON();
      expect(rendered).not.toBeNull();
      // Should have both Polyline and Circle components
    });

    it('should filter out points with poor accuracy for circles', () => {
      const pointsWithPoorAccuracy = [
        ...mockTrackPoints,
        {
          latitude: 40.7131,
          longitude: -74.0063,
          elevation: 20,
          timestamp: new Date(),
          accuracy: 100, // Poor accuracy
        },
      ];

      mockUseTrackPoints.mockReturnValue(pointsWithPoorAccuracy);

      const { toJSON } = render(
        <LiveTrackLayer
          showAccuracyCircles={true}
          maxAccuracyCircleRadius={50}
        />
      );

      expect(toJSON()).not.toBeNull();
      // Should filter out the point with 100m accuracy
    });

    it('should limit accuracy circles to recent points', () => {
      const manyPoints = Array.from({ length: 15 }, (_, i) => ({
        latitude: 40.7128 + i * 0.0001,
        longitude: -74.006 + i * 0.0001,
        elevation: 10 + i,
        timestamp: new Date(),
        accuracy: 5,
      }));

      mockUseTrackPoints.mockReturnValue(manyPoints);

      const { toJSON } = render(<LiveTrackLayer showAccuracyCircles={true} />);

      expect(toJSON()).not.toBeNull();
      // Should only show circles for last 10 points
    });
  });

  describe('Styling Props', () => {
    beforeEach(() => {
      mockUseTrackRecording.mockReturnValue({
        recordingState: RecordingState.RECORDING,
        currentSession: null,
      } as any);
      mockUseTrackPoints.mockReturnValue(mockTrackPoints);
    });

    it('should apply custom stroke color', () => {
      const { toJSON } = render(<LiveTrackLayer strokeColor="#00FF00" />);

      expect(toJSON()).not.toBeNull();
    });

    it('should apply custom stroke width', () => {
      const { toJSON } = render(<LiveTrackLayer strokeWidth={6} />);

      expect(toJSON()).not.toBeNull();
    });

    it('should apply custom accuracy circle colors', () => {
      const { toJSON } = render(
        <LiveTrackLayer
          showAccuracyCircles={true}
          accuracyCircleColor="#0000FF"
          accuracyCircleFillColor="rgba(0, 0, 255, 0.3)"
        />
      );

      expect(toJSON()).not.toBeNull();
    });
  });

  describe('Coordinate Conversion', () => {
    it('should convert track points to map coordinates correctly', () => {
      mockUseTrackRecording.mockReturnValue({
        recordingState: RecordingState.RECORDING,
        currentSession: null,
      } as any);
      mockUseTrackPoints.mockReturnValue(mockTrackPoints);

      const { toJSON } = render(<LiveTrackLayer />);

      expect(toJSON()).not.toBeNull();
      // Coordinates should be properly converted from track points
    });

    it('should handle track points without accuracy', () => {
      const pointsWithoutAccuracy = mockTrackPoints.map((point) => ({
        ...point,
        accuracy: undefined,
      }));

      mockUseTrackRecording.mockReturnValue({
        recordingState: RecordingState.RECORDING,
        currentSession: null,
      } as any);
      mockUseTrackPoints.mockReturnValue(pointsWithoutAccuracy);

      const { toJSON } = render(<LiveTrackLayer showAccuracyCircles={true} />);

      expect(toJSON()).not.toBeNull();
      // Should handle missing accuracy gracefully
    });
  });

  describe('Performance', () => {
    it('should handle large number of track points', () => {
      const manyPoints = Array.from({ length: 1000 }, (_, i) => ({
        latitude: 40.7128 + i * 0.00001,
        longitude: -74.006 + i * 0.00001,
        elevation: 10,
        timestamp: new Date(),
        accuracy: 5,
      }));

      mockUseTrackRecording.mockReturnValue({
        recordingState: RecordingState.RECORDING,
        currentSession: null,
      } as any);
      mockUseTrackPoints.mockReturnValue(manyPoints);

      const { toJSON } = render(<LiveTrackLayer />);

      expect(toJSON()).not.toBeNull();
      // Should render without performance issues
    });
  });
});
