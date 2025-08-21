/**
 * Recording Statistics Component
 * Displays live statistics during track recording
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTrackRecording } from '../../hooks/useTrackRecording';
import {
  formatDistance,
  formatDuration,
  formatSpeed,
  formatElevation,
} from '../../utils/formatters';

export interface RecordingStatsProps {
  style?: any;
  showElevation?: boolean;
  showSpeed?: boolean;
  showAccuracy?: boolean;
  compact?: boolean;
}

export const RecordingStats: React.FC<RecordingStatsProps> = ({
  style,
  showElevation = true,
  showSpeed = true,
  showAccuracy = true,
  compact = false,
}) => {
  const { stats, quality, isRecording, isPaused } = useTrackRecording();

  const getStatusColor = () => {
    if (isRecording) return '#4CAF50'; // Green
    if (isPaused) return '#FF9800'; // Orange
    return '#757575'; // Gray
  };

  const getStatusText = () => {
    if (isRecording) return 'Recording';
    if (isPaused) return 'Paused';
    return 'Stopped';
  };

  const getSignalQualityColor = () => {
    switch (quality.signalQuality) {
      case 'excellent':
        return '#4CAF50';
      case 'good':
        return '#8BC34A';
      case 'fair':
        return '#FF9800';
      case 'poor':
        return '#F44336';
      default:
        return '#757575';
    }
  };

  if (compact) {
    return (
      <View style={[styles.compactContainer, style]}>
        <View style={styles.compactRow}>
          <Text style={styles.compactValue}>
            {formatDistance(stats.distance)}
          </Text>
          <Text style={styles.compactValue}>{formatDuration(stats.time)}</Text>
          {showSpeed && (
            <Text style={styles.compactValue}>{formatSpeed(stats.speed)}</Text>
          )}
        </View>
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusIndicator,
              { backgroundColor: getStatusColor() },
            ]}
          />
          <Text style={styles.statusText}>{getStatusText()}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {/* Status Header */}
      <View style={styles.statusHeader}>
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusIndicator,
              { backgroundColor: getStatusColor() },
            ]}
          />
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {getStatusText()}
          </Text>
        </View>
        {showAccuracy && (
          <View style={styles.signalRow}>
            <View
              style={[
                styles.signalIndicator,
                { backgroundColor: getSignalQualityColor() },
              ]}
            />
            <Text style={styles.signalText}>
              GPS: {quality.gpsStatus === 'found' ? 'Connected' : 'Searching'}
            </Text>
          </View>
        )}
      </View>

      {/* Main Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{formatDistance(stats.distance)}</Text>
          <Text style={styles.statLabel}>Distance</Text>
        </View>

        <View style={styles.statItem}>
          <Text style={styles.statValue}>{formatDuration(stats.time)}</Text>
          <Text style={styles.statLabel}>Time</Text>
        </View>

        {showSpeed && (
          <>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatSpeed(stats.speed)}</Text>
              <Text style={styles.statLabel}>Speed</Text>
            </View>

            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {formatSpeed(stats.averageSpeed)}
              </Text>
              <Text style={styles.statLabel}>Avg Speed</Text>
            </View>
          </>
        )}

        {showElevation && (
          <>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {formatElevation(stats.elevation)}
              </Text>
              <Text style={styles.statLabel}>Elevation</Text>
            </View>

            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {formatElevation(stats.elevationGain)}
              </Text>
              <Text style={styles.statLabel}>Gain</Text>
            </View>
          </>
        )}
      </View>

      {/* Additional Stats */}
      <View style={styles.additionalStats}>
        <Text style={styles.additionalText}>Points: {stats.pointCount}</Text>
        {showSpeed && (
          <Text style={styles.additionalText}>
            Max Speed: {formatSpeed(stats.maxSpeed)}
          </Text>
        )}
        {showElevation && (
          <Text style={styles.additionalText}>
            Loss: {formatElevation(stats.elevationLoss)}
          </Text>
        )}
        {showAccuracy && quality.lastAccuracy && (
          <Text style={styles.additionalText}>
            Accuracy: ±{Math.round(quality.lastAccuracy)}m
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  compactContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  signalRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  signalIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  signalText: {
    fontSize: 12,
    color: '#666666',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 16,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  additionalStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  additionalText: {
    fontSize: 11,
    color: '#888888',
    marginBottom: 4,
  },
  compactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  compactValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
});

export default RecordingStats;
