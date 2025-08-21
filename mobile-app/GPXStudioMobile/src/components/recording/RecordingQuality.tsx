/**
 * Recording Quality Component
 * Displays GPS signal quality and recording quality indicators
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTrackRecording } from '../../hooks/useTrackRecording';
import { SignalQuality } from '../../types/location';

export interface RecordingQualityProps {
  style?: any;
  showDetails?: boolean;
  compact?: boolean;
}

export const RecordingQuality: React.FC<RecordingQualityProps> = ({
  style,
  showDetails = true,
  compact = false,
}) => {
  const { quality } = useTrackRecording();

  const getSignalQualityColor = (signalQuality: SignalQuality): string => {
    switch (signalQuality) {
      case SignalQuality.EXCELLENT:
        return '#4CAF50';
      case SignalQuality.GOOD:
        return '#8BC34A';
      case SignalQuality.FAIR:
        return '#FF9800';
      case SignalQuality.POOR:
        return '#F44336';
      default:
        return '#757575';
    }
  };

  const getSignalQualityText = (signalQuality: SignalQuality): string => {
    switch (signalQuality) {
      case SignalQuality.EXCELLENT:
        return 'Excellent';
      case SignalQuality.GOOD:
        return 'Good';
      case SignalQuality.FAIR:
        return 'Fair';
      case SignalQuality.POOR:
        return 'Poor';
      default:
        return 'Unknown';
    }
  };

  const getGpsStatusColor = (): string => {
    switch (quality.gpsStatus) {
      case 'found':
        return '#4CAF50';
      case 'searching':
        return '#FF9800';
      case 'lost':
        return '#F44336';
      default:
        return '#757575';
    }
  };

  const getGpsStatusText = (): string => {
    switch (quality.gpsStatus) {
      case 'found':
        return 'GPS Connected';
      case 'searching':
        return 'Searching for GPS';
      case 'lost':
        return 'GPS Signal Lost';
      default:
        return 'GPS Unknown';
    }
  };

  const getSignalBars = (signalQuality: SignalQuality): number => {
    switch (signalQuality) {
      case SignalQuality.EXCELLENT:
        return 4;
      case SignalQuality.GOOD:
        return 3;
      case SignalQuality.FAIR:
        return 2;
      case SignalQuality.POOR:
        return 1;
      default:
        return 0;
    }
  };

  const renderSignalBars = () => {
    const bars = getSignalBars(quality.signalQuality);
    const color = getSignalQualityColor(quality.signalQuality);

    return (
      <View style={styles.signalBars}>
        {[1, 2, 3, 4].map((bar) => (
          <View
            key={bar}
            style={[
              styles.signalBar,
              {
                backgroundColor: bar <= bars ? color : '#E0E0E0',
                height: 4 + bar * 2,
              },
            ]}
          />
        ))}
      </View>
    );
  };

  if (compact) {
    return (
      <View style={[styles.compactContainer, style]}>
        <View style={styles.compactRow}>
          {renderSignalBars()}
          <View
            style={[
              styles.gpsIndicator,
              { backgroundColor: getGpsStatusColor() },
            ]}
          />
        </View>
        {quality.lastAccuracy && (
          <Text style={styles.compactAccuracy}>
            ±{Math.round(quality.lastAccuracy)}m
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {/* GPS Status */}
      <View style={styles.statusRow}>
        <View
          style={[
            styles.gpsIndicator,
            { backgroundColor: getGpsStatusColor() },
          ]}
        />
        <Text style={[styles.statusText, { color: getGpsStatusColor() }]}>
          {getGpsStatusText()}
        </Text>
      </View>

      {/* Signal Quality */}
      <View style={styles.qualityRow}>
        <Text style={styles.qualityLabel}>Signal Quality:</Text>
        <View style={styles.qualityIndicator}>
          {renderSignalBars()}
          <Text
            style={[
              styles.qualityText,
              { color: getSignalQualityColor(quality.signalQuality) },
            ]}
          >
            {getSignalQualityText(quality.signalQuality)}
          </Text>
        </View>
      </View>

      {/* Accuracy Details */}
      {showDetails && (
        <View style={styles.detailsContainer}>
          {quality.lastAccuracy && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Current Accuracy:</Text>
              <Text style={styles.detailValue}>
                ±{Math.round(quality.lastAccuracy)}m
              </Text>
            </View>
          )}

          {quality.averageAccuracy > 0 && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Average Accuracy:</Text>
              <Text style={styles.detailValue}>
                ±{Math.round(quality.averageAccuracy)}m
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Quality Tips */}
      {quality.signalQuality === SignalQuality.POOR && (
        <View style={styles.tipContainer}>
          <Text style={styles.tipText}>
            💡 For better accuracy, move to an open area away from buildings and
            trees
          </Text>
        </View>
      )}

      {quality.gpsStatus === 'searching' && (
        <View style={styles.tipContainer}>
          <Text style={styles.tipText}>
            🔍 Searching for GPS satellites... This may take a few moments
          </Text>
        </View>
      )}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    minWidth: 80,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactAccuracy: {
    fontSize: 10,
    color: '#666666',
    marginLeft: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  gpsIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  qualityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  qualityLabel: {
    fontSize: 14,
    color: '#666666',
  },
  qualityIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qualityText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
  },
  signalBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 12,
  },
  signalBar: {
    width: 3,
    marginHorizontal: 1,
    borderRadius: 1,
  },
  detailsContainer: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 12,
    color: '#666666',
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333333',
  },
  tipContainer: {
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9800',
  },
  tipText: {
    fontSize: 12,
    color: '#E65100',
    lineHeight: 16,
  },
});

export default RecordingQuality;
