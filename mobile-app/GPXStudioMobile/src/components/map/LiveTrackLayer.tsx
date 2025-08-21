/**
 * Live Track Layer Component
 * Displays the currently recording track on the map in real-time
 */

import React, { useEffect, useState, useMemo } from 'react';
import { Polyline, Circle } from 'react-native-maps';
import {
  useTrackRecording,
  useTrackPoints,
} from '../../hooks/useTrackRecording';
import { RecordingState } from '../../services/location/TrackRecordingService';
import { MobileTrackPoint } from '../../types';

export interface LiveTrackLayerProps {
  strokeColor?: string;
  strokeWidth?: number;
  showAccuracyCircles?: boolean;
  accuracyCircleColor?: string;
  accuracyCircleFillColor?: string;
  maxAccuracyCircleRadius?: number;
}

export const LiveTrackLayer: React.FC<LiveTrackLayerProps> = ({
  strokeColor = '#FF6B6B',
  strokeWidth = 4,
  showAccuracyCircles = false,
  accuracyCircleColor = '#FF6B6B',
  accuracyCircleFillColor = 'rgba(255, 107, 107, 0.2)',
  maxAccuracyCircleRadius = 50,
}) => {
  const { recordingState, currentSession } = useTrackRecording();
  const liveTrackPoints = useTrackPoints();
  const [allTrackPoints, setAllTrackPoints] = useState<MobileTrackPoint[]>([]);

  // Combine existing session points with live points
  useEffect(() => {
    const existingPoints = currentSession?.trackPoints || [];
    setAllTrackPoints([...existingPoints, ...liveTrackPoints]);
  }, [currentSession, liveTrackPoints]);

  // Convert track points to map coordinates
  const coordinates = useMemo(() => {
    return allTrackPoints.map((point) => ({
      latitude: point.latitude,
      longitude: point.longitude,
    }));
  }, [allTrackPoints]);

  // Get accuracy circles for recent points
  const accuracyCircles = useMemo(() => {
    if (!showAccuracyCircles) return [];

    // Show accuracy circles for the last 10 points
    const recentPoints = allTrackPoints.slice(-10);

    return recentPoints
      .filter(
        (point) => point.accuracy && point.accuracy <= maxAccuracyCircleRadius
      )
      .map((point, index) => ({
        key: `accuracy-${allTrackPoints.length - 10 + index}`,
        coordinate: {
          latitude: point.latitude,
          longitude: point.longitude,
        },
        radius: point.accuracy!,
      }));
  }, [allTrackPoints, showAccuracyCircles, maxAccuracyCircleRadius]);

  // Don't render if not recording or no points
  if (recordingState === RecordingState.STOPPED || coordinates.length < 2) {
    return null;
  }

  return (
    <>
      {/* Main track polyline */}
      <Polyline
        coordinates={coordinates}
        strokeColor={strokeColor}
        strokeWidth={strokeWidth}
        lineCap="round"
        lineJoin="round"
      />

      {/* Accuracy circles */}
      {accuracyCircles.map((circle) => (
        <Circle
          key={circle.key}
          center={circle.coordinate}
          radius={circle.radius}
          strokeColor={accuracyCircleColor}
          strokeWidth={1}
          fillColor={accuracyCircleFillColor}
        />
      ))}
    </>
  );
};

export default LiveTrackLayer;
