/**
 * Example component demonstrating error handling integration
 * This shows how to use the error handling system in React components
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { LoadingIndicator, ErrorBoundary } from '../ui';
import { EnhancedFileImportService } from '../../services/file/EnhancedFileImportService';
import { ErrorFactory } from '../../services/error';
import { theme } from '../../constants/theme';

interface ExampleFile {
  id: string;
  name: string;
  uri: string;
}

export const ErrorHandlingExample: React.FC = () => {
  const [files, setFiles] = useState<ExampleFile[]>([]);
  const { loading, handleError, showConfirmation, executeWithErrorHandling } =
    useErrorHandler();
  const [importService] = useState(() => new EnhancedFileImportService());

  // Example: File import with error handling
  const handleFileImport = async (fileUri: string, fileName: string) => {
    const result = await executeWithErrorHandling(
      async () => {
        const importResult = await importService.importFile(
          {
            type: 'device',
            uri: fileUri,
            name: fileName,
          },
          {},
          (progress) => {
            // Update loading progress
            console.log('Import progress:', progress);
          }
        );

        if (!importResult.success) {
          throw new Error(importResult.error || 'Import failed');
        }

        return importResult;
      },
      `Importing ${fileName}...`,
      'FileImport'
    );

    if (result) {
      // Add to files list on success
      setFiles((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          name: fileName,
          uri: fileUri,
        },
      ]);
    }
  };

  // Example: File deletion with confirmation
  const handleFileDelete = (file: ExampleFile) => {
    showConfirmation(
      'Delete File',
      `Are you sure you want to delete "${file.name}"? This action cannot be undone.`,
      async () => {
        await executeWithErrorHandling(
          async () => {
            // Simulate file deletion
            await new Promise((resolve) => setTimeout(resolve, 1000));

            // Remove from files list
            setFiles((prev) => prev.filter((f) => f.id !== file.id));
          },
          'Deleting file...',
          'FileDelete'
        );
      },
      undefined,
      true // destructive action
    );
  };

  // Example: Simulate various error types
  const simulateError = async (errorType: string) => {
    try {
      switch (errorType) {
        case 'file-not-found':
          throw ErrorFactory.createFileNotFoundError('missing-file.gpx');

        case 'invalid-gpx':
          throw ErrorFactory.createInvalidGPXError(
            'corrupt-file.gpx',
            'Missing XML header'
          );

        case 'storage-full':
          throw ErrorFactory.createStorageFullError();

        case 'permission-denied':
          throw ErrorFactory.createFilePermissionError('read');

        case 'location-permission':
          throw ErrorFactory.createLocationPermissionError();

        case 'gps-unavailable':
          throw ErrorFactory.createGPSUnavailableError();

        case 'no-internet':
          throw ErrorFactory.createNoInternetError();

        case 'network-timeout':
          throw ErrorFactory.createNetworkTimeoutError('file upload');

        case 'unknown':
          throw ErrorFactory.createUnknownError(
            new Error('Something went wrong'),
            'TestError'
          );

        default:
          throw new Error('Unknown error type');
      }
    } catch (error) {
      await handleError(error as Error, 'ErrorSimulation');
    }
  };

  // Example: Batch operation with progress
  const handleBatchImport = async () => {
    const mockFiles = [
      { uri: 'file1.gpx', name: 'Track 1' },
      { uri: 'file2.gpx', name: 'Track 2' },
      { uri: 'file3.gpx', name: 'Track 3' },
    ];

    await executeWithErrorHandling(
      async () => {
        const result = await importService.importBatch(
          mockFiles.map((f) => ({
            type: 'device' as const,
            uri: f.uri,
            name: f.name,
          })),
          {},
          (progress) => {
            console.log(
              `Processing ${progress.currentFile}/${progress.totalFiles}: ${progress.currentFileName}`
            );
          }
        );

        console.log(
          `Batch import completed: ${result.successCount} success, ${result.failureCount} failed`
        );
        return result;
      },
      'Importing multiple files...',
      'BatchImport'
    );
  };

  return (
    <ErrorBoundary>
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Error Handling Examples</Text>

        {/* File Operations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>File Operations</Text>

          <TouchableOpacity
            style={styles.button}
            onPress={() => handleFileImport('example.gpx', 'Example Track')}
          >
            <Text style={styles.buttonText}>Import File</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={handleBatchImport}>
            <Text style={styles.buttonText}>Batch Import</Text>
          </TouchableOpacity>
        </View>

        {/* File List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Imported Files</Text>
          {files.map((file) => (
            <View key={file.id} style={styles.fileItem}>
              <Text style={styles.fileName}>{file.name}</Text>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleFileDelete(file)}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          ))}
          {files.length === 0 && (
            <Text style={styles.emptyText}>No files imported yet</Text>
          )}
        </View>

        {/* Error Simulation */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Error Simulation</Text>

          <TouchableOpacity
            style={styles.errorButton}
            onPress={() => simulateError('file-not-found')}
          >
            <Text style={styles.buttonText}>File Not Found</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.errorButton}
            onPress={() => simulateError('invalid-gpx')}
          >
            <Text style={styles.buttonText}>Invalid GPX</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.errorButton}
            onPress={() => simulateError('storage-full')}
          >
            <Text style={styles.buttonText}>Storage Full</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.errorButton}
            onPress={() => simulateError('location-permission')}
          >
            <Text style={styles.buttonText}>Location Permission</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.errorButton}
            onPress={() => simulateError('no-internet')}
          >
            <Text style={styles.buttonText}>No Internet</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.errorButton}
            onPress={() => simulateError('unknown')}
          >
            <Text style={styles.buttonText}>Unknown Error</Text>
          </TouchableOpacity>
        </View>

        {/* Loading Indicator */}
        <LoadingIndicator loading={loading} />
      </ScrollView>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 24,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
  button: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  errorButton: {
    backgroundColor: '#ff6b6b',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  buttonText: {
    color: theme.colors.surface,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  fileItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  fileName: {
    fontSize: 16,
    color: theme.colors.text,
    flex: 1,
  },
  deleteButton: {
    backgroundColor: '#ff6b6b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  deleteButtonText: {
    color: theme.colors.surface,
    fontSize: 14,
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 16,
  },
});

export default ErrorHandlingExample;
