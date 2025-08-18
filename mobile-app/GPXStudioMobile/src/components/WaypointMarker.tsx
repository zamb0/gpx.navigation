import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getWaypointStyle } from '../utils/waypointTypes';

interface WaypointMarkerProps {
    symbol?: string;
    type?: string;
    name?: string;
    size?: number;
}

export default function WaypointMarker({ symbol, type, name, size = 24 }: WaypointMarkerProps) {
    const style = getWaypointStyle(symbol, type, name);

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: style.color,
                    borderColor: style.color,
                    width: size + 8,
                    height: size + 8,
                },
            ]}
        >
            <Text style={[styles.emoji, { fontSize: size }]}>{style.emoji}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: 20,
        borderWidth: 2,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    emoji: {
        textAlign: 'center',
        lineHeight: 24, // Allineamento verticale emoji
    },
});
