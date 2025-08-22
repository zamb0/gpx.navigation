import { StyleSheet, View, Alert, TouchableOpacity, Text } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import GPXMapLeaflet, {
    LeafletGPXTrack,
    LeafletGPXWaypoint,
    GPXMapLeafletRef,
} from '@/src/components/GPXMapLeaflet';
import ElevationProfile from '@/src/components/ElevationProfile';
import { useGPXContext } from '@/src/context/GPXContext';
import { useSettings } from '@/src/context/AppSettingsContext';
import { useThemeColor } from '@/hooks/useThemeColor';

export default function MapScreen() {
    const { files, getAllTracks, getAllWaypoints, getVisibleWaypoints } = useGPXContext();
    const { settings } = useSettings();

    const primaryColor = useThemeColor({}, 'primary');
    const backgroundColor = useThemeColor({}, 'background');
    const cardColor = useThemeColor({}, 'card');
    const shadowColor = useThemeColor({}, 'shadow');
    const locationButtonColor = useThemeColor({}, 'locationButton');
    const locationButtonActiveColor = useThemeColor({}, 'locationButtonActive');
    const elevationButtonColor = useThemeColor({}, 'elevationButton');
    const elevationButtonActiveColor = useThemeColor({}, 'elevationButtonActive');
    const trackButtonColor = useThemeColor({}, 'trackButton');
    const trackButtonActiveColor = useThemeColor({}, 'trackButtonActive');
    const buttonTextColor = useThemeColor({}, 'buttonText');
    const modalBackgroundColor = useThemeColor({}, 'modalBackground');
    const modalTextColor = useThemeColor({}, 'modalText');
    const modalTrackColor = useThemeColor({}, 'modalTrack');
    const trackSelectorBorderColor = useThemeColor({}, 'trackSelectorBorder');
    const trackSelectorActiveBackgroundColor = useThemeColor({}, 'trackSelectorActiveBackground');
    const trackSelectorActiveBorderColor = useThemeColor({}, 'trackSelectorActiveBorder');
    const trackSelectorTextColor = useThemeColor({}, 'trackSelectorText');
    const trackSelectorActiveTextColor = useThemeColor({}, 'trackSelectorActiveText');

    // Stili dinamici per i pulsanti floating
    const dynamicStyles = {
        mapContainerStyle: {
            ...styles.mapContainer,
            shadowColor: shadowColor,
        },
        floatingLocationButtonStyle: {
            ...styles.floatingLocationButton,
            backgroundColor: locationButtonColor,
            shadowColor: shadowColor,
        },
        floatingLocationTextStyle: {
            ...styles.floatingLocationText,
            color: buttonTextColor,
        },
        floatingElevationButtonStyle: {
            ...styles.floatingElevationButton,
            backgroundColor: elevationButtonColor,
            shadowColor: shadowColor,
        },
        floatingElevationButtonActiveStyle: {
            ...styles.floatingElevationButton,
            backgroundColor: elevationButtonActiveColor,
            shadowColor: shadowColor,
        },
        floatingElevationTextStyle: {
            ...styles.floatingElevationText,
            color: buttonTextColor,
        },
        floatingTrackSelectorButtonStyle: {
            ...styles.floatingTrackSelectorButton,
            backgroundColor: trackButtonColor,
            shadowColor: shadowColor,
        },
        floatingTrackSelectorButtonActiveStyle: {
            ...styles.floatingTrackSelectorButton,
            backgroundColor: trackButtonActiveColor,
            shadowColor: shadowColor,
        },
        floatingTrackSelectorTextStyle: {
            ...styles.floatingTrackSelectorText,
            color: buttonTextColor,
        },
        trackSelectorDropdownStyle: {
            ...styles.trackSelectorDropdown,
            backgroundColor: modalBackgroundColor,
            shadowColor: shadowColor,
        },
        trackSelectorTitleStyle: {
            ...styles.trackSelectorTitle,
            color: modalTextColor,
        },
        trackSelectorItemStyle: {
            ...styles.trackSelectorItem,
            backgroundColor: modalTrackColor,
            borderColor: trackSelectorBorderColor,
        },
        elevationContainerStyle: {
            ...styles.elevationContainer,
            backgroundColor: modalBackgroundColor,
            shadowColor: shadowColor,
        },
        trackSelectorItemActiveStyle: {
            ...styles.trackSelectorItemActive,
            backgroundColor: trackSelectorActiveBackgroundColor,
            borderColor: trackSelectorActiveBorderColor,
        },
        trackSelectorItemTextStyle: {
            ...styles.trackSelectorItemText,
            color: trackSelectorTextColor,
        },
        trackSelectorItemTextActiveStyle: {
            ...styles.trackSelectorItemTextActive,
            color: trackSelectorActiveTextColor,
        },
    };

    const [tracks, setTracks] = useState<LeafletGPXTrack[]>([]);
    const [waypoints, setWaypoints] = useState<LeafletGPXWaypoint[]>([]);
    const [isLoadingLocation, setIsLoadingLocation] = useState(true);
    const [showElevationProfile, setShowElevationProfile] = useState(false);
    const [showTrackSelector, setShowTrackSelector] = useState(false);
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
    const [userLocationForMarker, setUserLocationForMarker] = useState<{
        latitude: number;
        longitude: number;
    } | null>(null);
    const mapRef = useRef<GPXMapLeafletRef>(null);

    // Get initial user location on component mount
    useEffect(() => {
        const getInitialLocation = async () => {
            try {
                console.log('Tentando di ottenere la posizione iniziale...');

                // Richiedi i permessi
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    console.log('Permessi negati, usando posizione di default (Roma)');
                    setIsLoadingLocation(false);
                    return;
                }

                // 🚀 INSTANT RESPONSE: Mostra immediatamente l'ultima posizione conosciuta
                console.log('Controllo ultima posizione conosciuta per risposta immediata...');
                try {
                    const lastKnownLocation = await Location.getLastKnownPositionAsync({
                        maxAge: 600000, // Accetta posizioni fino a 10 minuti fa per massima copertura
                        requiredAccuracy: 2000, // Accetta anche bassa accuratezza per avere subito qualcosa
                    });

                    if (lastKnownLocation) {
                        const { latitude, longitude } = lastKnownLocation.coords;
                        console.log(
                            '✅ Ultima posizione mostrata IMMEDIATAMENTE:',
                            latitude,
                            longitude
                        );

                        setInitialRegion({
                            latitude,
                            longitude,
                            latitudeDelta: 0.02,
                            longitudeDelta: 0.02,
                        });
                        // Salva la posizione per mostrare il marker quando la mappa è pronta
                        setUserLocationForMarker({ latitude, longitude });
                        setIsLoadingLocation(false); // Ferma il loading immediatamente

                        // 🔄 BACKGROUND UPDATE: Ora prova a ottenere posizione più accurata in background
                        console.log('⏱️ Avvio aggiornamento posizione in background...');

                        // Timeout per operazione background (non blocca l'UI)
                        const backgroundTimeout = setTimeout(() => {
                            console.log(
                                "Timeout background raggiunto, manteniamo l'ultima posizione"
                            );
                        }, 3000);

                        try {
                            const currentLocation = await Location.getCurrentPositionAsync({
                                accuracy: Location.Accuracy.Balanced,
                                timeInterval: 2000,
                                distanceInterval: 100,
                            });

                            const { latitude: newLat, longitude: newLng } = currentLocation.coords;
                            console.log('✅ Posizione aggiornata in background:', newLat, newLng);

                            // Aggiorna solo se la differenza è significativa (>50m)
                            const distance = calculateDistance(latitude, longitude, newLat, newLng);
                            if (distance > 50) {
                                console.log(
                                    `📍 Aggiornamento significativo (+${Math.round(
                                        distance
                                    )}m), aggiorno mappa`
                                );
                                setInitialRegion({
                                    latitude: newLat,
                                    longitude: newLng,
                                    latitudeDelta: 0.02,
                                    longitudeDelta: 0.02,
                                });
                                // Aggiorna anche la posizione per il marker
                                setUserLocationForMarker({ latitude: newLat, longitude: newLng });
                            } else {
                                console.log(
                                    `📍 Posizione stabile (±${Math.round(
                                        distance
                                    )}m), nessun aggiornamento necessario`
                                );
                            }

                            clearTimeout(backgroundTimeout);
                        } catch (backgroundError) {
                            console.log(
                                "Aggiornamento background fallito, manteniamo l'ultima posizione:",
                                backgroundError
                            );
                            clearTimeout(backgroundTimeout);
                        }

                        return; // Exit early con successo - abbiamo già mostrato la posizione
                    }
                } catch (lastKnownError) {
                    console.log(
                        'Nessuna ultima posizione disponibile, procedo con posizione corrente'
                    );
                }

                // 📍 FALLBACK: Se non c'è ultima posizione, usa il metodo esistente ma con timeout più lungo
                console.log('🔍 Nessuna posizione precedente, richiedendo posizione corrente...');

                const globalTimeout = setTimeout(() => {
                    console.log('Timeout globale raggiunto, usando posizione di default');
                    setIsLoadingLocation(false);
                }, 4000); // Timeout più lungo dato che non abbiamo alternative

                try {
                    const quickLocation = (await Promise.race([
                        Location.getCurrentPositionAsync({
                            accuracy: Location.Accuracy.Lowest,
                            timeInterval: 2000,
                            distanceInterval: 2000,
                        }),
                        new Promise((_, reject) =>
                            setTimeout(() => reject(new Error('Quick timeout')), 3000)
                        ),
                    ])) as Location.LocationObject;

                    const { latitude, longitude } = quickLocation.coords;
                    console.log('✅ Posizione corrente ottenuta:', latitude, longitude);

                    setInitialRegion({
                        latitude,
                        longitude,
                        latitudeDelta: 0.02,
                        longitudeDelta: 0.02,
                    });
                    // Salva la posizione per mostrare il marker quando la mappa è pronta
                    setUserLocationForMarker({ latitude, longitude });
                    setIsLoadingLocation(false);
                    clearTimeout(globalTimeout);
                } catch (quickError) {
                    console.log('Fallback finale con accuratezza standard...');
                    try {
                        const location = (await Promise.race([
                            Location.getCurrentPositionAsync({
                                accuracy: Location.Accuracy.Low,
                                timeInterval: 2000,
                                distanceInterval: 500,
                            }),
                            new Promise((_, reject) =>
                                setTimeout(() => reject(new Error('Final timeout')), 3000)
                            ),
                        ])) as Location.LocationObject;

                        const { latitude, longitude } = location.coords;
                        console.log('✅ Posizione fallback ottenuta:', latitude, longitude);

                        setInitialRegion({
                            latitude,
                            longitude,
                            latitudeDelta: 0.02,
                            longitudeDelta: 0.02,
                        });
                        // Salva la posizione per mostrare il marker quando la mappa è pronta
                        setUserLocationForMarker({ latitude, longitude });
                        setIsLoadingLocation(false);
                        clearTimeout(globalTimeout);
                    } catch (finalError) {
                        console.log('Tutti i tentativi falliti, usando posizione di default');
                        clearTimeout(globalTimeout);
                        setIsLoadingLocation(false);
                    }
                }
            } catch (error) {
                console.log("Errore nell'ottenere la posizione iniziale:", error);
                setIsLoadingLocation(false);
            }
        };

        getInitialLocation();
    }, []);

    // Mostra il marker della posizione utente non appena abbiamo la posizione e la mappa è pronta
    useEffect(() => {
        if (userLocationForMarker && mapRef.current) {
            console.log(
                '🎯 Mostrando marker della posizione utente immediatamente:',
                userLocationForMarker
            );
            // Aspetta un breve momento per assicurarsi che il WebView sia completamente caricato
            setTimeout(() => {
                if (mapRef.current && userLocationForMarker) {
                    mapRef.current.showUserLocationMarker(
                        userLocationForMarker.latitude,
                        userLocationForMarker.longitude
                    );
                    console.log('✅ Marker della posizione utente inviato al WebView');
                }
            }, 100); // Delay molto breve per assicurarsi che il WebView sia pronto
        }
    }, [userLocationForMarker]);

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

            // Data is already in the correct LeafletGPX format from adapters
            setTracks(gpxTracks);

            // Initialize track visibility - all tracks visible by default
            const visibility = new Map<number, boolean>();
            gpxTracks.forEach((_, index) => {
                visibility.set(index, true);
            });
            setTrackVisibility(visibility);
        } else {
            // Empty arrays when no files loaded
            setTracks([]);
            setWaypoints([]);
            setTrackVisibility(new Map());
        }
    }, [files, getAllTracks]);

    // Update waypoints when track visibility changes
    useEffect(() => {
        const gpxWaypoints = getVisibleWaypoints(trackVisibility);
        setWaypoints(gpxWaypoints);
    }, [files, trackVisibility, getVisibleWaypoints]);

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
    };

    const toggleTrackSelector = () => {
        if (tracks.length > 1) {
            setShowTrackSelector(!showTrackSelector);
        } else {
            Alert.alert('Selezione Tracce', 'Carica più file GPX per selezionare diverse tracce.', [
                { text: 'OK' },
            ]);
        }
    };

    // Filter tracks based on visibility
    const visibleTracks = tracks.filter((_, index) => {
        const visibility = trackVisibility.get(index);
        return visibility !== false; // Show track if visibility is not explicitly false
    });

    return (
        <ThemedView style={styles.container}>
            <ThemedView style={styles.header}>
                <ThemedText type="title">gpx.navigate</ThemedText>
            </ThemedView>

            <View style={dynamicStyles.mapContainerStyle}>
                {/* Overlay per chiudere il menu tracce quando si tocca fuori */}
                {showTrackSelector && (
                    <TouchableOpacity
                        style={styles.trackSelectorOverlay}
                        onPress={() => setShowTrackSelector(false)}
                        activeOpacity={1}
                    />
                )}

                <GPXMapLeaflet
                    ref={mapRef}
                    style={styles.map}
                    initialRegion={initialRegion}
                    tracks={visibleTracks}
                    waypoints={waypoints}
                    onMapPress={handleMapPress}
                    osmProvider={settings.osmProvider}
                />

                {/* Pulsante floating per centrare sulla posizione utente */}
                <TouchableOpacity
                    style={dynamicStyles.floatingLocationButtonStyle}
                    onPress={requestLocationFromMap}
                >
                    <ThemedText style={dynamicStyles.floatingLocationTextStyle}>📍</ThemedText>
                </TouchableOpacity>

                {/* Pulsante floating per il selettore tracce */}
                {tracks.length > 1 && (
                    <TouchableOpacity
                        style={[
                            dynamicStyles.floatingTrackSelectorButtonStyle,
                            showTrackSelector &&
                                dynamicStyles.floatingTrackSelectorButtonActiveStyle,
                        ]}
                        onPress={toggleTrackSelector}
                    >
                        <ThemedText style={dynamicStyles.floatingTrackSelectorTextStyle}>
                            {showTrackSelector ? '📂' : '📁'}
                        </ThemedText>
                    </TouchableOpacity>
                )}

                {/* Pulsante floating per il profilo altimetrico */}
                {tracks.length > 0 && (
                    <TouchableOpacity
                        style={[
                            dynamicStyles.floatingElevationButtonStyle,
                            showElevationProfile &&
                                dynamicStyles.floatingElevationButtonActiveStyle,
                        ]}
                        onPress={toggleElevationProfile}
                    >
                        <ThemedText style={dynamicStyles.floatingElevationTextStyle}>
                            {showElevationProfile ? '📊' : '📈'}
                        </ThemedText>
                    </TouchableOpacity>
                )}

                {/* Menu a tendina per la selezione tracce */}
                {showTrackSelector && tracks.length > 1 && (
                    <View style={dynamicStyles.trackSelectorDropdownStyle}>
                        <Text style={dynamicStyles.trackSelectorTitleStyle}>Seleziona Tracce:</Text>
                        {tracks.map((track, index) => (
                            <TouchableOpacity
                                key={index}
                                style={[
                                    dynamicStyles.trackSelectorItemStyle,
                                    trackVisibility.get(index) !== false &&
                                        dynamicStyles.trackSelectorItemActiveStyle,
                                ]}
                                onPress={() =>
                                    handleTrackVisibilityChange(
                                        index,
                                        trackVisibility.get(index) === false
                                    )
                                }
                            >
                                <Text
                                    style={[
                                        dynamicStyles.trackSelectorItemTextStyle,
                                        trackVisibility.get(index) !== false &&
                                            dynamicStyles.trackSelectorItemTextActiveStyle,
                                    ]}
                                >
                                    {trackVisibility.get(index) !== false ? '✅' : '❌'}{' '}
                                    {track.name || `Traccia ${index + 1}`}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </View>

            {/* Profilo altimetrico integrato */}
            {showElevationProfile && tracks.length > 0 && (
                <View style={dynamicStyles.elevationContainerStyle}>
                    <ElevationProfile
                        tracks={tracks}
                        trackVisibility={trackVisibility}
                        onPointHover={handleElevationPointHover}
                        onTrackVisibilityChange={handleTrackVisibilityChange}
                        height={160}
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
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8, // Android shadow
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    floatingLocationText: {
        fontSize: 20,
    },
    floatingElevationButton: {
        position: 'absolute',
        bottom: 76, // Sopra il pulsante posizione
        right: 16,
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8, // Android shadow
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    floatingElevationButtonActive: {
        // Rimosso backgroundColor - ora dinamico
    },
    floatingElevationText: {
        fontSize: 20,
    },
    floatingTrackSelectorButton: {
        position: 'absolute',
        bottom: 136, // Sopra il pulsante elevazione
        right: 16,
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8, // Android shadow
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    floatingTrackSelectorButtonActive: {
        // Rimosso backgroundColor - ora dinamico
    },
    floatingTrackSelectorText: {
        fontSize: 20,
    },
    trackSelectorDropdown: {
        position: 'absolute',
        top: 16,
        right: 16,
        borderRadius: 12,
        padding: 12,
        minWidth: 200,
        maxHeight: 300,
        elevation: 8, // Android shadow
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        zIndex: 2, // Above overlay
    },
    trackSelectorTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 12,
        textAlign: 'center',
    },
    trackSelectorItem: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        marginVertical: 2,
        borderRadius: 8,
        borderWidth: 1,
    },
    trackSelectorItemActive: {
        // Colori dinamici applicati tramite dynamicStyles
    },
    trackSelectorItemText: {
        fontSize: 12,
        fontWeight: '500',
    },
    trackSelectorItemTextActive: {
        fontWeight: '600',
    },
    trackSelectorOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'transparent',
        zIndex: 1,
    },
    elevationContainer: {
        margin: 8,
        marginTop: 0,
        marginBottom: 8,
        borderRadius: 12,
        overflow: 'hidden',
        elevation: 4, // Shadow leggera
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
    },
    bottomInfo: {
        padding: 8,
        paddingBottom: 12,
        alignItems: 'center',
    },
});
