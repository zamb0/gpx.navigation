import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { theme } from '../../constants/theme';

export interface FileImportModalProps {
  visible: boolean;
  onClose: () => void;
  onImportFromDevice: () => Promise<void>;
  onImportFromUrl: (url: string) => Promise<void>;
}

export const FileImportModal: React.FC<FileImportModalProps> = ({
  visible,
  onClose,
  onImportFromDevice,
  onImportFromUrl,
}) => {
  const [url, setUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [importType, setImportType] = useState<'device' | 'url' | null>(null);

  const handleImportFromDevice = async () => {
    setImporting(true);
    setImportType('device');

    try {
      await onImportFromDevice();
      onClose();
      setUrl('');
    } catch (error) {
      Alert.alert(
        'Import Error',
        error instanceof Error ? error.message : 'Failed to import file'
      );
    } finally {
      setImporting(false);
      setImportType(null);
    }
  };

  const handleImportFromUrl = async () => {
    if (!url.trim()) {
      Alert.alert('Error', 'Please enter a valid URL');
      return;
    }

    setImporting(true);
    setImportType('url');

    try {
      await onImportFromUrl(url.trim());
      onClose();
      setUrl('');
    } catch (error) {
      Alert.alert(
        'Import Error',
        error instanceof Error ? error.message : 'Failed to import from URL'
      );
    } finally {
      setImporting(false);
      setImportType(null);
    }
  };

  const handleClose = () => {
    if (!importing) {
      onClose();
      setUrl('');
      setImportType(null);
    }
  };

  const isValidUrl = (urlString: string): boolean => {
    try {
      const url = new URL(urlString);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Import GPX File</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              disabled={importing}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {/* Import from Device */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>From Device</Text>
              <Text style={styles.sectionDescription}>
                Select a GPX file (.gpx or .xml) from your device storage
              </Text>
              <TouchableOpacity
                style={[
                  styles.importButton,
                  importing && importType !== 'device' && styles.disabledButton,
                ]}
                onPress={handleImportFromDevice}
                disabled={importing}
              >
                {importing && importType === 'device' ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator
                      size="small"
                      color={theme.colors.background}
                    />
                    <Text style={styles.importButtonText}>Importing...</Text>
                  </View>
                ) : (
                  <Text style={styles.importButtonText}>Choose File</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Import from URL */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>From URL</Text>
              <Text style={styles.sectionDescription}>
                Enter a direct link to a GPX file
              </Text>
              <TextInput
                style={styles.urlInput}
                placeholder="https://example.com/track.gpx"
                value={url}
                onChangeText={setUrl}
                placeholderTextColor={theme.colors.textTertiary}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                editable={!importing}
              />
              <TouchableOpacity
                style={[
                  styles.importButton,
                  (!url.trim() || !isValidUrl(url.trim()) || importing) &&
                    styles.disabledButton,
                ]}
                onPress={handleImportFromUrl}
                disabled={!url.trim() || !isValidUrl(url.trim()) || importing}
              >
                {importing && importType === 'url' ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator
                      size="small"
                      color={theme.colors.background}
                    />
                    <Text style={styles.importButtonText}>Importing...</Text>
                  </View>
                ) : (
                  <Text style={styles.importButtonText}>Import from URL</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Tips */}
            <View style={styles.tipsSection}>
              <Text style={styles.tipsTitle}>Supported Sources:</Text>
              <Text style={styles.tipText}>• GPX files from your device</Text>
              <Text style={styles.tipText}>• Direct URLs to GPX files</Text>
              <Text style={styles.tipText}>• Files shared from other apps</Text>
              <Text style={styles.tipText}>• Cloud storage services</Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSecondary,
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.textSecondary,
  },
  content: {
    padding: theme.spacing.lg,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  sectionDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
    lineHeight: 18,
  },
  urlInput: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.borderSecondary,
    marginBottom: theme.spacing.md,
  },
  importButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: theme.colors.textTertiary,
    opacity: 0.6,
  },
  importButtonText: {
    color: theme.colors.background,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  tipsSection: {
    backgroundColor: theme.colors.backgroundSecondary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  tipsTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  tipText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
    lineHeight: 18,
  },
});
