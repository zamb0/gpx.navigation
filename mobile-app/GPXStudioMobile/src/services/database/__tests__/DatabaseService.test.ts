/**
 * Unit tests for DatabaseService
 */

import { DatabaseService } from '../DatabaseService';
import { DatabaseManager } from '../DatabaseManager';
import { GPXFilesRepository } from '../GPXFilesRepository';
import { TrackingSessionsRepository } from '../TrackingSessionsRepository';
import { AppSettingsRepository } from '../AppSettingsRepository';

// Mock all dependencies
jest.mock('../DatabaseManager');
jest.mock('../GPXFilesRepository');
jest.mock('../TrackingSessionsRepository');
jest.mock('../AppSettingsRepository');

describe('DatabaseService', () => {
  let service: DatabaseService;
  let mockDbManager: jest.Mocked<DatabaseManager>;
  let mockGpxRepo: jest.Mocked<GPXFilesRepository>;
  let mockSessionsRepo: jest.Mocked<TrackingSessionsRepository>;
  let mockSettingsRepo: jest.Mocked<AppSettingsRepository>;
  let mockDb: any;

  beforeEach(() => {
    // Reset singleton instance
    (DatabaseService as any).instance = undefined;

    mockDb = {
      getFirstAsync: jest.fn(),
      runAsync: jest.fn(),
      execAsync: jest.fn(),
    };

    mockDbManager = {
      initialize: jest.fn(),
      getDatabase: jest.fn().mockReturnValue(mockDb),
      executeTransaction: jest.fn((callback) => callback(mockDb)),
      close: jest.fn(),
      reset: jest.fn(),
    } as any;

    mockGpxRepo = {
      getCount: jest.fn(),
    } as any;

    mockSessionsRepo = {
      getSessionCount: jest.fn(),
    } as any;

    mockSettingsRepo = {
      initializeDefaults: jest.fn(),
    } as any;

    (DatabaseManager.getInstance as jest.Mock).mockReturnValue(mockDbManager);
    (GPXFilesRepository as jest.Mock).mockImplementation(() => mockGpxRepo);
    (TrackingSessionsRepository as jest.Mock).mockImplementation(
      () => mockSessionsRepo
    );
    (AppSettingsRepository as jest.Mock).mockImplementation(
      () => mockSettingsRepo
    );

    service = DatabaseService.getInstance();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = DatabaseService.getInstance();
      const instance2 = DatabaseService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('initialize', () => {
    it('should initialize database service successfully', async () => {
      mockDbManager.initialize.mockResolvedValue();
      mockSettingsRepo.initializeDefaults.mockResolvedValue();

      await service.initialize();

      expect(mockDbManager.initialize).toHaveBeenCalled();
      expect(mockSettingsRepo.initializeDefaults).toHaveBeenCalled();
      expect(service.isInitialized()).toBe(true);
    });

    it('should not reinitialize if already initialized', async () => {
      mockDbManager.initialize.mockResolvedValue();
      mockSettingsRepo.initializeDefaults.mockResolvedValue();

      await service.initialize();
      await service.initialize(); // Second call

      expect(mockDbManager.initialize).toHaveBeenCalledTimes(1);
      expect(mockSettingsRepo.initializeDefaults).toHaveBeenCalledTimes(1);
    });

    it('should handle initialization error', async () => {
      mockDbManager.initialize.mockRejectedValue(new Error('Database error'));

      await expect(service.initialize()).rejects.toThrow(
        'Database service initialization failed'
      );
      expect(service.isInitialized()).toBe(false);
    });
  });

  describe('repository access', () => {
    beforeEach(async () => {
      mockDbManager.initialize.mockResolvedValue();
      mockSettingsRepo.initializeDefaults.mockResolvedValue();
      await service.initialize();
    });

    it('should provide access to GPX files repository', () => {
      const repo = service.gpxFiles;
      expect(repo).toBe(mockGpxRepo);
    });

    it('should provide access to tracking sessions repository', () => {
      const repo = service.trackingSessions;
      expect(repo).toBe(mockSessionsRepo);
    });

    it('should provide access to app settings repository', () => {
      const repo = service.appSettings;
      expect(repo).toBe(mockSettingsRepo);
    });

    it('should provide access to database manager', () => {
      const manager = service.manager;
      expect(manager).toBe(mockDbManager);
    });

    it('should throw error when accessing repositories before initialization', () => {
      const uninitializedService = new (DatabaseService as any)();

      expect(() => uninitializedService.gpxFiles).toThrow(
        'Database service not initialized'
      );
      expect(() => uninitializedService.trackingSessions).toThrow(
        'Database service not initialized'
      );
      expect(() => uninitializedService.appSettings).toThrow(
        'Database service not initialized'
      );
      expect(() => uninitializedService.manager).toThrow(
        'Database service not initialized'
      );
    });
  });

  describe('executeTransaction', () => {
    beforeEach(async () => {
      mockDbManager.initialize.mockResolvedValue();
      mockSettingsRepo.initializeDefaults.mockResolvedValue();
      await service.initialize();
    });

    it('should execute transaction successfully', async () => {
      const callback = jest.fn().mockResolvedValue('result');

      const result = await service.executeTransaction(callback);

      expect(mockDbManager.executeTransaction).toHaveBeenCalled();
      expect(callback).toHaveBeenCalledWith(service);
      expect(result).toBe('result');
    });

    it('should throw error if not initialized', async () => {
      const uninitializedService = new (DatabaseService as any)();
      const callback = jest.fn();

      await expect(
        uninitializedService.executeTransaction(callback)
      ).rejects.toThrow('Database service not initialized');
    });
  });

  describe('getStatistics', () => {
    beforeEach(async () => {
      mockDbManager.initialize.mockResolvedValue();
      mockSettingsRepo.initializeDefaults.mockResolvedValue();
      await service.initialize();
    });

    it('should return database statistics', async () => {
      mockGpxRepo.getCount.mockResolvedValue(5);
      mockSessionsRepo.getSessionCount.mockResolvedValue(3);
      mockDb.getFirstAsync
        .mockResolvedValueOnce({ count: 100 }) // track points count
        .mockResolvedValueOnce({ size: 1048576 }); // database size

      const stats = await service.getStatistics();

      expect(stats).toEqual({
        filesCount: 5,
        sessionsCount: 3,
        totalTrackPoints: 100,
        databaseSize: '1 MB',
      });
    });

    it('should handle missing statistics gracefully', async () => {
      mockGpxRepo.getCount.mockResolvedValue(0);
      mockSessionsRepo.getSessionCount.mockResolvedValue(0);
      mockDb.getFirstAsync
        .mockResolvedValueOnce(null) // track points count
        .mockResolvedValueOnce(null); // database size

      const stats = await service.getStatistics();

      expect(stats).toEqual({
        filesCount: 0,
        sessionsCount: 0,
        totalTrackPoints: 0,
        databaseSize: '0 Bytes',
      });
    });

    it('should handle getStatistics error', async () => {
      mockGpxRepo.getCount.mockRejectedValue(new Error('Database error'));

      await expect(service.getStatistics()).rejects.toThrow(
        'Failed to get database statistics'
      );
    });
  });

  describe('cleanup', () => {
    beforeEach(async () => {
      mockDbManager.initialize.mockResolvedValue();
      mockSettingsRepo.initializeDefaults.mockResolvedValue();
      await service.initialize();
    });

    it('should cleanup old data successfully', async () => {
      mockDb.runAsync
        .mockResolvedValueOnce({ changes: 2 }) // deleted sessions
        .mockResolvedValueOnce({ changes: 1 }); // deleted files
      mockDb.getFirstAsync.mockResolvedValue({ count: 50 }); // track points count

      const options = {
        deleteSessionsOlderThan: new Date('2023-01-01'),
        deleteFilesOlderThan: new Date('2023-01-01'),
        maxTrackPoints: 100,
      };

      const result = await service.cleanup(options);

      expect(result).toEqual({
        deletedSessions: 2,
        deletedFiles: 1,
        deletedTrackPoints: 0, // No track points to delete (50 < 100)
      });
      expect(mockDbManager.executeTransaction).toHaveBeenCalled();
    });

    it('should cleanup track points when over limit', async () => {
      mockDb.runAsync.mockResolvedValue({ changes: 10 }); // deleted track points
      mockDb.getFirstAsync.mockResolvedValue({ count: 150 }); // track points count

      const options = {
        maxTrackPoints: 100,
      };

      const result = await service.cleanup(options);

      expect(result.deletedTrackPoints).toBe(10);
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM track_points WHERE id IN'),
        [50] // 150 - 100 = 50 to delete
      );
    });
  });

  describe('vacuum', () => {
    beforeEach(async () => {
      mockDbManager.initialize.mockResolvedValue();
      mockSettingsRepo.initializeDefaults.mockResolvedValue();
      await service.initialize();
    });

    it('should vacuum database successfully', async () => {
      mockDb.execAsync.mockResolvedValue();

      await service.vacuum();

      expect(mockDb.execAsync).toHaveBeenCalledWith('VACUUM');
    });

    it('should handle vacuum error', async () => {
      mockDb.execAsync.mockRejectedValue(new Error('Database error'));

      await expect(service.vacuum()).rejects.toThrow(
        'Failed to vacuum database'
      );
    });
  });

  describe('close', () => {
    it('should close database connection', async () => {
      mockDbManager.initialize.mockResolvedValue();
      mockSettingsRepo.initializeDefaults.mockResolvedValue();
      await service.initialize();

      await service.close();

      expect(mockDbManager.close).toHaveBeenCalled();
      expect(service.isInitialized()).toBe(false);
    });

    it('should handle close when not initialized', async () => {
      await service.close();
      expect(mockDbManager.close).not.toHaveBeenCalled();
    });
  });

  describe('reset', () => {
    it('should reset database successfully', async () => {
      mockDbManager.reset.mockResolvedValue();
      mockSettingsRepo.initializeDefaults.mockResolvedValue();

      await service.reset();

      expect(mockDbManager.reset).toHaveBeenCalled();
      expect(mockSettingsRepo.initializeDefaults).toHaveBeenCalled();
    });
  });
});
