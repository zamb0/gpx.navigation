import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { NavigationService } from '../../services/navigation/NavigationService';
import { NavigationSettings } from '../../types/navigation';
import { theme } from '../../constants/theme';

interface NavigationSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const NavigationSettingsModal: React.FC<
  NavigationSettingsModalProps
> = ({ visible, onClose }) => {
  const [settings, setSettings] = useState<NavigationSettings | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const navigationService = NavigationService.getInstance();

  useEffect(() => {
    if (visible) {
      // Load current settings
      const currentSettings = navigationService.getSettings();
      setSettings(currentSettings);
      setHasChanges(false);
    }
  }, [visible]);

  const handleSettingChange = (key: keyof NavigationSettings, value: any) => {
    if (!settings) return;

    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    setHasChanges(true);
  };

  const handleSave = () => {
    if (!settings) return;

    navigationService.updateSettings(settings);
    setHasChanges(false);
    onClose();
  };

  const handleCancel = () => {
    if (hasChanges) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Are you sure you want to close without saving?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: onClose },
        ]
      );
    } else {
      onClose();
    }
  };

  const handleReset = () => {
    Alert.alert(
      'Reset Settings',
      'Are you sure you want to reset all navigation settings to default values?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            // Reset to default settings
            const defaultSettings: NavigationSettings = {
              offRouteThreshold: 50,
              offRouteAlertEnabled: true,
              voiceGuidanceEnabled: true,
              waypointAlertDistance: 100,
              waypointAlertEnabled: true,
              speedAlertEnabled: false,
              speedAlertThreshold: 30,
              autoRecenterMap: true,
              keepScreenOn: true,
              navigationAccuracy: 'high',
              updateInterval: 1000,
            };
            setSettings(defaultSettings);
            setHasChanges(true);
          },
        },
      ]
    );
  };

  if (!settings) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleCancel}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.headerButton}>
            <Text style={styles.headerButtonText}>Cancel</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Navigation Settings</Text>

          <TouchableOpacity onPress={handleSave} style={styles.headerButton}>
            <Text style={[styles.headerButtonText, styles.saveButton]}>
              Save
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Route Following Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Route Following</Text>

            <View style={styles.settingItem}>
              <View style={styles.settingHeader}>
                <Text style={styles.settingLabel}>Off-Route Threshold</Text>
                <Text style={styles.settingValue}>
                  {settings.offRouteThreshold}m
                </Text>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={10}
                maximumValue={200}
                step={10}
                value={settings.offRouteThreshold}
                onValueChange={(value) =>
                  handleSettingChange('offRouteThreshold', value)
                }
                minimumTrackTintColor={theme.colors.primary}
                maximumTrackTintColor={theme.colors.border}
                thumbTintColor={theme.colors.primary}
              />
              <Text style={styles.settingDescription}>
                Distance from route before triggering off-route alert
              </Text>
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Off-Route Alerts</Text>
                  <Text style={styles.settingDescription}>
                    Show alerts when you deviate from the route
                  </Text>
                </View>
                <Switch
                  value={settings.offRouteAlertEnabled}
                  onValueChange={(value) =>
                    handleSettingChange('offRouteAlertEnabled', value)
                  }
                  trackColor={{
                    false: theme.colors.border,
                    true: theme.colors.primary,
                  }}
                  thumbColor={theme.colors.background}
                />
              </View>
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Auto Re-center Map</Text>
                  <Text style={styles.settingDescription}>
                    Automatically center map on your location during navigation
                  </Text>
                </View>
                <Switch
                  value={settings.autoRecenterMap}
                  onValueChange={(value) =>
                    handleSettingChange('autoRecenterMap', value)
                  }
                  trackColor={{
                    false: theme.colors.border,
                    true: theme.colors.primary,
                  }}
                  thumbColor={theme.colors.background}
                />
              </View>
            </View>
          </View>

          {/* Waypoint Alerts Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Waypoint Alerts</Text>

            <View style={styles.settingItem}>
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Waypoint Alerts</Text>
                  <Text style={styles.settingDescription}>
                    Show alerts when approaching waypoints
                  </Text>
                </View>
                <Switch
                  value={settings.waypointAlertEnabled}
                  onValueChange={(value) =>
                    handleSettingChange('waypointAlertEnabled', value)
                  }
                  trackColor={{
                    false: theme.colors.border,
                    true: theme.colors.primary,
                  }}
                  thumbColor={theme.colors.background}
                />
              </View>
            </View>

            {settings.waypointAlertEnabled && (
              <View style={styles.settingItem}>
                <View style={styles.settingHeader}>
                  <Text style={styles.settingLabel}>Alert Distance</Text>
                  <Text style={styles.settingValue}>
                    {settings.waypointAlertDistance}m
                  </Text>
                </View>
                <Slider
                  style={styles.slider}
                  minimumValue={25}
                  maximumValue={500}
                  step={25}
                  value={settings.waypointAlertDistance}
                  onValueChange={(value) =>
                    handleSettingChange('waypointAlertDistance', value)
                  }
                  minimumTrackTintColor={theme.colors.primary}
                  maximumTrackTintColor={theme.colors.border}
                  thumbTintColor={theme.colors.primary}
                />
                <Text style={styles.settingDescription}>
                  Distance before waypoint to show alert
                </Text>
              </View>
            )}
          </View>

          {/* Voice Guidance Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Voice Guidance</Text>

            <View style={styles.settingItem}>
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Voice Guidance</Text>
                  <Text style={styles.settingDescription}>
                    Enable spoken navigation instructions
                  </Text>
                </View>
                <Switch
                  value={settings.voiceGuidanceEnabled}
                  onValueChange={(value) =>
                    handleSettingChange('voiceGuidanceEnabled', value)
                  }
                  trackColor={{
                    false: theme.colors.border,
                    true: theme.colors.primary,
                  }}
                  thumbColor={theme.colors.background}
                />
              </View>
            </View>
          </View>

          {/* Speed Alerts Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Speed Alerts</Text>

            <View style={styles.settingItem}>
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Speed Alerts</Text>
                  <Text style={styles.settingDescription}>
                    Alert when exceeding speed threshold
                  </Text>
                </View>
                <Switch
                  value={settings.speedAlertEnabled}
                  onValueChange={(value) =>
                    handleSettingChange('speedAlertEnabled', value)
                  }
                  trackColor={{
                    false: theme.colors.border,
                    true: theme.colors.primary,
                  }}
                  thumbColor={theme.colors.background}
                />
              </View>
            </View>

            {settings.speedAlertEnabled && (
              <View style={styles.settingItem}>
                <View style={styles.settingHeader}>
                  <Text style={styles.settingLabel}>Speed Threshold</Text>
                  <Text style={styles.settingValue}>
                    {settings.speedAlertThreshold} km/h
                  </Text>
                </View>
                <Slider
                  style={styles.slider}
                  minimumValue={10}
                  maximumValue={100}
                  step={5}
                  value={settings.speedAlertThreshold}
                  onValueChange={(value) =>
                    handleSettingChange('speedAlertThreshold', value)
                  }
                  minimumTrackTintColor={theme.colors.primary}
                  maximumTrackTintColor={theme.colors.border}
                  thumbTintColor={theme.colors.primary}
                />
                <Text style={styles.settingDescription}>
                  Speed limit for alerts
                </Text>
              </View>
            )}
          </View>

          {/* Performance Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Performance</Text>

            <View style={styles.settingItem}>
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Keep Screen On</Text>
                  <Text style={styles.settingDescription}>
                    Prevent screen from turning off during navigation
                  </Text>
                </View>
                <Switch
                  value={settings.keepScreenOn}
                  onValueChange={(value) =>
                    handleSettingChange('keepScreenOn', value)
                  }
                  trackColor={{
                    false: theme.colors.border,
                    true: theme.colors.primary,
                  }}
                  thumbColor={theme.colors.background}
                />
              </View>
            </View>

            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>GPS Accuracy</Text>
              <View style={styles.segmentedControl}>
                {(['low', 'medium', 'high'] as const).map((accuracy) => (
                  <TouchableOpacity
                    key={accuracy}
                    style={[
                      styles.segmentButton,
                      settings.navigationAccuracy === accuracy &&
                        styles.segmentButtonActive,
                    ]}
                    onPress={() =>
                      handleSettingChange('navigationAccuracy', accuracy)
                    }
                  >
                    <Text
                      style={[
                        styles.segmentButtonText,
                        settings.navigationAccuracy === accuracy &&
                          styles.segmentButtonTextActive,
                      ]}
                    >
                      {accuracy.charAt(0).toUpperCase() + accuracy.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.settingDescription}>
                Higher accuracy uses more battery
              </Text>
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingHeader}>
                <Text style={styles.settingLabel}>Update Interval</Text>
                <Text style={styles.settingValue}>
                  {settings.updateInterval / 1000}s
                </Text>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={500}
                maximumValue={5000}
                step={500}
                value={settings.updateInterval}
                onValueChange={(value) =>
                  handleSettingChange('updateInterval', value)
                }
                minimumTrackTintColor={theme.colors.primary}
                maximumTrackTintColor={theme.colors.border}
                thumbTintColor={theme.colors.primary}
              />
              <Text style={styles.settingDescription}>
                How often to update navigation data
              </Text>
            </View>
          </View>

          {/* Reset Section */}
          <View style={styles.section}>
            <TouchableOpacity onPress={handleReset} style={styles.resetButton}>
              <Ionicons name="refresh" size={20} color={theme.colors.error} />
              <Text style={styles.resetButtonText}>Reset to Defaults</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  headerButton: {
    padding: 8,
  },
  headerButtonText: {
    fontSize: 16,
    color: theme.colors.primary,
  },
  saveButton: {
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 16,
  },
  settingItem: {
    marginBottom: 20,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
  },
  settingValue: {
    fontSize: 16,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  settingDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  slider: {
    width: '100%',
    height: 40,
    marginVertical: 8,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: theme.colors.border,
    borderRadius: 8,
    padding: 2,
    marginTop: 8,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  segmentButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  segmentButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  segmentButtonTextActive: {
    color: theme.colors.background,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.error,
    backgroundColor: theme.colors.errorBackground,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.error,
    marginLeft: 8,
  },
});
