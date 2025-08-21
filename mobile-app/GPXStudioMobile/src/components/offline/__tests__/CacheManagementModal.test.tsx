import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { CacheManagementModal } from '../CacheManagementModal';
import { OfflineMapService } from '../../../services/offline/OfflineMapService';
import { OfflineFileManager } from '../../../services/offline/OfflineFileManager';

// Mock dependencies
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Alert: {
    alert: jest.fn(),
  },
}));

jest.mock('../../../services/offline/OfflineMapService');
jest.mock('../../../services/offline/OfflineFileManager');
jest.mock('../../../utils/formatters', () => ({
  formatFileSize: jest.fn((size) => `${Math.round(size / 1024)}KB`),
}));

const MockOfflineMapService = OfflineMapService as jest.MockedClass<
  typeof OfflineMapService
>;
const MockOfflineFileManager = OfflineFileManager as jest.MockedClass<
  typeof OfflineFileManager
>;

describe('CacheManagementModal', () => {
  let mockOfflineMapService: jest.Mocked<OfflineMapService>;
  let mockOfflineFileManager: jest.Mocked<OfflineFileManager>;
  let mockOnClose: jest.Mock;

  const mockOfflineAreas = [
    {
      id: 'area1',
      name: 'Test Area 1',
      bounds: { north: 1, south: 0, east: 1, west: 0 },
      zoomLevels: [12, 13, 14],
      provider: 'openStreetMap',
      downloadProgress: 100,
      isDownloading: false,
      downloadedAt: new Date('2023-01-01'),
      sizeBytes: 1024 * 1024,
      tileCount: 100,
    },
    {
      id: 'area2',
      name: 'Test Area 2',
      bounds: { north: 2, south: 1, east: 2, west: 1 },
      zoomLevels: [10, 11, 12],
      provider: 'satellite',
      downloadProgress: 50,
      isDownloading: true,
      sizeBytes: 2 * 1024 * 1024,
      tileCount: 200,
    },
  ];

  const mockStorageInfo = {
    maps: {
      totalAreas: 2,
      totalSize: 3 * 1024 * 1024,
      availableSpace: 10 * 1024 * 1024,
    },
    files: {
      totalFiles: 5,
      totalSize: 2 * 1024 * 1024,
      availableSpace: 8 * 1024 * 1024,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockOfflineMapService = new MockOfflineMapService(
      {} as any
    ) as jest.Mocked<OfflineMapService>;
    mockOfflineFileManager = new MockOfflineFileManager(
      {} as any
    ) as jest.Mocked<OfflineFileManager>;
    mockOnClose = jest.fn();

    // Mock service methods
    mockOfflineMapService.getOfflineAreas.mockResolvedValue(mockOfflineAreas);
    mockOfflineMapService.getOfflineStorageInfo.mockResolvedValue(
      mockStorageInfo.maps
    );
    mockOfflineMapService.deleteOfflineArea.mockResolvedValue();
    mockOfflineMapService.clearCache.mockResolvedValue();
    mockOfflineMapService.optimizeOfflineStorage.mockResolvedValue();

    mockOfflineFileManager.getOfflineStorageInfo.mockResolvedValue(
      mockStorageInfo.files
    );
    mockOfflineFileManager.clearOfflineCache.mockResolvedValue();
  });

  describe('Rendering', () => {
    it('should render modal when visible', async () => {
      const { getByText } = render(
        <CacheManagementModal
          visible={true}
          onClose={mockOnClose}
          offlineMapService={mockOfflineMapService}
          offlineFileManager={mockOfflineFileManager}
        />
      );

      await waitFor(() => {
        expect(getByText('Cache Management')).toBeTruthy();
      });
    });

    it('should show loading state initially', () => {
      const { getByText } = render(
        <CacheManagementModal
          visible={true}
          onClose={mockOnClose}
          offlineMapService={mockOfflineMapService}
          offlineFileManager={mockOfflineFileManager}
        />
      );

      expect(getByText('Loading cache information...')).toBeTruthy();
    });

    it('should display storage overview', async () => {
      const { getByText } = render(
        <CacheManagementModal
          visible={true}
          onClose={mockOnClose}
          offlineMapService={mockOfflineMapService}
          offlineFileManager={mockOfflineFileManager}
        />
      );

      await waitFor(() => {
        expect(getByText('Storage Overview')).toBeTruthy();
        expect(getByText('Offline Maps')).toBeTruthy();
        expect(getByText('Offline Files')).toBeTruthy();
      });
    });

    it('should display offline areas', async () => {
      const { getByText } = render(
        <CacheManagementModal
          visible={true}
          onClose={mockOnClose}
          offlineMapService={mockOfflineMapService}
          offlineFileManager={mockOfflineFileManager}
        />
      );

      await waitFor(() => {
        expect(getByText('Test Area 1')).toBeTruthy();
        expect(getByText('Test Area 2')).toBeTruthy();
      });
    });

    it('should show download progress for downloading areas', async () => {
      const { getByText } = render(
        <CacheManagementModal
          visible={true}
          onClose={mockOnClose}
          offlineMapService={mockOfflineMapService}
          offlineFileManager={mockOfflineFileManager}
        />
      );

      await waitFor(() => {
        expect(getByText('50%')).toBeTruthy(); // Progress for area2
      });
    });

    it('should show empty state when no areas exist', async () => {
      mockOfflineMapService.getOfflineAreas.mockResolvedValue([]);

      const { getByText } = render(
        <CacheManagementModal
          visible={true}
          onClose={mockOnClose}
          offlineMapService={mockOfflineMapService}
          offlineFileManager={mockOfflineFileManager}
        />
      );

      await waitFor(() => {
        expect(getByText('No offline map areas')).toBeTruthy();
      });
    });
  });

  describe('Interactions', () => {
    it('should close modal when close button is pressed', async () => {
      const { getByTestId } = render(
        <CacheManagementModal
          visible={true}
          onClose={mockOnClose}
          offlineMapService={mockOfflineMapService}
          offlineFileManager={mockOfflineFileManager}
        />
      );

      const closeButton = getByTestId('close-button') || getByTestId('close');
      fireEvent.press(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should delete area when delete button is pressed', async () => {
      const mockAlert = Alert.alert as jest.Mock;
      mockAlert.mockImplementation((title, message, buttons) => {
        // Simulate user pressing "Delete"
        const deleteButton = buttons?.find((b: any) => b.text === 'Delete');
        if (deleteButton) {
          deleteButton.onPress();
        }
      });

      const { getAllByTestId } = render(
        <CacheManagementModal
          visible={true}
          onClose={mockOnClose}
          offlineMapService={mockOfflineMapService}
          offlineFileManager={mockOfflineFileManager}
        />
      );

      await waitFor(() => {
        const deleteButtons =
          getAllByTestId('delete-area') || getAllByTestId('trash-outline');
        if (deleteButtons.length > 0) {
          fireEvent.press(deleteButtons[0]);
        }
      });

      expect(mockAlert).toHaveBeenCalled();
      expect(mockOfflineMapService.deleteOfflineArea).toHaveBeenCalledWith(
        'area1'
      );
    });

    it('should optimize storage when optimize button is pressed', async () => {
      const { getByText } = render(
        <CacheManagementModal
          visible={true}
          onClose={mockOnClose}
          offlineMapService={mockOfflineMapService}
          offlineFileManager={mockOfflineFileManager}
        />
      );

      await waitFor(() => {
        const optimizeButton = getByText('Optimize');
        fireEvent.press(optimizeButton);
      });

      expect(mockOfflineMapService.optimizeOfflineStorage).toHaveBeenCalled();
    });

    it('should clear all map cache when clear maps button is pressed', async () => {
      const mockAlert = Alert.alert as jest.Mock;
      mockAlert.mockImplementation((title, message, buttons) => {
        const clearButton = buttons?.find((b: any) => b.text === 'Clear All');
        if (clearButton) {
          clearButton.onPress();
        }
      });

      const { getByText } = render(
        <CacheManagementModal
          visible={true}
          onClose={mockOnClose}
          offlineMapService={mockOfflineMapService}
          offlineFileManager={mockOfflineFileManager}
        />
      );

      await waitFor(() => {
        const clearButton = getByText('Clear All Map Cache');
        fireEvent.press(clearButton);
      });

      expect(mockAlert).toHaveBeenCalled();
      expect(mockOfflineMapService.clearCache).toHaveBeenCalled();
    });

    it('should clear all file cache when clear files button is pressed', async () => {
      const mockAlert = Alert.alert as jest.Mock;
      mockAlert.mockImplementation((title, message, buttons) => {
        const clearButton = buttons?.find((b: any) => b.text === 'Clear All');
        if (clearButton) {
          clearButton.onPress();
        }
      });

      const { getByText } = render(
        <CacheManagementModal
          visible={true}
          onClose={mockOnClose}
          offlineMapService={mockOfflineMapService}
          offlineFileManager={mockOfflineFileManager}
        />
      );

      await waitFor(() => {
        const clearButton = getByText('Clear All File Cache');
        fireEvent.press(clearButton);
      });

      expect(mockAlert).toHaveBeenCalled();
      expect(mockOfflineFileManager.clearOfflineCache).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle loading errors gracefully', async () => {
      mockOfflineMapService.getOfflineAreas.mockRejectedValue(
        new Error('Network error')
      );

      const mockAlert = Alert.alert as jest.Mock;

      render(
        <CacheManagementModal
          visible={true}
          onClose={mockOnClose}
          offlineMapService={mockOfflineMapService}
          offlineFileManager={mockOfflineFileManager}
        />
      );

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          'Error',
          'Failed to load cache information'
        );
      });
    });

    it('should handle delete errors gracefully', async () => {
      mockOfflineMapService.deleteOfflineArea.mockRejectedValue(
        new Error('Delete failed')
      );

      const mockAlert = Alert.alert as jest.Mock;
      mockAlert.mockImplementation((title, message, buttons) => {
        const deleteButton = buttons?.find((b: any) => b.text === 'Delete');
        if (deleteButton) {
          deleteButton.onPress();
        }
      });

      const { getAllByTestId } = render(
        <CacheManagementModal
          visible={true}
          onClose={mockOnClose}
          offlineMapService={mockOfflineMapService}
          offlineFileManager={mockOfflineFileManager}
        />
      );

      await waitFor(() => {
        const deleteButtons =
          getAllByTestId('delete-area') || getAllByTestId('trash-outline');
        if (deleteButtons.length > 0) {
          fireEvent.press(deleteButtons[0]);
        }
      });

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          'Error',
          'Failed to delete offline area'
        );
      });
    });

    it('should handle optimization errors gracefully', async () => {
      mockOfflineMapService.optimizeOfflineStorage.mockRejectedValue(
        new Error('Optimization failed')
      );

      const mockAlert = Alert.alert as jest.Mock;

      const { getByText } = render(
        <CacheManagementModal
          visible={true}
          onClose={mockOnClose}
          offlineMapService={mockOfflineMapService}
          offlineFileManager={mockOfflineFileManager}
        />
      );

      await waitFor(() => {
        const optimizeButton = getByText('Optimize');
        fireEvent.press(optimizeButton);
      });

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          'Error',
          'Failed to optimize storage'
        );
      });
    });
  });

  describe('Data Refresh', () => {
    it('should refresh data after successful operations', async () => {
      const { getByText } = render(
        <CacheManagementModal
          visible={true}
          onClose={mockOnClose}
          offlineMapService={mockOfflineMapService}
          offlineFileManager={mockOfflineFileManager}
        />
      );

      await waitFor(() => {
        const optimizeButton = getByText('Optimize');
        fireEvent.press(optimizeButton);
      });

      // Should call getOfflineAreas again to refresh data
      expect(mockOfflineMapService.getOfflineAreas).toHaveBeenCalledTimes(2);
    });

    it('should reload data when modal becomes visible', async () => {
      const { rerender } = render(
        <CacheManagementModal
          visible={false}
          onClose={mockOnClose}
          offlineMapService={mockOfflineMapService}
          offlineFileManager={mockOfflineFileManager}
        />
      );

      // Make modal visible
      rerender(
        <CacheManagementModal
          visible={true}
          onClose={mockOnClose}
          offlineMapService={mockOfflineMapService}
          offlineFileManager={mockOfflineFileManager}
        />
      );

      expect(mockOfflineMapService.getOfflineAreas).toHaveBeenCalled();
      expect(mockOfflineMapService.getOfflineStorageInfo).toHaveBeenCalled();
      expect(mockOfflineFileManager.getOfflineStorageInfo).toHaveBeenCalled();
    });
  });
});
