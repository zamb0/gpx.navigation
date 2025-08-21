import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { theme } from '../../constants';
import {
  AppSettings,
  AppSettingsRepository,
} from '../../services/database/AppSettingsRepository';
import { getAllMapProviders } from '../../services/map/MapProviders';
import { TileCacheService } from '../../services/map/TileCacheService';
import {
  SettingsSection,
  SettingsRow,
  SettingsButton,
} from '../../components/ui';

interface SettingsScreenProps {}

export const SettingsScreen: React.FC<SettingsScreenProps> = () => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cacheSize, setCacheSize] = useState<number>(0);
  const [cacheLoading, setCacheLoading] = useState(false);

  const settingsRepository = new AppSettingsRepository();
  const tileCacheService = new TileCacheService();
  const mapProviders = getAllMapProviders();

  useEffect(() => {
    loadSettings();
    loadCacheInfo();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const currentSettings = await settingsRepository.getSettings();
      setSettings(currentSettings);
    } catch (error) {
      console.error('Failed to load settings:', error);
      Alert.alert('Error', 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const loadCacheInfo = async () => {
    try {
      setCacheLoading(true);
      const size = await tileCacheService.getCacheSize();
      setCacheSize(size);
    } catch (error) {
      console.error('Failed to load cache info:', error);
    } finally {
      setCacheLoading(false);
    }
  };

  const updateSetting = async (key: string, value: any) => {
    if (!settings) return;

    try {
      setSaving(true);
      await settingsRepository.setSetting(key, value);

      // Update local state
      const updatedSettings = { ...settings };
      setNestedValue(updatedSettings, key, value);
      setSettings(updatedSettings);
    } catch (error) {
      console.error('Failed to update setting:', error);
      Alert.alert('Error', 'Failed to save setting');
    } finally {
      setSaving(false);
    }
  };

  const clearCache = async () => {
    Alert.alert(
      'Clear Cache',
      'This will remove all cached map tiles. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              setCacheLoading(true);
              await tileCacheService.clearCache();
              await loadCacheInfo();
              Alert.alert('Success', 'Cache cleared successfully');
            } catch (error) {
              console.error('Failed to clear cache:', error);
              Alert.alert('Error', 'Failed to clear cache');
            } finally {
              setCacheLoading(false);
            }
          },
        },
      ]
    );
  };

  const resetSettings = async () => {
    Alert.alert(
      'Reset Settings',
      'This will reset all settings to their default values. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              setSaving(true);
              await settingsRepository.resetToDefaults();
              await loadSettings();
              Alert.alert('Success', 'Settings reset to defaults');
            } catch (error) {
              console.error('Failed to reset settings:', error);
              Alert.alert('Error', 'Failed to reset settings');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  const setNestedValue = (obj: any, path: string, value: any): void => {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
  };

  const formatCacheSize = (bytes: number): string => {
    if (bytes === 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  if (loading || !settings) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Units Section */}
      <SettingsSection title="Units">
        <SettingsRow label="Distance">
          <Picker
            selectedValue={settings.units.distance}
            style={styles.picker}
            onValueChange={(value) => updateSetting('units.distance', value)}
          >
            <Picker.Item label="Metric (km)" value="metric" />
            <Picker.Item label="Imperial (mi)" value="imperial" />
          </Picker>
        </SettingsRow>

        <SettingsRow label="Elevation">
          <Picker
            selectedValue={settings.units.elevation}
            style={styles.picker}
            onValueChange={(value) => updateSetting('units.elevation', value)}
          >
            <Picker.Item label="Meters" value="meters" />
            <Picker.Item label="Feet" value="feet" />
          </Picker>
        </SettingsRow>

        <SettingsRow label="Speed" isLast>
          <Picker
            selectedValue={settings.units.speed}
            style={styles.picker}
            onValueChange={(value) => updateSetting('units.speed', value)}
          >
            <Picker.Item label="km/h" value="kmh" />
            <Picker.Item label="mph" value="mph" />
            <Picker.Item label="m/s" value="ms" />
          </Picker>
        </SettingsRow>
      </SettingsSection>

      {/* Map Section */}
      <SettingsSection title="Map">
        <SettingsRow label="Default Map Provider">
          <Picker
            selectedValue={settings.map.defaultProvider}
            style={styles.picker}
            onValueChange={(value) =>
              updateSetting('map.defaultProvider', value)
            }
          >
            {mapProviders.map((provider) => (
              <Picker.Item
                key={provider.id}
                label={provider.name}
                value={provider.id}
              />
            ))}
          </Picker>
        </SettingsRow>

        <SettingsRow label="Show User Location">
          <Switch
            value={settings.map.showUserLocation}
            onValueChange={(value) =>
              updateSetting('map.showUserLocation', value)
            }
            trackColor={{
              false: theme.colors.border,
              true: theme.colors.primaryLight,
            }}
            thumbColor={
              settings.map.showUserLocation
                ? theme.colors.primary
                : theme.colors.textSecondary
            }
          />
        </SettingsRow>

        <SettingsRow label="Follow User Location">
          <Switch
            value={settings.map.followUserLocation}
            onValueChange={(value) =>
              updateSetting('map.followUserLocation', value)
            }
            trackColor={{
              false: theme.colors.border,
              true: theme.colors.primaryLight,
            }}
            thumbColor={
              settings.map.followUserLocation
                ? theme.colors.primary
                : theme.colors.textSecondary
            }
          />
        </SettingsRow>

        <SettingsRow label="Cache Size Limit" isLast>
          <Picker
            selectedValue={settings.map.cacheSize}
            style={styles.picker}
            onValueChange={(value) => updateSetting('map.cacheSize', value)}
          >
            <Picker.Item label="50 MB" value={50} />
            <Picker.Item label="100 MB" value={100} />
            <Picker.Item label="200 MB" value={200} />
            <Picker.Item label="500 MB" value={500} />
            <Picker.Item label="1 GB" value={1000} />
          </Picker>
        </SettingsRow>
      </SettingsSection>

      {/* GPS Section */}
      <SettingsSection title="GPS & Recording">
        <SettingsRow label="GPS Accuracy">
          <Picker
            selectedValue={settings.gps.accuracy}
            style={styles.picker}
            onValueChange={(value) => updateSetting('gps.accuracy', value)}
          >
            <Picker.Item label="High (Best accuracy)" value="high" />
            <Picker.Item label="Medium (Balanced)" value="medium" />
            <Picker.Item label="Low (Battery saving)" value="low" />
          </Picker>
        </SettingsRow>

        <SettingsRow label="Recording Interval">
          <Picker
            selectedValue={settings.gps.recordingInterval}
            style={styles.picker}
            onValueChange={(value) =>
              updateSetting('gps.recordingInterval', value)
            }
          >
            <Picker.Item label="1 second" value={1} />
            <Picker.Item label="2 seconds" value={2} />
            <Picker.Item label="5 seconds" value={5} />
            <Picker.Item label="10 seconds" value={10} />
            <Picker.Item label="30 seconds" value={30} />
          </Picker>
        </SettingsRow>

        <SettingsRow label="Minimum Distance" isLast>
          <Picker
            selectedValue={settings.gps.minimumDistance}
            style={styles.picker}
            onValueChange={(value) =>
              updateSetting('gps.minimumDistance', value)
            }
          >
            <Picker.Item label="1 meter" value={1} />
            <Picker.Item label="2 meters" value={2} />
            <Picker.Item label="5 meters" value={5} />
            <Picker.Item label="10 meters" value={10} />
            <Picker.Item label="20 meters" value={20} />
          </Picker>
        </SettingsRow>
      </SettingsSection>

      {/* Appearance Section */}
      <SettingsSection title="Appearance">
        <SettingsRow label="Theme">
          <Picker
            selectedValue={settings.appearance.theme}
            style={styles.picker}
            onValueChange={(value) => updateSetting('appearance.theme', value)}
          >
            <Picker.Item label="System" value="system" />
            <Picker.Item label="Light" value="light" />
            <Picker.Item label="Dark" value="dark" />
          </Picker>
        </SettingsRow>

        <SettingsRow label="Font Size" isLast>
          <Picker
            selectedValue={settings.appearance.fontSize}
            style={styles.picker}
            onValueChange={(value) =>
              updateSetting('appearance.fontSize', value)
            }
          >
            <Picker.Item label="Small" value="small" />
            <Picker.Item label="Medium" value="medium" />
            <Picker.Item label="Large" value="large" />
          </Picker>
        </SettingsRow>
      </SettingsSection>

      {/* Cache Management Section */}
      <SettingsSection title="Cache Management">
        <SettingsRow label="Current Cache Size" isLast>
          <View style={styles.cacheInfo}>
            {cacheLoading ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <Text style={styles.cacheSize}>{formatCacheSize(cacheSize)}</Text>
            )}
          </View>
        </SettingsRow>

        <View style={styles.buttonContainer}>
          <SettingsButton
            title="Clear Cache"
            onPress={clearCache}
            loading={cacheLoading}
          />
        </View>
      </SettingsSection>

      {/* Advanced Section */}
      <SettingsSection title="Advanced">
        <View style={styles.buttonContainer}>
          <SettingsButton
            title="Reset All Settings"
            onPress={resetSettings}
            variant="danger"
            loading={saving}
          />
        </View>
      </SettingsSection>

      {saving && (
        <View style={styles.savingIndicator}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.savingText}>Saving...</Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    padding: theme.spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  picker: {
    width: 150,
    height: 50,
  },
  cacheInfo: {
    alignItems: 'flex-end',
  },
  cacheSize: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  buttonContainer: {
    padding: theme.spacing.md,
  },
  savingIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  savingText: {
    marginLeft: theme.spacing.sm,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
});
