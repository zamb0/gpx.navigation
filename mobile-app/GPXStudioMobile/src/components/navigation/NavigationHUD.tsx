import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NavigationService } from '../../services/navigation/NavigationService';
import {
  NavigationState,
  NavigationStats,
  NavigationAlert,
} from '../../types/navigation';
import { theme } from '../../constants/theme';

interface NavigationHUDProps {
  visible: boolean;
  onToggleExpanded?: () => void;
  onStopNavigation?: () => void;
}

export const NavigationHUD: React.FC<NavigationHUDProps> = ({
  visible,
  onToggleExpanded,
  onStopNavigation,
}) => {
  const [navigationState, setNavigationState] =
    useState<NavigationState | null>(null);
  const [navigationStats, setNavigationStats] =
    useState<NavigationStats | null>(null);
  const [alerts, setAlerts] = useState<NavigationAlert[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(-100));

  const navigationService = NavigationService.getInstance();

  useEffect(() => {
    if (visible) {
      // Show HUD with animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Subscribe to navigation updates
      const unsubscribeNavigation = navigationService.onNavigationUpdate(
        (state: NavigationState) => {
          setNavigationState(state);
          setNavigationStats(navigationService.getNavigationStats());
        }
      );

      const unsubscribeAlerts = navigationService.onNavigationAlert(
        (alert: NavigationAlert) => {
          setAlerts(
            navigationService.getAlerts().filter((a) => !a.acknowledged)
          );
        }
      );

      // Initial state
      setNavigationState(navigationService.getNavigationState());
      setNavigationStats(navigationService.getNavigationStats());
      setAlerts(navigationService.getAlerts().filter((a) => !a.acknowledged));

      return () => {
        unsubscribeNavigation();
        unsubscribeAlerts();
      };
    } else {
      // Hide HUD with animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleToggleExpanded = () => {
    setIsExpanded(!isExpanded);
    onToggleExpanded?.();
  };

  const handleStopNavigation = () => {
    onStopNavigation?.();
  };

  const formatSpeed = (speedMs: number): string => {
    const speedKmh = speedMs * 3.6;
    return `${Math.round(speedKmh)} km/h`;
  };

  const formatDistance = (distanceM: number): string => {
    if (distanceM < 1000) {
      return `${Math.round(distanceM)}m`;
    }
    return `${(distanceM / 1000).toFixed(1)}km`;
  };

  const formatTime = (timeMs: number): string => {
    const totalSeconds = Math.floor(timeMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatBearing = (bearing: number): string => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(bearing / 45) % 8;
    return `${Math.round(bearing)}° ${directions[index]}`;
  };

  if (!visible || !navigationState) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {/* Alert Banner */}
      {alerts.length > 0 && (
        <View style={styles.alertBanner}>
          <Ionicons
            name="warning"
            size={16}
            color={theme.colors.warning}
            style={styles.alertIcon}
          />
          <Text style={styles.alertText} numberOfLines={1}>
            {alerts[0].message}
          </Text>
          <TouchableOpacity
            onPress={() => navigationService.acknowledgeAlert(alerts[0].id)}
            style={styles.alertDismiss}
          >
            <Ionicons name="close" size={16} color={theme.colors.warning} />
          </TouchableOpacity>
        </View>
      )}

      {/* Main HUD */}
      <View style={styles.hudContainer}>
        {/* Compact View */}
        <View style={styles.compactView}>
          <View style={styles.primaryStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {formatSpeed(navigationState.currentSpeed)}
              </Text>
              <Text style={styles.statLabel}>Speed</Text>
            </View>

            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {formatDistance(navigationState.remainingDistance)}
              </Text>
              <Text style={styles.statLabel}>Remaining</Text>
            </View>

            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {Math.round(navigationState.progress * 100)}%
              </Text>
              <Text style={styles.statLabel}>Progress</Text>
            </View>
          </View>

          <View style={styles.controls}>
            <TouchableOpacity
              onPress={handleToggleExpanded}
              style={styles.controlButton}
            >
              <Ionicons
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={theme.colors.text}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleStopNavigation}
              style={[styles.controlButton, styles.stopButton]}
            >
              <Ionicons name="stop" size={20} color={theme.colors.background} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Expanded View */}
        {isExpanded && (
          <View style={styles.expandedView}>
            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${navigationState.progress * 100}%` },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {formatDistance(navigationState.distanceAlongTrack)} /{' '}
                {formatDistance(
                  navigationState.currentRoute?.totalDistance || 0
                )}
              </Text>
            </View>

            {/* Secondary Stats */}
            <View style={styles.secondaryStats}>
              <View style={styles.statRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {formatBearing(navigationState.bearing)}
                  </Text>
                  <Text style={styles.statLabel}>Bearing</Text>
                </View>

                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {formatDistance(navigationState.distanceToTrack)}
                  </Text>
                  <Text style={styles.statLabel}>Off Track</Text>
                </View>
              </View>

              {navigationState.nextWaypoint && (
                <View style={styles.statRow}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                      {formatDistance(navigationState.distanceToNextWaypoint)}
                    </Text>
                    <Text style={styles.statLabel}>Next Waypoint</Text>
                  </View>

                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                      {formatBearing(navigationState.bearingToNextWaypoint)}
                    </Text>
                    <Text style={styles.statLabel}>Waypoint Bearing</Text>
                  </View>
                </View>
              )}

              {navigationStats && (
                <View style={styles.statRow}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                      {formatTime(navigationStats.elapsedTime)}
                    </Text>
                    <Text style={styles.statLabel}>Elapsed Time</Text>
                  </View>

                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                      {formatSpeed(navigationStats.averageSpeed / 3.6)}
                    </Text>
                    <Text style={styles.statLabel}>Avg Speed</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Route Info */}
            {navigationState.currentRoute && (
              <View style={styles.routeInfo}>
                <Text style={styles.routeName} numberOfLines={1}>
                  {navigationState.currentRoute.name}
                </Text>
                {navigationState.currentRoute.description && (
                  <Text style={styles.routeDescription} numberOfLines={2}>
                    {navigationState.currentRoute.description}
                  </Text>
                )}
              </View>
            )}

            {/* Status Indicators */}
            <View style={styles.statusIndicators}>
              {navigationState.isOffRoute && (
                <View
                  style={[styles.statusIndicator, styles.offRouteIndicator]}
                >
                  <Ionicons
                    name="warning"
                    size={12}
                    color={theme.colors.warning}
                  />
                  <Text style={styles.statusText}>Off Route</Text>
                </View>
              )}

              <View style={[styles.statusIndicator, styles.gpsIndicator]}>
                <Ionicons
                  name="location"
                  size={12}
                  color={theme.colors.success}
                />
                <Text style={styles.statusText}>GPS Active</Text>
              </View>
            </View>
          </View>
        )}
      </View>
    </Animated.View>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 10,
    right: 10,
    zIndex: 1000,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.warningBackground,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  alertIcon: {
    marginRight: 8,
  },
  alertText: {
    flex: 1,
    color: theme.colors.warning,
    fontSize: 14,
    fontWeight: '500',
  },
  alertDismiss: {
    padding: 4,
  },
  hudContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  compactView: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  primaryStats: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
  },
  controlButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.background,
    marginLeft: 8,
  },
  stopButton: {
    backgroundColor: theme.colors.error,
  },
  expandedView: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  secondaryStats: {
    marginBottom: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  routeInfo: {
    marginBottom: 16,
  },
  routeName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  routeDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  statusIndicators: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  offRouteIndicator: {
    backgroundColor: theme.colors.warningBackground,
  },
  gpsIndicator: {
    backgroundColor: theme.colors.successBackground,
  },
  statusText: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
});
