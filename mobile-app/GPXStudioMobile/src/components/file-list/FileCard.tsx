import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
} from 'react-native';
import { GPXFileMetadata } from '../../types/gpx';
import { theme } from '../../constants/theme';
import {
  formatDistance,
  formatFileSize,
  formatDate,
} from '../../utils/formatters';

export interface FileCardProps {
  file: GPXFileMetadata;
  onPress?: () => void;
  onDelete?: () => Promise<void>;
  onShare?: () => void;
}

export const FileCard: React.FC<FileCardProps> = ({
  file,
  onPress,
  onDelete,
  onShare,
}) => {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = () => {
    Alert.alert(
      'Delete File',
      `Are you sure you want to delete "${file.name || file.filename}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (onDelete) {
              setDeleting(true);
              try {
                await onDelete();
              } catch (error) {
                Alert.alert(
                  'Error',
                  'Failed to delete file. Please try again.'
                );
              } finally {
                setDeleting(false);
              }
            }
          },
        },
      ]
    );
  };

  const renderThumbnail = () => {
    if (file.thumbnail) {
      return (
        <Image source={{ uri: file.thumbnail }} style={styles.thumbnail} />
      );
    }

    return (
      <View style={styles.placeholderThumbnail}>
        <Text style={styles.placeholderText}>GPX</Text>
      </View>
    );
  };

  const renderStats = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statItem}>
        <Text style={styles.statLabel}>Distance</Text>
        <Text style={styles.statValue}>
          {formatDistance(file.totalDistance)}
        </Text>
      </View>
      <View style={styles.statItem}>
        <Text style={styles.statLabel}>Elevation</Text>
        <Text style={styles.statValue}>
          ↗ {formatDistance(file.elevationGain, 'elevation')}
        </Text>
      </View>
      <View style={styles.statItem}>
        <Text style={styles.statLabel}>Tracks</Text>
        <Text style={styles.statValue}>{file.trackCount}</Text>
      </View>
      {file.waypointCount > 0 && (
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Waypoints</Text>
          <Text style={styles.statValue}>{file.waypointCount}</Text>
        </View>
      )}
    </View>
  );

  const renderActions = () => (
    <View style={styles.actionsContainer}>
      {onShare && (
        <TouchableOpacity
          style={[styles.actionButton, styles.shareButton]}
          onPress={onShare}
          disabled={deleting}
        >
          <Text style={styles.shareButtonText}>Share</Text>
        </TouchableOpacity>
      )}
      {onDelete && (
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={handleDelete}
          disabled={deleting}
        >
          <Text style={styles.deleteButtonText}>
            {deleting ? 'Deleting...' : 'Delete'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <TouchableOpacity
      style={[styles.container, deleting && styles.deletingContainer]}
      onPress={onPress}
      disabled={deleting}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          {renderThumbnail()}
          <View style={styles.headerInfo}>
            <Text style={styles.title} numberOfLines={1}>
              {file.name || file.filename}
            </Text>
            {file.description && (
              <Text style={styles.description} numberOfLines={2}>
                {file.description}
              </Text>
            )}
            <View style={styles.metadata}>
              <Text style={styles.metadataText}>
                {formatDate(file.createdAt)}
              </Text>
              <Text style={styles.metadataText}>•</Text>
              <Text style={styles.metadataText}>
                {formatFileSize(file.fileSize)}
              </Text>
            </View>
          </View>
        </View>

        {renderStats()}
        {renderActions()}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
    marginHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.md,
  },
  deletingContainer: {
    opacity: 0.6,
  },
  content: {
    padding: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: theme.borderRadius.md,
    marginRight: theme.spacing.md,
  },
  placeholderThumbnail: {
    width: 60,
    height: 60,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  placeholderText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textTertiary,
  },
  headerInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  description: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: theme.spacing.xs,
  },
  metadata: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metadataText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textTertiary,
    marginRight: theme.spacing.xs,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSecondary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSecondary,
    marginBottom: theme.spacing.md,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textTertiary,
    marginBottom: theme.spacing.xs,
  },
  statValue: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
  },
  actionButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    minWidth: 80,
    alignItems: 'center',
  },
  shareButton: {
    backgroundColor: theme.colors.primary,
  },
  shareButtonText: {
    color: theme.colors.background,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
  },
  deleteButton: {
    backgroundColor: theme.colors.backgroundTertiary,
    borderWidth: 1,
    borderColor: theme.colors.error,
  },
  deleteButtonText: {
    color: theme.colors.error,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
  },
});
