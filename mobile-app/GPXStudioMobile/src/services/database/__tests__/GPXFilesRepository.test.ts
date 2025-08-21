/**
 * Unit tests for GPXFilesRepository
 */

import { GPXFilesRepository } from '../GPXFilesRepository';
import { DatabaseManager } from '../DatabaseManager';
import { GPXFileMetadata } from '../../../types';

// Mock DatabaseManager
jest.mock('../DatabaseManager');

describe('GPXFilesRepository', () => {
  let repository: GPXFilesRepository;
  let mockDbManager: jest.Mocked<DatabaseManager>;
  let mockDb: any;

  const mockMetadata: GPXFileMetadata = {
    id: 'test-id',
    filename: 'test.gpx',
    name: 'Test Track',
    description: 'Test description',
    createdAt: new Date('2024-01-01'),
    modifiedAt: new Date('2024-01-02'),
    fileSize: 1024,
    trackCount: 1,
    waypointCount: 2,
    totalDistance: 5000,
    elevationGain: 100,
    elevationLoss: 50,
    bounds: {
      north: 45.0,
      south: 44.0,
      east: -122.0,
      west: -123.0,
    },
    thumbnail: 'base64-thumbnail',
    filePath: '/path/to/test.gpx',
  };

  beforeEach(() => {
    mockDb = {
      runAsync: jest.fn(),
      getFirstAsync: jest.fn(),
      getAllAsync: jest.fn(),
    };

    mockDbManager = {
      getDatabase: jest.fn().mockReturnValue(mockDb),
    } as any;

    (DatabaseManager.getInstance as jest.Mock).mockReturnValue(mockDbManager);
    repository = new GPXFilesRepository();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create GPX file record successfully', async () => {
      mockDb.runAsync.mockResolvedValue({ changes: 1 });

      await repository.create(mockMetadata);

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO files'),
        expect.arrayContaining([
          mockMetadata.id,
          mockMetadata.filename,
          mockMetadata.name,
          mockMetadata.description,
          mockMetadata.createdAt.getTime(),
          mockMetadata.modifiedAt.getTime(),
          mockMetadata.fileSize,
          mockMetadata.trackCount,
          mockMetadata.waypointCount,
          mockMetadata.totalDistance,
          mockMetadata.elevationGain,
          mockMetadata.elevationLoss,
          mockMetadata.bounds.north,
          mockMetadata.bounds.south,
          mockMetadata.bounds.east,
          mockMetadata.bounds.west,
          mockMetadata.thumbnail,
          mockMetadata.filePath,
        ])
      );
    });

    it('should handle create error', async () => {
      mockDb.runAsync.mockRejectedValue(new Error('Database error'));

      await expect(repository.create(mockMetadata)).rejects.toThrow(
        'Failed to create GPX file record'
      );
    });
  });

  describe('getById', () => {
    it('should return GPX file metadata by ID', async () => {
      const mockRecord = {
        id: mockMetadata.id,
        filename: mockMetadata.filename,
        name: mockMetadata.name,
        description: mockMetadata.description,
        created_at: mockMetadata.createdAt.getTime(),
        modified_at: mockMetadata.modifiedAt.getTime(),
        file_size: mockMetadata.fileSize,
        track_count: mockMetadata.trackCount,
        waypoint_count: mockMetadata.waypointCount,
        total_distance: mockMetadata.totalDistance,
        elevation_gain: mockMetadata.elevationGain,
        elevation_loss: mockMetadata.elevationLoss,
        bounds_north: mockMetadata.bounds.north,
        bounds_south: mockMetadata.bounds.south,
        bounds_east: mockMetadata.bounds.east,
        bounds_west: mockMetadata.bounds.west,
        thumbnail: mockMetadata.thumbnail,
        file_path: mockMetadata.filePath,
      };

      mockDb.getFirstAsync.mockResolvedValue(mockRecord);

      const result = await repository.getById('test-id');

      expect(result).toEqual(mockMetadata);
      expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
        'SELECT * FROM files WHERE id = ?',
        ['test-id']
      );
    });

    it('should return null if file not found', async () => {
      mockDb.getFirstAsync.mockResolvedValue(null);

      const result = await repository.getById('non-existent');

      expect(result).toBeNull();
    });

    it('should handle getById error', async () => {
      mockDb.getFirstAsync.mockRejectedValue(new Error('Database error'));

      await expect(repository.getById('test-id')).rejects.toThrow(
        'Failed to get GPX file by ID'
      );
    });
  });

  describe('getAll', () => {
    it('should return all GPX files', async () => {
      const mockRecord = {
        id: mockMetadata.id,
        filename: mockMetadata.filename,
        name: mockMetadata.name,
        description: mockMetadata.description,
        created_at: mockMetadata.createdAt.getTime(),
        modified_at: mockMetadata.modifiedAt.getTime(),
        file_size: mockMetadata.fileSize,
        track_count: mockMetadata.trackCount,
        waypoint_count: mockMetadata.waypointCount,
        total_distance: mockMetadata.totalDistance,
        elevation_gain: mockMetadata.elevationGain,
        elevation_loss: mockMetadata.elevationLoss,
        bounds_north: mockMetadata.bounds.north,
        bounds_south: mockMetadata.bounds.south,
        bounds_east: mockMetadata.bounds.east,
        bounds_west: mockMetadata.bounds.west,
        thumbnail: mockMetadata.thumbnail,
        file_path: mockMetadata.filePath,
      };

      mockDb.getAllAsync.mockResolvedValue([mockRecord]);

      const result = await repository.getAll();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockMetadata);
      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        'SELECT * FROM files ORDER BY created_at DESC'
      );
    });

    it('should handle getAll error', async () => {
      mockDb.getAllAsync.mockRejectedValue(new Error('Database error'));

      await expect(repository.getAll()).rejects.toThrow(
        'Failed to get all GPX files'
      );
    });
  });

  describe('update', () => {
    it('should update GPX file metadata', async () => {
      mockDb.runAsync.mockResolvedValue({ changes: 1 });

      const updates = {
        name: 'Updated Name',
        description: 'Updated description',
      };

      await repository.update('test-id', updates);

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'UPDATE files SET name = ?, description = ? WHERE id = ?',
        ['Updated Name', 'Updated description', 'test-id']
      );
    });

    it('should handle empty updates', async () => {
      await repository.update('test-id', {});

      expect(mockDb.runAsync).not.toHaveBeenCalled();
    });

    it('should handle update error', async () => {
      mockDb.runAsync.mockRejectedValue(new Error('Database error'));

      await expect(
        repository.update('test-id', { name: 'New Name' })
      ).rejects.toThrow('Failed to update GPX file');
    });
  });

  describe('delete', () => {
    it('should delete GPX file by ID', async () => {
      mockDb.runAsync.mockResolvedValue({ changes: 1 });

      await repository.delete('test-id');

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'DELETE FROM files WHERE id = ?',
        ['test-id']
      );
    });

    it('should handle delete error', async () => {
      mockDb.runAsync.mockRejectedValue(new Error('Database error'));

      await expect(repository.delete('test-id')).rejects.toThrow(
        'Failed to delete GPX file'
      );
    });
  });

  describe('search', () => {
    it('should search GPX files by query', async () => {
      const mockRecord = {
        id: mockMetadata.id,
        filename: mockMetadata.filename,
        name: mockMetadata.name,
        description: mockMetadata.description,
        created_at: mockMetadata.createdAt.getTime(),
        modified_at: mockMetadata.modifiedAt.getTime(),
        file_size: mockMetadata.fileSize,
        track_count: mockMetadata.trackCount,
        waypoint_count: mockMetadata.waypointCount,
        total_distance: mockMetadata.totalDistance,
        elevation_gain: mockMetadata.elevationGain,
        elevation_loss: mockMetadata.elevationLoss,
        bounds_north: mockMetadata.bounds.north,
        bounds_south: mockMetadata.bounds.south,
        bounds_east: mockMetadata.bounds.east,
        bounds_west: mockMetadata.bounds.west,
        thumbnail: mockMetadata.thumbnail,
        file_path: mockMetadata.filePath,
      };

      mockDb.getAllAsync.mockResolvedValue([mockRecord]);

      const result = await repository.search('test');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockMetadata);
      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining(
          'WHERE filename LIKE ? OR name LIKE ? OR description LIKE ?'
        ),
        ['%test%', '%test%', '%test%']
      );
    });
  });

  describe('getCount', () => {
    it('should return total count of files', async () => {
      mockDb.getFirstAsync.mockResolvedValue({ count: 5 });

      const result = await repository.getCount();

      expect(result).toBe(5);
      expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM files'
      );
    });

    it('should return 0 if no count result', async () => {
      mockDb.getFirstAsync.mockResolvedValue(null);

      const result = await repository.getCount();

      expect(result).toBe(0);
    });
  });

  describe('existsByFilename', () => {
    it('should return true if file exists', async () => {
      mockDb.getFirstAsync.mockResolvedValue({ count: 1 });

      const result = await repository.existsByFilename('test.gpx');

      expect(result).toBe(true);
      expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM files WHERE filename = ?',
        ['test.gpx']
      );
    });

    it('should return false if file does not exist', async () => {
      mockDb.getFirstAsync.mockResolvedValue({ count: 0 });

      const result = await repository.existsByFilename('nonexistent.gpx');

      expect(result).toBe(false);
    });
  });
});
