import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useFocusEffect } from '@react-navigation/native';

import {
  FileList,
  FileImportModal,
  SortOption,
  SortDirection,
} from '../../components/file-list';
import { GPXFileMetadata } from '../../types/gpx';
import { FileManager } from '../../services/file/FileManager';
import { theme } from '../../constants/theme';

export interface FilesScreenProps {
  onFileSelect?: (file: GPXFileMetadata) => void;
}

export const FilesScreen: React.FC<FilesScreenProps> = ({ onFileSelect }) => {
  const [files, setFiles] = useState<GPXFileMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showImportModal, setShowImportModal] = useState(false);

  const fileManager = new FileManager();

  // Load files when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadFiles();
    }, [])
  );

  const loadFiles = async () => {
    try {
      setLoading(true);
      const fileList = await fileManager.getFileList();
      setFiles(fileList);
    } catch (error) {
      console.error('Error loading files:', error);
      Alert.alert('Error', 'Failed to load files. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await loadFiles();
  };

  const handleFileSelect = (file: GPXFileMetadata) => {
    if (onFileSelect) {
      onFileSelect(file);
    } else {
      // Default behavior - could navigate to map view or file details
      console.log('Selected file:', file.name || file.filename);
    }
  };

  const handleFileDelete = async (fileId: string) => {
    try {
      const success = await fileManager.deleteFile(fileId);
      if (success) {
        // Remove file from local state
        setFiles((prevFiles) => prevFiles.filter((file) => file.id !== fileId));
      } else {
        Alert.alert('Error', 'Failed to delete file. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      Alert.alert('Error', 'Failed to delete file. Please try again.');
    }
  };

  const handleFileShare = async (file: GPXFileMetadata) => {
    try {
      const result = await fileManager.exportFile(file.id);
      if (result.success && result.uri) {
        // TODO: Implement sharing functionality
        // This would typically use Expo Sharing or React Native Share
        console.log('Share file:', result.uri);
        Alert.alert('Info', 'Sharing functionality will be implemented soon.');
      } else {
        Alert.alert(
          'Error',
          result.error || 'Failed to prepare file for sharing.'
        );
      }
    } catch (error) {
      console.error('Error sharing file:', error);
      Alert.alert('Error', 'Failed to share file. Please try again.');
    }
  };

  const handleImportFromDevice = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/gpx+xml',
          'text/xml',
          'application/xml',
          'text/plain',
          '*/*',
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];

        // Check file extension as additional validation
        const fileName = asset.name || '';
        const isGpxFile =
          fileName.toLowerCase().endsWith('.gpx') ||
          fileName.toLowerCase().endsWith('.xml');

        if (!isGpxFile) {
          Alert.alert(
            'Invalid File Type',
            'Please select a GPX file (.gpx or .xml extension)'
          );
          return;
        }

        const importResult = await fileManager.importFromDevice(asset.uri, {
          validateOnImport: true, // Re-enabled with simplified validation
          generateThumbnail: true,
          extractMetadata: true,
        });

        if (importResult.success) {
          // Reload files to show the new import
          await loadFiles();
          Alert.alert('Success', 'File imported successfully!');
        } else {
          Alert.alert(
            'Import Error',
            importResult.error || 'Failed to import file'
          );
        }
      }
    } catch (error) {
      console.error('Error importing from device:', error);
      Alert.alert('Error', 'Failed to import file. Please try again.');
    }
  };

  const handleImportFromUrl = async (url: string) => {
    try {
      const importResult = await fileManager.importFromUrl(url, {
        validateOnImport: true,
        generateThumbnail: true,
        extractMetadata: true,
      });

      if (importResult.success) {
        // Reload files to show the new import
        await loadFiles();
        Alert.alert('Success', 'File imported successfully!');
      } else {
        Alert.alert(
          'Import Error',
          importResult.error || 'Failed to import file'
        );
      }
    } catch (error) {
      console.error('Error importing from URL:', error);
      Alert.alert('Error', 'Failed to import file. Please try again.');
    }
  };

  const handleSortChange = (
    newSortBy: SortOption,
    newDirection: SortDirection
  ) => {
    setSortBy(newSortBy);
    setSortDirection(newDirection);
  };

  return (
    <View style={styles.container}>
      <FileList
        files={files}
        loading={loading}
        onRefresh={handleRefresh}
        onFileSelect={handleFileSelect}
        onFileDelete={handleFileDelete}
        onFileShare={handleFileShare}
        onImportFile={() => setShowImportModal(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sortBy={sortBy}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
      />

      <FileImportModal
        visible={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportFromDevice={handleImportFromDevice}
        onImportFromUrl={handleImportFromUrl}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});
