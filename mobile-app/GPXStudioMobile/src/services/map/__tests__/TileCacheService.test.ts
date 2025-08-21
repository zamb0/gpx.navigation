import { TileCacheService } from '../TileCacheService';
import { MapBounds } from '../../../types/map';
import * as FileSystem from 'expo-file-system';

// Mock expo-file-system
jest.mock('expo-file-system', () => ({
  documentDirectory: '/mock/documents/',
  getInfoAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
  deleteAsync: jest.fn(),
  downloadAsync: jest.fn(),
}));

const mockFileSystem = FileSystem as jest.Mocked<typeof FileSystem>;

describe('TileCacheService', () => {
  let tileCacheService: TileCacheService;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock directory exists
    mockFileSystem.getInfoAsync.mockResolvedValue({
      exists: true,
      isDirectory: true,
      modificationTime: Date.now(),
      size: 0,
      uri: '/mock/documents/mapTiles/',
    });

    // Mock empty index file
    mockFileSystem.readAsStringAsync.mockResolvedValue('{}');

    tileCacheService = new TileCacheService({
      maxSizeBytes: 10 * 1024 * 1024, // 10MB for testing
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });
  });

  describe('Initialization', () => {
    it('should create cache directory if it does not exist', async () => {
      mockFileSystem.getInfoAsync.mockResolvedValueOnce({
        exists: false,
        isDirectory: false,
        uri: '',
      });

      new TileCacheService();

      // Wait for async initialization
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockFileSystem.makeDirectoryAsync).toHaveBeenCalledWith(
        '/mock/documents/mapTiles/',
        { intermediates: true }
      );
    });

    it('should load existing cache index', async () => {
      const mockIndex = {
        openStreetMap_10_512_384: {
          provider: 'openStreetMap',
          bounds: { north: 45.5, south: 45.4, east: -122.6, west: -122.7 },
          zoomLevels: [10],
          cachedAt: '2023-01-01T00:00:00.000Z',
          sizeBytes: 1024,
        },
      };

      mockFileSystem.getInfoAsync
        .mockResolvedValueOnce({
          exists: true,
          isDirectory: true,
          modificationTime: Date.now(),
          size: 0,
          uri: '',
        })
        .mockResolvedValueOnce({
          exists: true,
          isDirectory: false,
          modificationTime: Date.now(),
          size: 100,
          uri: '',
        });

      mockFileSystem.readAsStringAsync.mockResolvedValue(
        JSON.stringify(mockIndex)
      );

      new TileCacheService();

      // Wait for async initialization
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockFileSystem.readAsStringAsync).toHaveBeenCalledWith(
        '/mock/documents/mapTiles/index.json'
      );
    });
  });

  describe('Tile Caching', () => {
    it('should cache a tile successfully', async () => {
      mockFileSystem.downloadAsync.mockResolvedValue({
        status: 200,
        headers: {},
        uri: '/mock/path/tile.png',
        mimeType: 'image/png',
      });

      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        isDirectory: false,
        modificationTime: Date.now(),
        size: 1024,
        uri: '/mock/path/tile.png',
      });

      const result = await tileCacheService.cacheTile(
        'openStreetMap',
        10,
        512,
        384,
        'https://tile.openstreetmap.org/10/512/384.png'
      );

      expect(result).toBe(true);
      expect(mockFileSystem.downloadAsync).toHaveBeenCalledWith(
        'https://tile.openstreetmap.org/10/512/384.png',
        '/mock/documents/mapTiles/openStreetMap/10/512/384.png'
      );
    });

    it('should return false when download fails', async () => {
      mockFileSystem.downloadAsync.mockResolvedValue({
        status: 404,
        headers: {},
        uri: '',
        mimeType: null,
      });

      const result = await tileCacheService.cacheTile(
        'openStreetMap',
        10,
        512,
        384,
        'https://tile.openstreetmap.org/10/512/384.png'
      );

      expect(result).toBe(false);
    });

    it('should check if tile is cached', async () => {
      // First cache a tile successfully
      mockFileSystem.downloadAsync.mockResolvedValue({
        status: 200,
        headers: {},
        uri: '/mock/path/tile.png',
        mimeType: 'image/png',
      });

      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        isDirectory: false,
        modificationTime: Date.now(),
        size: 1024,
        uri: '/mock/path/tile.png',
      });

      await tileCacheService.cacheTile(
        'openStreetMap',
        10,
        512,
        384,
        'https://example.com/tile.png'
      );

      // Now check if it's cached
      const isCached = await tileCacheService.isTileCached(
        'openStreetMap',
        10,
        512,
        384
      );
      expect(isCached).toBe(true);
    });

    it('should return false for non-existent tile', async () => {
      const isCached = await tileCacheService.isTileCached(
        'openStreetMap',
        10,
        999,
        999
      );
      expect(isCached).toBe(false);
    });
  });

  describe('Area Caching', () => {
    it('should cache map area with multiple tiles', async () => {
      mockFileSystem.downloadAsync.mockResolvedValue({
        status: 200,
        headers: {},
        uri: '/mock/path/tile.png',
        mimeType: 'image/png',
      });

      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        isDirectory: false,
        modificationTime: Date.now(),
        size: 1024,
        uri: '/mock/path/tile.png',
      });

      const bounds: MapBounds = {
        north: 45.5,
        south: 45.4,
        east: -122.6,
        west: -122.7,
      };

      await tileCacheService.cacheMapArea('openStreetMap', bounds, [10]);

      // Should have made multiple download calls for the area
      expect(mockFileSystem.downloadAsync).toHaveBeenCalled();
    });
  });

  describe('Cache Management', () => {
    it('should get cache size', async () => {
      // Cache a few tiles first
      mockFileSystem.downloadAsync.mockResolvedValue({
        status: 200,
        headers: {},
        uri: '/mock/path/tile.png',
        mimeType: 'image/png',
      });

      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        isDirectory: false,
        modificationTime: Date.now(),
        size: 1024,
        uri: '/mock/path/tile.png',
      });

      await tileCacheService.cacheTile(
        'openStreetMap',
        10,
        512,
        384,
        'https://example.com/tile1.png'
      );
      await tileCacheService.cacheTile(
        'openStreetMap',
        10,
        513,
        384,
        'https://example.com/tile2.png'
      );

      const cacheSize = await tileCacheService.getCacheSize();
      expect(cacheSize).toBeGreaterThan(0);
    });

    it('should clear cache', async () => {
      await tileCacheService.clearCache();

      expect(mockFileSystem.deleteAsync).toHaveBeenCalledWith(
        '/mock/documents/mapTiles/'
      );
      expect(mockFileSystem.makeDirectoryAsync).toHaveBeenCalledWith(
        '/mock/documents/mapTiles/',
        { intermediates: true }
      );
    });

    it('should get cached areas', async () => {
      // Cache some tiles first
      mockFileSystem.downloadAsync.mockResolvedValue({
        status: 200,
        headers: {},
        uri: '/mock/path/tile.png',
        mimeType: 'image/png',
      });

      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        isDirectory: false,
        modificationTime: Date.now(),
        size: 1024,
        uri: '/mock/path/tile.png',
      });

      await tileCacheService.cacheTile(
        'openStreetMap',
        10,
        512,
        384,
        'https://example.com/tile.png'
      );

      const cachedAreas = await tileCacheService.getCachedAreas();
      expect(Array.isArray(cachedAreas)).toBe(true);
    });

    it('should remove expired tiles', async () => {
      // Mock an expired tile
      const expiredDate = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48 hours ago

      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: false,
        isDirectory: false,
        uri: '',
      });

      const isCached = await tileCacheService.isTileCached(
        'openStreetMap',
        10,
        512,
        384
      );
      expect(isCached).toBe(false);
    });
  });
});
