import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { OfflineMapService } from '../../services/offline/OfflineMapService';
import { MapBounds } from '../../types/map';
import { formatFileSize } from '../../utils/formatters';

interface OfflineDownloadModalProps {
  visible: boolean;
  onClose: () => void;
  bounds: MapBounds;
  offlineMapService: OfflineMapService;
  onDownloadStart?: (areaId: string) => void;
}

interface DownloadEstimate {
  tileCount: number;
  estimatedSize: number;
  zoomLevels: number[];
}

export const OfflineDownloadModal: React.FC<OfflineDownloadModalProps> = ({
  visible,
  onClose,
  bounds,
  offlineMapService,
  onDownloadStart,
}) => {
  const [areaName, setAreaName] = useState('');
  const [minZoom, setMinZoom] = useState(10);
  const [maxZoom, setMaxZoom] = useState(15);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [estimate, setEstimate] = useState<DownloadEstimate | null>(null);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    if (visible) {
      // Generate default name based on bounds
      const centerLat = (bounds.north + bounds.south) / 2;
      const centerLon = (bounds.east + bounds.west) / 2;
      setAreaName(`Area ${centerLat.toFixed(3)}, ${centerLon.toFixed(3)}`);

      // Reset state
      setDownloading(false);
      setDownloadProgress(0);

      // Calculate initial estimate
      calculateEstimate();
    }
  }, [visible, bounds]);

  useEffect(() => {
    if (visible && !downloading) {
      calculateEstimate();
    }
  }, [minZoom, maxZoom, bounds]);

  const calculateEstimate = async () => {
    setCalculating(true);
    try {
      const zoomLevels = [];
      for (let z = minZoom; z <= maxZoom; z++) {
        zoomLevels.push(z);
      }

      const tileCount = calculateTotalTiles(bounds, zoomLevels);
      const estimatedSize = tileCount * 15000; // Rough estimate: 15KB per tile

      setEstimate({
        tileCount,
        estimatedSize,
        zoomLevels,
      });
    } catch (error) {
      console.error('Failed to calculate estimate:', error);
    } finally {
      setCalculating(false);
    }
  };

  const calculateTotalTiles = (
    bounds: MapBounds,
    zoomLevels: number[]
  ): number => {
    let total = 0;

    for (const zoom of zoomLevels) {
      const n = Math.pow(2, zoom);

      const minX = Math.floor(((bounds.west + 180) / 360) * n);
      const maxX = Math.floor(((bounds.east + 180) / 360) * n);

      const minY = Math.floor(
        ((1 -
          Math.log(
            Math.tan((bounds.north * Math.PI) / 180) +
              1 / Math.cos((bounds.north * Math.PI) / 180)
          ) /
            Math.PI) /
          2) *
          n
      );
      const maxY = Math.floor(
        ((1 -
          Math.log(
            Math.tan((bounds.south * Math.PI) / 180) +
              1 / Math.cos((bounds.south * Math.PI) / 180)
          ) /
            Math.PI) /
          2) *
          n
      );

      const tilesX = Math.max(0, maxX - minX + 1);
      const tilesY = Math.max(0, maxY - minY + 1);
      total += tilesX * tilesY;
    }

    return total;
  };

  const handleDownload = async () => {
    if (!areaName.trim()) {
      Alert.alert('Error', 'Please enter a name for this area');
      return;
    }

    if (!estimate) {
      Alert.alert('Error', 'Unable to calculate download size');
      return;
    }

    // Check storage space
    const storageInfo = await offlineMapService.getOfflineStorageInfo();
    if (estimate.estimatedSize > storageInfo.availableSpace) {
      Alert.alert(
        'Insufficient Storage',
        `This download requires ${formatFileSize(estimate.estimatedSize)} but only ${formatFileSize(storageInfo.availableSpace)} is available. Please free up space or reduce the zoom levels.`
      );
      return;
    }

    // Confirm download
    Alert.alert(
      'Download Offline Maps',
      `This will download ${estimate.tileCount} tiles (approximately ${formatFileSize(estimate.estimatedSize)}) for zoom levels ${minZoom}-${maxZoom}.\n\nContinue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Download',
          onPress: startDownload,
        },
      ]
    );
  };

  const startDownload = async () => {
    setDownloading(true);
    setDownloadProgress(0);

    try {
      const zoomLevels = [];
      for (let z = minZoom; z <= maxZoom; z++) {
        zoomLevels.push(z);
      }

      await offlineMapService.cacheMapArea(bounds, zoomLevels);
      const areaId = areaName.trim();

      Alert.alert('Success', 'Offline area downloaded successfully!');
      onDownloadStart?.(areaId);
      onClose();
    } catch (error) {
      console.error('Download failed:', error);
      Alert.alert(
        'Download Failed',
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
    } finally {
      setDownloading(false);
      setDownloadProgress(0);
    }
  };

  const handleCancel = () => {
    if (downloading) {
      Alert.alert(
        'Cancel Download',
        'Are you sure you want to cancel the download?',
        [
          { text: 'Continue Download', style: 'cancel' },
          {
            text: 'Cancel Download',
            style: 'destructive',
            onPress: () => {
              // TODO: Implement download cancellation
              setDownloading(false);
              setDownloadProgress(0);
              onClose();
            },
          },
        ]
      );
    } else {
      onClose();
    }
  };

  const renderZoomSlider = (
    label: string,
    value: number,
    onValueChange: (value: number) => void,
    minimum: number = 1,
    maximum: number = 18
  ) => (
    <View style={styles.sliderContainer}>
      <View style={styles.sliderHeader}>
        <Text style={styles.sliderLabel}>{label}</Text>
        <Text style={styles.sliderValue}>{value}</Text>
      </View>
      <Slider
        style={styles.slider}
        minimumValue={minimum}
        maximumValue={maximum}
        value={value}
        onValueChange={onValueChange}
        step={1}
        minimumTrackTintColor="#007AFF"
        maximumTrackTintColor="#E5E5EA"
        disabled={downloading}
      />
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Download Offline Maps</Text>
          <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Area Name</Text>
            <TextInput
              style={[
                styles.textInput,
                downloading && styles.textInputDisabled,
              ]}
              value={areaName}
              onChangeText={setAreaName}
              placeholder="Enter a name for this area"
              editable={!downloading}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Zoom Levels</Text>
            <Text style={styles.sectionDescription}>
              Higher zoom levels show more detail but require more storage space
            </Text>

            {renderZoomSlider('Minimum Zoom', minZoom, setMinZoom, 1, maxZoom)}
            {renderZoomSlider('Maximum Zoom', maxZoom, setMaxZoom, minZoom, 18)}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Download Estimate</Text>
            {calculating ? (
              <View style={styles.calculatingContainer}>
                <ActivityIndicator size="small" color="#007AFF" />
                <Text style={styles.calculatingText}>Calculating...</Text>
              </View>
            ) : estimate ? (
              <View style={styles.estimateContainer}>
                <View style={styles.estimateRow}>
                  <Text style={styles.estimateLabel}>Tiles:</Text>
                  <Text style={styles.estimateValue}>
                    {estimate.tileCount.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.estimateRow}>
                  <Text style={styles.estimateLabel}>Estimated Size:</Text>
                  <Text style={styles.estimateValue}>
                    {formatFileSize(estimate.estimatedSize)}
                  </Text>
                </View>
                <View style={styles.estimateRow}>
                  <Text style={styles.estimateLabel}>Zoom Levels:</Text>
                  <Text style={styles.estimateValue}>
                    {minZoom} - {maxZoom}
                  </Text>
                </View>
              </View>
            ) : (
              <Text style={styles.errorText}>Unable to calculate estimate</Text>
            )}
          </View>

          {downloading && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Download Progress</Text>
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${downloadProgress}%` },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>{downloadProgress}%</Text>
              </View>
              <Text style={styles.progressDescription}>
                Downloading map tiles... This may take several minutes.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={handleCancel}
          >
            <Text style={styles.cancelButtonText}>
              {downloading ? 'Cancel Download' : 'Cancel'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.downloadButton,
              (downloading || !estimate || !areaName.trim()) &&
                styles.downloadButtonDisabled,
            ]}
            onPress={handleDownload}
            disabled={downloading || !estimate || !areaName.trim()}
          >
            {downloading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.downloadButtonText}>Download</Text>
            )}
          </TouchableOpacity>
        </View>
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
    paddingTop: 16,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 16,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  textInputDisabled: {
    backgroundColor: '#F2F2F7',
    color: '#8E8E93',
  },
  sliderContainer: {
    marginBottom: 20,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sliderLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
  },
  sliderValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  slider: {
    height: 40,
  },
  sliderThumb: {
    backgroundColor: '#007AFF',
    width: 20,
    height: 20,
  },
  calculatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calculatingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#8E8E93',
  },
  estimateContainer: {
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 12,
  },
  estimateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  estimateLabel: {
    fontSize: 14,
    color: '#8E8E93',
  },
  estimateValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    fontStyle: 'italic',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E5EA',
    borderRadius: 4,
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    minWidth: 40,
    textAlign: 'right',
  },
  progressDescription: {
    fontSize: 12,
    color: '#8E8E93',
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F2F2F7',
    marginRight: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#8E8E93',
  },
  downloadButton: {
    backgroundColor: '#007AFF',
    marginLeft: 8,
  },
  downloadButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  downloadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
