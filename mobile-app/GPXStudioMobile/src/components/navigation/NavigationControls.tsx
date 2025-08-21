import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NavigationService } from '../../services/navigation/NavigationService';
import { NavigationMode, NavigationState } from '../../types/navigation';
import { MobileGPXFile } from '../../types/gpx';
import { theme } from '../../constants/theme';

interface NavigationControlsProps {
  gpxFile: MobileGPXFile | null;
  onNavigationStart?: () => void;
  onNavigationStop?: () => void;
  onSettingsPress?: () => void;
}

export const NavigationControls: React.FC<NavigationControlsProps> = ({
  gpxFile,
  onNavigationStart,
  onNavigationStop,
  onSettingsPress,
}) => {
  const [navigationState, setNavigationState] =
    useState<NavigationState | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [selectedMode, setSelectedMode] = useState<NavigationMode>(
    NavigationMode.FOLLOW_TRACK
  );

  const navigationService = NavigationService.getInstance();

  useEffect(() => {
    // Subscribe to navigation state updates
    const unsubscribe = navigationService.onNavigationUpdate(
      (state: NavigationState) => {
        setNavigationState(state);
      }
    );

    // Get initial state
    setNavigationState(navigationService.getNavigationState());

    return unsubscribe;
  }, []);

  const handleStartNavigation = async () => {
    if (!gpxFile) {
      Alert.alert(
        'No Route Selected',
        'Please select a GPX file to start navigation.'
      );
      return;
    }

    try {
      setIsStarting(true);
      await navigationService.startNavigation(gpxFile, selectedMode);
      onNavigationStart?.();
    } catch (error) {
      Alert.alert(
        'Navigation Error',
        error instanceof Error ? error.message : 'Failed to start navigation'
      );
    } finally {
      setIsStarting(false);
    }
  };

  const handleStopNavigation = async () => {
    Alert.alert(
      'Stop Navigation',
      'Are you sure you want to stop navigation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Stop',
          style: 'destructive',
          onPress: async () => {
            try {
              await navigationService.stopNavigation();
              onNavigationStop?.();
            } catch (error) {
              Alert.alert(
                'Error',
                error instanceof Error
                  ? error.message
                  : 'Failed to stop navigation'
              );
            }
          },
        },
      ]
    );
  };

  const handleModeSelection = () => {
    if (navigationState?.isNavigating) {
      Alert.alert('Navigation Active', 'Stop navigation to change mode.');
      return;
    }

    Alert.alert('Navigation Mode', 'Select navigation mode:', [
      {
        text: 'Follow Track',
        onPress: () => setSelectedMode(NavigationMode.FOLLOW_TRACK),
      },
      {
        text: 'Waypoint Navigation',
        onPress: () => setSelectedMode(NavigationMode.WAYPOINT_NAVIGATION),
      },
      {
        text: 'Free Navigation',
        onPress: () => setSelectedMode(NavigationMode.FREE_NAVIGATION),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const getModeDisplayName = (mode: NavigationMode): string => {
    switch (mode) {
      case NavigationMode.FOLLOW_TRACK:
        return 'Follow Track';
      case NavigationMode.WAYPOINT_NAVIGATION:
        return 'Waypoints';
      case NavigationMode.FREE_NAVIGATION:
        return 'Free Nav';
      default:
        return 'Unknown';
    }
  };

  const getModeIcon = (mode: NavigationMode): any => {
    switch (mode) {
      case NavigationMode.FOLLOW_TRACK:
        return 'trail-sign-outline';
      case NavigationMode.WAYPOINT_NAVIGATION:
        return 'location-outline';
      case NavigationMode.FREE_NAVIGATION:
        return 'compass-outline';
      default:
        return 'navigate-outline';
    }
  };

  const isNavigating = navigationState?.isNavigating || false;
  const hasRoute = gpxFile !== null;

  return (
    <View style={styles.container}>
      {/* Navigation Mode Selector */}
      {!isNavigating && (
        <TouchableOpacity
          style={[styles.modeButton, !hasRoute && styles.disabledButton]}
          onPress={handleModeSelection}
          disabled={!hasRoute}
        >
          <Ionicons
            name={getModeIcon(selectedMode)}
            size={16}
            color={hasRoute ? theme.colors.primary : theme.colors.textSecondary}
          />
          <Text
            style={[
              styles.modeButtonText,
              !hasRoute && styles.disabledButtonText,
            ]}
          >
            {getModeDisplayName(selectedMode)}
          </Text>
          <Ionicons
            name="chevron-down"
            size={16}
            color={hasRoute ? theme.colors.primary : theme.colors.textSecondary}
          />
        </TouchableOpacity>
      )}

      {/* Main Navigation Button */}
      <TouchableOpacity
        style={[
          styles.navigationButton,
          isNavigating ? styles.stopButton : styles.startButton,
          !hasRoute && !isNavigating && styles.disabledButton,
        ]}
        onPress={isNavigating ? handleStopNavigation : handleStartNavigation}
        disabled={!hasRoute && !isNavigating}
      >
        {isStarting ? (
          <ActivityIndicator size="small" color={theme.colors.background} />
        ) : (
          <Ionicons
            name={isNavigating ? 'stop' : 'navigate'}
            size={24}
            color={theme.colors.background}
          />
        )}
        <Text style={styles.navigationButtonText}>
          {isStarting ? 'Starting...' : isNavigating ? 'Stop' : 'Navigate'}
        </Text>
      </TouchableOpacity>

      {/* Settings Button */}
      <TouchableOpacity style={styles.settingsButton} onPress={onSettingsPress}>
        <Ionicons name="settings" size={20} color={theme.colors.text} />
      </TouchableOpacity>

      {/* Navigation Status */}
      {isNavigating && navigationState && (
        <View style={styles.statusContainer}>
          <View style={styles.statusItem}>
            <Ionicons
              name={navigationState.isOffRoute ? 'warning' : 'checkmark-circle'}
              size={16}
              color={
                navigationState.isOffRoute
                  ? theme.colors.warning
                  : theme.colors.success
              }
            />
            <Text style={styles.statusText}>
              {navigationState.isOffRoute ? 'Off Route' : 'On Route'}
            </Text>
          </View>

          {navigationState.nextWaypoint && (
            <View style={styles.statusItem}>
              <Ionicons
                name="location"
                size={16}
                color={theme.colors.primary}
              />
              <Text style={styles.statusText}>
                {Math.round(navigationState.distanceToNextWaypoint)}m to
                waypoint
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Route Info */}
      {hasRoute && !isNavigating && (
        <View style={styles.routeInfo}>
          <Text style={styles.routeName} numberOfLines={1}>
            {gpxFile.metadata.name || gpxFile.metadata.filename}
          </Text>
          <View style={styles.routeStats}>
            <View style={styles.routeStat}>
              <Ionicons
                name="trail-sign"
                size={14}
                color={theme.colors.textSecondary}
              />
              <Text style={styles.routeStatText}>
                {(gpxFile.metadata.totalDistance / 1000).toFixed(1)}km
              </Text>
            </View>
            <View style={styles.routeStat}>
              <Ionicons
                name="location"
                size={14}
                color={theme.colors.textSecondary}
              />
              <Text style={styles.routeStatText}>
                {gpxFile.metadata.waypointCount} waypoints
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryBackground,
    marginBottom: 12,
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.primary,
    marginHorizontal: 8,
  },
  navigationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 12,
  },
  startButton: {
    backgroundColor: theme.colors.success,
  },
  stopButton: {
    backgroundColor: theme.colors.error,
  },
  disabledButton: {
    backgroundColor: theme.colors.border,
    borderColor: theme.colors.border,
  },
  disabledButtonText: {
    color: theme.colors.textSecondary,
  },
  navigationButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.background,
    marginLeft: 8,
  },
  settingsButton: {
    alignSelf: 'flex-end',
    padding: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.background,
  },
  statusContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusText: {
    fontSize: 14,
    color: theme.colors.text,
    marginLeft: 8,
  },
  routeInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  routeName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  routeStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  routeStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeStatText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginLeft: 4,
  },
});
