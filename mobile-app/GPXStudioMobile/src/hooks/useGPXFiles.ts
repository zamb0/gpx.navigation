import { useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { parseGPX } from '../lib/gpx';
import type { GPXFile as GPXFileClass } from '../lib/gpx/gpx';

export interface GPXFile {
    id: string;
    name: string;
    uri: string;
    size: number;
    lastModified: Date;
    data?: GPXFileClass;
    error?: string;
}

interface UseGPXFilesResult {
    files: GPXFile[];
    loading: boolean;
    error: string | null;
    pickFile: () => Promise<void>;
    parseFile: (file: GPXFile) => Promise<void>;
    removeFile: (id: string) => void;
    clearAll: () => void;
}

export function useGPXFiles(): UseGPXFilesResult {
    const [files, setFiles] = useState<GPXFile[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const pickFile = async () => {
        try {
            setLoading(true);
            setError(null);

            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/gpx+xml', 'application/xml', 'text/xml', '*/*'],
                copyToCacheDirectory: true,
                multiple: true,
            });

            if (!result.canceled) {
                const newFiles: GPXFile[] = result.assets.map((asset) => ({
                    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    name: asset.name,
                    uri: asset.uri,
                    size: asset.size || 0,
                    lastModified: new Date(),
                }));

                setFiles((prev) => [...prev, ...newFiles]);

                // Auto-parse all selected files
                for (const file of newFiles) {
                    await parseFile(file);
                }
            }
        } catch (err) {
            console.error('Error picking file:', err);
            setError(
                `Failed to pick file: ${err instanceof Error ? err.message : 'Unknown error'}`
            );
        } finally {
            setLoading(false);
        }
    };

    const parseFile = async (file: GPXFile) => {
        try {
            setLoading(true);
            setError(null);

            // Read file content
            const content = await FileSystem.readAsStringAsync(file.uri);

            // Parse GPX content
            const gpxData = parseGPX(content);

            // Update file with parsed data
            setFiles((prev) =>
                prev.map((f) => (f.id === file.id ? { ...f, data: gpxData, error: undefined } : f))
            );

            console.log(`✅ GPX parsed successfully: ${file.name}`, {
                tracks: gpxData.trk?.length || 0,
                waypoints: gpxData.wpt?.length || 0,
                routes: gpxData.rte?.length || 0,
            });
        } catch (err) {
            console.error('Error parsing GPX:', err);
            const errorMsg = `Failed to parse GPX: ${
                err instanceof Error ? err.message : 'Invalid format'
            }`;

            // Update file with error
            setFiles((prev) => prev.map((f) => (f.id === file.id ? { ...f, error: errorMsg } : f)));

            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const removeFile = (id: string) => {
        setFiles((prev) => prev.filter((f) => f.id !== id));
    };

    const clearAll = () => {
        setFiles([]);
        setError(null);
    };

    return {
        files,
        loading,
        error,
        pickFile,
        parseFile,
        removeFile,
        clearAll,
    };
}
