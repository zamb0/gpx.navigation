import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OfflineService } from '../../services/offline/OfflineService';

interface OfflineStatusIndicatorProps {
  offlineService: OfflineService;
  onPress?: () => void;
  style?: any;
}

export const OfflineStatusIndicator: React.FC<OfflineStatusIndicatorProps> = ({
  offlineService,
  onPress,
  style,
}) => {
  const [isOnline, setIsOnline] = useState(true);
  const [queueSize, setQueueSize] = useState(0);
  const [fadeAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    // Initial state
    setIsOnline(offlineService.getConnectionStatus());
    setQueueSize(offlineService.getQueueSize());

    // Listen for connection changes
    const handleConnectionChange = (online: boolean) => {
      setIsOnline(online);

      // Animate status change
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0.5,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    };

    offlineService.addConnectionListener(handleConnectionChange);

    // Update queue size periodically
    const updateQueueSize = () => {
      setQueueSize(offlineService.getQueueSize());
    };

    const interval = setInterval(updateQueueSize, 5000); // Update every 5 seconds

    return () => {
      offlineService.removeConnectionListener(handleConnectionChange);
      clearInterval(interval);
    };
  }, [offlineService, fadeAnim]);

  const getStatusColor = () => {
    if (isOnline) {
      return queueSize > 0 ? '#FF9500' : '#34C759'; // Orange if syncing, green if online
    }
    return '#FF3B30'; // Red if offline
  };

  const getStatusText = () => {
    if (isOnline) {
      return queueSize > 0 ? `Syncing (${queueSize})` : 'Online';
    }
    return queueSize > 0 ? `Offline (${queueSize} queued)` : 'Offline';
  };

  const getStatusIcon = (): any => {
    if (isOnline) {
      return queueSize > 0 ? 'sync-outline' : 'wifi-outline';
    }
    return 'wifi-off-outline';
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }, style]}>
      <TouchableOpacity
        style={[styles.indicator, { backgroundColor: getStatusColor() }]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Ionicons
          name={getStatusIcon()}
          size={12}
          color="#FFFFFF"
          style={styles.icon}
        />
        <Text style={styles.text}>{getStatusText()}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  indicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 16,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  icon: {
    marginRight: 6,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
