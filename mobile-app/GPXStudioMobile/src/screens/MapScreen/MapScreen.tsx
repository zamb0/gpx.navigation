import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Alert, Dimensions } from 'react-native';
import MapView, { Region, LatLng } from 'react-native-maps';
import { LocationCoordinate } from '../../types/location';
import { MobileGPXFile, GPXFileMetadata } from '../../types/gpx';
import { MapViewState, MapBounds } from '../../types/map';
import { WaypointEditData, TrackEditData } from '../../types/editing';
import { LocationService } from '../../services/location/LocationService';
import { MapService } from '../../services/map/MapService';
import { DatabaseService } from '../../services/database/DatabaseService';
import {
  GPXLayers,
  UserLocationMarker,
  MapControls,
} from '../../components/map';
import { ElevationProfile } from '../../components/elevation-profile/ElevationProfile';
import { TrackPopup, WaypointPopup } from '../../components/map';
import {
  EditingToolbar,
  WaypointEditModal,
  TrackEditModal,
} from '../../components/editing';
import {
  NavigationHUD,
  NavigationControls,
  NavigationSettingsModal,
} from '../../components/navigation';
import { useEditing } from '../../context/EditingContext';
import { NavigationService } from '../../services/navigation/NavigationService';
import { NavigationState } from '../../types/navigation';

interface MapScreenProps {
  initialFileId?: string;
  initialLocation?: { latitude: number; longitude: number };
  initialZoom?: number;
  enableEditing?: boolean;
}

