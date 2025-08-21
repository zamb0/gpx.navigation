import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { OSM_PROVIDERS, OSMProviderType } from './MapProviderSelector';

interface TileTestProps {
    provider: OSMProviderType;
}

export default function TileTest({ provider }: TileTestProps) {
    const [testResult, setTestResult] = useState<string>('Nessun test effettuato');

    const testTileUrl = (providerKey: OSMProviderType) => {
        // Test con coordinate di Roma al zoom 12
        const url = OSM_PROVIDERS[providerKey].urlTemplate
            .replace('{z}', '12')
            .replace('{x}', '2090')
            .replace('{y}', '1432');

        console.log('Testing URL:', url);

        // Test di caricamento dell'immagine
        Image.getSize(
            url,
            (width, height) => {
                setTestResult(`✅ OK (${width}x${height})`);
                console.log('Tile loaded successfully:', width, 'x', height);
            },
            (error) => {
                setTestResult(`❌ Errore: ${error.message}`);
                console.error('Tile loading failed:', error);
                Alert.alert(
                    'Errore Tile',
                    `Impossibile caricare tile da ${providerKey}: ${error.message}`
                );
            }
        );
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Test Tile Provider: {provider}</Text>
            <Text style={styles.result}>{testResult}</Text>
            <TouchableOpacity style={styles.testButton} onPress={() => testTileUrl(provider)}>
                <Text style={styles.testButtonText}>Test Caricamento Tile</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 10,
        backgroundColor: '#f0f0f0',
        borderRadius: 8,
        marginVertical: 5,
    },
    title: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    result: {
        fontSize: 12,
        marginBottom: 10,
        color: '#666',
    },
    testButton: {
        backgroundColor: '#007AFF',
        padding: 8,
        borderRadius: 4,
        alignItems: 'center',
    },
    testButtonText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
});
