/**
 * Icon Components per GPX Studio Mobile
 * Usando React Native Vector Icons (Lucide style)
 */

import React from 'react';
import { View } from 'react-native';

interface IconProps {
    size?: number;
    color?: string;
    focused?: boolean;
}

// Temporaneo: Placeholder icons usando View
// TODO: Sostituire con react-native-vector-icons quando configurato

export const MapIcon: React.FC<IconProps> = ({ size = 24, color = '#000', focused = false }) => {
    return (
        <View
            style={{
                width: size,
                height: size,
                backgroundColor: focused ? color : color + '80',
                borderRadius: 4,
            }}
        />
    );
};

export const FolderIcon: React.FC<IconProps> = ({ size = 24, color = '#000', focused = false }) => {
    return (
        <View
            style={{
                width: size,
                height: size,
                backgroundColor: focused ? color : color + '80',
                borderRadius: 4,
            }}
        />
    );
};

export const WrenchIcon: React.FC<IconProps> = ({ size = 24, color = '#000', focused = false }) => {
    return (
        <View
            style={{
                width: size,
                height: size,
                backgroundColor: focused ? color : color + '80',
                borderRadius: 4,
            }}
        />
    );
};

export const SettingsIcon: React.FC<IconProps> = ({
    size = 24,
    color = '#000',
    focused = false,
}) => {
    return (
        <View
            style={{
                width: size,
                height: size,
                backgroundColor: focused ? color : color + '80',
                borderRadius: 4,
            }}
        />
    );
};
