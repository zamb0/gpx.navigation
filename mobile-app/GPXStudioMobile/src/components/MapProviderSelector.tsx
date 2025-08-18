import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

// OpenStreetMap tile providers
export const OSM_PROVIDERS = {
    standard: {
        name: 'Standard',
        description: 'Mappa OpenStreetMap standard',
        icon: '🗺️',
        urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '© OpenStreetMap contributors',
    },
    // cycle: {
    //     name: 'Ciclistica',
    //     description: 'Mappa ciclistica OpenStreetMap',
    //     icon: '🚴‍♂️',
    //     urlTemplate: 'https://tile-cyclosm.openstreetmap.fr/cyclosm-lite/{z}/{x}/{y}.png',
    //     attribution: '© OpenStreetMap contributors, © CyclOSM',
    // },
    hike: {
        name: 'Escursionistica',
        description: 'Mappa escursionistica OpenTopoMap',
        icon: '🥾',
        urlTemplate: 'https://tile.opentopomap.org/{z}/{x}/{y}.png',
        attribution: '© OpenStreetMap contributors, © OpenTopoMap',
    },
    // carto_light: {
    //     name: 'Carto Light',
    //     description: 'Mappa chiara e minimalista',
    //     icon: '☀️',
    //     urlTemplate: 'https://cartodb-basemaps-a.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png',
    //     attribution: '© OpenStreetMap contributors, © CARTO',
    // },
    // carto_dark: {
    //     name: 'Carto Dark',
    //     description: 'Mappa scura',
    //     icon: '🌙',
    //     urlTemplate: 'https://cartodb-basemaps-a.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png',
    //     attribution: '© OpenStreetMap contributors, © CARTO',
    // },
    // esri_world: {
    //     name: 'Esri World',
    //     description: 'Mappa satellitare Esri',
    //     icon: '🛰️',
    //     urlTemplate:
    //         'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    //     attribution: '© Esri, © OpenStreetMap contributors',
    // },
};

export type OSMProviderType = keyof typeof OSM_PROVIDERS;

interface MapProviderSelectorProps {
    selectedProvider: OSMProviderType;
    onProviderChange: (provider: OSMProviderType) => void;
    style?: any;
}

export default function MapProviderSelector({
    selectedProvider,
    onProviderChange,
    style,
}: MapProviderSelectorProps) {
    return (
        <View style={[styles.container, style]}>
            <Text style={styles.title}>Tipo di Mappa</Text>
            <View style={styles.providerGrid}>
                {(Object.keys(OSM_PROVIDERS) as OSMProviderType[]).map((providerKey) => {
                    const provider = OSM_PROVIDERS[providerKey];
                    const isSelected = selectedProvider === providerKey;

                    return (
                        <TouchableOpacity
                            key={providerKey}
                            style={[styles.providerButton, isSelected && styles.selectedProvider]}
                            onPress={() => onProviderChange(providerKey)}
                        >
                            <View style={styles.providerHeader}>
                                <Text style={styles.providerIcon}>{provider.icon}</Text>
                                <Text
                                    style={[
                                        styles.providerName,
                                        isSelected && styles.selectedProviderText,
                                    ]}
                                >
                                    {provider.name}
                                </Text>
                            </View>
                            <Text
                                style={[
                                    styles.providerDescription,
                                    isSelected && styles.selectedProviderDescription,
                                ]}
                            >
                                {provider.description}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        marginVertical: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
        color: '#333',
    },
    providerGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    providerButton: {
        width: '48%',
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#e9ecef',
        marginBottom: 8,
    },
    selectedProvider: {
        borderColor: '#007AFF',
        backgroundColor: '#f0f8ff',
    },
    providerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    providerIcon: {
        fontSize: 20,
        marginRight: 8,
    },
    providerName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        flex: 1,
    },
    selectedProviderText: {
        color: '#007AFF',
    },
    providerDescription: {
        fontSize: 12,
        color: '#666',
        lineHeight: 16,
    },
    selectedProviderDescription: {
        color: '#0066CC',
    },
});
