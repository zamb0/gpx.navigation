import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Text,
  ScrollView,
} from 'react-native';
import { theme } from '../../constants';

interface MapControlsProps {
  onCenterUser: () => void;
  onToggleFollowUser: () => void;
  isFollowingUser: boolean;
  onToggleElevationProfile: () => void;
  showElevationProfile: boolean;
  onMapProviderChange: (provider: string) => void;
  currentMapProvider: string;
  hasUserLocation: boolean;
  enableEditing?: boolean;
  isEditing?: boolean;
  onStartEditing?: () => void;
  onStopEditing?: () => void;
}

const MAP_PROVIDERS = [
  { id: 'standard', name: 'Standard', description: 'Default map view' },
  { id: 'satellite', name: 'Satellite', description: 'Satellite imagery' },
  { id: 'hybrid', name: 'Hybrid', description: 'Satellite with labels' },
  { id: 'terrain', name: 'Terrain', description: 'Topographic view' },
];

export const MapControls: React.FC<MapControlsProps> = ({
  onCenterUser,
  onToggleFollowUser,
  isFollowingUser,
  onToggleElevationProfile,
  showElevationProfile,
  onMapProviderChange,
  currentMapProvider,
  hasUserLocation,
  enableEditing = false,
  isEditing = false,
  onStartEditing,
  onStopEditing,
}) => {
  const [showLayerSelector, setShowLayerSelector] = useState(false);

  const LocationIcon = () => (
    <Text style={styles.controlIcon}>{isFollowingUser ? '🎯' : '📍'}</Text>
  );

  const ElevationIcon = () => (
    <Text style={styles.controlIcon}>{showElevationProfile ? '📊' : '📈'}</Text>
  );

  const LayersIcon = () => <Text style={styles.controlIcon}>🗺️</Text>;

  const EditIcon = () => (
    <Text style={styles.controlIcon}>{isEditing ? '✏️' : '📝'}</Text>
  );

  return (
    <>
      {/* Main Controls */}
      <View style={styles.controlsContainer}>
        {/* Location Controls */}
        <View style={styles.controlGroup}>
          {hasUserLocation && (
            <>
              <TouchableOpacity
                style={[
                  styles.controlButton,
                  isFollowingUser && styles.controlButtonActive,
                ]}
                onPress={onToggleFollowUser}
                accessibilityLabel={
                  isFollowingUser
                    ? 'Stop following location'
                    : 'Follow my location'
                }
              >
                <LocationIcon />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.controlButton}
                onPress={onCenterUser}
                accessibilityLabel="Center on my location"
              >
                <Text style={styles.controlIcon}>🎯</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Map Controls */}
        <View style={styles.controlGroup}>
          <TouchableOpacity
            style={[
              styles.controlButton,
              showElevationProfile && styles.controlButtonActive,
            ]}
            onPress={onToggleElevationProfile}
            accessibilityLabel={
              showElevationProfile
                ? 'Hide elevation profile'
                : 'Show elevation profile'
            }
          >
            <ElevationIcon />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => setShowLayerSelector(true)}
            accessibilityLabel="Change map layer"
          >
            <LayersIcon />
          </TouchableOpacity>

          {/* Editing Control */}
          {enableEditing && (
            <TouchableOpacity
              style={[
                styles.controlButton,
                isEditing && styles.controlButtonActive,
              ]}
              onPress={isEditing ? onStopEditing : onStartEditing}
              accessibilityLabel={isEditing ? 'Stop editing' : 'Start editing'}
            >
              <EditIcon />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Layer Selector Modal */}
      <Modal
        visible={showLayerSelector}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLayerSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Map Layers</Text>

            <ScrollView style={styles.layerList}>
              {MAP_PROVIDERS.map((provider) => (
                <TouchableOpacity
                  key={provider.id}
                  style={[
                    styles.layerItem,
                    currentMapProvider === provider.id &&
                      styles.layerItemActive,
                  ]}
                  onPress={() => {
                    onMapProviderChange(provider.id);
                    setShowLayerSelector(false);
                  }}
                >
                  <View style={styles.layerInfo}>
                    <Text style={styles.layerName}>{provider.name}</Text>
                    <Text style={styles.layerDescription}>
                      {provider.description}
                    </Text>
                  </View>
                  {currentMapProvider === provider.id && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowLayerSelector(false)}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  controlsContainer: {
    position: 'absolute',
    top: 60,
    right: 16,
    flexDirection: 'column',
    gap: 12,
  },
  controlGroup: {
    flexDirection: 'column',
    gap: 8,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.background,
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
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  controlButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  controlIcon: {
    fontSize: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    margin: theme.spacing.lg,
    minWidth: 280,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  layerList: {
    maxHeight: 300,
  },
  layerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.xs,
  },
  layerItemActive: {
    backgroundColor: theme.colors.primaryLight,
  },
  layerInfo: {
    flex: 1,
  },
  layerName: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: 2,
  },
  layerDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  checkmark: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.bold,
  },
  modalCloseButton: {
    marginTop: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  modalCloseText: {
    color: theme.colors.background,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
  },
});
