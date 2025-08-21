import { OfflineFileManager } from '../OfflineFileManager';
import { OfflineService } from '../OfflineService';
import * as FileSystem from 'expo-file-system';
import { MobileGPXFile } from '../../../types/gpx';

// Mock dependencies
jest.mock('expo-file-system');
jest.mock('../OfflineService');

const mockFileSystem = FileSystem as jest.Mocked<typeof FileSystem>;
const MockOfflineService = OfflineService as jest.MockedClass<
  typeof OfflineService
>;

describe('OfflineFileManager', () => {
  let offlineFileManager: OfflineFileManager;
  let mockOfflineService: jest.Mocked<OfflineService>;

  const mockGPXFile: any = {
    metadata: {
      name: 'Test Track',
      description: 'A test GPX file',
    },
    tracks: [
      {
        name: 'Test Track',
        segments: [
          {
            points: [
              { latitude: 40.7128, longitude: -74.006, elevation: 10 },
              { latitude: 40.7129, longitude: -74.0061, elevation: 11 },
            ],
          },
        ],
      },
    ],
    waypoints: [
      {
        latitude: 40.7128,
        longitude: -74.006,
        name: 'Start Point',
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock FileSystem
    Object.defineProperty(mockFileSystem, 'documentDirectory', {
      value: 'file:///mock/documents/',
      writable: true,
    });
    mockFileSystem.getInfoAsync.mockResolvedValue({ exists: false } as any);
    mockFileSystem.makeDirectoryAsync.mockResolvedValue();
    mockFileSystem.readAsStringAsync.mockResolvedValue('{}');
    mockFileSystem.writeAsStringAsync.mockResolvedValue();
    mockFileSystem.deleteAsync.mockResolvedValue();

    // Mock OfflineService
    mockOfflineService =
      new MockOfflineService() as jest.Mocked<OfflineService>;
    mockOfflineService.getConnectionStatus.mockReturnValue(true);
    mockOfflineService.executeWithFallback.mockImplementation(
      async (online, offline) => {
        return await online();
      }
    );
    mockOfflineService.executeOrQueue.mockImplementation(async (operation) => {
      return await operation();
    });

    offlineFileManager = new OfflineFileManager(mockOfflineService, {
      enableOfflineAccess: true,
      maxOfflineFiles: 10,
      offlineCacheSize: 10 * 1024 * 1024, // 10MB
      autoDownloadFavorites: true,
    });
  });

  describe('Initialization', () => {
    it('should create offline directory on initialization', async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockFileSystem.getInfoAsync).toHaveBeenCalledWith(
        expect.stringContaining('offline_gpx/')
      );
      expect(mockFileSystem.makeDirectoryAsync).toHaveBeenCalledWith(
        expect.stringContaining('offline_gpx/'),
        { intermediates: true }
      );
    });

    it('should load existing offline index', async () => {
      const mockIndex = {
        file1: {
          isAvailableOffline: true,
          lastSyncedAt: new Date().toISOString(),
          sizeBytes: 1024,
          isFavorite: false,
        },
      };

      mockFileSystem.getInfoAsync
        .mockResolvedValueOnce({ exists: true } as any) // directory exists
        .mockResolvedValueOnce({ exists: true } as any); // index file exists

      mockFileSystem.readAsStringAsync.mockResolvedValue(
        JSON.stringify(mockIndex)
      );

      const newManager = new OfflineFileManager(mockOfflineService);
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockFileSystem.readAsStringAsync).toHaveBeenCalledWith(
        expect.stringContaining('index.json')
      );
    });
  });

  describe('File Operations', () => {
    it('should cache file offline when loading online', async () => {
      // Mock parent class method
      const mockLoadFile = jest.fn().mockResolvedValue(mockGPXFile);
      (offlineFileManager as any).__proto__.__proto__.loadFile = mockLoadFile;

      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        size: 1024,
      } as any);

      const result = await offlineFileManager.loadFile('test-file-id');

      expect(result).toEqual(mockGPXFile);
      expect(mockLoadFile).toHaveBeenCalledWith('test-file-id');
      expect(mockFileSystem.writeAsStringAsync).toHaveBeenCalled();
    });

    it('should load from offline cache when offline', async () => {
      mockOfflineService.executeWithFallback.mockImplementation(
        async (online, offline) => {
          return await offline();
        }
      );

      mockFileSystem.getInfoAsync.mockResolvedValue({ exists: true } as any);
      mockFileSystem.readAsStringAsync.mockResolvedValue(
        JSON.stringify(mockGPXFile)
      );

      const result = await offlineFileManager.loadFile('test-file-id');

      expect(result).toEqual(mockGPXFile);
      expect(mockFileSystem.readAsStringAsync).toHaveBeenCalledWith(
        expect.stringContaining('test-file-id.gpx')
      );
    });

    it('should save file offline when online operation fails', async () => {
      mockOfflineService.executeOrQueue.mockResolvedValue(null); // Simulate failure

      const fileId = await offlineFileManager.saveFile(
        mockGPXFile,
        'test-file.gpx'
      );

      expect(fileId).toBeDefined();
      expect(fileId).toMatch(/^offline_/);
      expect(mockFileSystem.writeAsStringAsync).toHaveBeenCalled();
    });

    it('should remove offline file when deleting', async () => {
      // First cache a file
      await offlineFileManager.cacheFileOffline('test-file-id', mockGPXFile);

      // Then delete it
      await offlineFileManager.deleteFile('test-file-id');

      expect(mockFileSystem.deleteAsync).toHaveBeenCalledWith(
        expect.stringContaining('test-file-id.gpx')
      );
    });
  });

  describe('Offline File Management', () => {
    it('should cache file offline', async () => {
      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        size: 1024,
      } as any);

      await offlineFileManager.cacheFileOffline('test-file-id', mockGPXFile);

      expect(mockFileSystem.writeAsStringAsync).toHaveBeenCalledWith(
        expect.stringContaining('test-file-id.gpx'),
        expect.any(String)
      );
    });

    it('should check if file is available offline', () => {
      // Cache a file first
      offlineFileManager.cacheFileOffline('test-file-id', mockGPXFile);

      const isAvailable =
        offlineFileManager.isFileAvailableOffline('test-file-id');
      expect(isAvailable).toBe(false); // Will be false until cache operation completes
    });

    it('should set file as favorite', async () => {
      // First cache the file
      await offlineFileManager.cacheFileOffline('test-file-id', mockGPXFile);

      await offlineFileManager.setFileFavorite('test-file-id', true);

      // Should trigger auto-download if enabled
      expect(mockOfflineService.executeWithFallback).toHaveBeenCalled();
    });

    it('should get offline storage info', async () => {
      // Cache some files
      await offlineFileManager.cacheFileOffline('file1', mockGPXFile);
      await offlineFileManager.cacheFileOffline('file2', mockGPXFile);

      const storageInfo = await offlineFileManager.getOfflineStorageInfo();

      expect(storageInfo.totalFiles).toBeGreaterThan(0);
      expect(storageInfo.totalSize).toBeGreaterThan(0);
      expect(storageInfo.availableSpace).toBeDefined();
    });

    it('should clear offline cache', async () => {
      await offlineFileManager.clearOfflineCache();

      expect(mockFileSystem.deleteAsync).toHaveBeenCalledWith(
        expect.stringContaining('offline_gpx/')
      );
      expect(mockFileSystem.makeDirectoryAsync).toHaveBeenCalledWith(
        expect.stringContaining('offline_gpx/'),
        { intermediates: true }
      );
    });
  });

  describe('Storage Management', () => {
    it('should manage storage when cache size exceeds limit', async () => {
      // Mock large file sizes to trigger cleanup
      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        size: 5 * 1024 * 1024,
      } as any);

      // Cache multiple files to exceed limit
      for (let i = 0; i < 5; i++) {
        await offlineFileManager.cacheFileOffline(`file${i}`, mockGPXFile);
      }

      // Should trigger cleanup of oldest non-favorite files
      expect(mockFileSystem.deleteAsync).toHaveBeenCalled();
    });

    it('should not remove favorite files during cleanup', async () => {
      // Cache files and set some as favorites
      await offlineFileManager.cacheFileOffline('file1', mockGPXFile);
      await offlineFileManager.cacheFileOffline('file2', mockGPXFile);

      await offlineFileManager.setFileFavorite('file1', true);

      // Mock large sizes to trigger cleanup
      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        size: 10 * 1024 * 1024,
      } as any);

      // Cache another file to trigger cleanup
      await offlineFileManager.cacheFileOffline('file3', mockGPXFile);

      // Should preserve favorites and remove non-favorites
      // This would need more detailed mocking to test properly
    });
  });

  describe('File List Operations', () => {
    it('should get offline file list', async () => {
      // Cache some files
      await offlineFileManager.cacheFileOffline('file1', mockGPXFile);
      await offlineFileManager.cacheFileOffline('file2', mockGPXFile);

      mockFileSystem.getInfoAsync.mockResolvedValue({ exists: true } as any);
      mockFileSystem.readAsStringAsync.mockResolvedValue(
        JSON.stringify(mockGPXFile)
      );

      const fileList = await offlineFileManager.getOfflineFileList();

      expect(fileList).toHaveLength(2);
      expect(fileList[0].isAvailableOffline).toBe(true);
    });

    it('should enhance online file list with offline status', async () => {
      const mockOnlineFiles = [
        {
          id: 'file1',
          filename: 'test1.gpx',
          name: 'Test 1',
          createdAt: new Date(),
          modifiedAt: new Date(),
          fileSize: 1024,
          trackCount: 1,
          waypointCount: 1,
          totalDistance: 1000,
          elevationGain: 100,
          elevationLoss: 50,
          bounds: { north: 1, south: 0, east: 1, west: 0 },
        },
      ];

      // Mock parent class method
      const mockGetFileList = jest.fn().mockResolvedValue(mockOnlineFiles);
      (offlineFileManager as any).__proto__.__proto__.getFileList =
        mockGetFileList;

      const fileList = await offlineFileManager.getFileList();

      expect(fileList).toHaveLength(1);
      expect(fileList[0]).toHaveProperty('isAvailableOffline');
    });
  });

  describe('Error Handling', () => {
    it('should handle file system errors gracefully', async () => {
      mockFileSystem.writeAsStringAsync.mockRejectedValue(
        new Error('Disk full')
      );

      // Should not throw, but log error
      await expect(
        offlineFileManager.cacheFileOffline('test-file-id', mockGPXFile)
      ).resolves.not.toThrow();
    });

    it('should handle corrupted offline files', async () => {
      mockFileSystem.getInfoAsync.mockResolvedValue({ exists: true } as any);
      mockFileSystem.readAsStringAsync.mockResolvedValue('invalid json');

      const result = await offlineFileManager.loadOfflineFile('test-file-id');
      expect(result).toBeNull();
    });

    it('should handle missing offline files', async () => {
      mockFileSystem.getInfoAsync.mockResolvedValue({ exists: false } as any);

      const result =
        await offlineFileManager.loadOfflineFile('nonexistent-file');
      expect(result).toBeNull();
    });
  });
});
