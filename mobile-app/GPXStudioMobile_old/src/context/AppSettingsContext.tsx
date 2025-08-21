import React, { createContext, useContext, ReactNode } from 'react';
import { useAppSettings, AppSettings } from '../hooks/useAppSettings';
import { OSMProviderType } from '../components/MapProviderSelector';

interface AppSettingsContextType {
    settings: AppSettings;
    updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
    isLoading: boolean;
}

const AppSettingsContext = createContext<AppSettingsContextType | undefined>(undefined);

export const useSettings = () => {
    const context = useContext(AppSettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within an AppSettingsProvider');
    }
    return context;
};

interface AppSettingsProviderProps {
    children: ReactNode;
}

export const AppSettingsProvider: React.FC<AppSettingsProviderProps> = ({ children }) => {
    const settingsHook = useAppSettings();

    return (
        <AppSettingsContext.Provider value={settingsHook}>{children}</AppSettingsContext.Provider>
    );
};
