/**
 * GPX to Map Data Mappers
 * Converts GPX core library data to format suitable for map display
 * Uses ONLY the read-only lib/gpx library as source
 */

import type { GPXFile as GPXFileClass } from '@/src/lib/gpx/gpx';
import type {
    LeafletGPXTrack,
    LeafletGPXWaypoint,
    ConvertedGPXData,
    TrackStatistics,
    MapBounds,
    MapCoordinate,
} from './types';

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

/**
 * Converts GPX data to Leaflet-compatible tracks
 * @param gpxData - Core GPX file data (read-only)
 * @returns Array of Leaflet tracks
 */
export function gpxToLeafletTracks(gpxData: GPXFileClass): LeafletGPXTrack[] {
    try {
        const tracks: LeafletGPXTrack[] = [];

        if (!gpxData.trk || !Array.isArray(gpxData.trk)) {
            return tracks;
        }

        gpxData.trk.forEach((track, index) => {
            try {
                // Safety check for track segments
                if (!track.trkseg || !Array.isArray(track.trkseg)) {
                    console.warn(`Track ${index} has no segments`);
                    return;
                }

                // Flatten all track segments into one coordinate array
                const coordinates: MapCoordinate[] = track.trkseg.flatMap((segment) => {
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
                    opacity: 0.8,
                });
            } catch (err) {
                console.error(`Error converting track ${index}:`, err);
            }
        });

        return tracks;
    } catch (err) {
        console.error('Error in gpxToLeafletTracks:', err);
        return [];
    }
}

/**
 * Converts GPX data to Leaflet-compatible waypoints
 * @param gpxData - Core GPX file data (read-only)
 * @param fileIndex - Index of the source file for visibility filtering
 * @returns Array of Leaflet waypoints
 */
export function gpxToLeafletWaypoints(
    gpxData: GPXFileClass,
    fileIndex?: number
): LeafletGPXWaypoint[] {
    try {
        const waypoints: LeafletGPXWaypoint[] = [];

        if (!gpxData.wpt || !Array.isArray(gpxData.wpt)) {
            return waypoints;
        }

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
                    fileIndex,
                });
            } catch (err) {
                console.error(`Error converting waypoint ${index}:`, err);
            }
        });

        return waypoints;
    } catch (err) {
        console.error('Error in gpxToLeafletWaypoints:', err);
        return [];
    }
}

/**
 * Calculates bounding box for GPX data
 * @param gpxData - Core GPX file data (read-only)
 * @returns Map bounds or undefined if no coordinates
 */
export function gpxToMapBounds(gpxData: GPXFileClass): MapBounds | undefined {
    try {
        let minLat = Infinity;
        let maxLat = -Infinity;
        let minLon = Infinity;
        let maxLon = -Infinity;
        let hasCoordinates = false;

        // Check tracks
        if (gpxData.trk && Array.isArray(gpxData.trk)) {
            gpxData.trk.forEach((track) => {
                if (!track.trkseg || !Array.isArray(track.trkseg)) return;

                track.trkseg.forEach((segment) => {
                    if (!segment.trkpt || !Array.isArray(segment.trkpt)) return;

                    segment.trkpt.forEach((point) => {
                        if (
                            point.attributes &&
                            typeof point.attributes.lat === 'number' &&
                            typeof point.attributes.lon === 'number'
                        ) {
                            const lat = point.attributes.lat;
                            const lon = point.attributes.lon;

                            minLat = Math.min(minLat, lat);
                            maxLat = Math.max(maxLat, lat);
                            minLon = Math.min(minLon, lon);
                            maxLon = Math.max(maxLon, lon);
                            hasCoordinates = true;
                        }
                    });
                });
            });
        }

        // Check waypoints
        if (gpxData.wpt && Array.isArray(gpxData.wpt)) {
            gpxData.wpt.forEach((waypoint) => {
                if (
                    waypoint.attributes &&
                    typeof waypoint.attributes.lat === 'number' &&
                    typeof waypoint.attributes.lon === 'number'
                ) {
                    const lat = waypoint.attributes.lat;
                    const lon = waypoint.attributes.lon;

                    minLat = Math.min(minLat, lat);
                    maxLat = Math.max(maxLat, lat);
                    minLon = Math.min(minLon, lon);
                    maxLon = Math.max(maxLon, lon);
                    hasCoordinates = true;
                }
            });
        }

        if (!hasCoordinates) {
            return undefined;
        }

        return {
            north: maxLat,
            south: minLat,
            east: maxLon,
            west: minLon,
        };
    } catch (err) {
        console.error('Error calculating GPX bounds:', err);
        return undefined;
    }
}

/**
 * Calculates comprehensive statistics for GPX data
 * @param gpxData - Core GPX file data (read-only)
 * @returns Track statistics
 */
export function gpxToTrackStatistics(gpxData: GPXFileClass): TrackStatistics {
    try {
        let totalDistance = 0;
        let totalElevationGain = 0;
        let totalElevationLoss = 0;
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
                                } else if (elevationDiff < 0) {
                                    totalElevationLoss += Math.abs(elevationDiff);
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

                        // Distance calculation
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

        // Calculate average speed if duration is available
        const duration =
            startTime && endTime ? (endTime.getTime() - startTime.getTime()) / 1000 : undefined;
        const averageSpeed = duration && duration > 0 ? totalDistance / duration : undefined;

        return {
            distance: totalDistance,
            elevationGain: totalElevationGain,
            elevationLoss: totalElevationLoss,
            minElevation: minElevation === Infinity ? 0 : minElevation,
            maxElevation: maxElevation === -Infinity ? 0 : maxElevation,
            duration,
            averageSpeed,
        };
    } catch (err) {
        console.error('Error calculating GPX statistics:', err);
        return {
            distance: 0,
            elevationGain: 0,
            elevationLoss: 0,
            minElevation: 0,
            maxElevation: 0,
        };
    }
}

/**
 * All-in-one converter function that replaces convertGPXToMapData
 * @param gpxData - Core GPX file data (read-only)
 * @param fileIndex - Index of the source file for visibility filtering
 * @returns Complete converted data ready for map display
 */
export function convertGPXToMapData(gpxData: GPXFileClass, fileIndex?: number): ConvertedGPXData {
    try {
        const tracks = gpxToLeafletTracks(gpxData);
        const waypoints = gpxToLeafletWaypoints(gpxData, fileIndex);
        const bounds = gpxToMapBounds(gpxData);
        const statistics = gpxToTrackStatistics(gpxData);

        return {
            tracks,
            waypoints,
            bounds,
            statistics,
        };
    } catch (err) {
        console.error('Error in convertGPXToMapData:', err);
        return {
            tracks: [],
            waypoints: [],
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
