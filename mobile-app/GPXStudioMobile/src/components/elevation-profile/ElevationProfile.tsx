import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  ScrollView,
  PanResponder,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { MobileGPXFile } from '../../types/gpx';
import { theme } from '../../constants';
import {
  formatElevation,
  formatDistance,
  formatSpeed,
  formatSlope,
} from '../../utils/formatters';

export type DataOverlayType =
  | 'elevation'
  | 'slope'
  | 'speed'
  | 'surface'
  | 'highway';

interface ElevationProfileProps {
  gpxFile: MobileGPXFile;
  onPointSelect?: (
    pointIndex: number,
    coordinate: { latitude: number; longitude: number }
  ) => void;
  onClose: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface ElevationData {
  elevations: number[];
  distances: number[];
  slopes: number[];
  speeds: number[];
  coordinates: { latitude: number; longitude: number }[];
  minElevation: number;
  maxElevation: number;
  totalDistance: number;
  elevationGain: number;
  elevationLoss: number;
  averageSlope: number;
  maxSlope: number;
  averageSpeed: number;
  maxSpeed: number;
}

export const ElevationProfile: React.FC<ElevationProfileProps> = ({
  gpxFile,
  onPointSelect,
  onClose,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const screenWidth = Dimensions.get('window').width;
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(
    null
  );
  const [dataOverlay, setDataOverlay] = useState<DataOverlayType>('elevation');
  const [isDragging, setIsDragging] = useState(false);

  // Animation values
  const collapseAnimation = useRef(
    new Animated.Value(isCollapsed ? 0 : 1)
  ).current;
  const markerPosition = useRef(new Animated.Value(0)).current;

  // Extract comprehensive data from GPX file
  const getElevationData = useCallback((): ElevationData | null => {
    const tracks = gpxFile.gpxFile.tracks || [];
    if (tracks.length === 0) return null;

    const segments = tracks[0].segments || [];
    if (segments.length === 0) return null;

    const points = segments[0].points || [];
    if (points.length === 0) return null;

    const elevations: number[] = [];
    const distances: number[] = [];
    const slopes: number[] = [];
    const speeds: number[] = [];
    const coordinates: { latitude: number; longitude: number }[] = [];
    let totalDistance = 0;

    points.forEach((point: any, index: number) => {
      coordinates.push({ latitude: point.lat, longitude: point.lon });

      if (point.ele !== undefined) {
        elevations.push(point.ele);
      } else {
        elevations.push(0); // Default elevation if missing
      }

      if (index > 0) {
        const prevPoint = points[index - 1];
        const distance = calculateDistance(
          prevPoint.lat,
          prevPoint.lon,
          point.lat,
          point.lon
        );
        totalDistance += distance;

        // Calculate slope
        const elevationDiff = elevations[index] - elevations[index - 1];
        const slope = distance > 0 ? (elevationDiff / distance) * 100 : 0;
        slopes.push(slope);

        // Calculate speed if timestamps are available
        if (point.time && prevPoint.time) {
          const timeDiff =
            (new Date(point.time).getTime() -
              new Date(prevPoint.time).getTime()) /
            1000;
          const speed = timeDiff > 0 ? (distance / timeDiff) * 3.6 : 0; // km/h
          speeds.push(speed);
        } else {
          speeds.push(0);
        }
      } else {
        slopes.push(0);
        speeds.push(0);
      }

      distances.push(totalDistance);
    });

    if (elevations.length === 0) return null;

    return {
      elevations,
      distances,
      slopes,
      speeds,
      coordinates,
      minElevation: Math.min(...elevations),
      maxElevation: Math.max(...elevations),
      totalDistance,
      elevationGain: calculateElevationGain(elevations),
      elevationLoss: calculateElevationLoss(elevations),
      averageSlope:
        slopes.length > 0
          ? slopes.reduce((a, b) => a + b, 0) / slopes.length
          : 0,
      maxSlope: slopes.length > 0 ? Math.max(...slopes) : 0,
      averageSpeed:
        speeds.length > 0
          ? speeds.reduce((a, b) => a + b, 0) / speeds.length
          : 0,
      maxSpeed: speeds.length > 0 ? Math.max(...speeds) : 0,
    };
  }, [gpxFile]);

  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ) => {
    const R = 6371000; // Earth's radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const calculateElevationGain = (elevations: number[]) => {
    let gain = 0;
    for (let i = 1; i < elevations.length; i++) {
      const diff = elevations[i] - elevations[i - 1];
      if (diff > 0) gain += diff;
    }
    return gain;
  };

  const calculateElevationLoss = (elevations: number[]) => {
    let loss = 0;
    for (let i = 1; i < elevations.length; i++) {
      const diff = elevations[i] - elevations[i - 1];
      if (diff < 0) loss += Math.abs(diff);
    }
    return loss;
  };

  // Memoize elevation data
  const elevationData = useMemo(() => getElevationData(), [getElevationData]);

  // Handle collapse animation
  React.useEffect(() => {
    Animated.timing(collapseAnimation, {
      toValue: isCollapsed ? 0 : 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isCollapsed, collapseAnimation]);

  // Get current data based on overlay type
  const getCurrentData = useCallback(() => {
    if (!elevationData) return [];

    switch (dataOverlay) {
      case 'elevation':
        return elevationData.elevations;
      case 'slope':
        return elevationData.slopes;
      case 'speed':
        return elevationData.speeds;
      default:
        return elevationData.elevations;
    }
  }, [elevationData, dataOverlay]);

  // Handle chart interaction
  const handleChartPress = useCallback(
    (data: any) => {
      if (!elevationData || !onPointSelect) return;

      const pointIndex = data.index;
      setSelectedPointIndex(pointIndex);

      const coordinate = elevationData.coordinates[pointIndex];
      if (coordinate) {
        onPointSelect(pointIndex, coordinate);
      }

      // Animate marker position
      const chartWidth = screenWidth - 32;
      const markerX =
        (pointIndex / (elevationData.elevations.length - 1)) * chartWidth;

      Animated.timing(markerPosition, {
        toValue: markerX,
        duration: 200,
        useNativeDriver: false,
      }).start();
    },
    [elevationData, onPointSelect, screenWidth, markerPosition]
  );

  // Create pan responder for dragging
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setIsDragging(true);
      },
      onPanResponderMove: (event) => {
        if (!elevationData) return;

        const { locationX } = event.nativeEvent;
        const chartWidth = screenWidth - 64; // Account for padding
        const progress = Math.max(0, Math.min(1, locationX / chartWidth));
        const pointIndex = Math.round(
          progress * (elevationData.elevations.length - 1)
        );

        setSelectedPointIndex(pointIndex);

        if (onPointSelect) {
          const coordinate = elevationData.coordinates[pointIndex];
          if (coordinate) {
            onPointSelect(pointIndex, coordinate);
          }
        }

        markerPosition.setValue(locationX);
      },
      onPanResponderRelease: () => {
        setIsDragging(false);
      },
      onPanResponderTerminate: () => {
        setIsDragging(false);
      },
    })
  ).current;

  // Toggle data overlay
  const toggleDataOverlay = useCallback(() => {
    const overlays: DataOverlayType[] = ['elevation', 'slope', 'speed'];
    const currentIndex = overlays.indexOf(dataOverlay);
    const nextIndex = (currentIndex + 1) % overlays.length;
    setDataOverlay(overlays[nextIndex]);
  }, [dataOverlay]);

  if (!elevationData) {
    return (
      <Animated.View
        style={[
          styles.container,
          {
            height: collapseAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [60, 350],
            }),
          },
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Elevation Profile</Text>
          <View style={styles.headerControls}>
            {onToggleCollapse && (
              <TouchableOpacity
                style={styles.collapseButton}
                onPress={onToggleCollapse}
              >
                <Text style={styles.collapseIcon}>
                  {isCollapsed ? '▲' : '▼'}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
        {!isCollapsed && (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>No elevation data available</Text>
          </View>
        )}
      </Animated.View>
    );
  }

  // Get chart configuration based on data overlay
  const getChartConfig = useCallback(() => {
    let color = theme.colors.primaryRgb;

    switch (dataOverlay) {
      case 'slope':
        color = theme.colors.warning
          .replace('#', '')
          .split('')
          .map((c, i) =>
            i % 2 === 0
              ? parseInt(c + (i + 1 < 6 ? color[i + 1] : '0'), 16)
              : null
          )
          .filter(Boolean)
          .join(', ');
        break;
      case 'speed':
        color = theme.colors.success
          .replace('#', '')
          .split('')
          .map((c, i) =>
            i % 2 === 0
              ? parseInt(c + (i + 1 < 6 ? color[i + 1] : '0'), 16)
              : null
          )
          .filter(Boolean)
          .join(', ');
        break;
      default:
        color = theme.colors.primaryRgb;
    }

    return {
      backgroundColor: theme.colors.background,
      backgroundGradientFrom: theme.colors.background,
      backgroundGradientTo: theme.colors.background,
      decimalPlaces: dataOverlay === 'slope' ? 1 : 0,
      color: (opacity = 1) => `rgba(${color}, ${opacity})`,
      labelColor: (opacity = 1) => `rgba(${theme.colors.textRgb}, ${opacity})`,
      style: {
        borderRadius: 16,
      },
      propsForDots: {
        r: selectedPointIndex !== null ? '4' : '0',
      },
    };
  }, [dataOverlay, selectedPointIndex]);

  const chartData = useMemo(
    () => ({
      labels: [], // Simplified labels
      datasets: [
        {
          data: getCurrentData(),
          color: (opacity = 1) => {
            const config = getChartConfig();
            return config.color(opacity);
          },
          strokeWidth: 2,
        },
      ],
    }),
    [getCurrentData, getChartConfig]
  );

  return (
    <Animated.View
      style={[
        styles.container,
        {
          height: collapseAnimation.interpolate({
            inputRange: [0, 1],
            outputRange: [60, 400],
          }),
        },
      ]}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.overlayButton}
          onPress={toggleDataOverlay}
        >
          <Text style={styles.overlayButtonText}>
            {dataOverlay.charAt(0).toUpperCase() + dataOverlay.slice(1)}
          </Text>
        </TouchableOpacity>
        <Text style={styles.title}>Profile</Text>
        <View style={styles.headerControls}>
          {onToggleCollapse && (
            <TouchableOpacity
              style={styles.collapseButton}
              onPress={onToggleCollapse}
            >
              <Text style={styles.collapseIcon}>{isCollapsed ? '▲' : '▼'}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Animated.View
        style={[
          styles.content,
          {
            opacity: collapseAnimation,
            transform: [
              {
                translateY: collapseAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.statsScrollView}
        >
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Distance</Text>
              <Text style={styles.statValue}>
                {formatDistance(elevationData.totalDistance)}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Gain</Text>
              <Text style={styles.statValue}>
                {formatElevation(elevationData.elevationGain)}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Loss</Text>
              <Text style={styles.statValue}>
                {formatElevation(elevationData.elevationLoss)}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Range</Text>
              <Text style={styles.statValue}>
                {formatElevation(elevationData.minElevation)} -{' '}
                {formatElevation(elevationData.maxElevation)}
              </Text>
            </View>
            {dataOverlay === 'slope' && (
              <>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Avg Slope</Text>
                  <Text style={styles.statValue}>
                    {formatSlope(elevationData.averageSlope)}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Max Slope</Text>
                  <Text style={styles.statValue}>
                    {formatSlope(elevationData.maxSlope)}
                  </Text>
                </View>
              </>
            )}
            {dataOverlay === 'speed' && (
              <>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Avg Speed</Text>
                  <Text style={styles.statValue}>
                    {formatSpeed(elevationData.averageSpeed)}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Max Speed</Text>
                  <Text style={styles.statValue}>
                    {formatSpeed(elevationData.maxSpeed)}
                  </Text>
                </View>
              </>
            )}
          </View>
        </ScrollView>

        <View style={styles.chartContainer}>
          <View {...panResponder.panHandlers}>
            <LineChart
              data={chartData}
              width={screenWidth - 32}
              height={200}
              chartConfig={getChartConfig()}
              bezier={false}
              style={styles.chart}
              onDataPointClick={handleChartPress}
              withDots={selectedPointIndex !== null}
              withInnerLines={false}
              withOuterLines={true}
              withVerticalLines={false}
              withHorizontalLines={true}
            />

            {/* Interactive marker */}
            {selectedPointIndex !== null && (
              <Animated.View
                style={[
                  styles.chartMarker,
                  {
                    left: markerPosition,
                  },
                ]}
              />
            )}
          </View>

          {/* Selected point info */}
          {selectedPointIndex !== null && (
            <View style={styles.selectedPointInfo}>
              <Text style={styles.selectedPointText}>
                Point {selectedPointIndex + 1}:{' '}
                {dataOverlay === 'elevation' &&
                  formatElevation(getCurrentData()[selectedPointIndex])}
                {dataOverlay === 'slope' &&
                  formatSlope(getCurrentData()[selectedPointIndex])}
                {dataOverlay === 'speed' &&
                  formatSpeed(getCurrentData()[selectedPointIndex])}
                {' at '}
                {formatDistance(elevationData.distances[selectedPointIndex])}
              </Text>
            </View>
          )}
        </View>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
    shadowColor: theme.colors.shadow,
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    minHeight: 60,
  },
  title: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    flex: 1,
    textAlign: 'center',
  },
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  overlayButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
  },
  overlayButtonText: {
    color: theme.colors.background,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
  },
  collapseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  collapseIcon: {
    fontSize: 14,
    color: theme.colors.textSecondary,
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
    flex: 1,
  },
  statsScrollView: {
    maxHeight: 80,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  statItem: {
    alignItems: 'center',
    marginRight: theme.spacing.lg,
    minWidth: 60,
  },
  statLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginBottom: 2,
    textAlign: 'center',
  },
  statValue: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    textAlign: 'center',
  },
  chartContainer: {
    position: 'relative',
    paddingHorizontal: theme.spacing.md,
  },
  chart: {
    marginVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  chartMarker: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: theme.colors.error,
    opacity: 0.8,
  },
  selectedPointInfo: {
    backgroundColor: theme.colors.backgroundSecondary,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  selectedPointText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    textAlign: 'center',
  },
  noDataContainer: {
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  noDataText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
});
