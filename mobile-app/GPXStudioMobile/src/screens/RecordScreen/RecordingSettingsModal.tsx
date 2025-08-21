/**
 * Recording Settings Modal Component
 * Allows users to configure GPS accuracy and recording interval settings
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { LocationAccuracy } from '../../types/location';
import { RecordingOptions } from '../../services/location/TrackRecordingService';
import { DatabaseService } from '../../services/database/DatabaseService';
import { theme } from '../../constants';

export interface RecordingSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  onSettingsChanged?: (settings: RecordingOptions) => void;
}

interface RecordingSettings {
  accuracy: LocationAccuracy;
  timeInterval: number;
  distanceInterval: number;
  enableHighAccuracy: boolean;
  autoSave: boolean;
  pauseOnLowAccuracy: boolean;
  minimumAccuracy: number;
}

const ACCURACY_OPTIONS = [
  { label: 'High (Best GPS)', value: LocationAccuracy.HIGH },
  { label: 'Medium (Balanced)', value: LocationAccuracy.MEDIUM },
  { label: 'Low (Battery Saver)', value: LocationAccuracy.LOW },
];

const TIME_INTERVAL_OPTIONS = [
  { label: '1 second', value: 1000 },
  { label: '2 seconds', value: 2000 },
  { label: '5 seconds', value: 5000 },
  { label: '10 seconds', value: 10000 },
  { label: '30 seconds', value: 30000 },
];

const DISTANCE_INTERVAL_OPTIONS = [
  { label: '1 meter', value: 1 },
  { label: '2 meters', value: 2 },
  { label: '5 meters', value: 5 },
  { label: '10 meters', value: 10 },
  { label: '20 meters', value: 20 },
];

const MINIMUM_ACCURACY_OPTIONS = [
  { label: '5 meters', value: 5 },
  { label: '10 meters', value: 10 },
  { label: '20 meters', value: 20 },
  { label: '50 meters', value: 50 },
  { label: '100 meters', value: 100 },
];

export const RecordingSettingsModal: React.FC<RecordingSettingsModalProps> = ({
  visible,
  onClose,
  onSettingsChanged,
}) => {
  const [settings, setSettings] = useState<RecordingSettings>({
    accuracy: LocationAccuracy.HIGH,
    timeInterval: 1000,
    distanceInterval: 1,
    enableHighAccuracy: true,
    autoSave: true,
    pauseOnLowAccuracy: false,
    minimumAccuracy: 10,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Load settings when modal opens
  useEffect(() => {
    if (visible) {
      loadSettings();
    }
  }, [visible]);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const dbService = DatabaseService.getInstance();
      const appSettings = await dbService.appSettings.getSettings();

      if (appSettings?.gps) {
        setSettings({
          accuracy:
            appSettings.gps.accuracy === 'high'
              ? LocationAccuracy.HIGH
              : appSettings.gps.accuracy === 'medium'
                ? LocationAccuracy.MEDIUM
                : LocationAccuracy.LOW,
          timeInterval: (appSettings.gps.recordingInterval || 1) * 1000,
          distanceInterval: appSettings.gps.minimumDistance || 1,
          enableHighAccuracy: true,
          autoSave: true,
          pauseOnLowAccuracy: false,
          minimumAccuracy: 10,
        });
      }
    } catch (error) {
      console.error('Failed to load recording settings:', error);
      Alert.alert('Error', 'Failed to load settings. Using defaults.');
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setIsLoading(true);
      const dbService = DatabaseService.getInstance();

      // Update app settings
      const accuracyString =
        settings.accuracy === LocationAccuracy.HIGH
          ? 'high'
          : settings.accuracy === LocationAccuracy.MEDIUM
            ? 'medium'
            : 'low';

      await dbService.appSettings.setSettings({
        gps: {
          accuracy: accuracyString as 'high' | 'medium' | 'low',
          recordingInterval: settings.timeInterval / 1000,
          minimumDistance: settings.distanceInterval,
        },
      });

      // Notify parent component
      const recordingOptions: RecordingOptions = {
        accuracy: settings.accuracy,
        timeInterval: settings.timeInterval,
        distanceInterval: settings.distanceInterval,
        enableHighAccuracy: settings.enableHighAccuracy,
        autoSave: settings.autoSave,
      };

      onSettingsChanged?.(recordingOptions);
      setHasChanges(false);

      Alert.alert('Success', 'Recording settings saved successfully.');
    } catch (error) {
      console.error('Failed to save recording settings:', error);
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetToDefaults = () => {
    Alert.alert(
      'Reset Settings',
      'Are you sure you want to reset all recording settings to defaults?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            setSettings({
              accuracy: LocationAccuracy.HIGH,
              timeInterval: 1000,
              distanceInterval: 1,
              enableHighAccuracy: true,
              autoSave: true,
              pauseOnLowAccuracy: false,
              minimumAccuracy: 10,
            });
            setHasChanges(true);
          },
        },
      ]
    );
  };

  const handleClose = () => {
    if (hasChanges) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Do you want to save them before closing?',
        [
          { text: 'Discard', style: 'destructive', onPress: onClose },
          { text: 'Cancel', style: 'cancel' },
          { text: 'Save', onPress: () => saveSettings().then(onClose) },
        ]
      );
    } else {
      onClose();
    }
  };

  const updateSetting = <K extends keyof RecordingSettings>(
    key: K,
    value: RecordingSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const getAccuracyDescription = (accuracy: LocationAccuracy): string => {
    switch (accuracy) {
      case LocationAccuracy.HIGH:
        return 'Best accuracy, higher battery usage';
      case LocationAccuracy.MEDIUM:
        return 'Good accuracy, moderate battery usage';
      case LocationAccuracy.LOW:
        return 'Lower accuracy, best battery life';
      default:
        return '';
    }
  };

  const getBatteryImpact = (): string => {
    let impact = 'Low';

    if (settings.accuracy === LocationAccuracy.HIGH) impact = 'High';
    else if (settings.accuracy === LocationAccuracy.MEDIUM) impact = 'Medium';

    if (settings.timeInterval < 2000) impact = 'High';
    else if (settings.timeInterval < 5000 && impact !== 'High')
      impact = 'Medium';

    if (settings.enableHighAccuracy && impact !== 'High') {
      impact = impact === 'Medium' ? 'High' : 'Medium';
    }

    return impact;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
            <Text style={styles.headerButtonText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Recording Settings</Text>
          <TouchableOpacity
            onPress={saveSettings}
            style={[styles.headerButton, styles.saveButton]}
            disabled={isLoading || !hasChanges}
          >
            <Text
              style={[
                styles.headerButtonText,
                styles.saveButtonText,
                (!hasChanges || isLoading) && styles.disabledText,
              ]}
            >
              Save
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* GPS Accuracy Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>GPS Accuracy</Text>

            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Accuracy Level</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={settings.accuracy}
                  onValueChange={(value) => updateSetting('accuracy', value)}
                  style={styles.picker}
                >
                  {ACCURACY_OPTIONS.map((option) => (
                    <Picker.Item
                      key={option.value}
                      label={option.label}
                      value={option.value}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            <Text style={styles.settingDescription}>
              {getAccuracyDescription(settings.accuracy)}
            </Text>

            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>High Accuracy Mode</Text>
              <Switch
                value={settings.enableHighAccuracy}
                onValueChange={(value) =>
                  updateSetting('enableHighAccuracy', value)
                }
                trackColor={{ false: '#E0E0E0', true: theme.colors.primary }}
                thumbColor={settings.enableHighAccuracy ? '#FFFFFF' : '#F4F3F4'}
              />
            </View>

            <Text style={styles.settingDescription}>
              Uses GPS, Wi-Fi, and cellular networks for best accuracy
            </Text>
          </View>

          {/* Recording Intervals Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recording Intervals</Text>

            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Time Interval</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={settings.timeInterval}
                  onValueChange={(value) =>
                    updateSetting('timeInterval', value)
                  }
                  style={styles.picker}
                >
                  {TIME_INTERVAL_OPTIONS.map((option) => (
                    <Picker.Item
                      key={option.value}
                      label={option.label}
                      value={option.value}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            <Text style={styles.settingDescription}>
              How often to record GPS points based on time
            </Text>

            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Distance Interval</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={settings.distanceInterval}
                  onValueChange={(value) =>
                    updateSetting('distanceInterval', value)
                  }
                  style={styles.picker}
                >
                  {DISTANCE_INTERVAL_OPTIONS.map((option) => (
                    <Picker.Item
                      key={option.value}
                      label={option.label}
                      value={option.value}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            <Text style={styles.settingDescription}>
              Minimum distance to move before recording a new point
            </Text>
          </View>

          {/* Quality Control Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quality Control</Text>

            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Minimum Accuracy</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={settings.minimumAccuracy}
                  onValueChange={(value) =>
                    updateSetting('minimumAccuracy', value)
                  }
                  style={styles.picker}
                >
                  {MINIMUM_ACCURACY_OPTIONS.map((option) => (
                    <Picker.Item
                      key={option.value}
                      label={option.label}
                      value={option.value}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            <Text style={styles.settingDescription}>
              Ignore GPS points with accuracy worse than this value
            </Text>

            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Pause on Low Accuracy</Text>
              <Switch
                value={settings.pauseOnLowAccuracy}
                onValueChange={(value) =>
                  updateSetting('pauseOnLowAccuracy', value)
                }
                trackColor={{ false: '#E0E0E0', true: theme.colors.primary }}
                thumbColor={settings.pauseOnLowAccuracy ? '#FFFFFF' : '#F4F3F4'}
              />
            </View>

            <Text style={styles.settingDescription}>
              Automatically pause recording when GPS accuracy is poor
            </Text>
          </View>

          {/* Auto-Save Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Auto-Save</Text>

            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Auto-Save Recordings</Text>
              <Switch
                value={settings.autoSave}
                onValueChange={(value) => updateSetting('autoSave', value)}
                trackColor={{ false: '#E0E0E0', true: theme.colors.primary }}
                thumbColor={settings.autoSave ? '#FFFFFF' : '#F4F3F4'}
              />
            </View>

            <Text style={styles.settingDescription}>
              Automatically save completed recordings to your files
            </Text>
          </View>

          {/* Battery Impact */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Battery Impact</Text>
            <View style={styles.batteryImpact}>
              <Text style={styles.batteryLabel}>Estimated Impact:</Text>
              <Text
                style={[
                  styles.batteryValue,
                  getBatteryImpact() === 'High' && styles.batteryHigh,
                  getBatteryImpact() === 'Medium' && styles.batteryMedium,
                  getBatteryImpact() === 'Low' && styles.batteryLow,
                ]}
              >
                {getBatteryImpact()}
              </Text>
            </View>
          </View>

          {/* Reset Button */}
          <TouchableOpacity
            style={styles.resetButton}
            onPress={resetToDefaults}
            disabled={isLoading}
          >
            <Text style={styles.resetButtonText}>Reset to Defaults</Text>
          </TouchableOpacity>
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
    backgroundColor: theme.colors.backgroundSecondary,
  },
  headerButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  headerButtonText: {
    fontSize: 16,
    color: theme.colors.primary,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  disabledText: {
    opacity: 0.5,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  settingLabel: {
    fontSize: 16,
    color: theme.colors.text,
    flex: 1,
  },
  settingDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
    marginBottom: 12,
    lineHeight: 18,
  },
  pickerContainer: {
    flex: 1,
    maxWidth: 150,
  },
  picker: {
    height: 40,
  },
  batteryImpact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 8,
  },
  batteryLabel: {
    fontSize: 16,
    color: theme.colors.text,
  },
  batteryValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  batteryLow: {
    color: theme.colors.success,
  },
  batteryMedium: {
    color: theme.colors.warning,
  },
  batteryHigh: {
    color: theme.colors.error,
  },
  resetButton: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  resetButtonText: {
    fontSize: 16,
    color: theme.colors.error,
    fontWeight: '600',
  },
});

export default RecordingSettingsModal;
