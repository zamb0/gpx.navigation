import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useThemeColor } from '@/hooks/useThemeColor';

interface WaypointLegendProps {
    style?: any;
}

export default function WaypointLegend({ style }: WaypointLegendProps) {
    const backgroundColor = useThemeColor({}, 'card');
    const textColor = useThemeColor({}, 'text');
    const borderColor = useThemeColor({}, 'border');
    const itemBackground = useThemeColor({}, 'background');
    const placeholderColor = useThemeColor({}, 'placeholder');
    const shadowColor = useThemeColor({}, 'shadow');

    // Colori dinamici per i waypoint
    const waypointStart = useThemeColor({}, 'waypointStart');
    const waypointFinish = useThemeColor({}, 'waypointFinish');
    const waypointSummit = useThemeColor({}, 'waypointSummit');
    const waypointWater = useThemeColor({}, 'waypointWater');
    const waypointCamp = useThemeColor({}, 'waypointCamp');
    const waypointRestaurant = useThemeColor({}, 'waypointRestaurant');
    const waypointDanger = useThemeColor({}, 'waypointDanger');
    const waypointViewpoint = useThemeColor({}, 'waypointViewpoint');
    const waypointBridge = useThemeColor({}, 'waypointBridge');
    const waypointChurch = useThemeColor({}, 'waypointChurch');
    const waypointDefault = useThemeColor({}, 'waypointDefault');

    // Array dinamico con colori del tema
    const waypointTypes = [
        {
            icon: '🏁',
            name: 'Partenza',
            description: 'Punto di inizio del percorso',
            color: waypointStart,
        },
        {
            icon: '🏆',
            name: 'Arrivo',
            description: 'Punto finale del percorso',
            color: waypointFinish,
        },
        {
            icon: '⛰️',
            name: 'Vetta',
            description: 'Cime e punti panoramici',
            color: waypointSummit,
        },
        {
            icon: '💧',
            name: 'Fonte',
            description: "Sorgenti e punti d'acqua",
            color: waypointWater,
        },
        { icon: '🏕️', name: 'Rifugio', description: 'Campeggi e rifugi', color: waypointCamp },
        { icon: '🍽️', name: 'Ristoro', description: 'Ristoranti e bar', color: waypointRestaurant },
        { icon: '⚠️', name: 'Pericolo', description: 'Punti di attenzione', color: waypointDanger },
        { icon: '📸', name: 'Vista', description: 'Punti panoramici', color: waypointViewpoint },
        {
            icon: '🌉',
            name: 'Ponte',
            description: 'Ponti e attraversamenti',
            color: waypointBridge,
        },
        {
            icon: '⛪',
            name: 'Luogo sacro',
            description: 'Chiese e luoghi di culto',
            color: waypointChurch,
        },
        { icon: '📍', name: 'Generico', description: 'Waypoint standard', color: waypointDefault },
    ];

    return (
        <View style={[styles.container, { backgroundColor }, style]}>
            <Text style={[styles.title, { color: textColor }]}>🗺️ Legenda Waypoints</Text>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {waypointTypes.map((type, index) => (
                    <View
                        key={index}
                        style={[
                            styles.legendItem,
                            {
                                backgroundColor: itemBackground,
                                borderColor,
                                shadowColor,
                            },
                        ]}
                    >
                        <View
                            style={[
                                styles.iconContainer,
                                {
                                    borderColor: type.color,
                                    backgroundColor: itemBackground,
                                    shadowColor,
                                },
                            ]}
                        >
                            <Text style={[styles.legendIcon, { color: type.color }]}>
                                {type.icon}
                            </Text>
                        </View>
                        <Text style={[styles.legendName, { color: textColor }]}>{type.name}</Text>
                        <Text style={[styles.legendDescription, { color: placeholderColor }]}>
                            {type.description}
                        </Text>
                    </View>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: 8,
        padding: 16,
        marginVertical: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
        textAlign: 'center',
    },
    scrollContent: {
        paddingHorizontal: 4,
    },
    legendItem: {
        padding: 12,
        borderRadius: 8,
        marginHorizontal: 4,
        minWidth: 120,
        alignItems: 'center',
        borderWidth: 1,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
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
        marginBottom: 4,
        textAlign: 'center',
    },
    legendDescription: {
        fontSize: 10,
        textAlign: 'center',
        lineHeight: 12,
    },
});
