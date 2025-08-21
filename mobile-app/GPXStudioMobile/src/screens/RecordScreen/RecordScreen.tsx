/**
 * Record Screen Component
 * Main screen for GPS track recording with live map, controls, and statistics
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import MapView, { Region } from 'react-native-maps';
import { useTrackRecording } from '../../hooks/useTrackRecording';
import { RecordingControls } from '../../components/recording/RecordingControls';
import { RecordingStats } from '../../components/recording/RecordingStats';
import { RecordingQuality } from '../../components/recording/RecordingQuality';
import { LiveTrackLayer } from '../../components/map/LiveTrackLayer';
import { UserLocationMarker } from '../../components/map/UserLocationMarker';
import { RecordingSettingsModal } from './RecordingSettingsModal';
import { RecordingHistoryModal } from './RecordingHistoryModal';
import { RecordingExportModal } from './RecordingExportModal';
import { LocationService } from '../../services/location/LocationService';
import { TrackingSession } from '../../types';
import { theme } from '../../constants';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export interface RecordScreenProps {
  autoStart?: boolean;
}

export const RecordScreen: React.FC<RecordScreenProps> = ({ autoStart }) => {
  const {
    recordingState,
    stats,
    quality,
    currentSession,
    isRecording,
    isPaused,
    startRecording,
    error,
  } = useTrackRecording();

  const [mapRegion, setMapRegion] = useState<Region>({
    latitude: 37.7749,
    longitude: -122.4194,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

  const [followUserLocation, setFollowUserLocation] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [completedSession, setCompletedSession] =
    useState<TrackingSession | null>(null);
  const [mapLayoutComplete, setMapLayoutComplete] = useState(false);

  const mapRef = useRef<MapView>(null);
  const locationService = useRef<LocationService>(
    LocationService.getInstance()
  );

  // Initialize user location
  useEffect(() => {
    const initializeLocation = async () => {
      try {
        const location = await locationService.current.getCurrentLocation();
        if (location) {
          const newRegion = {
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          };
          setMapRegion(newRegion);
        }
      } catch (error) {
        console.error('Failed to get initial location:', error);
      }
    };

    initializeLocation();
  }, []);

  // Auto-start recording if requested
  useEffect(() => {
    if (autoStart && !isRecording && !isPaused) {
      const autoStartRecording = async () => {
        try {
          await startRecording();
        } catch (error) {
          console.error('Auto-start recording failed:', error);
          Alert.alert(
            'Auto-Start Failed',
            'Could not automatically start recording. Please start manually.',
            [{ text: 'OK' }]
          );
        }
      };

      // Delay auto-start to ensure components are ready
      const timer = setTimeout(autoStartRecording, 1000);
      return () => clearTimeout(timer);
    }
  }, [autoStart, isRecording, isPaused, startRecording]);

  // Follow user location during recording
  useEffect(() => {
    if (!followUserLocation || !mapRef.current || !mapLayoutComplete) return;

    const unsubscribe = locationService.current.onLocationUpdate((location) => {
      if (isRecording || isPaused) {
        const newRegion = {
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: mapRegion.latitudeDelta,
          longitudeDelta: mapRegion.longitudeDelta,
        };

        mapRef.current?.animateToRegion(newRegion, 1000);
      }
    });

    return unsubscribe;
  }, [followUserLocation, isRecording, isPaused, mapRegion, mapLayoutComplete]);

  const handleRecordingStarted = () => {
    setFollowUserLocation(true);
  };

  const handleRecordingStopped = () => {
    if (currentSession) {
      setCompletedSession(currentSession);
      setShowExport(true);
    }
  };

  const handleMapRegionChange = (region: Region) => {
    setMapRegion(region);
    // Disable auto-follow when user manually moves map
    if (isRecording || isPaused) {
      setFollowUserLocation(false);
    }
  };

  const handleCenterOnLocation = async () => {
    try {
      const location = await locationService.current.getCurrentLocation();
      if (location && mapRef.current) {
        const newRegion = {
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: mapRegion.latitudeDelta,
          longitudeDelta: mapRegion.longitudeDelta,
        };

        mapRef.current.animateToRegion(newRegion, 1000);
        setFollowUserLocation(true);
      }
    } catch (error) {
      Alert.alert('Location Error', 'Could not get current location.');
    }
  };

  const handleMapLayout = () => {
    setMapLayoutComplete(true);
  };

  return (
    <View style={styles.container}>
      {/* Map View */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          region={mapRegion}
          onRegionChangeComplete={handleMapRegionChange}
          onLayout={handleMapLayout}
          showsUserLocation={true}
          showsMyLocationButton={false}
          showsCompass={true}
          showsScale={true}
          mapType="standard"
          pitchEnabled={false}
          rotateEnabled={false}
        >
          {/* Live track layer */}
          <LiveTrackLayer
            strokeColor={theme.colors.primary}
            strokeWidth={4}
            showAccuracyCircles={quality.signalQuality === 'poor'}
          />

          {/* User location marker */}
          {mapRegion && (
            <UserLocationMarker
              location={{
                latitude: mapRegion.latitude,
                longitude: mapRegion.longitude,
                timestamp: Date.now(),
              }}
              isFollowing={followUserLocation}
            />
          )}
        </MapView>

        {/* Map Controls */}
        <View style={styles.mapControls}>
          <RecordingQuality compact style={styles.qualityIndicator} />
        </View>

        {/* Center on Location Button */}
        <View style={styles.locationButton}>
          <RecordingControls
            style={styles.locationControl}
            onRecordingStarted={handleRecordingStarted}
            onRecordingStopped={handleRecordingStopped}
            showCancelButton={false}
          />
        </View>
      </View>

      {/* Stats and Controls Panel */}
      <ScrollView
        style={styles.controlsPanel}
        contentContainerStyle={styles.controlsContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Recording Statistics */}
        <RecordingStats
          style={styles.statsCard}
          showElevation={true}
          showSpeed={true}
          showAccuracy={false}
        />

        {/* Recording Controls */}
        <RecordingControls
          style={styles.controlsCard}
          onRecordingStarted={handleRecordingStarted}
          onRecordingStopped={handleRecordingStopped}
        />

        {/* GPS Quality Details */}
        <RecordingQuality style={styles.qualityCard} showDetails={true} />

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <View style={styles.actionButton}>
            <RecordingControls
              style={styles.settingsButton}
              onRecordingStarted={() => setShowSettings(true)}
              showCancelButton={false}
            />
          </View>

          <View style={styles.actionButton}>
            <RecordingControls
              style={styles.historyButton}
              onRecordingStarted={() => setShowHistory(true)}
              showCancelButton={false}
            />
          </View>
        </View>
      </ScrollView>

      {/* Modals */}
      <RecordingSettingsModal
        visible={showSettings}
        onClose={() => setShowSettings(false)}
      />

      <RecordingHistoryModal
        visible={showHistory}
        onClose={() => setShowHistory(false)}
        onExportSession={(session) => {
          setCompletedSession(session);
          setShowHistory(false);
          setShowExport(true);
        }}
      />

      <RecordingExportModal
        visible={showExport}
        session={completedSession}
        onClose={() => {
          setShowExport(false);
          setCompletedSession(null);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  mapControls: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    right: 16,
    zIndex: 1,
  },
  qualityIndicator: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    padding: 8,
  },
  locationButton: {
    position: 'absolute',
    bottom: 20,
    right: 16,
    zIndex: 1,
  },
  locationControl: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlsPanel: {
    maxHeight: screenHeight * 0.4,
    backgroundColor: theme.colors.background,
  },
  controlsContent: {
    padding: 16,
    paddingBottom: 32,
  },
  statsCard: {
    marginBottom: 16,
  },
  controlsCard: {
    marginBottom: 16,
  },
  qualityCard: {
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  settingsButton: {
    backgroundColor: theme.colors.secondary,
  },
  historyButton: {
    backgroundColor: theme.colors.info,
  },
});

export default RecordScreen;
