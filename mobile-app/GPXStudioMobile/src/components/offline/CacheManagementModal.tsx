import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  OfflineMapService,
  OfflineMapArea,
} from '../../services/offline/OfflineMapService';
import { OfflineFileManager } from '../../services/offline/OfflineFileManager';
import { formatFileSize, formatDistance } from '../../utils/formatters';

interface CacheManagementModalProps {
  visible: boolean;
  onClose: () => void;
  offlineMapService: OfflineMapService;
  offlineFileManager: OfflineFileManager;
}

interface StorageInfo {
  maps: {
    totalAreas: number;
    totalSize: number;
    availableSpace: number;
  };
  files: {
    totalFiles: number;
    totalSize: number;
    availableSpace: number;
  };
}

export const CacheManagementModal: React.FC<CacheManagementModalProps> = ({
  visible,
  onClose,
  offlineMapService,
  offlineFileManager,
}) => {
  const [offlineAreas, setOfflineAreas] = useState<OfflineMapArea[]>([]);
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingArea, setDeletingArea] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      loadCacheData();
    }
  }, [visible]);

  const loadCacheData = async () => {
    setLoading(true);
    try {
      const [areas, mapStorage, fileStorage] = await Promise.all([
        offlineMapService.getOfflineAreas(),
        offlineMapService.getOfflineStorageInfo(),
        offlineFileManager.getOfflineStorageInfo(),
      ]);

      setOfflineAreas(areas);
      setStorageInfo({
        maps: mapStorage,
        files: fileStorage,
      });
    } catch (error) {
      console.error('Failed to load cache data:', error);
      Alert.alert('Error', 'Failed to load cache information');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteArea = async (areaId: string, areaName: string) => {
    Alert.alert(
      'Delete Offline Area',
      `Are you sure you want to delete "${areaName}"? This will remove all cached map tiles for this area.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingArea(areaId);
            try {
              await offlineMapService.deleteOfflineArea(areaId);
              await loadCacheData(); // Refresh data
            } catch (error) {
              console.error('Failed to delete area:', error);
              Alert.alert('Error', 'Failed to delete offline area');
            } finally {
              setDeletingArea(null);
            }
          },
        },
      ]
    );
  };

  const handleClearAllMaps = async () => {
    Alert.alert(
      'Clear All Maps',
      'Are you sure you want to clear all cached map tiles? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await offlineMapService.clearCache();
              await loadCacheData();
            } catch (error) {
              console.error('Failed to clear map cache:', error);
              Alert.alert('Error', 'Failed to clear map cache');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleClearAllFiles = async () => {
    Alert.alert(
      'Clear All Files',
      'Are you sure you want to clear all cached GPX files? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await offlineFileManager.clearOfflineCache();
              await loadCacheData();
            } catch (error) {
              console.error('Failed to clear file cache:', error);
              Alert.alert('Error', 'Failed to clear file cache');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleOptimizeStorage = async () => {
    setLoading(true);
    try {
      await offlineMapService.optimizeOfflineStorage();
      await loadCacheData();
      Alert.alert('Success', 'Storage has been optimized');
    } catch (error) {
      console.error('Failed to optimize storage:', error);
      Alert.alert('Error', 'Failed to optimize storage');
    } finally {
      setLoading(false);
    }
  };

  const renderStorageOverview = () => {
    if (!storageInfo) return null;

    const totalSize = storageInfo.maps.totalSize + storageInfo.files.totalSize;
    const totalAvailable =
      storageInfo.maps.availableSpace + storageInfo.files.availableSpace;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Storage Overview</Text>

        <View style={styles.storageItem}>
          <View style={styles.storageHeader}>
            <Ionicons name="map-outline" size={20} color="#007AFF" />
            <Text style={styles.storageLabel}>Offline Maps</Text>
          </View>
          <Text style={styles.storageValue}>
            {storageInfo.maps.totalAreas} areas •{' '}
            {formatFileSize(storageInfo.maps.totalSize)}
          </Text>
        </View>

        <View style={styles.storageItem}>
          <View style={styles.storageHeader}>
            <Ionicons name="document-outline" size={20} color="#34C759" />
            <Text style={styles.storageLabel}>Offline Files</Text>
          </View>
          <Text style={styles.storageValue}>
            {storageInfo.files.totalFiles} files •{' '}
            {formatFileSize(storageInfo.files.totalSize)}
          </Text>
        </View>

        <View style={styles.totalStorage}>
          <Text style={styles.totalLabel}>
            Total Used: {formatFileSize(totalSize)}
          </Text>
          <Text style={styles.availableLabel}>
            Available: {formatFileSize(totalAvailable)}
          </Text>
        </View>
      </View>
    );
  };

  const renderOfflineArea = (area: OfflineMapArea) => {
    const isDeleting = deletingArea === area.id;

    return (
      <View key={area.id} style={styles.areaItem}>
        <View style={styles.areaHeader}>
          <View style={styles.areaInfo}>
            <Text style={styles.areaName}>{area.name}</Text>
            <Text style={styles.areaDetails}>
              {area.provider} • Zoom {Math.min(...area.zoomLevels)}-
              {Math.max(...area.zoomLevels)}
            </Text>
            <Text style={styles.areaSize}>
              {area.tileCount} tiles • {formatFileSize(area.sizeBytes)}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.deleteButton,
              isDeleting && styles.deleteButtonDisabled,
            ]}
            onPress={() => handleDeleteArea(area.id, area.name)}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color="#FF3B30" />
            ) : (
              <Ionicons name="trash-outline" size={20} color="#FF3B30" />
            )}
          </TouchableOpacity>
        </View>

        {area.isDownloading && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${area.downloadProgress}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>{area.downloadProgress}%</Text>
          </View>
        )}

        {area.downloadedAt && (
          <Text style={styles.downloadDate}>
            Downloaded: {area.downloadedAt.toLocaleDateString()}
          </Text>
        )}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Cache Management</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading cache information...</Text>
          </View>
        ) : (
          <ScrollView style={styles.content}>
            {renderStorageOverview()}

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Offline Map Areas</Text>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleOptimizeStorage}
                >
                  <Ionicons name="settings-outline" size={16} color="#007AFF" />
                  <Text style={styles.actionButtonText}>Optimize</Text>
                </TouchableOpacity>
              </View>

              {offlineAreas.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="map-outline" size={48} color="#8E8E93" />
                  <Text style={styles.emptyText}>No offline map areas</Text>
                  <Text style={styles.emptySubtext}>
                    Download map areas from the map screen to access them
                    offline
                  </Text>
                </View>
              ) : (
                offlineAreas.map(renderOfflineArea)
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Cache Actions</Text>

              <TouchableOpacity
                style={styles.actionRow}
                onPress={handleClearAllMaps}
              >
                <View style={styles.actionRowContent}>
                  <Ionicons name="map-outline" size={20} color="#FF3B30" />
                  <Text style={styles.actionRowText}>Clear All Map Cache</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionRow}
                onPress={handleClearAllFiles}
              >
                <View style={styles.actionRowContent}>
                  <Ionicons name="document-outline" size={20} color="#FF3B30" />
                  <Text style={styles.actionRowText}>Clear All File Cache</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8E8E93',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  actionButtonText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#007AFF',
  },
  storageItem: {
    marginBottom: 12,
  },
  storageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  storageLabel: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
  },
  storageValue: {
    fontSize: 13,
    color: '#8E8E93',
    marginLeft: 28,
  },
  totalStorage: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
  },
  availableLabel: {
    fontSize: 14,
    color: '#34C759',
  },
  areaItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  areaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  areaInfo: {
    flex: 1,
  },
  areaName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 2,
  },
  areaDetails: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 2,
  },
  areaSize: {
    fontSize: 12,
    color: '#8E8E93',
  },
  deleteButton: {
    padding: 8,
    marginLeft: 12,
  },
  deleteButtonDisabled: {
    opacity: 0.5,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#E5E5EA',
    borderRadius: 2,
    marginRight: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#8E8E93',
    minWidth: 32,
    textAlign: 'right',
  },
  downloadDate: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#8E8E93',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 32,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  actionRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionRowText: {
    marginLeft: 12,
    fontSize: 15,
    color: '#FF3B30',
  },
});
