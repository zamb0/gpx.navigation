import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  Text,
  ActivityIndicator,
} from 'react-native';
import { GPXFileMetadata } from '../../types/gpx';
import { FileCard } from './FileCard';
import { FileListHeader } from './FileListHeader';
import { EmptyFileList } from './EmptyFileList';
import { theme } from '../../constants/theme';

export type SortOption = 'date' | 'name' | 'distance' | 'size';
export type SortDirection = 'asc' | 'desc';

export interface FileListProps {
  files: GPXFileMetadata[];
  loading?: boolean;
  onRefresh?: () => Promise<void>;
  onFileSelect?: (file: GPXFileMetadata) => void;
  onFileDelete?: (fileId: string) => Promise<void>;
  onFileShare?: (file: GPXFileMetadata) => void;
  onImportFile?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  sortBy?: SortOption;
  sortDirection?: SortDirection;
  onSortChange?: (sortBy: SortOption, direction: SortDirection) => void;
}

export const FileList: React.FC<FileListProps> = ({
  files,
  loading = false,
  onRefresh,
  onFileSelect,
  onFileDelete,
  onFileShare,
  onImportFile,
  searchQuery = '',
  onSearchChange,
  sortBy = 'date',
  sortDirection = 'desc',
  onSortChange,
}) => {
  const [refreshing, setRefreshing] = useState(false);
  const [filteredFiles, setFilteredFiles] = useState<GPXFileMetadata[]>(files);

  // Filter and sort files
  useEffect(() => {
    let filtered = [...files];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (file) =>
          file.filename.toLowerCase().includes(query) ||
          file.name?.toLowerCase().includes(query) ||
          file.description?.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'date':
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        case 'name':
          comparison = (a.name || a.filename).localeCompare(
            b.name || b.filename
          );
          break;
        case 'distance':
          comparison = a.totalDistance - b.totalDistance;
          break;
        case 'size':
          comparison = a.fileSize - b.fileSize;
          break;
      }

      return sortDirection === 'desc' ? -comparison : comparison;
    });

    setFilteredFiles(filtered);
  }, [files, searchQuery, sortBy, sortDirection]);

  const handleRefresh = useCallback(async () => {
    if (onRefresh) {
      setRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    }
  }, [onRefresh]);

  const renderFileItem = ({ item }: { item: GPXFileMetadata }) => (
    <FileCard
      file={item}
      onPress={() => onFileSelect?.(item)}
      onDelete={onFileDelete ? () => onFileDelete(item.id) : undefined}
      onShare={() => onFileShare?.(item)}
    />
  );

  const renderHeader = () => (
    <FileListHeader
      searchQuery={searchQuery}
      onSearchChange={onSearchChange}
      sortBy={sortBy}
      sortDirection={sortDirection}
      onSortChange={onSortChange}
      onImportFile={onImportFile}
      fileCount={filteredFiles.length}
      totalFiles={files.length}
    />
  );

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading files...</Text>
        </View>
      );
    }

    return (
      <EmptyFileList
        hasSearchQuery={!!searchQuery.trim()}
        onImportFile={onImportFile}
        onClearSearch={() => onSearchChange?.('')}
      />
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredFiles}
        renderItem={renderFileItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          ) : undefined
        }
        contentContainerStyle={[
          styles.listContent,
          filteredFiles.length === 0 && styles.emptyListContent,
        ]}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  listContent: {
    paddingBottom: theme.spacing.lg,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
});
