import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OSMProviderType } from '../components/MapProviderSelector';

const SETTINGS_KEY = '@GPXStudio_Settings';

export interface AppSettings {
    osmProvider: OSMProviderType;
    units: 'metric' | 'imperial';
    theme: 'light' | 'dark' | 'auto';
    language: string;
    autoSave: boolean;
    showElevationProfile: boolean;
}

const defaultSettings: AppSettings = {
    osmProvider: 'standard',
    units: 'metric',
    theme: 'auto',
    language: 'it',
    autoSave: true,
    showElevationProfile: true,
};

export function useAppSettings() {
    const [settings, setSettings] = useState<AppSettings>(defaultSettings);
    const [isLoading, setIsLoading] = useState(true);

    // Load settings on mount
    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const stored = await AsyncStorage.getItem(SETTINGS_KEY);
            if (stored) {
                const parsedSettings = JSON.parse(stored);
                setSettings({ ...defaultSettings, ...parsedSettings });
            }
        } catch (error) {
            console.warn('Failed to load settings:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const saveSettings = async (newSettings: Partial<AppSettings>) => {
        try {
            const updatedSettings = { ...settings, ...newSettings };
            setSettings(updatedSettings);
            await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updatedSettings));
        } catch (error) {
            console.error('Failed to save settings:', error);
        }
    };

    const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
        saveSettings({ [key]: value });
    };

    return {
        settings,
        updateSetting,
        saveSettings,
        isLoading,
    };
}
