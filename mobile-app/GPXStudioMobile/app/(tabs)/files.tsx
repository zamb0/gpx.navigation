import { StyleSheet, ScrollView, TouchableOpacity, Alert, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useGPXContext } from '@/src/context/GPXContext';
import WaypointLegend from '@/src/components/WaypointLegend';

export default function FilesScreen() {
    const { files, loading, error, pickFile, removeFile, clearAll } = useGPXContext();

    const handleImportFile = async () => {
        try {
            await pickFile();
        } catch (err) {
            Alert.alert('Error', 'Failed to import GPX file');
        }
    };

    return (
        <ThemedView style={styles.container}>
            <ThemedView style={styles.header}>
                <ThemedText type="title">My GPX Files</ThemedText>
                <ThemedText type="subtitle">Import, manage and organize your tracks</ThemedText>
            </ThemedView>

            <ScrollView style={styles.content}>
                {/* Waypoint Legend - mostra solo se ci sono waypoint caricati */}
                {files.some((f) => f.data && f.data.wpt && f.data.wpt.length > 0) && (
                    <WaypointLegend
                        usedTypes={files.flatMap(
                            (f) =>
                                f.data?.wpt?.map((w) => ({
                                    type: w.type,
                                    symbol: w.sym,
                                    name: w.name,
                                })) || []
                        )}
                    />
                )}

                <ThemedView style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <ThemedText type="defaultSemiBold">
                            📁 Loaded Files ({files.length})
                        </ThemedText>
                        {files.length > 0 && (
                            <TouchableOpacity onPress={clearAll} style={styles.clearButton}>
                                <ThemedText style={styles.clearButtonText}>Clear All</ThemedText>
                            </TouchableOpacity>
                        )}
                    </View>

                    {files.length === 0 ? (
                        <ThemedView style={styles.emptyState}>
                            <ThemedText style={styles.emptyText}>
                                No GPX files loaded yet
                            </ThemedText>
                            <ThemedText type="default">
                                Tap "Import GPX File" to get started
                            </ThemedText>
                        </ThemedView>
                    ) : (
                        files.map((file) => (
                            <ThemedView key={file.id} style={styles.fileItem}>
                                <View style={styles.fileInfo}>
                                    <ThemedText type="defaultSemiBold" numberOfLines={1}>
                                        {file.data ? '✅' : file.error ? '❌' : '⏳'} {file.name}
                                    </ThemedText>
                                    <ThemedText type="default" style={styles.fileDetails}>
                                        Size: {(file.size / 1024).toFixed(1)} KB
                                        {file.data && (
                                            <>
                                                {' • Tracks: '}
                                                {file.data.trk?.length || 0}
                                                {' • Waypoints: '}
                                                {file.data.wpt?.length || 0}
                                            </>
                                        )}
                                        {file.error && (
                                            <ThemedText style={styles.errorText}>
                                                {' '}
                                                • {file.error}
                                            </ThemedText>
                                        )}
                                    </ThemedText>
                                </View>
                                <TouchableOpacity
                                    onPress={() => removeFile(file.id)}
                                    style={styles.deleteButton}
                                >
                                    <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                                </TouchableOpacity>
                            </ThemedView>
                        ))
                    )}
                </ThemedView>

                <ThemedView style={styles.section}>
                    <ThemedText type="defaultSemiBold">⚡ Quick Actions</ThemedText>
                    <ThemedView style={styles.actionButtons}>
                        <TouchableOpacity style={styles.actionButton} onPress={handleImportFile}>
                            <Ionicons name="document-attach-outline" size={24} color="#007AFF" />
                            <ThemedText style={styles.actionButtonText}>Import GPX File</ThemedText>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionButton}>
                            <Ionicons name="cloud-upload-outline" size={24} color="#007AFF" />
                            <ThemedText style={styles.actionButtonText}>Sync with Cloud</ThemedText>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionButton}>
                            <Ionicons name="link-outline" size={24} color="#007AFF" />
                            <ThemedText style={styles.actionButtonText}>Import from URL</ThemedText>
                        </TouchableOpacity>
                    </ThemedView>
                </ThemedView>
            </ScrollView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        padding: 20,
        paddingTop: 60,
        alignItems: 'center',
    },
    content: {
        flex: 1,
        padding: 20,
    },
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    emptyState: {
        alignItems: 'center',
        padding: 40,
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderRadius: 12,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: '#ccc',
    },
    emptyText: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    actionButtons: {
        gap: 12,
        marginTop: 16,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderRadius: 12,
        gap: 12,
    },
    actionButtonText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#007AFF',
    },
    clearButton: {
        backgroundColor: '#FF3B30',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
    },
    clearButtonText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
    },
    fileItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderRadius: 12,
        marginBottom: 8,
    },
    fileInfo: {
        flex: 1,
    },
    fileDetails: {
        fontSize: 12,
        opacity: 0.7,
        marginTop: 4,
    },
    errorText: {
        color: '#FF3B30',
    },
    deleteButton: {
        padding: 8,
        marginLeft: 8,
    },
});
