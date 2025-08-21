import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { theme } from '../../constants';
import {
  formatDistance,
  formatElevation,
  formatSpeed,
} from '../../utils/formatters';

interface TrackPopupProps {
  trackPoint: any;
  track: any;
  onClose: () => void;
}

export const TrackPopup: React.FC<TrackPopupProps> = ({
  trackPoint,
  track,
  onClose,
}) => {
  const formatCoordinate = (value: number, type: 'lat' | 'lon') => {
    const direction =
      type === 'lat' ? (value >= 0 ? 'N' : 'S') : value >= 0 ? 'E' : 'W';
    return `${Math.abs(value).toFixed(6)}° ${direction}`;
  };

  const formatDateTime = (timestamp: string | Date) => {
    if (!timestamp) return 'Unknown';

    const date =
      typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return date.toLocaleString();
  };

  return (
    <Modal
      visible={true}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.popupContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Track Point</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              accessibilityLabel="Close popup"
            >
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {/* Track Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Track</Text>
              <Text style={styles.trackName}>
                {track.name || 'Unnamed Track'}
              </Text>
              {track.desc && (
                <Text style={styles.trackDescription}>{track.desc}</Text>
              )}
            </View>

            {/* Coordinates */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Coordinates</Text>
              <View style={styles.coordinateRow}>
                <Text style={styles.label}>Latitude:</Text>
                <Text style={styles.value}>
                  {formatCoordinate(trackPoint.lat, 'lat')}
                </Text>
              </View>
              <View style={styles.coordinateRow}>
                <Text style={styles.label}>Longitude:</Text>
                <Text style={styles.value}>
                  {formatCoordinate(trackPoint.lon, 'lon')}
                </Text>
              </View>
            </View>

            {/* Elevation */}
            {trackPoint.ele !== undefined && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Elevation</Text>
                <Text style={styles.elevationValue}>
                  {formatElevation(trackPoint.ele)}
                </Text>
              </View>
            )}

            {/* Time */}
            {trackPoint.time && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Time</Text>
                <Text style={styles.value}>
                  {formatDateTime(trackPoint.time)}
                </Text>
              </View>
            )}

            {/* Extensions (additional data) */}
            {trackPoint.extensions && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Additional Data</Text>

                {trackPoint.extensions.speed && (
                  <View style={styles.dataRow}>
                    <Text style={styles.label}>Speed:</Text>
                    <Text style={styles.value}>
                      {formatSpeed(trackPoint.extensions.speed)}
                    </Text>
                  </View>
                )}

                {trackPoint.extensions.course && (
                  <View style={styles.dataRow}>
                    <Text style={styles.label}>Course:</Text>
                    <Text style={styles.value}>
                      {trackPoint.extensions.course}°
                    </Text>
                  </View>
                )}

                {trackPoint.extensions.hr && (
                  <View style={styles.dataRow}>
                    <Text style={styles.label}>Heart Rate:</Text>
                    <Text style={styles.value}>
                      {trackPoint.extensions.hr} bpm
                    </Text>
                  </View>
                )}

                {trackPoint.extensions.cad && (
                  <View style={styles.dataRow}>
                    <Text style={styles.label}>Cadence:</Text>
                    <Text style={styles.value}>
                      {trackPoint.extensions.cad} rpm
                    </Text>
                  </View>
                )}

                {trackPoint.extensions.power && (
                  <View style={styles.dataRow}>
                    <Text style={styles.label}>Power:</Text>
                    <Text style={styles.value}>
                      {trackPoint.extensions.power} W
                    </Text>
                  </View>
                )}

                {trackPoint.extensions.temp && (
                  <View style={styles.dataRow}>
                    <Text style={styles.label}>Temperature:</Text>
                    <Text style={styles.value}>
                      {trackPoint.extensions.temp}°C
                    </Text>
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  popupContainer: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
    maxHeight: '70%',
    minHeight: 200,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  content: {
    padding: theme.spacing.lg,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  trackName: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  trackDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  coordinateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  label: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  value: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    fontWeight: theme.fontWeight.medium,
    flex: 1,
    textAlign: 'right',
  },
  elevationValue: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
  },
});
