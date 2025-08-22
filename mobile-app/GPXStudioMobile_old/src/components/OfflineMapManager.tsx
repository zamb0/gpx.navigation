import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { tileCacheService, TileCacheConfig } from '../services/TileCacheService';
import { OSMProviderType } from './MapProviderSelector';
import { useThemeColor } from '@/hooks/useThemeColor';

interface OfflineMapManagerProps {
    provider: OSMProviderType;
}

export default function OfflineMapManager({ provider }: OfflineMapManagerProps) {
    const [isDownloading, setIsDownloading] = useState(false);
    const [cacheStats, setCacheStats] = useState({ count: 0, totalSize: 0 });
    const [downloadProgress, setDownloadProgress] = useState('');

    React.useEffect(() => {
        loadCacheStats();
    }, []);

    const loadCacheStats = async () => {
        try {
            const stats = await tileCacheService.getCacheStats();
            setCacheStats(stats);
        } catch (error) {
            console.error('Error loading cache stats:', error);
        }
    };

    const formatBytes = (bytes: number): string => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const downloadCurrentArea = async () => {
        Alert.alert(
            'Download Mappa Offline',
            "Vuoi scaricare i tiles della mappa per l'area corrente? Questo permetterà di visualizzare la mappa offline.",
            [
                { text: 'Annulla', style: 'cancel' },
                {
                    text: 'Download',
                    onPress: async () => {
                        setIsDownloading(true);
                        setDownloadProgress('Avvio download...');

                        try {
                            // Area di esempio (Roma)
                            const config: TileCacheConfig = {
                                provider,
                                region: {
                                    latitude: 41.9028,
                                    longitude: 12.4964,
                                    latitudeDelta: 0.05, // Area piccola per test
                                    longitudeDelta: 0.05,
                                },
                                minZoom: 10,
                                maxZoom: 16, // Limita zoom per ridurre il numero di tiles
                            };

                            setDownloadProgress('Scaricando tiles...');
                            const result = await tileCacheService.preloadRegion(config);

                            setDownloadProgress(
                                `Completato: ${result.success} tiles scaricati, ${result.failed} falliti`
                            );

                            // Aggiorna le statistiche
                            await loadCacheStats();

                            Alert.alert(
                                'Download Completato',
                                `${result.success} tiles scaricati con successo${
                                    result.failed > 0 ? `, ${result.failed} falliti` : ''
                                }`
                            );
                        } catch (error) {
                            console.error('Error downloading tiles:', error);
                            Alert.alert('Errore', 'Errore durante il download dei tiles');
                        } finally {
                            setIsDownloading(false);
                            setDownloadProgress('');
                        }
                    },
                },
            ]
        );
    };

    const clearCache = async () => {
        Alert.alert(
            'Pulisci Cache',
            "Vuoi eliminare tutti i tiles scaricati? Questo libererà spazio ma richiederà nuovi download per l'uso offline.",
            [
                { text: 'Annulla', style: 'cancel' },
                {
                    text: 'Elimina',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await tileCacheService.clearCache();
                            await loadCacheStats();
                            Alert.alert('Cache Pulita', 'Tutti i tiles sono stati eliminati');
                        } catch (error) {
                            console.error('Error clearing cache:', error);
                            Alert.alert('Errore', 'Errore durante la pulizia della cache');
                        }
                    },
                },
            ]
        );
    };

    return (
        <OfflineMapManagerThemed
            provider={provider}
            isDownloading={isDownloading}
            cacheStats={cacheStats}
            downloadProgress={downloadProgress}
            downloadCurrentArea={downloadCurrentArea}
            clearCache={clearCache}
        />
    );
}

function OfflineMapManagerThemed({
    provider,
    isDownloading,
    cacheStats,
    downloadProgress,
    downloadCurrentArea,
    clearCache,
}: any) {
    const backgroundColor = useThemeColor({}, 'card');
    const textColor = useThemeColor({}, 'text');
    const placeholderColor = useThemeColor({}, 'placeholder');
    const accentColor = useThemeColor({}, 'accent');
    const primaryColor = useThemeColor({}, 'primary');
    const dangerColor = useThemeColor({}, 'danger');

    const formatBytes = (bytes: number): string => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <View style={[styles.container, { backgroundColor }]}>
            <Text style={[styles.title, { color: textColor }]}>🗺️ Mappe Offline</Text>

            <View style={styles.statsContainer}>
                <Text style={[styles.statsText, { color: placeholderColor }]}>
                    Tiles in cache: {cacheStats.count}
                </Text>
                <Text style={[styles.statsText, { color: placeholderColor }]}>
                    Spazio occupato: {formatBytes(cacheStats.totalSize)}
                </Text>
            </View>

            {isDownloading && (
                <View style={[styles.progressContainer, { backgroundColor: accentColor }]}>
                    <ActivityIndicator size="small" color={primaryColor} />
                    <Text style={[styles.progressText, { color: primaryColor }]}>
                        {downloadProgress}
                    </Text>
                </View>
            )}

            <View style={styles.buttonContainer}>
                <TouchableOpacity
                    style={[
                        styles.button,
                        styles.downloadButton,
                        { backgroundColor: primaryColor },
                    ]}
                    onPress={downloadCurrentArea}
                    disabled={isDownloading}
                >
                    <Text style={styles.downloadButtonText}>
                        {isDownloading ? 'Scaricando...' : 'Scarica Area Corrente'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, styles.clearButton, { backgroundColor: dangerColor }]}
                    onPress={clearCache}
                    disabled={isDownloading || cacheStats.count === 0}
                >
                    <Text style={styles.clearButtonText}>Pulisci Cache</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        borderRadius: 8,
        marginVertical: 8,
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    statsContainer: {
        marginBottom: 16,
    },
    statsText: {
        fontSize: 14,
        marginBottom: 4,
    },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        padding: 12,
        borderRadius: 6,
    },
    progressText: {
        marginLeft: 8,
        fontSize: 14,
    },
    buttonContainer: {
        gap: 8,
    },
    button: {
        padding: 12,
        borderRadius: 6,
        alignItems: 'center',
    },
    downloadButton: {},
    downloadButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
    },
    clearButton: {},
    clearButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
    },
});
