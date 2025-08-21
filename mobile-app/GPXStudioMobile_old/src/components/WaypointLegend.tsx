import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

interface WaypointLegendProps {
    style?: any;
}

const WAYPOINT_TYPES = [
    { icon: '🏁', name: 'Partenza', description: 'Punto di inizio del percorso', color: '#00FF00' },
    { icon: '🏆', name: 'Arrivo', description: 'Punto finale del percorso', color: '#FF0000' },
    { icon: '⛰️', name: 'Vetta', description: 'Cime e punti panoramici', color: '#8B4513' },
    { icon: '💧', name: 'Fonte', description: "Sorgenti e punti d'acqua", color: '#0066FF' },
    { icon: '🏕️', name: 'Rifugio', description: 'Campeggi e rifugi', color: '#8B4513' },
    { icon: '🍽️', name: 'Ristoro', description: 'Ristoranti e bar', color: '#FF6600' },
    { icon: '⚠️', name: 'Pericolo', description: 'Punti di attenzione', color: '#FF0000' },
    { icon: '📸', name: 'Vista', description: 'Punti panoramici', color: '#9900FF' },
    { icon: '🌉', name: 'Ponte', description: 'Ponti e attraversamenti', color: '#666666' },
    { icon: '⛪', name: 'Luogo sacro', description: 'Chiese e luoghi di culto', color: '#8B4513' },
    { icon: '📍', name: 'Generico', description: 'Waypoint standard', color: '#007AFF' },
];

export default function WaypointLegend({ style }: WaypointLegendProps) {
    return (
        <View style={[styles.container, style]}>
            <Text style={styles.title}>🗺️ Legenda Waypoints</Text>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {WAYPOINT_TYPES.map((type, index) => (
                    <View key={index} style={styles.legendItem}>
                        <View style={[styles.iconContainer, { borderColor: type.color }]}>
                            <Text style={[styles.legendIcon, { color: type.color }]}>
                                {type.icon}
                            </Text>
                        </View>
                        <Text style={styles.legendName}>{type.name}</Text>
                        <Text style={styles.legendDescription}>{type.description}</Text>
                    </View>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        padding: 16,
        marginVertical: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
        color: '#333',
        textAlign: 'center',
    },
    scrollContent: {
        paddingHorizontal: 4,
    },
    legendItem: {
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 8,
        marginHorizontal: 4,
        minWidth: 120,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e9ecef',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'white',
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    legendIcon: {
        fontSize: 20,
    },
    legendName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
        textAlign: 'center',
    },
    legendDescription: {
        fontSize: 10,
        color: '#666',
        textAlign: 'center',
        lineHeight: 12,
    },
});
