/**
 * Unit tests for DatabaseManager
 */

import { DatabaseManager } from '../DatabaseManager';
import { CURRENT_DB_VERSION } from '../schema';

// Mock expo-sqlite
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(),
}));

describe('DatabaseManager', () => {
  let dbManager: DatabaseManager;
  let mockDb: any;

  beforeEach(() => {
    // Reset singleton instance
    (DatabaseManager as any).instance = undefined;
    dbManager = DatabaseManager.getInstance();

    // Mock database
    mockDb = {
      execAsync: jest.fn(),
      runAsync: jest.fn(),
      getFirstAsync: jest.fn(),
      getAllAsync: jest.fn(),
      withTransactionAsync: jest.fn((callback) => callback()),
      closeAsync: jest.fn(),
    };

    const { openDatabaseAsync } = require('expo-sqlite');
    openDatabaseAsync.mockResolvedValue(mockDb);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = DatabaseManager.getInstance();
      const instance2 = DatabaseManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('initialize', () => {
    it('should initialize database successfully', async () => {
      mockDb.getFirstAsync
        .mockResolvedValueOnce({ count: 0 }) // No version table
        .mockResolvedValueOnce(null); // No version

      await dbManager.initialize();

      expect(mockDb.execAsync).toHaveBeenCalled();
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'INSERT OR REPLACE INTO db_version (version) VALUES (?)',
        [CURRENT_DB_VERSION]
      );
    });

    it('should handle existing database with current version', async () => {
      mockDb.getFirstAsync
        .mockResolvedValueOnce({ count: 1 }) // Version table exists
        .mockResolvedValueOnce({ version: CURRENT_DB_VERSION }); // Current version

      await dbManager.initialize();

      // Should not run migrations, only indexes
      expect(mockDb.execAsync).toHaveBeenCalledTimes(6); // 6 indexes
    });

    it('should throw error on initialization failure', async () => {
      const { openDatabaseAsync } = require('expo-sqlite');
      openDatabaseAsync.mockRejectedValue(new Error('Database error'));

      await expect(dbManager.initialize()).rejects.toThrow(
        'Database initialization failed'
      );
    });
  });

  describe('getDatabase', () => {
    it('should return database instance after initialization', async () => {
      mockDb.getFirstAsync.mockResolvedValue({ count: 0 });

      await dbManager.initialize();
      const db = dbManager.getDatabase();

      expect(db).toBe(mockDb);
    });

    it('should throw error if not initialized', () => {
      expect(() => dbManager.getDatabase()).toThrow('Database not initialized');
    });
  });

  describe('executeTransaction', () => {
    it('should execute transaction successfully', async () => {
      mockDb.getFirstAsync.mockResolvedValue({ count: 0 });
      await dbManager.initialize();

      const callback = jest.fn().mockResolvedValue('result');
      const result = await dbManager.executeTransaction(callback);

      expect(mockDb.withTransactionAsync).toHaveBeenCalled();
      expect(callback).toHaveBeenCalledWith(mockDb);
      expect(result).toBe('result');
    });

    it('should throw error if not initialized', async () => {
      const callback = jest.fn();

      await expect(dbManager.executeTransaction(callback)).rejects.toThrow(
        'Database not initialized'
      );
    });
  });

  describe('close', () => {
    it('should close database connection', async () => {
      mockDb.getFirstAsync.mockResolvedValue({ count: 0 });
      await dbManager.initialize();

      await dbManager.close();

      expect(mockDb.closeAsync).toHaveBeenCalled();
    });

    it('should handle close when not initialized', async () => {
      await dbManager.close();
      expect(mockDb.closeAsync).not.toHaveBeenCalled();
    });
  });

  describe('reset', () => {
    it('should reset database successfully', async () => {
      mockDb.getFirstAsync.mockResolvedValue({ count: 0 });
      await dbManager.initialize();

      await dbManager.reset();

      expect(mockDb.execAsync).toHaveBeenCalledWith(
        'DROP TABLE IF EXISTS track_points'
      );
      expect(mockDb.execAsync).toHaveBeenCalledWith(
        'DROP TABLE IF EXISTS tracking_sessions'
      );
      expect(mockDb.execAsync).toHaveBeenCalledWith(
        'DROP TABLE IF EXISTS files'
      );
      expect(mockDb.execAsync).toHaveBeenCalledWith(
        'DROP TABLE IF EXISTS app_settings'
      );
      expect(mockDb.execAsync).toHaveBeenCalledWith(
        'DROP TABLE IF EXISTS db_version'
      );
    });
  });
});
