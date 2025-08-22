import { StyleSheet, ScrollView } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';

export default function ToolsScreen() {
    const cardColor = useThemeColor({}, 'card');
    const borderColor = useThemeColor({}, 'border');

    return (
        <ThemedView style={styles.container}>
            <ThemedView style={styles.header}>
                <ThemedText type="title">GPX Tools</ThemedText>
                <ThemedText type="subtitle">Edit, analyze and optimize your tracks</ThemedText>
            </ThemedView>

            <ScrollView style={styles.content}>
                <ThemedView style={styles.section}>
                    <ThemedText type="defaultSemiBold">✂️ Editing Tools</ThemedText>
                    <ThemedView style={styles.toolGrid}>
                        <ThemedView
                            style={[styles.toolCard, { backgroundColor: cardColor, borderColor }]}
                        >
                            <ThemedText style={styles.toolIcon}>✂️</ThemedText>
                            <ThemedText type="defaultSemiBold">Scissors</ThemedText>
                            <ThemedText type="default">Cut and split tracks</ThemedText>
                        </ThemedView>
                        <ThemedView
                            style={[styles.toolCard, { backgroundColor: cardColor, borderColor }]}
                        >
                            <ThemedText style={styles.toolIcon}>🔗</ThemedText>
                            <ThemedText type="defaultSemiBold">Merge</ThemedText>
                            <ThemedText type="default">Join multiple tracks</ThemedText>
                        </ThemedView>
                        <ThemedView
                            style={[styles.toolCard, { backgroundColor: cardColor, borderColor }]}
                        >
                            <ThemedText style={styles.toolIcon}>📍</ThemedText>
                            <ThemedText type="defaultSemiBold">Waypoints</ThemedText>
                            <ThemedText type="default">Add and edit waypoints</ThemedText>
                        </ThemedView>
                        <ThemedView
                            style={[styles.toolCard, { backgroundColor: cardColor, borderColor }]}
                        >
                            <ThemedText style={styles.toolIcon}>🎛️</ThemedText>
                            <ThemedText type="defaultSemiBold">Reduce</ThemedText>
                            <ThemedText type="default">Simplify track points</ThemedText>
                        </ThemedView>
                    </ThemedView>
                </ThemedView>

                <ThemedView style={styles.section}>
                    <ThemedText type="defaultSemiBold">📊 Analysis Tools</ThemedText>
                    <ThemedView style={styles.toolGrid}>
                        <ThemedView
                            style={[styles.toolCard, { backgroundColor: cardColor, borderColor }]}
                        >
                            <ThemedText style={styles.toolIcon}>📈</ThemedText>
                            <ThemedText type="defaultSemiBold">Elevation</ThemedText>
                            <ThemedText type="default">Profile and correction</ThemedText>
                        </ThemedView>
                        <ThemedView
                            style={[styles.toolCard, { backgroundColor: cardColor, borderColor }]}
                        >
                            <ThemedText style={styles.toolIcon}>📏</ThemedText>
                            <ThemedText type="defaultSemiBold">Statistics</ThemedText>
                            <ThemedText type="default">Distance, speed, time</ThemedText>
                        </ThemedView>
                        <ThemedView
                            style={[styles.toolCard, { backgroundColor: cardColor, borderColor }]}
                        >
                            <ThemedText style={styles.toolIcon}>🧹</ThemedText>
                            <ThemedText type="defaultSemiBold">Clean</ThemedText>
                            <ThemedText type="default">Remove errors</ThemedText>
                        </ThemedView>
                        <ThemedView
                            style={[styles.toolCard, { backgroundColor: cardColor, borderColor }]}
                        >
                            <ThemedText style={styles.toolIcon}>⏱️</ThemedText>
                            <ThemedText type="defaultSemiBold">Time</ThemedText>
                            <ThemedText type="default">Edit timestamps</ThemedText>
                        </ThemedView>
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
        marginBottom: 30,
    },
    toolGrid: {
        marginTop: 10,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    toolCard: {
        flex: 1,
        minWidth: 150,
        padding: 15,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
        gap: 5,
    },
    toolIcon: {
        fontSize: 24,
        marginBottom: 5,
    },
});
