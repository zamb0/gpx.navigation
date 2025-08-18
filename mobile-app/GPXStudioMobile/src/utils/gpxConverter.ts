import type { GPXFile as GPXFileClass } from '../lib/gpx/gpx';
import type { GPXTrack, GPXWaypoint as MapWaypoint } from '../components/GPXMap';

// Colori per i diversi track
const TRACK_COLORS = [
    '#FF0000', // Red
    '#00FF00', // Green
    '#0000FF', // Blue
    '#FF8000', // Orange
    '#8000FF', // Purple
    '#FF0080', // Pink
    '#00FFFF', // Cyan
    '#FFFF00', // Yellow
];

export function convertGPXToMapData(gpxData: GPXFileClass): {
    tracks: GPXTrack[];
    waypoints: MapWaypoint[];
} {
    try {
        // Safe check for tracks
        const tracks: GPXTrack[] = [];
        if (gpxData.trk && Array.isArray(gpxData.trk)) {
            gpxData.trk.forEach((track, index) => {
                try {
                    // Safety check for track segments
                    if (!track.trkseg || !Array.isArray(track.trkseg)) {
                        console.warn(`Track ${index} has no segments`);
                        return;
                    }

                    // Flatten all track segments into one coordinate array
                    const coordinates = track.trkseg.flatMap((segment) => {
                        if (!segment.trkpt || !Array.isArray(segment.trkpt)) {
                            return [];
                        }
                        return segment.trkpt
                            .filter(
                                (point) =>
                                    point.attributes &&
                                    typeof point.attributes.lat === 'number' &&
                                    typeof point.attributes.lon === 'number'
                            )
                            .map((point) => ({
                                latitude: point.getLatitude(),
                                longitude: point.getLongitude(),
                                elevation: point.ele || undefined,
                                time: point.time || undefined,
                            }));
                    });

                    if (coordinates.length === 0) {
                        console.warn(`Track ${index} has no valid coordinates`);
                        return;
                    }

                    // Get color from extensions or use default
                    const styleColor = track.extensions?.['gpx_style:line']?.['gpx_style:color'];
                    const color = styleColor || TRACK_COLORS[index % TRACK_COLORS.length];

                    tracks.push({
                        id: `track-${index}`,
                        name: track.name || `Track ${index + 1}`,
                        coordinates,
                        color,
                    });
                } catch (err) {
                    console.error(`Error converting track ${index}:`, err);
                }
            });
        }

        // Safe check for waypoints
        const waypoints: MapWaypoint[] = [];
        if (gpxData.wpt && Array.isArray(gpxData.wpt)) {
            gpxData.wpt.forEach((waypoint, index) => {
                try {
                    // Safety check for waypoint coordinates
                    if (
                        !waypoint.attributes ||
                        typeof waypoint.attributes.lat !== 'number' ||
                        typeof waypoint.attributes.lon !== 'number'
                    ) {
                        console.warn(`Waypoint ${index} has invalid coordinates`);
                        return;
                    }

                    waypoints.push({
                        id: `waypoint-${index}`,
                        name: waypoint.name || `Waypoint ${index + 1}`,
                        latitude: waypoint.attributes.lat,
                        longitude: waypoint.attributes.lon,
                        elevation: waypoint.ele || undefined,
                        description: waypoint.desc || waypoint.cmt || undefined,
                        type: waypoint.type || undefined,
                        symbol: waypoint.sym || undefined,
                    });
                } catch (err) {
                    console.error(`Error converting waypoint ${index}:`, err);
                }
            });
        }

        return { tracks, waypoints };
    } catch (err) {
        console.error('Error in convertGPXToMapData:', err);
        return { tracks: [], waypoints: [] };
    }
}

export function getGPXStatistics(gpxData: GPXFileClass) {
    try {
        let totalDistance = 0;
        let totalElevationGain = 0;
        let minElevation = Infinity;
        let maxElevation = -Infinity;
        let startTime: Date | undefined;
        let endTime: Date | undefined;

        // Calculate statistics for all tracks
        if (gpxData.trk && Array.isArray(gpxData.trk)) {
            gpxData.trk.forEach((track) => {
                if (!track.trkseg || !Array.isArray(track.trkseg)) return;

                track.trkseg.forEach((segment) => {
                    if (!segment.trkpt || !Array.isArray(segment.trkpt)) return;

                    for (let i = 0; i < segment.trkpt.length; i++) {
                        const point = segment.trkpt[i];

                        // Elevation statistics
                        if (point.ele !== undefined) {
                            minElevation = Math.min(minElevation, point.ele);
                            maxElevation = Math.max(maxElevation, point.ele);

                            if (i > 0 && segment.trkpt[i - 1].ele !== undefined) {
                                const elevationDiff = point.ele - segment.trkpt[i - 1].ele!;
                                if (elevationDiff > 0) {
                                    totalElevationGain += elevationDiff;
                                }
                            }
                        }

                        // Time statistics
                        if (point.time) {
                            if (!startTime || point.time < startTime) {
                                startTime = point.time;
                            }
                            if (!endTime || point.time > endTime) {
                                endTime = point.time;
                            }
                        }

                        // Distance calculation (simplified)
                        if (i > 0) {
                            const prevPoint = segment.trkpt[i - 1];
                            const distance = calculateDistance(
                                prevPoint.getLatitude(),
                                prevPoint.getLongitude(),
                                point.getLatitude(),
                                point.getLongitude()
                            );
                            totalDistance += distance;
                        }
                    }
                });
            });
        }

        return {
            totalDistance,
            totalElevationGain,
            minElevation: minElevation === Infinity ? undefined : minElevation,
            maxElevation: maxElevation === -Infinity ? undefined : maxElevation,
            startTime,
            endTime,
            duration: startTime && endTime ? endTime.getTime() - startTime.getTime() : undefined,
        };
    } catch (err) {
        console.error('Error calculating GPX statistics:', err);
        return {
            totalDistance: 0,
            totalElevationGain: 0,
            minElevation: undefined,
            maxElevation: undefined,
            startTime: undefined,
            endTime: undefined,
            duration: undefined,
        };
    }
}

// Simplified distance calculation using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the Earth in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km
    return distance * 1000; // Convert to meters
}
