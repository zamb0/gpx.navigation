/**
 * Unit tests for AppSettingsRepository
 */

import { AppSettingsRepository, AppSettings } from '../AppSettingsRepository';
import { DatabaseManager } from '../DatabaseManager';

// Mock DatabaseManager
jest.mock('../DatabaseManager');

describe('AppSettingsRepository', () => {
  let repository: AppSettingsRepository;
  let mockDbManager: jest.Mocked<DatabaseManager>;
  let mockDb: any;

  const mockSettings: AppSettings = {
    units: {
      distance: 'metric',
      elevation: 'meters',
      speed: 'kmh',
    },
    map: {
      defaultProvider: 'openstreetmap',
      showUserLocation: true,
      followUserLocation: false,
      cacheSize: 100,
    },
    gps: {
      accuracy: 'high',
      recordingInterval: 5,
      minimumDistance: 5,
    },
    appearance: {
      theme: 'system',
      fontSize: 'medium',
    },
  };

  beforeEach(() => {
    mockDb = {
      runAsync: jest.fn(),
      getFirstAsync: jest.fn(),
      getAllAsync: jest.fn(),
    };

    mockDbManager = {
      getDatabase: jest.fn().mockReturnValue(mockDb),
      executeTransaction: jest.fn((callback) => callback(mockDb)),
    } as any;

    (DatabaseManager.getInstance as jest.Mock).mockReturnValue(mockDbManager);
    repository = new AppSettingsRepository();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSettings', () => {
    it('should return settings with stored values', async () => {
      const mockRecords = [
        {
          key: 'units.distance',
          value: '"imperial"',
          updated_at: Date.now(),
        },
        {
          key: 'map.cacheSize',
          value: '200',
          updated_at: Date.now(),
        },
      ];

      mockDb.getAllAsync.mockResolvedValue(mockRecords);

      const result = await repository.getSettings();

      expect(result.units.distance).toBe('imperial');
      expect(result.map.cacheSize).toBe(200);
      // Should keep defaults for other values
      expect(result.units.elevation).toBe('meters');
      expect(result.gps.accuracy).toBe('high');
    });

    it('should return default settings when no stored settings', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);

      const result = await repository.getSettings();

      expect(result).toEqual(mockSettings);
    });

    it('should return default settings on error', async () => {
      mockDb.getAllAsync.mockRejectedValue(new Error('Database error'));

      const result = await repository.getSettings();

      expect(result).toEqual(mockSettings);
    });
  });

  describe('getSetting', () => {
    it('should return specific setting value', async () => {
      mockDb.getFirstAsync.mockResolvedValue({
        key: 'units.distance',
        value: '"imperial"',
        updated_at: Date.now(),
      });

      const result = await repository.getSetting<string>('units.distance');

      expect(result).toBe('imperial');
      expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
        'SELECT * FROM app_settings WHERE key = ?',
        ['units.distance']
      );
    });

    it('should return default value if setting not found', async () => {
      mockDb.getFirstAsync.mockResolvedValue(null);

      const result = await repository.getSetting<string>('units.distance');

      expect(result).toBe('metric'); // Default value
    });

    it('should return null if no default exists', async () => {
      mockDb.getFirstAsync.mockResolvedValue(null);

      const result = await repository.getSetting<string>('nonexistent.key');

      expect(result).toBeNull();
    });

    it('should handle getSetting error', async () => {
      mockDb.getFirstAsync.mockRejectedValue(new Error('Database error'));

      const result = await repository.getSetting<string>('units.distance');

      expect(result).toBeNull();
    });
  });

  describe('setSetting', () => {
    it('should set specific setting value', async () => {
      mockDb.runAsync.mockResolvedValue({ changes: 1 });

      await repository.setSetting('units.distance', 'imperial');

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)',
        ['units.distance', '"imperial"', expect.any(Number)]
      );
    });

    it('should handle setSetting error', async () => {
      mockDb.runAsync.mockRejectedValue(new Error('Database error'));

      await expect(
        repository.setSetting('units.distance', 'imperial')
      ).rejects.toThrow('Failed to set setting');
    });
  });

  describe('setSettings', () => {
    it('should set multiple settings', async () => {
      mockDb.runAsync.mockResolvedValue({ changes: 1 });

      const updates: Partial<AppSettings> = {
        units: {
          distance: 'imperial',
          elevation: 'meters',
          speed: 'kmh',
        },
        map: {
          defaultProvider: 'openstreetmap',
          showUserLocation: true,
          followUserLocation: false,
          cacheSize: 200,
        },
      };

      await repository.setSettings(updates);

      expect(mockDbManager.executeTransaction).toHaveBeenCalled();
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)',
        ['units.distance', '"imperial"', expect.any(Number)]
      );
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)',
        ['map.cacheSize', '200', expect.any(Number)]
      );
    });

    it('should handle setSettings error', async () => {
      mockDbManager.executeTransaction.mockRejectedValue(
        new Error('Database error')
      );

      const invalidUpdates: Partial<AppSettings> = {
        units: {
          distance: 'imperial',
          elevation: 'meters',
          speed: 'kmh',
        },
      };

      await expect(repository.setSettings(invalidUpdates)).rejects.toThrow(
        'Failed to set settings'
      );
    });
  });

  describe('deleteSetting', () => {
    it('should delete specific setting', async () => {
      mockDb.runAsync.mockResolvedValue({ changes: 1 });

      await repository.deleteSetting('units.distance');

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'DELETE FROM app_settings WHERE key = ?',
        ['units.distance']
      );
    });

    it('should handle deleteSetting error', async () => {
      mockDb.runAsync.mockRejectedValue(new Error('Database error'));

      await expect(repository.deleteSetting('units.distance')).rejects.toThrow(
        'Failed to delete setting'
      );
    });
  });

  describe('resetToDefaults', () => {
    it('should reset all settings to defaults', async () => {
      mockDb.runAsync.mockResolvedValue({ changes: 1 });

      await repository.resetToDefaults();

      expect(mockDb.runAsync).toHaveBeenCalledWith('DELETE FROM app_settings');
    });

    it('should handle resetToDefaults error', async () => {
      mockDb.runAsync.mockRejectedValue(new Error('Database error'));

      await expect(repository.resetToDefaults()).rejects.toThrow(
        'Failed to reset settings'
      );
    });
  });

  describe('getModifiedSince', () => {
    it('should return settings modified since date', async () => {
      const testDate = new Date('2024-01-01');
      const mockRecords = [
        {
          key: 'units.distance',
          value: '"imperial"',
          updated_at: testDate.getTime() + 1000,
        },
      ];

      mockDb.getAllAsync.mockResolvedValue(mockRecords);

      const result = await repository.getModifiedSince(testDate);

      expect(result).toEqual({
        'units.distance': 'imperial',
      });
      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        'SELECT * FROM app_settings WHERE updated_at > ?',
        [testDate.getTime()]
      );
    });
  });

  describe('initializeDefaults', () => {
    it('should initialize missing default settings', async () => {
      // Mock existing settings (partial)
      mockDb.getAllAsync.mockResolvedValue([
        {
          key: 'units.distance',
          value: '"imperial"',
          updated_at: Date.now(),
        },
      ]);

      mockDb.runAsync.mockResolvedValue({ changes: 1 });

      await repository.initializeDefaults();

      expect(mockDbManager.executeTransaction).toHaveBeenCalled();
      // Should set defaults for missing keys
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)',
        expect.arrayContaining([
          'units.elevation',
          '"meters"',
          expect.any(Number),
        ])
      );
    });

    it('should handle initializeDefaults error', async () => {
      mockDb.getAllAsync.mockRejectedValue(new Error('Database error'));

      await expect(repository.initializeDefaults()).rejects.toThrow(
        'Failed to initialize default settings'
      );
    });
  });
});
