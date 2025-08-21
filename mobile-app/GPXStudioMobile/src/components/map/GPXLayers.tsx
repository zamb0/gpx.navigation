import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Polyline, Marker } from 'react-native-maps';
import { MobileGPXFile } from '../../types/gpx';
import { EditingMode } from '../../types/editing';
import { WaypointMarker } from './WaypointMarker';
import { theme } from '../../constants';

interface GPXLayersProps {
  gpxFiles: MobileGPXFile[];
  selectedFile?: MobileGPXFile | null;
  onTrackPointPress?: (
    trackPoint: any,
    track: any,
    trackIndex: number,
    segmentIndex: number,
    pointIndex: number
  ) => void;
  onWaypointPress?: (waypoint: any, waypointIndex: number) => void;
  onMapPress?: (coordinate: { latitude: number; longitude: number }) => void;
  editingMode?: EditingMode;
  isEditing?: boolean;
  selectedWaypoints?: string[];
  selectedTrackPoints?: Array<{
    trackId: string;
    segmentIndex: number;
    pointIndex: number;
  }>;
}

export const GPXLayers: React.FC<GPXLayersProps> = ({
  gpxFiles,
  selectedFile,
  onTrackPointPress,
  onWaypointPress,
  onMapPress,
  editingMode = 'none',
  isEditing = false,
  selectedWaypoints = [],
  selectedTrackPoints = [],
}) => {
  // Generate track polylines
  const trackPolylines = useMemo(() => {
    const polylines: React.ReactElement[] = [];

    gpxFiles.forEach((gpxFile) => {
      const isSelected = selectedFile?.id === gpxFile.id;
      const tracks = gpxFile.gpxFile.tracks || [];

      tracks.forEach((track: any, trackIndex: number) => {
        const segments = track.segments || [];
        const trackId = track.extensions?.id || `track-${trackIndex}`;

        segments.forEach((segment: any, segmentIndex: number) => {
          const points = segment.points || [];

          if (points.length < 2) return; // Need at least 2 points for a line

          const coordinates = points.map((point: any) => ({
            latitude: point.lat,
            longitude: point.lon,
          }));

          const polylineKey = `${gpxFile.id}-track-${trackIndex}-segment-${segmentIndex}`;

          // Get track style from extensions or use defaults
          const trackStyle = track.extensions?.line_style || {};
          const strokeColor = isSelected
            ? theme.colors.primary
            : trackStyle.color || theme.colors.secondary;
          const strokeWidth = isSelected ? 4 : trackStyle.width || 3;

          polylines.push(
            <Polyline
              key={polylineKey}
              coordinates={coordinates}
              strokeColor={strokeColor}
              strokeWidth={strokeWidth}
              lineCap="round"
              lineJoin="round"
              onPress={() => {
                if (onTrackPointPress && points.length > 0) {
                  // Find the closest point to the press (simplified - use first point)
                  onTrackPointPress(
                    points[0],
                    track,
                    trackIndex,
                    segmentIndex,
                    0
                  );
                }
              }}
            />
          );

          // Add individual track point markers in editing mode
          if (isEditing && isSelected && editingMode === 'track') {
            points.forEach((point: any, pointIndex: number) => {
              const isSelectedPoint = selectedTrackPoints.some(
                (selected) =>
                  selected.trackId === trackId &&
                  selected.segmentIndex === segmentIndex &&
                  selected.pointIndex === pointIndex
              );

              polylines.push(
                <Marker
                  key={`${polylineKey}-point-${pointIndex}`}
                  coordinate={{
                    latitude: point.lat,
                    longitude: point.lon,
                  }}
                  onPress={() => {
                    onTrackPointPress?.(
                      point,
                      track,
                      trackIndex,
                      segmentIndex,
                      pointIndex
                    );
                  }}
                >
                  <View
                    style={{
                      width: isSelectedPoint ? 16 : 10,
                      height: isSelectedPoint ? 16 : 10,
                      borderRadius: isSelectedPoint ? 8 : 5,
                      backgroundColor: isSelectedPoint
                        ? theme.colors.primary
                        : theme.colors.background,
                      borderWidth: 2,
                      borderColor: theme.colors.primary,
                    }}
                  />
                </Marker>
              );
            });
          }

          // Add start and end markers for selected track (when not in editing mode)
          if (isSelected && points.length > 0 && !isEditing) {
            const startPoint = points[0];
            const endPoint = points[points.length - 1];

            // Start marker
            polylines.push(
              <Marker
                key={`${polylineKey}-start`}
                coordinate={{
                  latitude: startPoint.lat,
                  longitude: startPoint.lon,
                }}
                title="Start"
                description={`Track: ${track.name || 'Unnamed'}`}
                pinColor={theme.colors.success}
                onPress={() =>
                  onTrackPointPress?.(
                    startPoint,
                    track,
                    trackIndex,
                    segmentIndex,
                    0
                  )
                }
              />
            );

            // End marker (only if different from start)
            if (points.length > 1) {
              polylines.push(
                <Marker
                  key={`${polylineKey}-end`}
                  coordinate={{
                    latitude: endPoint.lat,
                    longitude: endPoint.lon,
                  }}
                  title="End"
                  description={`Track: ${track.name || 'Unnamed'}`}
                  pinColor={theme.colors.error}
                  onPress={() =>
                    onTrackPointPress?.(
                      endPoint,
                      track,
                      trackIndex,
                      segmentIndex,
                      points.length - 1
                    )
                  }
                />
              );
            }
          }
        });
      });
    });

    return polylines;
  }, [
    gpxFiles,
    selectedFile,
    onTrackPointPress,
    isEditing,
    editingMode,
    selectedTrackPoints,
  ]);

  // Generate waypoint markers
  const waypointMarkers = useMemo(() => {
    const markers: React.ReactElement[] = [];

    gpxFiles.forEach((gpxFile) => {
      const waypoints = gpxFile.gpxFile.waypoints || [];

      waypoints.forEach((waypoint: any, index: number) => {
        const markerKey = `${gpxFile.id}-waypoint-${index}`;
        const waypointId = waypoint.extensions?.id || `waypoint-${index}`;
        const isSelected = selectedWaypoints.includes(waypointId);

        markers.push(
          <WaypointMarker
            key={markerKey}
            waypoint={waypoint}
            isSelected={isSelected}
            isEditing={isEditing}
            onPress={() => onWaypointPress?.(waypoint, index)}
          />
        );
      });
    });

    return markers;
  }, [gpxFiles, onWaypointPress, isEditing, selectedWaypoints]);

  return (
    <>
      {trackPolylines}
      {waypointMarkers}
    </>
  );
};