export const MapScreen: React.FC<MapScreenProps> = ({
  initialFileId,
  initialLocation,
  initialZoom = 10,
  enableEditing = false,
}) => {
  const mapRef = useRef<MapView>(null);
  const locationService = LocationService.getInstance();
  const mapService = new MapService();
  const databaseService = DatabaseService.getInstance();

  // Editing context
  const {
    mode: editingMode,
    isEditing,
    selection,
    currentGpxFile,
    startEditing,
    stopEditing,
    addWaypoint,
    editWaypointProperties,
    editTrackProperties,
    setSelection,
  } = useEditing();

  // State management
  const [userLocation, setUserLocation] = useState<LocationCoordinate | null>(
    null
  );
  const [gpxFiles, setGpxFiles] = useState<MobileGPXFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<MobileGPXFile | null>(null);
  const [mapRegion, setMapRegion] = useState<Region>({
    latitude: initialLocation?.latitude || 37.7749,
    longitude: initialLocation?.longitude || -122.4194,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  const [showElevationProfile, setShowElevationProfile] = useState(false);
  const [selectedTrackPoint, setSelectedTrackPoint] = useState<any>(null);
  const [selectedWaypoint, setSelectedWaypoint] = useState<any>(null);
  const [isFollowingUser, setIsFollowingUser] = useState(false);
  const [mapProvider, setMapProvider] = useState('standard');

  // Editing state
  const [showEditingToolbar, setShowEditingToolbar] = useState(false);
  const [waypointEditModal, setWaypointEditModal] = useState<{
    visible: boolean;
    waypoint?: any;
    position?: { latitude: number; longitude: number; elevation?: number };
  }>({ visible: false });
  const [trackEditModal, setTrackEditModal] = useState<{
    visible: boolean;
    track?: any;
    trackId?: string;
  }>({ visible: false });

  // Navigation state
  const [navigationState, setNavigationState] =
    useState<NavigationState | null>(null);
  const [showNavigationHUD, setShowNavigationHUD] = useState(false);
  const [showNavigationSettings, setShowNavigationSettings] = useState(false);
  const navigationService = NavigationService.getInstance();

  // Initialize location tracking
  useEffect(() => {
    const initializeLocation = async () => {
      try {
        const currentLocation = await locationService.getCurrentLocation();
        setUserLocation(currentLocation);

        // If no initial location provided, center on user location
        if (!initialLocation) {
          setMapRegion({
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          });
        }

        // Start location tracking
        await locationService.startTracking({
          accuracy: 'high' as any,
          timeInterval: 1000,
          distanceInterval: 1,
        });

        // Subscribe to location updates
        const unsubscribe = locationService.onLocationUpdate((location) => {
          setUserLocation(location);

          // Follow user if enabled
          if (isFollowingUser && mapRef.current) {
            mapRef.current.animateToRegion({
              latitude: location.latitude,
              longitude: location.longitude,
              latitudeDelta: mapRegion.latitudeDelta,
              longitudeDelta: mapRegion.longitudeDelta,
            });
          }
        });

        return unsubscribe;
      } catch (error) {
        console.error('Failed to initialize location:', error);
        Alert.alert(
          'Location Error',
          'Unable to access your location. Please check your location settings.'
        );
      }
    };

    initializeLocation();

    return () => {
      locationService.stopTracking();
    };
  }, [isFollowingUser, mapRegion.latitudeDelta, mapRegion.longitudeDelta]);

  // Load GPX files
  useEffect(() => {
    const loadGPXFiles = async () => {
      try {
        // Initialize database service if needed
        if (!databaseService.isInitialized()) {
          await databaseService.initialize();
        }

        const metadata = await databaseService.gpxFiles.getAll();
        // For now, we'll create mock MobileGPXFile objects
        // In a real implementation, we'd load the actual GPX files from storage
        const files: MobileGPXFile[] = metadata.map((meta) => ({
          id: meta.id,
          metadata: meta,
          gpxFile: {
            tracks: [],
            waypoints: [],
          }, // This would be loaded from file system
        }));

        setGpxFiles(files);

        // If initial file ID provided, select it
        if (initialFileId) {
          const file = files.find((f) => f.id === initialFileId);
          if (file) {
            setSelectedFile(file);
            fitToGPXFile(file);
          }
        }
      } catch (error) {
        console.error('Failed to load GPX files:', error);
      }
    };

    loadGPXFiles();
  }, [initialFileId]);

  // Initialize navigation
  useEffect(() => {
    // Subscribe to navigation state updates
    const unsubscribeNavigation = navigationService.onNavigationUpdate(
      (state: NavigationState) => {
        setNavigationState(state);
        setShowNavigationHUD(state.isNavigating);

        // Auto-recenter map if navigation is active and setting is enabled
        if (
          state.isNavigating &&
          state.currentPosition &&
          navigationService.getSettings().autoRecenterMap &&
          mapRef.current
        ) {
          mapRef.current.animateToRegion({
            latitude: state.currentPosition.latitude,
            longitude: state.currentPosition.longitude,
            latitudeDelta: mapRegion.latitudeDelta,
            longitudeDelta: mapRegion.longitudeDelta,
          });
        }
      }
    );

    // Get initial navigation state
    setNavigationState(navigationService.getNavigationState());

    return () => {
      unsubscribeNavigation();
    };
  }, [mapRegion.latitudeDelta, mapRegion.longitudeDelta]);

  // Fit map to GPX file bounds
  const fitToGPXFile = useCallback(
    (file: MobileGPXFile) => {
      if (!mapRef.current) return;

      const bounds = file.metadata.bounds;
      const region = mapService.calculateOptimalViewState(
        bounds,
        Dimensions.get('window')
      );

      mapRef.current.animateToRegion({
        latitude: region.center.latitude,
        longitude: region.center.longitude,
        latitudeDelta: Math.abs(bounds.north - bounds.south) * 1.2,
        longitudeDelta: Math.abs(bounds.east - bounds.west) * 1.2,
      });
    },
    [mapService]
  );

  // Handle map region change
  const handleRegionChange = useCallback((region: Region) => {
    setMapRegion(region);
  }, []);

  // Handle track point selection
  const handleTrackPointPress = useCallback(
    (
      trackPoint: any,
      track: any,
      trackIndex: number,
      segmentIndex: number,
      pointIndex: number
    ) => {
      if (isEditing && editingMode === 'track') {
        // Handle track point selection in editing mode
        const trackId = track.extensions?.id || `track-${trackIndex}`;

        // Toggle selection
        const isSelected = selection.selectedTrackPoints.some(
          (selected: any) =>
            selected.trackId === trackId &&
            selected.segmentIndex === segmentIndex &&
            selected.pointIndex === pointIndex
        );

        if (isSelected) {
          // Remove from selection
          setSelection({
            selectedTrackPoints: selection.selectedTrackPoints.filter(
              (selected: any) =>
                !(
                  selected.trackId === trackId &&
                  selected.segmentIndex === segmentIndex &&
                  selected.pointIndex === pointIndex
                )
            ),
          });
        } else {
          // Add to selection
          setSelection({
            selectedTrackPoints: [
              ...selection.selectedTrackPoints,
              { trackId, segmentIndex, pointIndex },
            ],
          });
        }
      } else {
        setSelectedTrackPoint({ trackPoint, track });
        setSelectedWaypoint(null);
      }
    },
    [isEditing, editingMode, selection, setSelection]
  );

  // Handle waypoint selection
  const handleWaypointPress = useCallback(
    (waypoint: any, waypointIndex: number) => {
      if (isEditing && editingMode === 'waypoint') {
        // Handle waypoint selection in editing mode
        const waypointId =
          waypoint.extensions?.id || `waypoint-${waypointIndex}`;

        // Toggle selection
        const isSelected = selection.selectedWaypoints.includes(waypointId);

        if (isSelected) {
          // Remove from selection
          setSelection({
            selectedWaypoints: selection.selectedWaypoints.filter(
              (id) => id !== waypointId
            ),
          });
        } else {
          // Add to selection
          setSelection({
            selectedWaypoints: [...selection.selectedWaypoints, waypointId],
          });
        }
      } else {
        setSelectedWaypoint(waypoint);
        setSelectedTrackPoint(null);
      }
    },
    [isEditing, editingMode, selection, setSelection]
  );

  // Handle map tap (close popups or add waypoint in editing mode)
  const handleMapPress = useCallback(
    (event: any) => {
      const coordinate = event.nativeEvent.coordinate;

      if (isEditing && editingMode === 'waypoint') {
        // Add waypoint at tapped location
        setWaypointEditModal({
          visible: true,
          position: {
            latitude: coordinate.latitude,
            longitude: coordinate.longitude,
          },
        });
      } else {
        // Close popups
        setSelectedTrackPoint(null);
        setSelectedWaypoint(null);
      }
    },
    [isEditing, editingMode]
  );

  // Center on user location
  const centerOnUser = useCallback(() => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  }, [userLocation]);

  // Toggle follow user mode
  const toggleFollowUser = useCallback(() => {
    setIsFollowingUser(!isFollowingUser);
  }, [isFollowingUser]);

  // Navigation event handlers
  const handleNavigationStart = useCallback(() => {
    setShowNavigationHUD(true);
    // Disable editing mode when navigation starts
    if (isEditing) {
      stopEditing();
      setShowEditingToolbar(false);
    }
  }, [isEditing, stopEditing]);

  const handleNavigationStop = useCallback(() => {
    setShowNavigationHUD(false);
  }, []);

  const handleNavigationSettingsPress = useCallback(() => {
    setShowNavigationSettings(true);
  }, []);

  const handleNavigationSettingsClose = useCallback(() => {
    setShowNavigationSettings(false);
  }, []);

  // Editing handlers
  const handleStartEditing = useCallback(() => {
    if (selectedFile) {
      startEditing(selectedFile);
      setShowEditingToolbar(true);
    }
  }, [selectedFile, startEditing]);

  const handleStopEditing = useCallback(() => {
    stopEditing();
    setShowEditingToolbar(false);
  }, [stopEditing]);

  const handleSaveWaypoint = useCallback(
    async (waypointData: Partial<WaypointEditData>) => {
      try {
        if (waypointEditModal.waypoint) {
          // Edit existing waypoint
          await editWaypointProperties(
            waypointEditModal.waypoint.id,
            waypointData
          );
        } else if (waypointEditModal.position) {
          // Add new waypoint
          await addWaypoint({
            ...waypointData,
            latitude: waypointEditModal.position.latitude,
            longitude: waypointEditModal.position.longitude,
          });
        }
        setWaypointEditModal({ visible: false });
      } catch (error) {
        Alert.alert(
          'Error',
          error instanceof Error ? error.message : 'Failed to save waypoint'
        );
      }
    },
    [waypointEditModal, addWaypoint, editWaypointProperties]
  );

  // Handle elevation profile point selection
  const handleElevationPointSelect = useCallback(
    (
      pointIndex: number,
      coordinate: { latitude: number; longitude: number }
    ) => {
      if (!selectedFile) return;

      // Animate map to the selected point
      if (mapRef.current) {
        mapRef.current.animateToRegion({
          latitude: coordinate.latitude,
          longitude: coordinate.longitude,
          latitudeDelta: mapRegion.latitudeDelta,
          longitudeDelta: mapRegion.longitudeDelta,
        });
      }

      // Find the track point at the given index for popup
      const trackPoints =
        selectedFile.gpxFile.tracks?.[0]?.segments?.[0]?.points;
      if (trackPoints && trackPoints[pointIndex]) {
        const point = trackPoints[pointIndex];
        setSelectedTrackPoint({
          trackPoint: point,
          track: selectedFile.gpxFile.tracks[0],
        });
      }
    },
    [selectedFile, mapRegion]
  );

  const handleSaveTrackProperties = useCallback(
    async (trackData: Partial<TrackEditData>) => {
      if (trackEditModal.trackId) {
        try {
          await editTrackProperties(trackEditModal.trackId, trackData);
          setTrackEditModal({ visible: false });
        } catch (error) {
          Alert.alert(
            'Error',
            error instanceof Error
              ? error.message
              : 'Failed to save track properties'
          );
        }
      }
    },
    [trackEditModal.trackId, editTrackProperties]
  );

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        region={mapRegion}
        onRegionChangeComplete={handleRegionChange}
        onPress={handleMapPress}
        showsUserLocation={false} // We'll use our custom marker
        showsMyLocationButton={false}
        showsCompass={true}
        showsScale={true}
        mapType={mapProvider as any}
      >
        {/* GPX Layers */}
        <GPXLayers
          gpxFiles={gpxFiles}
          selectedFile={selectedFile}
          onTrackPointPress={handleTrackPointPress}
          onWaypointPress={handleWaypointPress}
          onMapPress={handleMapPress}
          editingMode={editingMode}
          isEditing={isEditing}
          selectedWaypoints={selection.selectedWaypoints}
          selectedTrackPoints={selection.selectedTrackPoints}
        />

        {/* User Location Marker */}
        {userLocation && (
          <UserLocationMarker
            location={userLocation}
            isFollowing={isFollowingUser}
          />
        )}
      </MapView>

      {/* Map Controls */}
      <MapControls
        onCenterUser={centerOnUser}
        onToggleFollowUser={toggleFollowUser}
        isFollowingUser={isFollowingUser}
        onToggleElevationProfile={() =>
          setShowElevationProfile(!showElevationProfile)
        }
        showElevationProfile={showElevationProfile}
        onMapProviderChange={setMapProvider}
        currentMapProvider={mapProvider}
        hasUserLocation={!!userLocation}
        enableEditing={enableEditing}
        isEditing={isEditing}
        onStartEditing={handleStartEditing}
        onStopEditing={handleStopEditing}
      />

      {/* Elevation Profile */}
      {showElevationProfile && selectedFile && (
        <ElevationProfile
          gpxFile={selectedFile}
          onPointSelect={handleElevationPointSelect}
          onClose={() => setShowElevationProfile(false)}
        />
      )}

      {/* Track Point Popup */}
      {selectedTrackPoint && (
        <TrackPopup
          trackPoint={selectedTrackPoint.trackPoint}
          track={selectedTrackPoint.track}
          onClose={() => setSelectedTrackPoint(null)}
        />
      )}

      {/* Waypoint Popup */}
      {selectedWaypoint && !isEditing && (
        <WaypointPopup
          waypoint={selectedWaypoint}
          onClose={() => setSelectedWaypoint(null)}
        />
      )}

      {/* Editing Toolbar */}
      <EditingToolbar
        visible={showEditingToolbar}
        onClose={handleStopEditing}
      />

      {/* Waypoint Edit Modal */}
      <WaypointEditModal
        visible={waypointEditModal.visible}
        waypoint={waypointEditModal.waypoint}
        initialPosition={waypointEditModal.position}
        onClose={() => setWaypointEditModal({ visible: false })}
        onSave={handleSaveWaypoint}
      />

      {/* Track Edit Modal */}
      <TrackEditModal
        visible={trackEditModal.visible}
        track={trackEditModal.track}
        onClose={() => setTrackEditModal({ visible: false })}
        onSave={handleSaveTrackProperties}
      />

      {/* Navigation HUD */}
      <NavigationHUD
        visible={showNavigationHUD}
        onStopNavigation={handleNavigationStop}
      />

      {/* Navigation Controls */}
      {!isEditing && (
        <View style={styles.navigationControls}>
          <NavigationControls
            gpxFile={selectedFile}
            onNavigationStart={handleNavigationStart}
            onNavigationStop={handleNavigationStop}
            onSettingsPress={handleNavigationSettingsPress}
          />
        </View>
      )}

      {/* Navigation Settings Modal */}
      <NavigationSettingsModal
        visible={showNavigationSettings}
        onClose={handleNavigationSettingsClose}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  navigationControls: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    zIndex: 100,
  },
});
