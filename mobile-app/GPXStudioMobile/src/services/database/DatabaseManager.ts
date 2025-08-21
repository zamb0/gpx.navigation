/**
 * Database connection and migration manager
 */

import * as SQLite from 'expo-sqlite';
import { CURRENT_DB_VERSION, MIGRATIONS, INDEXES } from './schema';

export class DatabaseManager {
  private static instance: DatabaseManager;
  private db: SQLite.SQLiteDatabase | null = null;
  private readonly dbName = 'gpx_studio.db';

  private constructor() {}

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  /**
   * Initialize database connection and run migrations
   */
  public async initialize(): Promise<void> {
    try {
      this.db = await SQLite.openDatabaseAsync(this.dbName);
      await this.runMigrations();
      await this.createIndexes();
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw new Error(`Database initialization failed: ${error}`);
    }
  }

  /**
   * Get database instance
   */
  public getDatabase(): SQLite.SQLiteDatabase {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  /**
   * Run database migrations
   */
  private async runMigrations(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      // Get current database version
      const currentVersion = await this.getCurrentVersion();

      if (currentVersion === CURRENT_DB_VERSION) {
        return; // Already up to date
      }

      console.log(
        `Migrating database from version ${currentVersion} to ${CURRENT_DB_VERSION}`
      );

      // Run migrations in order
      for (const migration of MIGRATIONS) {
        if (migration.version > currentVersion) {
          console.log(`Running migration to version ${migration.version}`);

          await this.db.withTransactionAsync(async () => {
            for (const sql of migration.up) {
              await this.db!.execAsync(sql);
            }
          });
        }
      }

      // Update version
      await this.setCurrentVersion(CURRENT_DB_VERSION);
      console.log(
        `Database migration completed to version ${CURRENT_DB_VERSION}`
      );
    } catch (error) {
      console.error('Migration failed:', error);
      throw new Error(`Database migration failed: ${error}`);
    }
  }

  /**
   * Create database indexes for performance
   */
  private async createIndexes(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      for (const indexSql of INDEXES) {
        await this.db.execAsync(indexSql);
      }
    } catch (error) {
      console.error('Failed to create indexes:', error);
      throw new Error(`Index creation failed: ${error}`);
    }
  }

  /**
   * Get current database version
   */
  private async getCurrentVersion(): Promise<number> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      // Check if version table exists
      const result = await this.db.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name='db_version'"
      );

      if (result?.count === 0) {
        return 0; // No version table, fresh database
      }

      // Get version
      const versionResult = await this.db.getFirstAsync<{ version: number }>(
        'SELECT version FROM db_version ORDER BY version DESC LIMIT 1'
      );

      return versionResult?.version || 0;
    } catch (error) {
      console.error('Failed to get database version:', error);
      return 0;
    }
  }

  /**
   * Set current database version
   */
  private async setCurrentVersion(version: number): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      await this.db.runAsync(
        'INSERT OR REPLACE INTO db_version (version) VALUES (?)',
        [version]
      );
    } catch (error) {
      console.error('Failed to set database version:', error);
      throw new Error(`Failed to set database version: ${error}`);
    }
  }

  /**
   * Execute a transaction
   */
  public async executeTransaction<T>(
    callback: (db: SQLite.SQLiteDatabase) => Promise<T>
  ): Promise<T> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    let result: T;
    await this.db.withTransactionAsync(async () => {
      result = await callback(this.db!);
    });
    return result!;
  }

  /**
   * Close database connection
   */
  public async close(): Promise<void> {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
    }
  }

  /**
   * Reset database (for testing purposes)
   */
  public async reset(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      // Drop all tables
      const tables = [
        'track_points',
        'tracking_sessions',
        'files',
        'app_settings',
        'db_version',
      ];

      await this.db.withTransactionAsync(async () => {
        for (const table of tables) {
          await this.db!.execAsync(`DROP TABLE IF EXISTS ${table}`);
        }
      });

      // Reinitialize
      await this.runMigrations();
      await this.createIndexes();
    } catch (error) {
      console.error('Failed to reset database:', error);
      throw new Error(`Database reset failed: ${error}`);
    }
  }
}
