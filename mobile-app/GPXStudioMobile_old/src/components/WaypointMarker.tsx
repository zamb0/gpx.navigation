import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getWaypointStyle } from '../utils/waypointTypes';
import { useThemeColor } from '@/hooks/useThemeColor';

interface WaypointMarkerProps {
    symbol?: string;
    type?: string;
    name?: string;
    size?: number;
}

export default function WaypointMarker({ symbol, type, name, size = 24 }: WaypointMarkerProps) {
    const style = getWaypointStyle(symbol, type, name);

    // Colori del tema
    const shadowColor = useThemeColor({}, 'shadow');
    const backgroundColor = useThemeColor({}, 'background');

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: backgroundColor,
                    borderColor: style.color,
                    width: size + 8,
                    height: size + 8,
                    shadowColor: shadowColor,
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
        justifyContent: 'center',
        alignItems: 'center',
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
