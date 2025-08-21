/**
 * Recording Export Modal Component
 * Handles exporting completed recording sessions to various formats and destinations
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Share,
  Platform,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as MailComposer from 'expo-mail-composer';
import { TrackingSession } from '../../types';
import {
  FileExportService,
  ExportDestination,
} from '../../services/file/FileExportService';
import { GPXConverter } from '../../services/gpx/GPXConverter';
import { GPXExportOptions } from '../../types/gpx';
import {
  formatDistance,
  formatDuration,
  formatSpeed,
} from '../../utils/formatters';
import { theme } from '../../constants';

export interface RecordingExportModalProps {
  visible: boolean;
  session: TrackingSession | null;
  onClose: () => void;
  onExportComplete?: (success: boolean, message: string) => void;
}

interface ExportFormat {
  id: string;
  name: string;
  extension: string;
  description: string;
  available: boolean;
}

interface ExportOption {
  id: string;
  name: string;
  description: string;
  icon: string;
}

const EXPORT_FORMATS: ExportFormat[] = [
  {
    id: 'gpx',
    name: 'GPX',
    extension: '.gpx',
    description: 'GPS Exchange Format (recommended)',
    available: true,
  },
  {
    id: 'kml',
    name: 'KML',
    extension: '.kml',
    description: 'Google Earth format (coming soon)',
    available: false,
  },
  {
    id: 'tcx',
    name: 'TCX',
    extension: '.tcx',
    description: 'Training Center XML (coming soon)',
    available: false,
  },
];

const EXPORT_OPTIONS: ExportOption[] = [
  {
    id: 'share',
    name: 'Share',
    description: 'Share via apps on your device',
    icon: '📤',
  },
  {
    id: 'email',
    name: 'Email',
    description: 'Send as email attachment',
    icon: '📧',
  },
  {
    id: 'save',
    name: 'Save to Files',
    description: 'Save to device storage',
    icon: '💾',
  },
];

// Helper function to convert session to GPX XML
const convertSessionToGPX = async (
  session: TrackingSession,
  options: {
    includeTimestamps: boolean;
    includeElevation: boolean;
    includeSpeed: boolean;
    trackName: string;
    trackDescription: string;
  }
): Promise<string> => {
  const { includeTimestamps, includeElevation, trackName, trackDescription } =
    options;

  const gpxHeader = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="GPX Studio Mobile" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${trackName}</name>
    <desc>${trackDescription}</desc>
    <time>${session.startTime.toISOString()}</time>
  </metadata>
  <trk>
    <name>${trackName}</name>
    <desc>${trackDescription}</desc>
    <trkseg>`;

  const trackPoints = session.trackPoints
    .map((point) => {
      let trkpt = `      <trkpt lat="${point.latitude}" lon="${point.longitude}">`;

      if (includeElevation && point.elevation !== undefined) {
        trkpt += `\n        <ele>${point.elevation}</ele>`;
      }

      if (includeTimestamps && point.timestamp) {
        trkpt += `\n        <time>${point.timestamp.toISOString()}</time>`;
      }

      trkpt += '\n      </trkpt>';
      return trkpt;
    })
    .join('\n');

  const gpxFooter = `
    </trkseg>
  </trk>
</gpx>`;

  return gpxHeader + '\n' + trackPoints + gpxFooter;
};

export const RecordingExportModal: React.FC<RecordingExportModalProps> = ({
  visible,
  session,
  onClose,
  onExportComplete,
}) => {
  const [selectedFormat, setSelectedFormat] = useState('gpx');
  const [selectedOption, setSelectedOption] = useState('share');
  const [fileName, setFileName] = useState('');
  const [includeTimestamps, setIncludeTimestamps] = useState(true);
  const [includeElevation, setIncludeElevation] = useState(true);
  const [includeSpeed, setIncludeSpeed] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const gpxConverter = new GPXConverter();

  // Generate default filename when session changes
  useEffect(() => {
    if (session) {
      const date = session.startTime.toISOString().split('T')[0];
      const time = session.startTime
        .toTimeString()
        .split(' ')[0]
        .replace(/:/g, '-');
      setFileName(`track_${date}_${time}`);
    }
  }, [session]);

  const handleExport = async () => {
    if (!session) {
      Alert.alert('Error', 'No recording session selected.');
      return;
    }

    if (!fileName.trim()) {
      Alert.alert('Error', 'Please enter a filename.');
      return;
    }

    if (session.trackPoints.length === 0) {
      Alert.alert('Error', 'This recording has no track points to export.');
      return;
    }

    try {
      setIsExporting(true);
      setExportProgress(0);

      // Convert session to GPX
      setExportProgress(25);
      const gpxContent = await convertSessionToGPX(session, {
        includeTimestamps,
        includeElevation,
        includeSpeed,
        trackName: fileName,
        trackDescription: `Recorded on ${session.startTime.toLocaleDateString()}`,
      });

      // Create filename
      setExportProgress(50);
      const filename = `${fileName}.${EXPORT_FORMATS.find((f) => f.id === selectedFormat)?.extension || 'gpx'}`;

      // Create temporary file
      setExportProgress(75);
      const tempUri = `${FileSystem.cacheDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(tempUri, gpxContent);

      // Handle different export destinations
      setExportProgress(90);

      let success = false;
      let message = '';

      switch (selectedOption) {
        case 'share':
          success = await handleShare(tempUri, filename);
          message = success
            ? 'File shared successfully'
            : 'Failed to share file';
          break;

        case 'email':
          success = await handleEmail(tempUri, filename);
          message = success ? 'Email composer opened' : 'Failed to open email';
          break;

        case 'save':
          success = await handleSaveToFiles(tempUri, filename);
          message = success ? 'File saved successfully' : 'Failed to save file';
          break;

        default:
          throw new Error('Unknown export option');
      }

      setExportProgress(100);

      if (success) {
        onExportComplete?.(true, message);
        onClose();
      } else {
        onExportComplete?.(false, message);
      }
    } catch (error) {
      console.error('Export failed:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Export failed';
      Alert.alert('Export Failed', errorMessage);
      onExportComplete?.(false, errorMessage);
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const handleShare = async (
    fileUri: string,
    filename: string
  ): Promise<boolean> => {
    try {
      const result = await Share.share({
        url: Platform.OS === 'ios' ? fileUri : `file://${fileUri}`,
        title: 'GPS Track Recording',
        message: `GPS track recorded on ${session?.startTime.toLocaleDateString()}`,
      });

      return result.action === Share.sharedAction;
    } catch (error) {
      console.error('Share failed:', error);
      return false;
    }
  };

  const handleEmail = async (
    fileUri: string,
    filename: string
  ): Promise<boolean> => {
    try {
      const isAvailable = await MailComposer.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert(
          'Email Not Available',
          'Email is not configured on this device.'
        );
        return false;
      }

      const result = await MailComposer.composeAsync({
        subject: `GPS Track - ${filename}`,
        body: `GPS track recording from ${session?.startTime.toLocaleDateString()}\n\nDistance: ${formatDistance(session?.totalDistance || 0)}\nDuration: ${formatDuration(session?.totalTime || 0)}\nAverage Speed: ${formatSpeed(session?.averageSpeed || 0)}`,
        attachments: [fileUri],
      });

      return result.status === MailComposer.MailComposerStatus.SENT;
    } catch (error) {
      console.error('Email failed:', error);
      return false;
    }
  };

  const handleSaveToFiles = async (
    fileUri: string,
    filename: string
  ): Promise<boolean> => {
    try {
      // On iOS, we can use the document picker to save files
      // On Android, we save to the Downloads directory
      const documentsDir = FileSystem.documentDirectory;
      if (!documentsDir) return false;

      const destUri = `${documentsDir}${filename}`;
      await FileSystem.copyAsync({
        from: fileUri,
        to: destUri,
      });

      return true;
    } catch (error) {
      console.error('Save to files failed:', error);
      return false;
    }
  };

  const getSessionSummary = () => {
    if (!session) return null;

    return (
      <View style={styles.sessionSummary}>
        <Text style={styles.sessionSummaryTitle}>Recording Summary</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Date</Text>
            <Text style={styles.summaryValue}>
              {session.startTime.toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Duration</Text>
            <Text style={styles.summaryValue}>
              {formatDuration(session.totalTime)}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Distance</Text>
            <Text style={styles.summaryValue}>
              {formatDistance(session.totalDistance)}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Points</Text>
            <Text style={styles.summaryValue}>
              {session.trackPoints.length.toLocaleString()}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (!session) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Text style={styles.headerButtonText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Export Recording</Text>
          <TouchableOpacity
            onPress={handleExport}
            style={[styles.headerButton, styles.exportButton]}
            disabled={isExporting || !fileName.trim()}
          >
            <Text
              style={[
                styles.headerButtonText,
                styles.exportButtonText,
                (isExporting || !fileName.trim()) && styles.disabledText,
              ]}
            >
              {isExporting ? 'Exporting...' : 'Export'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Session Summary */}
          {getSessionSummary()}

          {/* Filename Input */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Filename</Text>
            <TextInput
              style={styles.textInput}
              value={fileName}
              onChangeText={setFileName}
              placeholder="Enter filename"
              editable={!isExporting}
            />
          </View>

          {/* Export Format */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Export Format</Text>
            {EXPORT_FORMATS.map((format) => (
              <TouchableOpacity
                key={format.id}
                style={[
                  styles.optionItem,
                  selectedFormat === format.id && styles.optionItemSelected,
                  !format.available && styles.optionItemDisabled,
                ]}
                onPress={() => format.available && setSelectedFormat(format.id)}
                disabled={!format.available || isExporting}
              >
                <View style={styles.optionContent}>
                  <Text
                    style={[
                      styles.optionTitle,
                      !format.available && styles.optionTitleDisabled,
                    ]}
                  >
                    {format.name}
                  </Text>
                  <Text
                    style={[
                      styles.optionDescription,
                      !format.available && styles.optionDescriptionDisabled,
                    ]}
                  >
                    {format.description}
                  </Text>
                </View>
                <View
                  style={[
                    styles.radioButton,
                    selectedFormat === format.id && styles.radioButtonSelected,
                  ]}
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* Export Options */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Export To</Text>
            {EXPORT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionItem,
                  selectedOption === option.id && styles.optionItemSelected,
                ]}
                onPress={() => setSelectedOption(option.id)}
                disabled={isExporting}
              >
                <Text style={styles.optionIcon}>{option.icon}</Text>
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>{option.name}</Text>
                  <Text style={styles.optionDescription}>
                    {option.description}
                  </Text>
                </View>
                <View
                  style={[
                    styles.radioButton,
                    selectedOption === option.id && styles.radioButtonSelected,
                  ]}
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* Data Options */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Include Data</Text>

            <TouchableOpacity
              style={styles.checkboxItem}
              onPress={() => setIncludeTimestamps(!includeTimestamps)}
              disabled={isExporting}
            >
              <View
                style={[
                  styles.checkbox,
                  includeTimestamps && styles.checkboxChecked,
                ]}
              >
                {includeTimestamps && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>Timestamps</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.checkboxItem}
              onPress={() => setIncludeElevation(!includeElevation)}
              disabled={isExporting}
            >
              <View
                style={[
                  styles.checkbox,
                  includeElevation && styles.checkboxChecked,
                ]}
              >
                {includeElevation && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>Elevation Data</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.checkboxItem}
              onPress={() => setIncludeSpeed(!includeSpeed)}
              disabled={isExporting}
            >
              <View
                style={[
                  styles.checkbox,
                  includeSpeed && styles.checkboxChecked,
                ]}
              >
                {includeSpeed && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>Speed Data</Text>
            </TouchableOpacity>
          </View>

          {/* Export Progress */}
          {isExporting && (
            <View style={styles.progressSection}>
              <Text style={styles.progressText}>
                Exporting... {Math.round(exportProgress)}%
              </Text>
              <View style={styles.progressBar}>
                <View
                  style={[styles.progressFill, { width: `${exportProgress}%` }]}
                />
              </View>
            </View>
          )}
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
  exportButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
  },
  exportButtonText: {
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
  sessionSummary: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  sessionSummaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  summaryItem: {
    width: '50%',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
  textInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.colors.text,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 8,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  optionItemSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '10',
  },
  optionItemDisabled: {
    opacity: 0.5,
  },
  optionIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  optionTitleDisabled: {
    color: theme.colors.textSecondary,
  },
  optionDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  optionDescriptionDisabled: {
    color: theme.colors.textSecondary,
    opacity: 0.7,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  radioButtonSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  checkboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 16,
    color: theme.colors.text,
  },
  progressSection: {
    marginTop: 16,
    padding: 16,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 8,
  },
  progressText: {
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  progressBar: {
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
  },
});

export default RecordingExportModal;
