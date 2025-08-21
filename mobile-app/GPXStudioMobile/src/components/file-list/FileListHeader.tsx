import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from 'react-native';
import { theme } from '../../constants/theme';
import { SortOption, SortDirection } from './FileList';

export interface FileListHeaderProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  sortBy?: SortOption;
  sortDirection?: SortDirection;
  onSortChange?: (sortBy: SortOption, direction: SortDirection) => void;
  onImportFile?: () => void;
  fileCount: number;
  totalFiles: number;
}

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: 'date', label: 'Date Created' },
  { key: 'name', label: 'Name' },
  { key: 'distance', label: 'Distance' },
  { key: 'size', label: 'File Size' },
];

export const FileListHeader: React.FC<FileListHeaderProps> = ({
  searchQuery = '',
  onSearchChange,
  sortBy = 'date',
  sortDirection = 'desc',
  onSortChange,
  onImportFile,
  fileCount,
  totalFiles,
}) => {
  const [showSortModal, setShowSortModal] = useState(false);

  const handleSortSelect = (option: SortOption) => {
    const newDirection =
      sortBy === option && sortDirection === 'desc' ? 'asc' : 'desc';
    onSortChange?.(option, newDirection);
    setShowSortModal(false);
  };

  const getSortLabel = () => {
    const option = SORT_OPTIONS.find((opt) => opt.key === sortBy);
    const directionIcon = sortDirection === 'desc' ? '↓' : '↑';
    return `${option?.label} ${directionIcon}`;
  };

  const renderSortModal = () => (
    <Modal
      visible={showSortModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowSortModal(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowSortModal(false)}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Sort Files</Text>
          {SORT_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.sortOption,
                sortBy === option.key && styles.selectedSortOption,
              ]}
              onPress={() => handleSortSelect(option.key)}
            >
              <Text
                style={[
                  styles.sortOptionText,
                  sortBy === option.key && styles.selectedSortOptionText,
                ]}
              >
                {option.label}
              </Text>
              {sortBy === option.key && (
                <Text style={styles.sortDirectionIcon}>
                  {sortDirection === 'desc' ? '↓' : '↑'}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search files..."
          value={searchQuery}
          onChangeText={onSearchChange}
          placeholderTextColor={theme.colors.textTertiary}
        />
      </View>

      {/* Controls Row */}
      <View style={styles.controlsRow}>
        <View style={styles.fileCountContainer}>
          <Text style={styles.fileCountText}>
            {fileCount === totalFiles
              ? `${totalFiles} files`
              : `${fileCount} of ${totalFiles} files`}
          </Text>
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.sortButton}
            onPress={() => setShowSortModal(true)}
          >
            <Text style={styles.sortButtonText}>{getSortLabel()}</Text>
          </TouchableOpacity>

          {onImportFile && (
            <TouchableOpacity
              style={styles.importButton}
              onPress={onImportFile}
            >
              <Text style={styles.importButtonText}>Import</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {renderSortModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  searchContainer: {
    marginBottom: theme.spacing.md,
  },
  searchInput: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.borderSecondary,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fileCountContainer: {
    flex: 1,
  },
  fileCountText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  sortButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sortButtonText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    fontWeight: theme.fontWeight.medium,
  },
  importButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
  },
  importButtonText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.background,
    fontWeight: theme.fontWeight.medium,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    minWidth: 250,
    maxWidth: '80%',
    ...theme.shadows.lg,
  },
  modalTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  selectedSortOption: {
    backgroundColor: theme.colors.backgroundSecondary,
  },
  sortOptionText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
  },
  selectedSortOptionText: {
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.primary,
  },
  sortDirectionIcon: {
    fontSize: theme.fontSize.md,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.bold,
  },
});
