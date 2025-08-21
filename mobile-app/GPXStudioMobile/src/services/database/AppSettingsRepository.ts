/**
 * Repository for app settings CRUD operations
 */

import * as SQLite from 'expo-sqlite';
import { DatabaseManager } from './DatabaseManager';

export interface AppSettings {
  units: {
    distance: 'metric' | 'imperial';
    elevation: 'meters' | 'feet';
    speed: 'kmh' | 'mph' | 'ms';
  };
  map: {
    defaultProvider: string;
    showUserLocation: boolean;
    followUserLocation: boolean;
    cacheSize: number; // MB
  };
  gps: {
    accuracy: 'high' | 'medium' | 'low';
    recordingInterval: number; // seconds
    minimumDistance: number; // meters
  };
  appearance: {
    theme: 'light' | 'dark' | 'system';
    fontSize: 'small' | 'medium' | 'large';
  };
}

export interface SettingRecord {
  key: string;
  value: string;
  updated_at: number;
}

export class AppSettingsRepository {
  private dbManager: DatabaseManager;
  private defaultSettings: AppSettings = {
    units: {
      distance: 'metric',
      elevation: 'meters',
      speed: 'kmh',
    },
    map: {
      defaultProvider: 'openstreetmap',
      showUserLocation: true,
      followUserLocation: false,
      cacheSize: 100, // 100MB default
    },
    gps: {
      accuracy: 'high',
      recordingInterval: 5, // 5 seconds
      minimumDistance: 5, // 5 meters
    },
    appearance: {
      theme: 'system',
      fontSize: 'medium',
    },
  };

  constructor() {
    this.dbManager = DatabaseManager.getInstance();
  }

  /**
   * Get all app settings
   */
  public async getSettings(): Promise<AppSettings> {
    const db = this.dbManager.getDatabase();

    try {
      const results = await db.getAllAsync<SettingRecord>(
        'SELECT * FROM app_settings'
      );

      // Start with default settings
      const settings = JSON.parse(JSON.stringify(this.defaultSettings));

      // Override with stored settings
      for (const record of results) {
        this.setNestedValue(settings, record.key, JSON.parse(record.value));
      }

      return settings;
    } catch (error) {
      console.error('Failed to get app settings:', error);
      // Return default settings on error
      return JSON.parse(JSON.stringify(this.defaultSettings));
    }
  }

  /**
   * Get specific setting by key
   */
  public async getSetting<T>(key: string): Promise<T | null> {
    const db = this.dbManager.getDatabase();

    try {
      const result = await db.getFirstAsync<SettingRecord>(
        'SELECT * FROM app_settings WHERE key = ?',
        [key]
      );

      if (!result) {
        // Return default value if exists
        const defaultValue = this.getNestedValue(this.defaultSettings, key);
        return defaultValue !== undefined ? defaultValue : null;
      }

      return JSON.parse(result.value);
    } catch (error) {
      console.error('Failed to get setting:', error);
      return null;
    }
  }

  /**
   * Set specific setting
   */
  public async setSetting<T>(key: string, value: T): Promise<void> {
    const db = this.dbManager.getDatabase();

    try {
      const now = Date.now();
      await db.runAsync(
        'INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)',
        [key, JSON.stringify(value), now]
      );
    } catch (error) {
      console.error('Failed to set setting:', error);
      throw new Error(`Failed to set setting: ${error}`);
    }
  }

  /**
   * Set multiple settings at once
   */
  public async setSettings(settings: Partial<AppSettings>): Promise<void> {
    const db = this.dbManager.getDatabase();

    try {
      await this.dbManager.executeTransaction(async (db) => {
        const now = Date.now();
        const flatSettings = this.flattenObject(settings);

        for (const [key, value] of Object.entries(flatSettings)) {
          await db.runAsync(
            'INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)',
            [key, JSON.stringify(value), now]
          );
        }
      });
    } catch (error) {
      console.error('Failed to set settings:', error);
      throw new Error(`Failed to set settings: ${error}`);
    }
  }

  /**
   * Delete specific setting (will fall back to default)
   */
  public async deleteSetting(key: string): Promise<void> {
    const db = this.dbManager.getDatabase();

    try {
      await db.runAsync('DELETE FROM app_settings WHERE key = ?', [key]);
    } catch (error) {
      console.error('Failed to delete setting:', error);
      throw new Error(`Failed to delete setting: ${error}`);
    }
  }

  /**
   * Reset all settings to defaults
   */
  public async resetToDefaults(): Promise<void> {
    const db = this.dbManager.getDatabase();

    try {
      await db.runAsync('DELETE FROM app_settings');
    } catch (error) {
      console.error('Failed to reset settings:', error);
      throw new Error(`Failed to reset settings: ${error}`);
    }
  }

  /**
   * Get settings that were modified after a specific date
   */
  public async getModifiedSince(date: Date): Promise<Record<string, any>> {
    const db = this.dbManager.getDatabase();

    try {
      const results = await db.getAllAsync<SettingRecord>(
        'SELECT * FROM app_settings WHERE updated_at > ?',
        [date.getTime()]
      );

      const modifiedSettings: Record<string, any> = {};
      for (const record of results) {
        modifiedSettings[record.key] = JSON.parse(record.value);
      }

      return modifiedSettings;
    } catch (error) {
      console.error('Failed to get modified settings:', error);
      throw new Error(`Failed to get modified settings: ${error}`);
    }
  }

  /**
   * Initialize settings with defaults if not exists
   */
  public async initializeDefaults(): Promise<void> {
    try {
      // Get stored settings directly from database (not using getSettings which returns defaults)
      const db = this.dbManager.getDatabase();
      const results = await db.getAllAsync<SettingRecord>(
        'SELECT * FROM app_settings'
      );

      const storedSettings: Record<string, any> = {};
      for (const record of results) {
        storedSettings[record.key] = JSON.parse(record.value);
      }

      const flatDefaults = this.flattenObject(this.defaultSettings);

      // Only set defaults for missing keys
      const missingSettings: Record<string, any> = {};
      for (const [key, value] of Object.entries(flatDefaults)) {
        if (!(key in storedSettings)) {
          missingSettings[key] = value;
        }
      }

      if (Object.keys(missingSettings).length > 0) {
        await this.setSettings(this.unflattenObject(missingSettings));
      }
    } catch (error) {
      console.error('Failed to initialize default settings:', error);
      throw new Error(`Failed to initialize default settings: ${error}`);
    }
  }

  /**
   * Flatten nested object to dot notation keys
   */
  private flattenObject(obj: any, prefix = ''): Record<string, any> {
    const flattened: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}.${key}` : key;

      if (
        value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value)
      ) {
        Object.assign(flattened, this.flattenObject(value, newKey));
      } else {
        flattened[newKey] = value;
      }
    }

    return flattened;
  }

  /**
   * Unflatten dot notation keys to nested object
   */
  private unflattenObject(obj: Record<string, any>): any {
    const result: any = {};

    for (const [key, value] of Object.entries(obj)) {
      this.setNestedValue(result, key, value);
    }

    return result;
  }

  /**
   * Set nested value using dot notation
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
  }

  /**
   * Get nested value using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (current === null || current === undefined || !(key in current)) {
        return undefined;
      }
      current = current[key];
    }

    return current;
  }
}
