import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../../constants/theme';

export interface EmptyFileListProps {
  hasSearchQuery: boolean;
  onImportFile?: () => void;
  onClearSearch?: () => void;
}

export const EmptyFileList: React.FC<EmptyFileListProps> = ({
  hasSearchQuery,
  onImportFile,
  onClearSearch,
}) => {
  if (hasSearchQuery) {
    return (
      <View style={styles.container}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>🔍</Text>
        </View>
        <Text style={styles.title}>No files found</Text>
        <Text style={styles.subtitle}>
          No files match your search criteria. Try adjusting your search terms.
        </Text>
        {onClearSearch && (
          <TouchableOpacity style={styles.button} onPress={onClearSearch}>
            <Text style={styles.buttonText}>Clear Search</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>📁</Text>
      </View>
      <Text style={styles.title}>No GPX files yet</Text>
      <Text style={styles.subtitle}>
        Import your first GPX file to get started. You can import files from
        your device, cloud storage, or by entering a URL.
      </Text>
      {onImportFile && (
        <TouchableOpacity style={styles.button} onPress={onImportFile}>
          <Text style={styles.buttonText}>Import File</Text>
        </TouchableOpacity>
      )}
      <View style={styles.tipsContainer}>
        <Text style={styles.tipsTitle}>Tips:</Text>
        <Text style={styles.tipText}>
          • Tap Import to add files from your device
        </Text>
        <Text style={styles.tipText}>
          • Use the Record tab to create new tracks
        </Text>
        <Text style={styles.tipText}>
          • Files are stored locally on your device
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.xxl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: theme.spacing.xl,
  },
  button: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.xl,
  },
  buttonText: {
    color: theme.colors.background,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
  },
  tipsContainer: {
    alignSelf: 'stretch',
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
