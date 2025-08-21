import React from 'react';
import { Marker, Circle } from 'react-native-maps';
import { View, StyleSheet, Animated } from 'react-native';
import { LocationCoordinate } from '../../types/location';
import { theme } from '../../constants';

interface UserLocationMarkerProps {
  location: LocationCoordinate;
  isFollowing?: boolean;
  showAccuracy?: boolean;
}

export const UserLocationMarker: React.FC<UserLocationMarkerProps> = ({
  location,
  isFollowing = false,
  showAccuracy = true,
}) => {
  const pulseAnimation = React.useRef(new Animated.Value(1)).current;

  // Pulse animation for following mode
  React.useEffect(() => {
    if (isFollowing) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnimation, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();

      return () => pulse.stop();
    } else {
      pulseAnimation.setValue(1);
    }
  }, [isFollowing, pulseAnimation]);

  const UserLocationDot = () => (
    <Animated.View
      style={[
        styles.userLocationContainer,
        {
          transform: [{ scale: pulseAnimation }],
        },
      ]}
    >
      <View style={styles.userLocationDot} />
      <View style={styles.userLocationRing} />
    </Animated.View>
  );

  return (
    <>
      {/* Accuracy circle */}
      {showAccuracy && location.accuracy && (
        <Circle
          center={{
            latitude: location.latitude,
            longitude: location.longitude,
          }}
          radius={location.accuracy}
          fillColor={theme.colors.primary + '20'} // 20% opacity
          strokeColor={theme.colors.primary + '40'} // 40% opacity
          strokeWidth={1}
        />
      )}

      {/* User location marker */}
      <Marker
        coordinate={{
          latitude: location.latitude,
          longitude: location.longitude,
        }}
        anchor={{ x: 0.5, y: 0.5 }}
        flat={true}
        rotation={location.heading || 0}
      >
        <UserLocationDot />
      </Marker>
    </>
  );
};

const styles = StyleSheet.create({
  userLocationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
  },
  userLocationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.primary,
    borderWidth: 2,
    borderColor: theme.colors.background,
    position: 'absolute',
  },
  userLocationRing: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    backgroundColor: 'transparent',
  },
});
