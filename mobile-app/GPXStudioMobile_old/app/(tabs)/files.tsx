import { StyleSheet, ScrollView, TouchableOpacity, Alert, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useGPXContext } from '@/src/context/GPXContext';
import WaypointLegend from '@/src/components/WaypointLegend';
import { useThemeColor } from '@/hooks/useThemeColor';

export default function FilesScreen() {
    const { files, loading, error, pickFile, removeFile, clearAll } = useGPXContext();

    const muteColor = useThemeColor({}, 'muted');
    const primaryColor = useThemeColor({}, 'primary');
    const dangerColor = useThemeColor({}, 'danger');
    const borderColor = useThemeColor({}, 'border');

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
                <ThemedText type="title">gpx files</ThemedText>
                {/* <ThemedText type="subtitle">Import, manage and organize your tracks</ThemedText> */}
            </ThemedView>

            <ScrollView style={styles.content}>
                {/* Waypoint Legend - mostra solo se ci sono waypoint caricati */}
                {files.some((f) => f.data && f.data.wpt && f.data.wpt.length > 0) && (
                    <WaypointLegend />
                )}

                <ThemedView style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <ThemedText type="defaultSemiBold">
                            📁 Loaded Files ({files.length})
                        </ThemedText>
                        {files.length > 0 && (
                            <TouchableOpacity
                                onPress={clearAll}
                                style={[styles.clearButton, { backgroundColor: dangerColor }]}
                            >
                                <ThemedText style={styles.clearButtonText}>Clear All</ThemedText>
                            </TouchableOpacity>
                        )}
                    </View>

                    {files.length === 0 ? (
                        <ThemedView
                            style={[
                                styles.emptyState,
                                {
                                    backgroundColor: muteColor,
                                    borderColor,
                                },
                            ]}
                        >
                            <ThemedText style={styles.emptyText}>
                                No GPX files loaded yet
                            </ThemedText>
                            <ThemedText type="default">
                                Tap "Import GPX File" to get started
                            </ThemedText>
                        </ThemedView>
                    ) : (
                        files.map((file) => (
                            <ThemedView
                                key={file.id}
                                style={[styles.fileItem, { backgroundColor: muteColor }]}
                            >
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
                                            <ThemedText
                                                style={[styles.errorText, { color: dangerColor }]}
                                            >
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
                                    <Ionicons name="trash-outline" size={20} color={dangerColor} />
                                </TouchableOpacity>
                            </ThemedView>
                        ))
                    )}
                </ThemedView>

                <ThemedView style={styles.section}>
                    <ThemedText type="defaultSemiBold">⚡ Quick Actions</ThemedText>
                    <ThemedView style={styles.actionButtons}>
                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: muteColor }]}
                            onPress={handleImportFile}
                        >
                            <Ionicons
                                name="document-attach-outline"
                                size={24}
                                color={primaryColor}
                            />
                            <ThemedText style={[styles.actionButtonText, { color: primaryColor }]}>
                                Import GPX File
                            </ThemedText>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: muteColor }]}
                        >
                            <Ionicons name="cloud-upload-outline" size={24} color={primaryColor} />
                            <ThemedText style={[styles.actionButtonText, { color: primaryColor }]}>
                                Sync with Cloud
                            </ThemedText>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: muteColor }]}
                        >
                            <Ionicons name="link-outline" size={24} color={primaryColor} />
                            <ThemedText style={[styles.actionButtonText, { color: primaryColor }]}>
                                Import from URL
                            </ThemedText>
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
        borderRadius: 12,
        borderWidth: 2,
        borderStyle: 'dashed',
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
        borderRadius: 12,
        gap: 12,
    },
    actionButtonText: {
        fontSize: 16,
        fontWeight: '500',
    },
    clearButton: {
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
    errorText: {},
    deleteButton: {
        padding: 8,
        marginLeft: 8,
    },
});
