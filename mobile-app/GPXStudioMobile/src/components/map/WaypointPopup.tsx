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
import { formatElevation } from '../../utils/formatters';

interface WaypointPopupProps {
  waypoint: any;
  onClose: () => void;
}

export const WaypointPopup: React.FC<WaypointPopupProps> = ({
  waypoint,
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

  const getWaypointTypeInfo = (waypoint: any) => {
    const symbol = waypoint.sym?.toLowerCase() || '';
    const type = waypoint.type?.toLowerCase() || '';

    if (symbol.includes('flag') || type.includes('flag')) {
      return { icon: '🏁', name: 'Flag' };
    }
    if (symbol.includes('camp') || type.includes('camp')) {
      return { icon: '⛺', name: 'Campsite' };
    }
    if (symbol.includes('water') || type.includes('water')) {
      return { icon: '💧', name: 'Water Source' };
    }
    if (symbol.includes('food') || type.includes('restaurant')) {
      return { icon: '🍽️', name: 'Food/Restaurant' };
    }
    if (symbol.includes('danger') || type.includes('danger')) {
      return { icon: '⚠️', name: 'Danger/Warning' };
    }
    if (symbol.includes('summit') || type.includes('peak')) {
      return { icon: '⛰️', name: 'Summit/Peak' };
    }
    if (symbol.includes('parking') || type.includes('parking')) {
      return { icon: '🅿️', name: 'Parking' };
    }

    return { icon: '📍', name: 'Waypoint' };
  };

  const typeInfo = getWaypointTypeInfo(waypoint);

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
            <View style={styles.titleContainer}>
              <Text style={styles.typeIcon}>{typeInfo.icon}</Text>
              <View style={styles.titleText}>
                <Text style={styles.title}>
                  {waypoint.name || 'Unnamed Waypoint'}
                </Text>
                <Text style={styles.subtitle}>{typeInfo.name}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              accessibilityLabel="Close popup"
            >
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {/* Description */}
            {(waypoint.desc || waypoint.cmt) && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Description</Text>
                <Text style={styles.description}>
                  {waypoint.desc || waypoint.cmt}
                </Text>
              </View>
            )}

            {/* Coordinates */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Coordinates</Text>
              <View style={styles.coordinateRow}>
                <Text style={styles.label}>Latitude:</Text>
                <Text style={styles.value}>
                  {formatCoordinate(waypoint.lat, 'lat')}
                </Text>
              </View>
              <View style={styles.coordinateRow}>
                <Text style={styles.label}>Longitude:</Text>
                <Text style={styles.value}>
                  {formatCoordinate(waypoint.lon, 'lon')}
                </Text>
              </View>
            </View>

            {/* Elevation */}
            {waypoint.ele !== undefined && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Elevation</Text>
                <Text style={styles.elevationValue}>
                  {formatElevation(waypoint.ele)}
                </Text>
              </View>
            )}

            {/* Time */}
            {waypoint.time && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Time</Text>
                <Text style={styles.value}>
                  {formatDateTime(waypoint.time)}
                </Text>
              </View>
            )}

            {/* Symbol and Type */}
            {(waypoint.sym || waypoint.type) && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Classification</Text>

                {waypoint.sym && (
                  <View style={styles.dataRow}>
                    <Text style={styles.label}>Symbol:</Text>
                    <Text style={styles.value}>{waypoint.sym}</Text>
                  </View>
                )}

                {waypoint.type && (
                  <View style={styles.dataRow}>
                    <Text style={styles.label}>Type:</Text>
                    <Text style={styles.value}>{waypoint.type}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Links */}
            {waypoint.links && waypoint.links.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Links</Text>
                {waypoint.links.map((link: any, index: number) => (
                  <View key={index} style={styles.linkContainer}>
                    <Text style={styles.linkText}>
                      {link.text || link.href}
                    </Text>
                    {link.type && (
                      <Text style={styles.linkType}>({link.type})</Text>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* Extensions (additional data) */}
            {waypoint.extensions && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Additional Data</Text>

                {Object.entries(waypoint.extensions).map(([key, value]) => (
                  <View key={key} style={styles.dataRow}>
                    <Text style={styles.label}>
                      {key.charAt(0).toUpperCase() + key.slice(1)}:
                    </Text>
                    <Text style={styles.value}>{String(value)}</Text>
                  </View>
                ))}
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
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  typeIcon: {
    fontSize: 24,
    marginRight: theme.spacing.md,
  },
  titleText: {
    flex: 1,
  },
  title: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
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
  description: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
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
  linkContainer: {
    marginBottom: theme.spacing.xs,
  },
  linkText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    textDecorationLine: 'underline',
  },
  linkType: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
});
