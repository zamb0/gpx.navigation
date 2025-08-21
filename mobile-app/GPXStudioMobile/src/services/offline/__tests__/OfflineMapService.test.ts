import { OfflineMapService } from '../OfflineMapService';
import { OfflineService } from '../OfflineService';
import { MapBounds } from '../../../types/map';

// Mock dependencies
jest.mock('../OfflineService');
jest.mock('../../map/TileCacheService');

const MockOfflineService = OfflineService as jest.MockedClass<
  typeof OfflineService
>;

describe('OfflineMapService', () => {
  let offlineMapService: OfflineMapService;
  let mockOfflineService: jest.Mocked<OfflineService>;

  const mockBounds: MapBounds = {
    north: 40.7589,
    south: 40.7489,
    east: -73.9741,
    west: -73.9841,
  };

  beforeEach(() => {
    jest.clearAllMocks();

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
    mockOfflineService.queueOperation.mockResolvedValue('queued-op-id');

    offlineMapService = new OfflineMapService(mockOfflineService, {
      enableOfflineMaps: true,
      maxOfflineAreas: 5,
      defaultOfflineZoomLevels: [10, 11, 12, 13, 14],
      preloadRadius: 2,
    });
  });

  describe('Map Area Caching', () => {
    it('should cache map area when online', async () => {
      // Mock tile cache service
      const mockTileCacheService = {
        cacheTile: jest.fn().mockResolvedValue(true),
      };
      (offlineMapService as any).tileCacheService = mockTileCacheService;

      await offlineMapService.cacheMapArea(mockBounds, [12, 13]);

      expect(mockTileCacheService.cacheTile).toHaveBeenCalled();
    });

    it('should queue map area caching when offline', async () => {
      mockOfflineService.getConnectionStatus.mockReturnValue(false);

      await expect(
        offlineMapService.cacheMapArea(mockBounds, [12, 13])
      ).rejects.toThrow('Cannot download maps while offline');

      expect(mockOfflineService.queueOperation).toHaveBeenCalledWith(
        'cache_tiles',
        expect.objectContaining({
          bounds: mockBounds,
          zoomLevels: [12, 13],
          areaName: 'Test Area',
        })
      );
    });

    it('should calculate total tiles correctly', async () => {
      const totalTiles = (offlineMapService as any).calculateTotalTiles(
        mockBounds,
        [12, 13]
      );

      expect(totalTiles).toBeGreaterThan(0);
      expect(typeof totalTiles).toBe('number');
    });

    it('should handle download cancellation', async () => {
      // Start a download
      const downloadPromise = offlineMapService.cacheMapArea(mockBounds, [12]);

      // Cancel it immediately
      setTimeout(() => {
        offlineMapService.cancelDownload('test-area-id');
      }, 10);

      // Should handle cancellation gracefully
      await expect(downloadPromise).rejects.toThrow();
    });
  });

  describe('Offline Area Management', () => {
    it('should get offline areas', async () => {
      // Mock getCachedAreas from parent class
      const mockCachedAreas = [
        {
          id: 'area1',
          name: 'Test Area 1',
          bounds: mockBounds,
          zoomLevels: [12, 13],
          provider: 'openStreetMap',
          cachedAt: new Date(),
          sizeBytes: 1024 * 1024,
          tileCount: 100,
        },
      ];
      (offlineMapService as any).getCachedAreas = jest
        .fn()
        .mockResolvedValue(mockCachedAreas);

      const areas = await offlineMapService.getOfflineAreas();

      expect(areas).toHaveLength(1);
      expect(areas[0]).toHaveProperty('downloadProgress');
      expect(areas[0]).toHaveProperty('isDownloading');
    });

    it('should delete offline area', async () => {
      const mockClearCache = jest.fn().mockResolvedValue(undefined);
      (offlineMapService as any).clearCache = mockClearCache;

      await offlineMapService.deleteOfflineArea('test-area-id');

      // Should cancel any ongoing download
      expect(mockClearCache).toHaveBeenCalled();
    });

    it('should optimize offline storage', async () => {
      // Mock areas exceeding limit
      const mockAreas = Array.from({ length: 10 }, (_, i) => ({
        id: `area${i}`,
        name: `Area ${i}`,
        bounds: mockBounds,
        zoomLevels: [12],
        provider: 'openStreetMap',
        downloadProgress: 100,
        isDownloading: false,
        downloadedAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000), // Different ages
        sizeBytes: 1024 * 1024,
        tileCount: 100,
      }));

      (offlineMapService as any).getOfflineAreas = jest
        .fn()
        .mockResolvedValue(mockAreas);
      const mockDeleteArea = jest.fn().mockResolvedValue(undefined);
      offlineMapService.deleteOfflineArea = mockDeleteArea;

      await offlineMapService.optimizeOfflineStorage();

      // Should delete oldest areas to stay within limit
      expect(mockDeleteArea).toHaveBeenCalled();
    });
  });

  describe('Preloading', () => {
    it('should preload area around location', async () => {
      const mockCacheMapArea = jest.fn().mockResolvedValue('area-id');
      offlineMapService.cacheMapArea = mockCacheMapArea;

      await offlineMapService.preloadAroundLocation(40.7128, -74.006, 1);

      expect(mockCacheMapArea).toHaveBeenCalledWith(
        expect.objectContaining({
          north: expect.any(Number),
          south: expect.any(Number),
          east: expect.any(Number),
          west: expect.any(Number),
        }),
        expect.any(Array),
        expect.stringContaining('Preload')
      );
    });

    it('should queue preload when offline', async () => {
      mockOfflineService.executeOrQueue.mockImplementation(
        async (operation, queueData, type) => {
          // Simulate queuing
          await mockOfflineService.queueOperation(type, queueData);
          return null;
        }
      );

      await offlineMapService.preloadAroundLocation(40.7128, -74.006);

      expect(mockOfflineService.queueOperation).toHaveBeenCalledWith(
        'cache_tiles',
        expect.objectContaining({
          location: { latitude: 40.7128, longitude: -74.006 },
        })
      );
    });
  });

  describe('Offline Availability', () => {
    it('should check if area is available offline', async () => {
      const mockIsAreaCached = jest.fn().mockResolvedValue(true);
      (offlineMapService as any).isAreaCached = mockIsAreaCached;

      const isAvailable = await offlineMapService.isAreaAvailableOffline(
        mockBounds,
        12
      );

      expect(isAvailable).toBe(true);
      expect(mockIsAreaCached).toHaveBeenCalledWith(mockBounds, 12);
    });

    it('should get offline storage info', async () => {
      const mockAreas = [
        {
          id: 'area1',
          sizeBytes: 1024 * 1024,
        },
        {
          id: 'area2',
          sizeBytes: 2 * 1024 * 1024,
        },
      ];
      (offlineMapService as any).getOfflineAreas = jest
        .fn()
        .mockResolvedValue(mockAreas);

      const storageInfo = await offlineMapService.getOfflineStorageInfo();

      expect(storageInfo.totalAreas).toBe(2);
      expect(storageInfo.totalSize).toBe(3 * 1024 * 1024);
      expect(storageInfo.availableSpace).toBeGreaterThan(0);
    });
  });

  describe('Map Provider Management', () => {
    it('should set map provider when online', async () => {
      const mockSetMapProvider = jest.fn().mockReturnValue(true);
      (offlineMapService as any).__proto__.__proto__.setMapProvider =
        mockSetMapProvider;

      const result = await offlineMapService.setMapProvider('openStreetMap');

      expect(result).toBe(true);
      expect(mockSetMapProvider).toHaveBeenCalledWith('openStreetMap');
    });

    it('should check offline availability when setting provider offline', async () => {
      mockOfflineService.executeWithFallback.mockImplementation(
        async (online, offline) => {
          return await offline();
        }
      );

      const mockAreas = [
        {
          provider: 'openStreetMap',
        },
      ];
      (offlineMapService as any).getOfflineAreas = jest
        .fn()
        .mockResolvedValue(mockAreas);

      const mockSetMapProvider = jest.fn().mockReturnValue(true);
      (offlineMapService as any).__proto__.__proto__.setMapProvider =
        mockSetMapProvider;

      const result = await offlineMapService.setMapProvider('openStreetMap');

      expect(result).toBe(true);
      expect(mockSetMapProvider).toHaveBeenCalledWith('openStreetMap');
    });

    it('should reject unavailable provider when offline', async () => {
      mockOfflineService.executeWithFallback.mockImplementation(
        async (online, offline) => {
          return await offline();
        }
      );

      const mockAreas = [
        {
          provider: 'openStreetMap',
        },
      ];
      (offlineMapService as any).getOfflineAreas = jest
        .fn()
        .mockResolvedValue(mockAreas);

      const result = await offlineMapService.setMapProvider(
        'unavailableProvider'
      );

      expect(result).toBe(false);
    });
  });

  describe('Utility Methods', () => {
    it('should calculate bounds from radius', () => {
      const bounds = (offlineMapService as any).calculateBoundsFromRadius(
        40.7128,
        -74.006,
        1 // 1km radius
      );

      expect(bounds).toHaveProperty('north');
      expect(bounds).toHaveProperty('south');
      expect(bounds).toHaveProperty('east');
      expect(bounds).toHaveProperty('west');
      expect(bounds.north).toBeGreaterThan(40.7128);
      expect(bounds.south).toBeLessThan(40.7128);
    });

    it('should convert bounds to tiles', () => {
      const tileBounds = (offlineMapService as any).boundsToTiles(
        mockBounds,
        12
      );

      expect(tileBounds).toHaveProperty('minX');
      expect(tileBounds).toHaveProperty('maxX');
      expect(tileBounds).toHaveProperty('minY');
      expect(tileBounds).toHaveProperty('maxY');
      expect(tileBounds.minX).toBeLessThanOrEqual(tileBounds.maxX);
      expect(tileBounds.minY).toBeLessThanOrEqual(tileBounds.maxY);
    });

    it('should build tile URLs for different providers', () => {
      const osmUrl = (offlineMapService as any).buildTileUrl(
        'openStreetMap',
        12,
        1234,
        5678
      );
      const topoUrl = (offlineMapService as any).buildTileUrl(
        'openTopoMap',
        12,
        1234,
        5678
      );
      const satelliteUrl = (offlineMapService as any).buildTileUrl(
        'satellite',
        12,
        1234,
        5678
      );
      const unknownUrl = (offlineMapService as any).buildTileUrl(
        'unknown',
        12,
        1234,
        5678
      );

      expect(osmUrl).toContain('tile.openstreetmap.org');
      expect(topoUrl).toContain('tile.opentopomap.org');
      expect(satelliteUrl).toContain('arcgisonline.com');
      expect(unknownUrl).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle tile caching errors gracefully', async () => {
      const mockTileCacheService = {
        cacheTile: jest.fn().mockRejectedValue(new Error('Network error')),
      };
      (offlineMapService as any).tileCacheService = mockTileCacheService;

      // Should not throw, but handle errors gracefully
      await expect(
        offlineMapService.cacheMapArea(mockBounds, [12])
      ).rejects.toThrow();
    });

    it('should handle missing tile cache service', async () => {
      (offlineMapService as any).tileCacheService = undefined;

      await expect(
        offlineMapService.cacheMapArea(mockBounds, [12])
      ).rejects.toThrow('Tile cache service not available');
    });

    it('should handle disabled offline maps', async () => {
      const disabledService = new OfflineMapService(mockOfflineService, {
        enableOfflineMaps: false,
      });

      await expect(
        disabledService.cacheMapArea(mockBounds, [12])
      ).rejects.toThrow('Offline maps are not enabled');
    });
  });
});
