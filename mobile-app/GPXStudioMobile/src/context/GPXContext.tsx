import React, { createContext, useContext, ReactNode } from 'react';
import { useGPXFiles, GPXFile } from '@/src/hooks/useGPXFiles';
import { convertGPXToMapData } from '@/src/lib/gpx-adapters/mappers';
import type { LeafletGPXTrack, LeafletGPXWaypoint } from '@/src/lib/gpx-adapters/types';

interface GPXContextType {
    files: GPXFile[];
    loading: boolean;
    error: string | null;
    pickFile: () => Promise<void>;
    removeFile: (id: string) => void;
    clearAll: () => void;
    getAllTracks: () => LeafletGPXTrack[];
    getAllWaypoints: () => LeafletGPXWaypoint[];
    getVisibleWaypoints: (trackVisibility?: Map<number, boolean>) => LeafletGPXWaypoint[];
    getActiveFile: () => GPXFile | null;
}

const GPXContext = createContext<GPXContextType | null>(null);

export function GPXProvider({ children }: { children: ReactNode }) {
    const gpxFiles = useGPXFiles();

    const getAllTracks = (): LeafletGPXTrack[] => {
        try {
            const allTracks: LeafletGPXTrack[] = [];

            if (!gpxFiles.files || !Array.isArray(gpxFiles.files)) {
                return [];
            }

            gpxFiles.files.forEach((file, fileIndex) => {
                if (file.data) {
                    try {
                        const { tracks, waypoints } = convertGPXToMapData(file.data, fileIndex);
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

    const getAllWaypoints = (): LeafletGPXWaypoint[] => {
        try {
            const allWaypoints: LeafletGPXWaypoint[] = [];

            if (!gpxFiles.files || !Array.isArray(gpxFiles.files)) {
                return [];
            }

            gpxFiles.files.forEach((file, fileIndex) => {
                if (file.data) {
                    try {
                        const { waypoints } = convertGPXToMapData(file.data, fileIndex);
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

    const getVisibleWaypoints = (trackVisibility?: Map<number, boolean>): LeafletGPXWaypoint[] => {
        try {
            if (!trackVisibility || trackVisibility.size === 0) {
                // If no visibility map provided, return all waypoints
                return getAllWaypoints();
            }

            const allWaypoints = getAllWaypoints();
            const allTracks = getAllTracks();

            // Create a map of fileIndex to whether that file has any visible tracks
            const fileVisibilityMap = new Map<number, boolean>();

            allTracks.forEach((track, trackIndex) => {
                const isTrackVisible = trackVisibility.get(trackIndex) !== false;

                // Extract fileIndex from track ID (format: "file-{fileIndex}-track-{trackIndex}")
                const fileIndexMatch = track.id.match(/^file-(\d+)-/);
                if (fileIndexMatch) {
                    const fileIndex = parseInt(fileIndexMatch[1], 10);

                    // If any track from this file is visible, mark the file as visible
                    if (isTrackVisible) {
                        fileVisibilityMap.set(fileIndex, true);
                    } else if (!fileVisibilityMap.has(fileIndex)) {
                        // Only set to false if not already set to true
                        fileVisibilityMap.set(fileIndex, false);
                    }
                }
            });

            // Filter waypoints based on their file visibility
            return allWaypoints.filter((waypoint) => {
                if (waypoint.fileIndex === undefined) {
                    // If fileIndex is not set, show the waypoint by default
                    return true;
                }

                return fileVisibilityMap.get(waypoint.fileIndex) === true;
            });
        } catch (err) {
            console.error('Error in getVisibleWaypoints:', err);
            return getAllWaypoints();
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
        getVisibleWaypoints,
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
