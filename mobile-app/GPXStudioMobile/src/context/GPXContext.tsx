import React, { createContext, useContext, ReactNode } from 'react';
import { useGPXFiles, GPXFile } from '../hooks/useGPXFiles';
import { convertGPXToMapData } from '../utils/gpxConverter';
import type { GPXTrack, GPXWaypoint as MapWaypoint } from '../components/GPXMap';

interface GPXContextType {
    files: GPXFile[];
    loading: boolean;
    error: string | null;
    pickFile: () => Promise<void>;
    removeFile: (id: string) => void;
    clearAll: () => void;
    getAllTracks: () => GPXTrack[];
    getAllWaypoints: () => MapWaypoint[];
    getActiveFile: () => GPXFile | null;
}

const GPXContext = createContext<GPXContextType | null>(null);

export function GPXProvider({ children }: { children: ReactNode }) {
    const gpxFiles = useGPXFiles();

    const getAllTracks = (): GPXTrack[] => {
        try {
            const allTracks: GPXTrack[] = [];

            if (!gpxFiles.files || !Array.isArray(gpxFiles.files)) {
                return [];
            }

            gpxFiles.files.forEach((file, fileIndex) => {
                if (file.data) {
                    try {
                        const { tracks } = convertGPXToMapData(file.data);
                        if (tracks && Array.isArray(tracks)) {
                            // Prefix track IDs with file index to avoid conflicts
                            const prefixedTracks = tracks.map((track) => ({
                                ...track,
                                id: `file-${fileIndex}-${track.id}`,
                                name: `${file.name}: ${track.name}`,
                            }));
                            allTracks.push(...prefixedTracks);
                        }
                    } catch (err) {
                        console.warn('Error converting GPX track data:', err);
                    }
                }
            });

            return allTracks;
        } catch (err) {
            console.error('Error in getAllTracks:', err);
            return [];
        }
    };

    const getAllWaypoints = (): MapWaypoint[] => {
        try {
            const allWaypoints: MapWaypoint[] = [];

            if (!gpxFiles.files || !Array.isArray(gpxFiles.files)) {
                return [];
            }

            gpxFiles.files.forEach((file, fileIndex) => {
                if (file.data) {
                    try {
                        const { waypoints } = convertGPXToMapData(file.data);
                        if (waypoints && Array.isArray(waypoints)) {
                            // Prefix waypoint IDs with file index to avoid conflicts
                            const prefixedWaypoints = waypoints.map((waypoint) => ({
                                ...waypoint,
                                id: `file-${fileIndex}-${waypoint.id}`,
                                name: `${file.name}: ${waypoint.name}`,
                            }));
                            allWaypoints.push(...prefixedWaypoints);
                        }
                    } catch (err) {
                        console.warn('Error converting GPX waypoint data:', err);
                    }
                }
            });

            return allWaypoints;
        } catch (err) {
            console.error('Error in getAllWaypoints:', err);
            return [];
        }
    };

    const getActiveFile = (): GPXFile | null => {
        try {
            // Return the most recently loaded file with data
            const filesWithData = gpxFiles.files.filter((f) => f.data);
            return filesWithData.length > 0 ? filesWithData[filesWithData.length - 1] : null;
        } catch (err) {
            console.error('Error in getActiveFile:', err);
            return null;
        }
    };

    const contextValue: GPXContextType = {
        ...gpxFiles,
        getAllTracks,
        getAllWaypoints,
        getActiveFile,
    };

    return <GPXContext.Provider value={contextValue}>{children}</GPXContext.Provider>;
}

export function useGPXContext(): GPXContextType {
    const context = useContext(GPXContext);
    if (!context) {
        throw new Error('useGPXContext must be used within a GPXProvider');
    }
    return context;
}
