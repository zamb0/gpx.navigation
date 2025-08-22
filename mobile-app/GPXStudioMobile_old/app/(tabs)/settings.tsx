import { StyleSheet, ScrollView, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import MapProviderSelector from '@/src/components/MapProviderSelector';
import OfflineMapManager from '@/src/components/OfflineMapManager';
import { useSettings } from '@/src/context/AppSettingsContext';
import { useThemeColor } from '@/hooks/useThemeColor';

export default function SettingsScreen() {
    const { settings, updateSetting, isLoading } = useSettings();
    const cardColor = useThemeColor({}, 'card');
    const borderColor = useThemeColor({}, 'border');

    if (isLoading) {
        return (
            <ThemedView style={styles.container}>
                <ThemedView style={styles.header}>
                    <ThemedText>Caricamento impostazioni...</ThemedText>
                </ThemedView>
            </ThemedView>
        );
    }

    return (
        <ThemedView style={styles.container}>
            <ThemedView style={styles.header}>
                <ThemedText type="title">Settings</ThemedText>
                <ThemedText type="subtitle">Customize your GPX.Studio experience</ThemedText>
            </ThemedView>

            <ScrollView style={styles.content}>
                <ThemedView style={styles.section}>
                    <ThemedText type="defaultSemiBold">🗺️ Map Settings</ThemedText>
                    <MapProviderSelector
                        selectedProvider={settings.osmProvider}
                        onProviderChange={(provider) => updateSetting('osmProvider', provider)}
                    />
                    <OfflineMapManager provider={settings.osmProvider} />
                    <ThemedView
                        style={[styles.settingItem, { backgroundColor: cardColor, borderColor }]}
                    >
                        <ThemedText>Units</ThemedText>
                        <ThemedText type="default">
                            {settings.units === 'metric' ? 'Metric (km, m)' : 'Imperial (mi, ft)'}
                        </ThemedText>
                    </ThemedView>
                    <ThemedView
                        style={[styles.settingItem, { backgroundColor: cardColor, borderColor }]}
                    >
                        <ThemedText>Show Elevation Profile</ThemedText>
                        <ThemedText type="default">
                            {settings.showElevationProfile ? 'Enabled' : 'Disabled'}
                        </ThemedText>
                    </ThemedView>
                </ThemedView>

                <ThemedView style={styles.section}>
                    <ThemedText type="defaultSemiBold">📱 App Settings</ThemedText>
                    <ThemedView
                        style={[styles.settingItem, { backgroundColor: cardColor, borderColor }]}
                    >
                        <ThemedText>Theme</ThemedText>
                        <ThemedText type="default">
                            {settings.theme === 'auto'
                                ? 'System (Auto)'
                                : settings.theme === 'light'
                                ? 'Light'
                                : 'Dark'}
                        </ThemedText>
                    </ThemedView>
                    <ThemedView
                        style={[styles.settingItem, { backgroundColor: cardColor, borderColor }]}
                    >
                        <ThemedText>Language</ThemedText>
                        <ThemedText type="default">
                            {settings.language === 'it' ? 'Italiano' : 'English'}
                        </ThemedText>
                    </ThemedView>
                    <ThemedView
                        style={[styles.settingItem, { backgroundColor: cardColor, borderColor }]}
                    >
                        <ThemedText>Auto-save</ThemedText>
                        <ThemedText type="default">
                            {settings.autoSave ? 'Enabled' : 'Disabled'}
                        </ThemedText>
                    </ThemedView>
                </ThemedView>

                <ThemedView style={styles.section}>
                    <ThemedText type="defaultSemiBold">☁️ Cloud & Sync</ThemedText>
                    <ThemedView
                        style={[styles.settingItem, { backgroundColor: cardColor, borderColor }]}
                    >
                        <ThemedText>Account</ThemedText>
                        <ThemedText type="default">Not signed in</ThemedText>
                    </ThemedView>
                    <ThemedView
                        style={[styles.settingItem, { backgroundColor: cardColor, borderColor }]}
                    >
                        <ThemedText>Auto-sync</ThemedText>
                        <ThemedText type="default">Disabled</ThemedText>
                    </ThemedView>
                </ThemedView>

                <ThemedView style={styles.section}>
                    <ThemedText type="defaultSemiBold">ℹ️ About</ThemedText>
                    <ThemedView
                        style={[styles.settingItem, { backgroundColor: cardColor, borderColor }]}
                    >
                        <ThemedText>Version</ThemedText>
                        <ThemedText type="default">1.0.0 (Expo)</ThemedText>
                    </ThemedView>
                    <ThemedView
                        style={[styles.settingItem, { backgroundColor: cardColor, borderColor }]}
                    >
                        <ThemedText>Website</ThemedText>
                        <ThemedText type="default">gpx.studio</ThemedText>
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
    settingItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        marginTop: 5,
        borderRadius: 8,
        borderWidth: 1,
    },
});
