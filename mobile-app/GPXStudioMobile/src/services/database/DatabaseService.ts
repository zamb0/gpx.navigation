/**
 * Main database service that provides unified access to all repositories
 */

import { DatabaseManager } from './DatabaseManager';
import { GPXFilesRepository } from './GPXFilesRepository';
import { TrackingSessionsRepository } from './TrackingSessionsRepository';
import { AppSettingsRepository } from './AppSettingsRepository';

export class DatabaseService {
  private static instance: DatabaseService;
  private dbManager: DatabaseManager;
  private gpxFilesRepo: GPXFilesRepository;
  private trackingSessionsRepo: TrackingSessionsRepository;
  private appSettingsRepo: AppSettingsRepository;
  private initialized = false;

  private constructor() {
    this.dbManager = DatabaseManager.getInstance();
    this.gpxFilesRepo = new GPXFilesRepository();
    this.trackingSessionsRepo = new TrackingSessionsRepository();
    this.appSettingsRepo = new AppSettingsRepository();
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * Initialize the database service
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      await this.dbManager.initialize();
      await this.appSettingsRepo.initializeDefaults();
      this.initialized = true;
      console.log('Database service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database service:', error);
      throw new Error(`Database service initialization failed: ${error}`);
    }
  }

  /**
   * Check if database service is initialized
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get GPX files repository
   */
  public get gpxFiles(): GPXFilesRepository {
    this.ensureInitialized();
    return this.gpxFilesRepo;
  }

  /**
   * Get tracking sessions repository
   */
  public get trackingSessions(): TrackingSessionsRepository {
    this.ensureInitialized();
    return this.trackingSessionsRepo;
  }

  /**
   * Get app settings repository
   */
  public get appSettings(): AppSettingsRepository {
    this.ensureInitialized();
    return this.appSettingsRepo;
  }

  /**
   * Get database manager for advanced operations
   */
  public get manager(): DatabaseManager {
    this.ensureInitialized();
    return this.dbManager;
  }

  /**
   * Execute a transaction across multiple repositories
   */
  public async executeTransaction<T>(
    callback: (service: DatabaseService) => Promise<T>
  ): Promise<T> {
    this.ensureInitialized();

    return await this.dbManager.executeTransaction(async () => {
      return await callback(this);
    });
  }

  /**
   * Get database statistics
   */
  public async getStatistics(): Promise<{
    filesCount: number;
    sessionsCount: number;
    totalTrackPoints: number;
    databaseSize: string;
  }> {
    this.ensureInitialized();

    try {
      const [filesCount, sessionsCount] = await Promise.all([
        this.gpxFilesRepo.getCount(),
        this.trackingSessionsRepo.getSessionCount(),
      ]);

      // Get total track points count
      const db = this.dbManager.getDatabase();
      const trackPointsResult = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM track_points'
      );
      const totalTrackPoints = trackPointsResult?.count || 0;

      // Get database size (approximate)
      const sizeResult = await db.getFirstAsync<{ size: number }>(
        'SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()'
      );
      const sizeBytes = sizeResult?.size || 0;
      const databaseSize = this.formatBytes(sizeBytes);

      return {
        filesCount,
        sessionsCount,
        totalTrackPoints,
        databaseSize,
      };
    } catch (error) {
      console.error('Failed to get database statistics:', error);
      throw new Error(`Failed to get database statistics: ${error}`);
    }
  }

  /**
   * Cleanup old data based on retention policies
   */
  public async cleanup(options: {
    deleteSessionsOlderThan?: Date;
    deleteFilesOlderThan?: Date;
    maxTrackPoints?: number;
  }): Promise<{
    deletedSessions: number;
    deletedFiles: number;
    deletedTrackPoints: number;
  }> {
    this.ensureInitialized();

    try {
      let deletedSessions = 0;
      let deletedFiles = 0;
      let deletedTrackPoints = 0;

      await this.dbManager.executeTransaction(async (db) => {
        // Delete old sessions
        if (options.deleteSessionsOlderThan) {
          const result = await db.runAsync(
            'DELETE FROM tracking_sessions WHERE start_time < ?',
            [options.deleteSessionsOlderThan.getTime()]
          );
          deletedSessions = result.changes;
        }

        // Delete old files
        if (options.deleteFilesOlderThan) {
          const result = await db.runAsync(
            'DELETE FROM files WHERE created_at < ?',
            [options.deleteFilesOlderThan.getTime()]
          );
          deletedFiles = result.changes;
        }

        // Limit track points if specified
        if (options.maxTrackPoints) {
          const countResult = await db.getFirstAsync<{ count: number }>(
            'SELECT COUNT(*) as count FROM track_points'
          );
          const currentCount = countResult?.count || 0;

          if (currentCount > options.maxTrackPoints) {
            const toDelete = currentCount - options.maxTrackPoints;
            const result = await db.runAsync(
              `DELETE FROM track_points WHERE id IN (
                SELECT id FROM track_points ORDER BY timestamp ASC LIMIT ?
              )`,
              [toDelete]
            );
            deletedTrackPoints = result.changes;
          }
        }
      });

      return {
        deletedSessions,
        deletedFiles,
        deletedTrackPoints,
      };
    } catch (error) {
      console.error('Failed to cleanup database:', error);
      throw new Error(`Failed to cleanup database: ${error}`);
    }
  }

  /**
   * Vacuum database to reclaim space
   */
  public async vacuum(): Promise<void> {
    this.ensureInitialized();

    try {
      const db = this.dbManager.getDatabase();
      await db.execAsync('VACUUM');
      console.log('Database vacuum completed');
    } catch (error) {
      console.error('Failed to vacuum database:', error);
      throw new Error(`Failed to vacuum database: ${error}`);
    }
  }

  /**
   * Close database connection
   */
  public async close(): Promise<void> {
    if (this.initialized) {
      await this.dbManager.close();
      this.initialized = false;
    }
  }

  /**
   * Reset database (for testing purposes)
   */
  public async reset(): Promise<void> {
    await this.dbManager.reset();
    await this.appSettingsRepo.initializeDefaults();
  }

  /**
   * Ensure database service is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error(
        'Database service not initialized. Call initialize() first.'
      );
    }
  }

  /**
   * Format bytes to human readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Export singleton instance
export const databaseService = DatabaseService.getInstance();
