import React, { useMemo, useState, useRef, useCallback } from 'react';
import {
    View,
    StyleSheet,
    Dimensions,
    Text,
    GestureResponderEvent,
    TouchableOpacity,
    ScrollView,
} from 'react-native';
import { Svg, Path, Line, Circle, Text as SvgText, Rect } from 'react-native-svg';
import { LeafletGPXTrack } from './GPXMapLeaflet';
import { TrackSegment, TrackPoint } from '@/src/lib';

interface ElevationProfileProps {
    tracks: LeafletGPXTrack[];
    trackVisibility?: Map<number, boolean>; // Receive visibility state from parent
    onPointHover?: (
        coordinate: { latitude: number; longitude: number },
        pointIndex: number,
        trackIndex: number
    ) => void;
    onTrackVisibilityChange?: (trackIndex: number, visible: boolean) => void;
    height?: number;
}

interface ElevationPoint {
    distance: number; // Distanza cumulativa in metri
    elevation: number; // Elevazione in metri
    coordinate: { latitude: number; longitude: number };
    trackIndex: number;
    pointIndex: number;
}

const ElevationProfile: React.FC<ElevationProfileProps> = ({
    tracks,
    trackVisibility,
    onPointHover,
    onTrackVisibilityChange,
    height = 200,
}) => {
    const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
    const [cursorPosition, setCursorPosition] = useState<{
        x: number;
        y: number;
        elevation: number;
        distance: number;
    } | null>(null);
    const [isActive, setIsActive] = useState(false);
    const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastPositionRef = useRef<{ x: number; y: number } | null>(null);
    const screenWidth = Dimensions.get('window').width;
    const chartWidth = screenWidth - 40; // Margini laterali
    const chartHeight = height - 60; // Spazio per etichette

    // Helper function to check if track is visible
    const isTrackVisible = useCallback(
        (trackIndex: number) => {
            if (!trackVisibility) return true; // If no visibility map, show all tracks
            return trackVisibility.get(trackIndex) !== false; // Show if not explicitly false
        },
        [trackVisibility]
    );

    // Calculate visible tracks count
    const visibleTracksCount = useMemo(() => {
        if (!trackVisibility) return tracks.length;
        return tracks.filter((_, index) => isTrackVisible(index)).length;
    }, [tracks, trackVisibility, isTrackVisible]);

    // Calcola i dati del profilo altimetrico usando solo la libreria GPX
    const elevationData = useMemo((): ElevationPoint[] => {
        if (!tracks || tracks.length === 0) return [];

        const points: ElevationPoint[] = [];
        let globalDistanceOffset = 0;

        tracks.forEach((track, trackIndex) => {
            // Skip tracks that are not visible
            if (!isTrackVisible(trackIndex)) {
                return;
            }

            if (!track.coordinates || track.coordinates.length === 0) return;

            try {
                // Crea un TrackSegment per calcoli precisi
                const trackSegment = new TrackSegment();

                track.coordinates.forEach((coord) => {
                    const trackPoint = new TrackPoint({
                        attributes: {
                            lat: coord.latitude,
                            lon: coord.longitude,
                        },
                        ele: coord.elevation || 0,
                        time: undefined,
                    });
                    trackSegment.trkpt.push(trackPoint);
                });

                // Ottieni le statistiche dalla libreria GPX
                const stats = trackSegment.getStatistics();

                // IMPORTANTE: La libreria GPX restituisce distanze in KM, dobbiamo convertire in metri
                const distances = (stats.local.distance.total || []).map((d) => d * 1000);

                console.log(`📊 ELEVATION DATA - Track ${trackIndex}:`);
                console.log('  Punti nel track:', track.coordinates.length);
                console.log('  Distanze progressive ricevute (convertite in m):', distances.length);
                console.log(
                    '  Distanza totale track (convertita in m):',
                    Math.round(stats.global.distance.total * 1000)
                );
                console.log('  Global offset corrente:', Math.round(globalDistanceOffset));

                // Aggiungi i punti con distanze corrette (ora in metri)
                track.coordinates.forEach((point, pointIndex) => {
                    const localDistance = distances[pointIndex] || 0;
                    const globalDistance = globalDistanceOffset + localDistance;

                    points.push({
                        distance: globalDistance,
                        elevation: point.elevation || 0,
                        coordinate: {
                            latitude: point.latitude,
                            longitude: point.longitude,
                        },
                        trackIndex,
                        pointIndex,
                    });
                });

                // Aggiorna l'offset per il prossimo track (convertendo da km a metri)
                const trackTotalDistance = (stats.global.distance.total || 0) * 1000;
                globalDistanceOffset += trackTotalDistance;

                console.log('  Nuovo global offset:', Math.round(globalDistanceOffset));
                console.log('  Punti aggiunti finora:', points.length);
            } catch (error) {
                console.warn('Errore nel calcolo GPX per track:', error);
                // Fallback semplice con nostre distanze
                let localDistance = 0;
                track.coordinates.forEach((point, pointIndex) => {
                    if (pointIndex > 0) {
                        const prevPoint = track.coordinates[pointIndex - 1];
                        const segmentDistance = calculateDistance(
                            prevPoint.latitude,
                            prevPoint.longitude,
                            point.latitude,
                            point.longitude
                        );
                        localDistance += segmentDistance;
                    }

                    points.push({
                        distance: globalDistanceOffset + localDistance,
                        elevation: point.elevation || 0,
                        coordinate: {
                            latitude: point.latitude,
                            longitude: point.longitude,
                        },
                        trackIndex,
                        pointIndex,
                    });
                });

                globalDistanceOffset += localDistance;
            }
        });

        return points;
    }, [tracks, trackVisibility, isTrackVisible]);

    // Calcola i valori min/max per la scala e il dislivello corretto usando la libreria GPX
    const chartBounds = useMemo(() => {
        if (elevationData.length === 0) {
            return {
                minElevation: 0,
                maxElevation: 100,
                maxDistance: 1000,
                elevationGain: 0,
                elevationLoss: 0,
            };
        }

        const elevations = elevationData.map((p) => p.elevation);

        // Usa la libreria GPX per calcolare tutte le statistiche
        let totalElevationGain = 0;
        let totalElevationLoss = 0;
        let totalDistance = 0;
        let minElevationFromGPX = Infinity;
        let maxElevationFromGPX = -Infinity;

        tracks.forEach((track, trackIndex) => {
            // Skip tracks that are not visible
            if (!isTrackVisible(trackIndex)) {
                return;
            }

            if (track.coordinates && track.coordinates.length > 0) {
                try {
                    // Crea un TrackSegment temporaneo per i calcoli
                    const trackSegment = new TrackSegment();

                    // Aggiungi i punti al track segment
                    track.coordinates.forEach((coord) => {
                        const trackPoint = new TrackPoint({
                            attributes: {
                                lat: coord.latitude,
                                lon: coord.longitude,
                            },
                            ele: coord.elevation || 0,
                            time: undefined,
                        });
                        trackSegment.trkpt.push(trackPoint);
                    });

                    // Calcola le statistiche usando la libreria GPX
                    const stats = trackSegment.getStatistics();

                    // DEBUG: Stampa tutte le statistiche GPX per questo track
                    console.log(`=== STATISTICHE GPX TRACK ${trackIndex} ===`);
                    console.log('Global stats:', {
                        distance: {
                            moving: Math.round(stats.global.distance.moving * 1000), // Convertito in metri
                            total: Math.round(stats.global.distance.total * 1000), // Convertito in metri
                        },
                        elevation: {
                            gain: Math.round(stats.global.elevation.gain),
                            loss: Math.round(stats.global.elevation.loss),
                        },
                        time: {
                            start: stats.global.time.start,
                            end: stats.global.time.end,
                            moving: stats.global.time.moving,
                            total: stats.global.time.total,
                        },
                        speed: {
                            moving: Math.round((stats.global.speed.moving || 0) * 3.6), // km/h
                            total: Math.round((stats.global.speed.total || 0) * 3.6), // km/h
                        },
                    });

                    console.log('Local stats arrays lengths:', {
                        distanceTotal: stats.local.distance.total?.length || 0,
                        elevationGain: stats.local.elevation.gain?.length || 0,
                        elevationLoss: stats.local.elevation.loss?.length || 0,
                        elevationSmoothed: stats.local.elevation.smoothed?.length || 0,
                        coordinatesInTrack: track.coordinates.length,
                    });

                    if (stats.local.distance.total && stats.local.distance.total.length > 0) {
                        console.log(
                            'Prime 5 distanze progressive (convertite in m):',
                            stats.local.distance.total.slice(0, 5).map((d) => Math.round(d * 1000))
                        );
                        console.log(
                            'Ultime 5 distanze progressive (convertite in m):',
                            stats.local.distance.total.slice(-5).map((d) => Math.round(d * 1000))
                        );
                    }

                    console.log('==============================');

                    // Accumula le statistiche (convertendo le distanze da km a metri)
                    totalElevationGain += stats.global.elevation.gain;
                    totalElevationLoss += stats.global.elevation.loss;
                    totalDistance += stats.global.distance.total * 1000;

                    // Trova min/max elevazione dai dati del track
                    const trackElevations = track.coordinates.map((coord) => coord.elevation || 0);
                    const trackMin = Math.min(...trackElevations);
                    const trackMax = Math.max(...trackElevations);

                    minElevationFromGPX = Math.min(minElevationFromGPX, trackMin);
                    maxElevationFromGPX = Math.max(maxElevationFromGPX, trackMax);
                } catch (error) {
                    console.warn('Errore nel calcolo statistiche GPX:', error);
                    // Fallback ai calcoli precedenti se ci sono errori
                    const trackElevations = track.coordinates.map((coord) => coord.elevation || 0);
                    minElevationFromGPX = Math.min(
                        minElevationFromGPX,
                        Math.min(...trackElevations)
                    );
                    maxElevationFromGPX = Math.max(
                        maxElevationFromGPX,
                        Math.max(...trackElevations)
                    );
                }
            }
        });

        // Usa i valori dalla libreria GPX se disponibili, altrimenti fallback
        const finalDistance =
            totalDistance > 0
                ? totalDistance
                : elevationData[elevationData.length - 1]?.distance || 1000;
        const finalMinElevation =
            minElevationFromGPX !== Infinity ? minElevationFromGPX : Math.min(...elevations);
        const finalMaxElevation =
            maxElevationFromGPX !== -Infinity ? maxElevationFromGPX : Math.max(...elevations);

        // Aggiungi un piccolo padding verticale
        const elevationPadding = (finalMaxElevation - finalMinElevation) * 0.1;

        // DEBUG: Riassunto finale di tutte le statistiche
        console.log('🏁 RIASSUNTO FINALE STATISTICHE 🏁');
        console.log('Tracks processati:', tracks.length);
        console.log('Punti totali elevationData:', elevationData.length);
        console.log('STATISTICHE FINALI:', {
            // Da libreria GPX (somma di tutti i tracks)
            gpxDistanzaTotale: Math.round(totalDistance),
            gpxMinElevazione: Math.round(minElevationFromGPX),
            gpxMaxElevazione: Math.round(maxElevationFromGPX),
            gpxDislivelloPositivo: Math.round(totalElevationGain),
            gpxDislivelloNegativo: Math.round(totalElevationLoss),
            // Dai nostri calcoli (per confronto)
            nostraDistanza: Math.round(elevationData[elevationData.length - 1]?.distance || 0),
            nostraMinElevazione: Math.round(Math.min(...elevations)),
            nostraMaxElevazione: Math.round(Math.max(...elevations)),
            // Valori finali usati nell'UI
            distanzaUsata: Math.round(finalDistance),
            elevazioneMinimaUsata: Math.round(finalMinElevation),
            elevazioneMaxUsata: Math.round(finalMaxElevation),
        });
        console.log('=======================================');

        return {
            minElevation: finalMinElevation - elevationPadding,
            maxElevation: finalMaxElevation + elevationPadding,
            maxDistance: finalDistance,
            elevationGain: totalElevationGain,
            elevationLoss: totalElevationLoss,
        };
    }, [elevationData, tracks, trackVisibility, isTrackVisible]); // Genera il path SVG per il profilo
    const profilePath = useMemo(() => {
        if (elevationData.length === 0) return '';

        const pathCommands = elevationData.map((point, index) => {
            const x = (point.distance / chartBounds.maxDistance) * chartWidth;
            const y =
                chartHeight -
                ((point.elevation - chartBounds.minElevation) /
                    (chartBounds.maxElevation - chartBounds.minElevation)) *
                    chartHeight;

            return index === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
        });

        // Chiudi il path per creare un'area riempita
        const lastPoint = elevationData[elevationData.length - 1];
        const lastX = (lastPoint.distance / chartBounds.maxDistance) * chartWidth;
        pathCommands.push(`L ${lastX} ${chartHeight}`);
        pathCommands.push(`L 0 ${chartHeight}`);
        pathCommands.push('Z');

        return pathCommands.join(' ');
    }, [elevationData, chartBounds, chartWidth, chartHeight]);

    // Gestisce il tocco/trascinamento sul grafico con massima responsività
    const handleTouch = useCallback(
        (locationX: number) => {
            if (elevationData.length === 0) return;

            // Cancella timeout precedente se esiste
            if (hideTimeoutRef.current) {
                clearTimeout(hideTimeoutRef.current);
                hideTimeoutRef.current = null;
            }

            const relativeX = Math.max(0, Math.min(locationX, chartWidth));

            // Ottimizzazione: evita aggiornamenti se la posizione non è cambiata significativamente
            if (lastPositionRef.current && Math.abs(lastPositionRef.current.x - relativeX) < 2) {
                return; // Skip se il movimento è minimo (< 2px)
            }

            const distanceAtX = (relativeX / chartWidth) * chartBounds.maxDistance;

            // Interpolazione fluida per la posizione del cursore
            let interpolatedElevation = 0;
            let closestPointIndex = 0;

            if (elevationData.length > 1) {
                // Trova i due punti tra cui interpolare
                for (let i = 0; i < elevationData.length - 1; i++) {
                    if (
                        distanceAtX >= elevationData[i].distance &&
                        distanceAtX <= elevationData[i + 1].distance
                    ) {
                        const point1 = elevationData[i];
                        const point2 = elevationData[i + 1];

                        // Interpolazione lineare
                        const t =
                            (distanceAtX - point1.distance) / (point2.distance - point1.distance);
                        interpolatedElevation =
                            point1.elevation + t * (point2.elevation - point1.elevation);

                        // Scegli il punto più vicino per onPointHover
                        closestPointIndex = t < 0.5 ? i : i + 1;
                        break;
                    }
                }

                // Gestisci i casi estremi
                if (distanceAtX <= elevationData[0].distance) {
                    interpolatedElevation = elevationData[0].elevation;
                    closestPointIndex = 0;
                } else if (distanceAtX >= elevationData[elevationData.length - 1].distance) {
                    interpolatedElevation = elevationData[elevationData.length - 1].elevation;
                    closestPointIndex = elevationData.length - 1;
                }
            } else {
                interpolatedElevation = elevationData[0]?.elevation || 0;
                closestPointIndex = 0;
            }

            // Calcola la posizione Y interpolata per il cursore
            const interpolatedY =
                chartHeight -
                ((interpolatedElevation - chartBounds.minElevation) /
                    (chartBounds.maxElevation - chartBounds.minElevation)) *
                    chartHeight;

            // Aggiorna il cursore fluido con requestAnimationFrame per massima performance
            requestAnimationFrame(() => {
                setCursorPosition({
                    x: relativeX,
                    y: interpolatedY,
                    elevation: interpolatedElevation,
                    distance: distanceAtX,
                });
            });

            // Aggiorna la posizione precedente
            lastPositionRef.current = { x: relativeX, y: interpolatedY };

            setSelectedPointIndex(closestPointIndex);

            // Notifica il punto selezionato per mostrarlo sulla mappa (senza centrare)
            if (onPointHover && elevationData[closestPointIndex]) {
                const point = elevationData[closestPointIndex];
                onPointHover(point.coordinate, point.pointIndex, point.trackIndex);
            }
        },
        [elevationData, chartWidth, chartBounds, chartHeight, onPointHover]
    );

    // Gestione ultra-responsiva degli eventi touch
    const handleTouchStart = useCallback(
        (event: GestureResponderEvent) => {
            setIsActive(true);
            handleTouch(event.nativeEvent.locationX);
        },
        [handleTouch]
    );

    const handleTouchMove = useCallback(
        (event: GestureResponderEvent) => {
            if (isActive) {
                handleTouch(event.nativeEvent.locationX);
            }
        },
        [isActive, handleTouch]
    );

    const handleTouchEnd = useCallback(() => {
        setIsActive(false);
        // Nascondi il cursore dopo un breve delay
        hideTimeoutRef.current = setTimeout(() => {
            setCursorPosition(null);
        }, 1500);
    }, []);

    if (elevationData.length === 0) {
        return (
            <View style={[styles.container, { height }]}>
                <Text style={styles.noDataText}>
                    {visibleTracksCount === 0
                        ? 'Seleziona almeno una traccia da visualizzare'
                        : 'Nessun dato altimetrico disponibile'}
                </Text>
            </View>
        );
    }

    const selectedPoint = selectedPointIndex !== null ? elevationData[selectedPointIndex] : null;

    return (
        <View style={[styles.container, { height }]}>
            {/* Header compatto */}
            <View style={styles.headerContainer}>
                <Text style={styles.title}>📊 Profilo Altimetrico</Text>

                {/* Statistiche rapide compatte */}
                <View style={styles.statsContainer}>
                    <Text style={styles.statText}>
                        📏 {formatDistance(chartBounds.maxDistance)}
                    </Text>
                    <Text style={styles.statText}>⛰️ {Math.round(chartBounds.maxElevation)}m</Text>
                    <Text style={styles.statText}>
                        📈 +{Math.round(chartBounds.elevationGain)}m
                    </Text>
                    <Text style={styles.statText}>
                        📉 -{Math.round(chartBounds.elevationLoss)}m
                    </Text>
                </View>
            </View>

            <View
                style={{ width: chartWidth, alignSelf: 'center' }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <Svg height={chartHeight + 30} width={chartWidth}>
                    {/* Griglia orizzontale */}
                    {[...Array(5)].map((_, i) => {
                        const y = (i / 4) * chartHeight;
                        const elevation =
                            chartBounds.maxElevation -
                            (i / 4) * (chartBounds.maxElevation - chartBounds.minElevation);

                        return (
                            <React.Fragment key={i}>
                                <Line
                                    x1={0}
                                    y1={y}
                                    x2={chartWidth}
                                    y2={y}
                                    stroke="#E5E7EB"
                                    strokeWidth={0.5}
                                    strokeDasharray="5,5"
                                />
                                <SvgText x={5} y={y - 5} fontSize="10" fill="#6B7280">
                                    {Math.round(elevation)}m
                                </SvgText>
                            </React.Fragment>
                        );
                    })}

                    {/* Area del profilo */}
                    <Path
                        d={profilePath}
                        fill="rgba(59, 130, 246, 0.3)"
                        stroke="#3B82F6"
                        strokeWidth={2}
                    />

                    {/* Indicatore del punto selezionato - ora fluido */}
                    {cursorPosition && (
                        <>
                            <Line
                                x1={cursorPosition.x}
                                y1={0}
                                x2={cursorPosition.x}
                                y2={chartHeight}
                                stroke="#EF4444"
                                strokeWidth={2}
                            />
                            <Circle
                                cx={cursorPosition.x}
                                cy={cursorPosition.y}
                                r={4}
                                fill="#EF4444"
                            />

                            {/* Tooltip informazioni */}
                            <Rect
                                x={Math.max(0, Math.min(cursorPosition.x - 40, chartWidth - 80))}
                                y={Math.max(0, cursorPosition.y - 40)}
                                width={80}
                                height={35}
                                fill="rgba(0, 0, 0, 0.8)"
                                rx={4}
                            />
                            <SvgText
                                x={
                                    Math.max(0, Math.min(cursorPosition.x - 35, chartWidth - 75)) +
                                    40
                                }
                                y={Math.max(0, cursorPosition.y - 40) + 15}
                                fontSize="10"
                                fill="white"
                                textAnchor="middle"
                            >
                                {Math.round(cursorPosition.elevation)}m
                            </SvgText>
                            <SvgText
                                x={
                                    Math.max(0, Math.min(cursorPosition.x - 35, chartWidth - 75)) +
                                    40
                                }
                                y={Math.max(0, cursorPosition.y - 40) + 28}
                                fontSize="9"
                                fill="white"
                                textAnchor="middle"
                            >
                                {formatDistance(cursorPosition.distance)}
                            </SvgText>
                        </>
                    )}
                </Svg>
            </View>

            {cursorPosition && (
                <Text style={styles.selectedPointInfo}>
                    📍 {Math.round(cursorPosition.elevation)}m •{' '}
                    {formatDistance(cursorPosition.distance)} • Trascina per esplorare il tracciato
                </Text>
            )}
        </View>
    );
};

// Funzione per calcolare la distanza tra due coordinate GPS (Haversine)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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
}

function toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
}

function formatDistance(meters: number): string {
    if (meters >= 1000) {
        return `${(meters / 1000).toFixed(2)} km`;
    }
    return `${Math.round(meters)} m`;
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 12,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    headerContainer: {
        marginBottom: 12,
    },
    title: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 8,
        textAlign: 'center',
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: 8,
    },
    statText: {
        fontSize: 11,
        color: '#6B7280',
        fontWeight: '500',
    },
    noDataText: {
        textAlign: 'center',
        color: '#6B7280',
        fontSize: 14,
        marginTop: 50,
    },
    selectedPointInfo: {
        fontSize: 11,
        color: '#6B7280',
        textAlign: 'center',
        marginTop: 6,
        fontStyle: 'italic',
    },
});

export default ElevationProfile;
