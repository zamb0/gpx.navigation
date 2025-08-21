import React from 'react';
import { Marker } from 'react-native-maps';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../constants';

interface WaypointMarkerProps {
  waypoint: any;
  isSelected?: boolean;
  isEditing?: boolean;
  onPress?: () => void;
}

export const WaypointMarker: React.FC<WaypointMarkerProps> = ({
  waypoint,
  isSelected = false,
  isEditing = false,
  onPress,
}) => {
  // Determine waypoint icon based on type/symbol
  const getWaypointIcon = (waypoint: any) => {
    const symbol = waypoint.sym?.toLowerCase() || '';
    const type = waypoint.type?.toLowerCase() || '';

    // Map common waypoint types to colors and symbols
    if (symbol.includes('flag') || type.includes('flag')) {
      return { color: theme.colors.primary, symbol: '🏁' };
    }
    if (symbol.includes('camp') || type.includes('camp')) {
      return { color: theme.colors.success, symbol: '⛺' };
    }
    if (symbol.includes('water') || type.includes('water')) {
      return { color: theme.colors.info, symbol: '💧' };
    }
    if (symbol.includes('food') || type.includes('restaurant')) {
      return { color: theme.colors.warning, symbol: '🍽️' };
    }
    if (symbol.includes('danger') || type.includes('danger')) {
      return { color: theme.colors.error, symbol: '⚠️' };
    }
    if (symbol.includes('summit') || type.includes('peak')) {
      return { color: theme.colors.secondary, symbol: '⛰️' };
    }
    if (symbol.includes('parking') || type.includes('parking')) {
      return { color: theme.colors.textSecondary, symbol: '🅿️' };
    }

    // Default waypoint
    return { color: theme.colors.primary, symbol: '📍' };
  };

  const waypointIcon = getWaypointIcon(waypoint);

  const CustomMarker = () => (
    <View
      style={[
        styles.markerContainer,
        { borderColor: waypointIcon.color },
        isSelected && styles.selectedMarker,
        isEditing && styles.editingMarker,
      ]}
    >
      <Text style={styles.markerSymbol}>{waypointIcon.symbol}</Text>
      {isSelected && (
        <View style={styles.selectionIndicator}>
          <Text style={styles.selectionText}>✓</Text>
        </View>
      )}
    </View>
  );

  return (
    <Marker
      coordinate={{
        latitude: waypoint.lat,
        longitude: waypoint.lon,
      }}
      title={waypoint.name || 'Waypoint'}
      description={waypoint.desc || waypoint.cmt || ''}
      onPress={onPress}
    >
      <CustomMarker />
    </Marker>
  );
};

const styles = StyleSheet.create({
  markerContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.background,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  selectedMarker: {
    borderColor: theme.colors.primary,
    borderWidth: 3,
    backgroundColor: theme.colors.primaryLight,
  },
  editingMarker: {
    transform: [{ scale: 1.1 }],
  },
  markerSymbol: {
    fontSize: 16,
  },
  selectionIndicator: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionText: {
    fontSize: 10,
    color: theme.colors.background,
    fontWeight: 'bold',
  },
});
