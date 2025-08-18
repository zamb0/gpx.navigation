import { StyleSheet, View, Alert, TouchableOpacity } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import GPXMapLeaflet, { LeafletGPXTrack, LeafletGPXWaypoint } from '@/src/components/GPXMapLeaflet';
import ElevationProfile from '@/src/components/ElevationProfile';
import { useGPXContext } from '@/src/context/GPXContext';
import { useSettings } from '@/src/context/AppSettingsContext';

export default function MapScreen() {
    const { files, getAllTracks, getAllWaypoints } = useGPXContext();
    const { settings } = useSettings();
    const [tracks, setTracks] = useState<LeafletGPXTrack[]>([]);
    const [waypoints, setWaypoints] = useState<LeafletGPXWaypoint[]>([]);
    const [isLoadingLocation, setIsLoadingLocation] = useState(true);
    const [showElevationProfile, setShowElevationProfile] = useState(false);
    const [trackVisibility, setTrackVisibility] = useState<Map<number, boolean>>(new Map());
    const [initialRegion, setInitialRegion] = useState<
        | {
              latitude: number;
              longitude: number;
              latitudeDelta: number;
              longitudeDelta: number;
          }
        | undefined
    >(undefined);
    const mapRef = useRef<any>(null);

    // Get initial user location on component mount
    useEffect(() => {
        const getInitialLocation = async () => {
            // Timeout globale per l'intera operazione di geolocalizzazione
            const globalTimeout = setTimeout(() => {
                console.log('Timeout globale raggiunto, usando posizione di default');
                setIsLoadingLocation(false);
            }, 2000); // Ridotto a 2 secondi per garantire il puntino entro 2s

            try {
                console.log('Tentando di ottenere la posizione iniziale...');

                // Richiedi i permessi
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    console.log('Permessi negati, usando posizione di default (Roma)');
                    clearTimeout(globalTimeout);
                    setIsLoadingLocation(false);
                    return;
                }

                // Prima prova: posizione velocissima con accuratezza minima
                try {
                    console.log('Tentativo 1: posizione ultra-veloce...');

                    // Prova prima con l'ultima posizione conosciuta (istantanea se disponibile)
                    const lastKnownLocation = await Location.getLastKnownPositionAsync({
                        maxAge: 300000, // Accetta posizioni fino a 5 minuti fa
                        requiredAccuracy: 1000, // Accetta anche bassa accuratezza
                    });

                    if (lastKnownLocation) {
                        const { latitude, longitude } = lastKnownLocation.coords;
                        console.log('Ultima posizione conosciuta trovata:', latitude, longitude);

                        setInitialRegion({
                            latitude,
                            longitude,
                            latitudeDelta: 0.02,
                            longitudeDelta: 0.02,
                        });
                        setIsLoadingLocation(false);
                        clearTimeout(globalTimeout);

                        return; // Exit early con successo
                    }

                    // Se non c'è ultima posizione, prova posizione veloce con timeout aggressivo
                    console.log('Nessuna posizione conosciuta, richiedendo nuova posizione...');
                    const quickLocation = (await Promise.race([
                        Location.getCurrentPositionAsync({
                            accuracy: Location.Accuracy.Lowest, // Ancora più bassa
                            timeInterval: 1500, // Ridotto a 1.5 secondi
                            distanceInterval: 2000, // Tolleranza molto alta
                        }),
                        new Promise(
                            (_, reject) =>
                                setTimeout(() => reject(new Error('Quick timeout')), 1800) // Timeout a 1.8s
                        ),
                    ])) as Location.LocationObject;

                    const { latitude, longitude } = quickLocation.coords;
                    console.log('Posizione veloce ottenuta:', latitude, longitude);

                    setInitialRegion({
                        latitude,
                        longitude,
                        latitudeDelta: 0.02,
                        longitudeDelta: 0.02,
                    });
                    setIsLoadingLocation(false);
                    clearTimeout(globalTimeout);
                } catch (quickError) {
                    console.log(
                        'Fallback: tentativo con accuratezza standard con timeout ridotto...'
                    );
                    // Fallback finale con timeout molto breve
                    try {
                        const location = (await Promise.race([
                            Location.getCurrentPositionAsync({
                                accuracy: Location.Accuracy.Low,
                                timeInterval: 1800,
                                distanceInterval: 500,
                            }),
                            new Promise(
                                (_, reject) =>
                                    setTimeout(() => reject(new Error('Final timeout')), 2000) // Massimo 2s
                            ),
                        ])) as Location.LocationObject;

                        const { latitude, longitude } = location.coords;
                        console.log('Posizione fallback ottenuta:', latitude, longitude);

                        setInitialRegion({
                            latitude,
                            longitude,
                            latitudeDelta: 0.02,
                            longitudeDelta: 0.02,
                        });
                        setIsLoadingLocation(false);
                        clearTimeout(globalTimeout);
                    } catch (finalError) {
                        console.log('Tutti i tentativi falliti, usando posizione di default');
                        clearTimeout(globalTimeout);
                        // Non fare nulla, lascia che usi la posizione di default (Roma)
                        setIsLoadingLocation(false);
                    }
                }
            } catch (error) {
                console.log("Errore nell'ottenere la posizione iniziale:", error);
                clearTimeout(globalTimeout);
                setIsLoadingLocation(false); // Stop loading indicator anche in caso di errore
                // Mantieni il comportamento di default se non riesce ad ottenere la posizione
            }
        };

        getInitialLocation();
    }, []);

    // Mostra automaticamente la posizione utente quando la mappa è pronta e abbiamo l'initial region
    // MA SOLO se non ci sono tracciati GPX caricati
    useEffect(() => {
        if (initialRegion && mapRef.current && files.length === 0) {
            console.log(
                'Nessun tracciato GPX caricato, mostrando automaticamente la posizione utente sulla mappa...'
            );
            // Ridotto a 200ms per velocità massima
            setTimeout(() => {
                if (mapRef.current) {
                    mapRef.current.requestUserLocation();
                }
            }, 200);
        }
    }, [initialRegion, files.length]);

    // Strategia di backup: se dopo 2 secondi non abbiamo ancora una posizione, mostra comunque il puntino sulla posizione di default
    // MA SOLO se non ci sono tracciati GPX caricati
    useEffect(() => {
        const backupTimeout = setTimeout(() => {
            if (isLoadingLocation && mapRef.current && files.length === 0) {
                console.log(
                    'Timeout 2s raggiunto, mostrando puntino sulla posizione di default (nessun GPX caricato)'
                );
                setIsLoadingLocation(false);
                // Mostra il puntino anche se siamo sulla posizione di default (Roma)
                if (mapRef.current) {
                    mapRef.current.requestUserLocation();
                }
            }
        }, 2000);

        return () => clearTimeout(backupTimeout);
    }, [isLoadingLocation, files.length]);

    // Update map data when GPX files change
    useEffect(() => {
        if (files.length > 0) {
            const gpxTracks = getAllTracks();
            const gpxWaypoints = getAllWaypoints();

            // Map GPX tracks to Leaflet format
            const leafletTracks: LeafletGPXTrack[] = gpxTracks.map((track) => ({
                name: track.name || 'Unnamed Track',
                coordinates: track.coordinates,
                color: track.color,
            }));

            // Map GPX waypoints to Leaflet format
            const leafletWaypoints: LeafletGPXWaypoint[] = gpxWaypoints.map((waypoint) => ({
                name: waypoint.name || 'Unnamed Waypoint',
                latitude: waypoint.latitude,
                longitude: waypoint.longitude,
                description: waypoint.description,
                symbol: waypoint.symbol,
                type: waypoint.type,
            }));

            setTracks(leafletTracks);
            setWaypoints(leafletWaypoints);

            // Initialize track visibility - all tracks visible by default
            const visibility = new Map<number, boolean>();
            leafletTracks.forEach((_, index) => {
                visibility.set(index, true);
            });
            setTrackVisibility(visibility);
        } else {
            // Empty arrays when no files loaded
            setTracks([]);
            setWaypoints([]);
            setTrackVisibility(new Map());
        }
    }, [files, getAllTracks, getAllWaypoints]);

    const handleMapPress = (coordinate: { latitude: number; longitude: number }) => {
        Alert.alert(
            'Map Tap',
            `Coordinates: ${coordinate.latitude.toFixed(6)}, ${coordinate.longitude.toFixed(6)}`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Add Waypoint',
                    onPress: () => console.log('Add waypoint feature coming soon'),
                },
            ]
        );
    };

    const requestLocationFromMap = () => {
        console.log('Pulsante posizione premuto');
        if (mapRef.current) {
            console.log('Chiamando centerOnLastKnownLocation...');
            mapRef.current.centerOnLastKnownLocation();
        } else {
            console.log('mapRef.current è null');
        }
    };

    const handleElevationPointHover = (
        coordinate: { latitude: number; longitude: number },
        pointIndex: number,
        trackIndex: number
    ) => {
        console.log('Punto elevazione selezionato (hover):', coordinate, pointIndex, trackIndex);

        // Mostra un marker temporaneo sulla mappa senza centrare
        if (mapRef.current && tracks[trackIndex] && tracks[trackIndex].coordinates[pointIndex]) {
            const point = tracks[trackIndex].coordinates[pointIndex];
            const elevation = point.elevation || 0;

            // Calcola la distanza approssimativa (in modo semplificato)
            let distance = 0;
            for (let i = 0; i <= pointIndex; i++) {
                if (i > 0) {
                    const prev = tracks[trackIndex].coordinates[i - 1];
                    const curr = tracks[trackIndex].coordinates[i];
                    distance += calculateDistance(
                        prev.latitude,
                        prev.longitude,
                        curr.latitude,
                        curr.longitude
                    );
                }
            }

            mapRef.current.showElevationMarker(
                coordinate.latitude,
                coordinate.longitude,
                elevation,
                distance
            );
        }
    };

    // Funzione di utilità per calcolare la distanza
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const R = 6371000; // Raggio della Terra in metri
        const dLat = toRadians(lat2 - lat1);
        const dLon = toRadians(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRadians(lat1)) *
                Math.cos(toRadians(lat2)) *
                Math.sin(dLon / 2) *
                Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const toRadians = (degrees: number): number => {
        return degrees * (Math.PI / 180);
    };

    const toggleElevationProfile = () => {
        if (tracks.length > 0) {
            const newState = !showElevationProfile;
            setShowElevationProfile(newState);

            // Se stiamo chiudendo il profilo, nascondi il marker di elevazione
            if (!newState && mapRef.current) {
                mapRef.current.hideElevationMarker();
            }
        } else {
            Alert.alert(
                'Profilo Altimetrico',
                'Carica un file GPX con dati altimetrici per visualizzare il profilo.',
                [{ text: 'OK' }]
            );
        }
    };

    const handleTrackVisibilityChange = (trackIndex: number, isVisible: boolean) => {
        setTrackVisibility((prev) => {
            const newMap = new Map(prev);
            newMap.set(trackIndex, isVisible);
            return newMap;
        });

        // Filter tracks to show only visible ones
        const visibleTracks = tracks.filter((_, index) => {
            const visibility = trackVisibility.get(index);
            return visibility !== false && (index === trackIndex ? isVisible : true);
        });

        // Update map with filtered tracks
        if (mapRef.current) {
            mapRef.current.setGPXData(visibleTracks, waypoints);
        }
    };

    return (
        <ThemedView style={styles.container}>
            <ThemedView style={styles.header}>
                <ThemedText type="title">gpx.navigate</ThemedText>
            </ThemedView>

            <View style={styles.mapContainer}>
                <GPXMapLeaflet
                    ref={mapRef}
                    style={styles.map}
                    initialRegion={initialRegion}
                    tracks={tracks}
                    waypoints={waypoints}
                    onMapPress={handleMapPress}
                    osmProvider={settings.osmProvider}
                />

                {/* Pulsante floating per centrare sulla posizione utente */}
                <TouchableOpacity
                    style={styles.floatingLocationButton}
                    onPress={requestLocationFromMap}
                >
                    <ThemedText style={styles.floatingLocationText}>📍</ThemedText>
                </TouchableOpacity>

                {/* Pulsante floating per il profilo altimetrico */}
                {tracks.length > 0 && (
                    <TouchableOpacity
                        style={[
                            styles.floatingElevationButton,
                            showElevationProfile && styles.floatingElevationButtonActive,
                        ]}
                        onPress={toggleElevationProfile}
                    >
                        <ThemedText style={styles.floatingElevationText}>
                            {showElevationProfile ? '📊' : '📈'}
                        </ThemedText>
                    </TouchableOpacity>
                )}
            </View>

            {/* Profilo altimetrico integrato */}
            {showElevationProfile && tracks.length > 0 && (
                <View style={styles.elevationContainer}>
                    <ElevationProfile
                        tracks={tracks}
                        onPointHover={handleElevationPointHover}
                        onTrackVisibilityChange={handleTrackVisibilityChange}
                        height={180}
                    />
                </View>
            )}

            <ThemedView style={styles.bottomInfo}>
                <ThemedText type="default">
                    🍃 Leaflet + OpenStreetMap ({settings.osmProvider}) •{' '}
                    {files.length > 0
                        ? `${files.length} file${files.length > 1 ? 's' : ''} loaded`
                        : isLoadingLocation
                        ? '🔍 Rilevando la tua posizione...'
                        : initialRegion
                        ? 'Mappa centrata sulla tua posizione • Import GPX files to see your tracks'
                        : 'Import GPX files to see your tracks'}{' '}
                    • Fully open source
                </ThemedText>
            </ThemedView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        padding: 12,
        paddingTop: 50,
        alignItems: 'center',
    },
    mapContainer: {
        flex: 1,
        margin: 8,
        marginTop: 4,
        marginBottom: 20, // Spazio ottimizzato per le tab
        borderRadius: 12,
        overflow: 'hidden',
        elevation: 5, // Android shadow
        shadowColor: '#000', // iOS shadow
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        position: 'relative', // Per contenere i pulsanti floating
    },
    mapContainerWithProfile: {
        flex: 0.6, // Riduci la mappa quando c'è il profilo
        marginBottom: 8, // Meno spazio sotto quando c'è il profilo
    },
    map: {
        flex: 1,
    },
    floatingLocationButton: {
        position: 'absolute',
        bottom: 16,
        right: 16,
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(0, 122, 255, 0.9)', // Blu semi-trasparente
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8, // Android shadow
        shadowColor: '#000', // iOS shadow
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    floatingLocationText: {
        fontSize: 20,
        color: 'white',
    },
    floatingElevationButton: {
        position: 'absolute',
        bottom: 76, // Sopra il pulsante posizione
        right: 16,
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(34, 197, 94, 0.9)', // Verde semi-trasparente
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8, // Android shadow
        shadowColor: '#000', // iOS shadow
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    floatingElevationButtonActive: {
        backgroundColor: 'rgba(34, 197, 94, 1)', // Verde pieno quando attivo
    },
    floatingElevationText: {
        fontSize: 20,
        color: 'white',
    },
    elevationContainer: {
        margin: 8,
        marginTop: 0,
        marginBottom: 8,
        borderRadius: 12,
        overflow: 'hidden',
        elevation: 4, // Shadow leggera
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
        backgroundColor: 'white',
    },
    bottomInfo: {
        padding: 8,
        paddingBottom: 12,
        alignItems: 'center',
    },
});
