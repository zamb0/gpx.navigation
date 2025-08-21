/**
 * Type definitions for GPX data adapted to map interfaces
 * Extends the core GPX types (read-only) with app-specific interfaces
 */

import type { GPXFile, TrackSegment, TrackPoint } from '@/src/lib/gpx/gpx';

// Interface per coordinate compatibili con mappe
export interface MapCoordinate {
    latitude: number;
    longitude: number;
    elevation?: number;
}

// Interface per tracce compatibili con Leaflet
export interface LeafletGPXTrack {
    id: string;
    name: string;
    coordinates: MapCoordinate[];
    color?: string;
    opacity?: number;
}

// Interface per waypoint compatibili con Leaflet
export interface LeafletGPXWaypoint {
    id: string;
    name: string;
    latitude: number; // Direct coordinates for backward compatibility
    longitude: number;
    elevation?: number;
    description?: string;
    type?: string;
    symbol?: string; // Note: icon renamed to symbol for compatibility
    fileIndex?: number; // Index of the source file to enable visibility filtering
}

// Interface per statistiche traccia
export interface TrackStatistics {
    distance: number; // in meters
    elevationGain: number; // in meters
    elevationLoss: number; // in meters
    minElevation: number; // in meters
    maxElevation: number; // in meters
    duration?: number; // in seconds
    averageSpeed?: number; // in m/s
}

// Interface per bounds della mappa
export interface MapBounds {
    north: number;
    south: number;
    east: number;
    west: number;
}

// Interface per dati convertiti pronti per la mappa
export interface ConvertedGPXData {
    tracks: LeafletGPXTrack[];
    waypoints: LeafletGPXWaypoint[];
    bounds?: MapBounds;
    statistics?: TrackStatistics;
}

// Type alias per backward compatibility con codice esistente
export type GPXTrack = LeafletGPXTrack;
export type GPXWaypoint = LeafletGPXWaypoint;
