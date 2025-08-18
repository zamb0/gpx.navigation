import React, { useState, useRef } from 'react';
import { StyleSheet, View, Alert, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import MapView, {
    PROVIDER_DEFAULT,
    Region,
    Polyline,
    Marker,
    MapPressEvent,
    UrlTile,
} from 'react-native-maps';
import WaypointMarker from './WaypointMarker';
import { getWaypointStyle } from '../utils/waypointTypes';
import { OSM_PROVIDERS, OSMProviderType } from './MapProviderSelector';

// Placeholder types for GPX data - we'll integrate with the real GPX library later
interface GPXTrack {
    id: string;
    name?: string;
    coordinates: Array<{
        latitude: number;
        longitude: number;
        elevation?: number;
        time?: Date;
    }>;
    color?: string;
}

interface GPXWaypoint {
    id: string;
    name?: string;
    latitude: number;
    longitude: number;
    elevation?: number;
    description?: string;
    type?: string;
    symbol?: string;
}

interface GPXMapProps {
    style?: any;
    initialRegion?: Region;
    tracks?: GPXTrack[];
    waypoints?: GPXWaypoint[];
    onMapPress?: (coordinate: { latitude: number; longitude: number }) => void;
    osmProvider?: OSMProviderType;
}

export default function GPXMap({
    style,
    initialRegion,
    tracks = [],
    waypoints = [],
    onMapPress,
    osmProvider = 'standard',
}: GPXMapProps) {
    const mapRef = useRef<MapView>(null);
    const [isMapReady, setIsMapReady] = useState(false);

    // Log provider changes for debugging
    React.useEffect(() => {
        console.log('OSM Provider changed to:', osmProvider);
        console.log('Using URL template:', OSM_PROVIDERS[osmProvider].urlTemplate);
        setIsMapReady(false); // Reset quando cambia provider
    }, [osmProvider]);

    // Default region: Rome, Italy
    const defaultRegion: Region = {
        latitude: 41.9028,
        longitude: 12.4964,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
    };

    const handleMapPress = (event: MapPressEvent) => {
        const { coordinate } = event.nativeEvent;
        if (onMapPress) {
            onMapPress(coordinate);
        }
    };

    const fitToTracks = () => {
        if (tracks.length === 0 || !mapRef.current) return;

        const allCoordinates = tracks.flatMap((track) => track.coordinates);
        if (allCoordinates.length === 0) return;

        mapRef.current.fitToCoordinates(allCoordinates, {
            edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
            animated: true,
        });
    };

    return (
        <View style={[styles.container, style]}>
            <MapView
                ref={mapRef}
                provider={PROVIDER_DEFAULT}
                style={styles.map}
                initialRegion={initialRegion || defaultRegion}
                onPress={handleMapPress}
                onMapReady={() => setIsMapReady(true)}
                // Proprietà essenziali per lo zoom
                scrollEnabled={true}
                zoomEnabled={true}
                pitchEnabled={false}
                rotateEnabled={true}
            >
                {/* OpenStreetMap Tiles */}
                <UrlTile
                    key={`tiles-${osmProvider}`}
                    urlTemplate={OSM_PROVIDERS[osmProvider].urlTemplate}
                    maximumZ={20}
                    minimumZ={1}
                    flipY={false}
                    zIndex={0}
                    tileSize={256}
                    tileCachePath={undefined}
                    tileCacheMaxAge={86400}
                />

                {/* Render GPX Tracks as Polylines */}
                {tracks.map((track) => (
                    <Polyline
                        key={track.id}
                        coordinates={track.coordinates}
                        strokeColor={track.color || '#FF0000'}
                        strokeWidth={3}
                        lineCap="round"
                        lineJoin="round"
                    />
                ))}

                {/* Render GPX Waypoints as Custom Markers */}
                {waypoints.map((waypoint) => {
                    const waypointStyle = getWaypointStyle(
                        waypoint.symbol,
                        waypoint.type,
                        waypoint.name
                    );

                    return (
                        <Marker
                            key={waypoint.id}
                            coordinate={{
                                latitude: waypoint.latitude,
                                longitude: waypoint.longitude,
                            }}
                            title={waypoint.name || 'Waypoint'}
                            description={[
                                waypointStyle.description,
                                waypoint.description,
                                waypoint.elevation ? `Elevazione: ${waypoint.elevation}m` : null,
                            ]
                                .filter(Boolean)
                                .join(' • ')}
                        >
                            <WaypointMarker
                                symbol={waypoint.symbol}
                                type={waypoint.type}
                                name={waypoint.name}
                                size={24}
                            />
                        </Marker>
                    );
                })}
            </MapView>

            {/* Indicatore di caricamento */}
            {!isMapReady && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#007AFF" />
                    <Text style={styles.loadingText}>Caricamento mappa...</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    map: {
        width: '100%',
        height: '100%',
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#333',
    },
});

// Export types for use in other components
export type { GPXTrack, GPXWaypoint };
