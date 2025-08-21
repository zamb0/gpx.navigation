/**
 * Repository for GPX files CRUD operations
 */

import * as SQLite from 'expo-sqlite';
import { DatabaseManager } from './DatabaseManager';
import { GPXFileMetadata, MapBounds } from '../../types';

export interface GPXFileRecord {
  id: string;
  filename: string;
  name?: string;
  description?: string;
  created_at: number;
  modified_at: number;
  file_size: number;
  track_count: number;
  waypoint_count: number;
  total_distance: number;
  elevation_gain: number;
  elevation_loss: number;
  bounds_north: number;
  bounds_south: number;
  bounds_east: number;
  bounds_west: number;
  thumbnail?: string;
  file_path: string;
}

export class GPXFilesRepository {
  private dbManager: DatabaseManager;

  constructor() {
    this.dbManager = DatabaseManager.getInstance();
  }

  /**
   * Create a new GPX file record
   */
  public async create(metadata: GPXFileMetadata): Promise<void> {
    const db = this.dbManager.getDatabase();

    try {
      await db.runAsync(
        `INSERT INTO files (
          id, filename, name, description, created_at, modified_at,
          file_size, track_count, waypoint_count, total_distance,
          elevation_gain, elevation_loss, bounds_north, bounds_south,
          bounds_east, bounds_west, thumbnail, file_path
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          metadata.id,
          metadata.filename,
          metadata.name || null,
          metadata.description || null,
          metadata.createdAt.getTime(),
          metadata.modifiedAt.getTime(),
          metadata.fileSize,
          metadata.trackCount,
          metadata.waypointCount,
          metadata.totalDistance,
          metadata.elevationGain,
          metadata.elevationLoss,
          metadata.bounds.north,
          metadata.bounds.south,
          metadata.bounds.east,
          metadata.bounds.west,
          metadata.thumbnail || null,
          metadata.filePath,
        ]
      );
    } catch (error) {
      console.error('Failed to create GPX file record:', error);
      throw new Error(`Failed to create GPX file record: ${error}`);
    }
  }

  /**
   * Get GPX file by ID
   */
  public async getById(id: string): Promise<GPXFileMetadata | null> {
    const db = this.dbManager.getDatabase();

    try {
      const result = await db.getFirstAsync<GPXFileRecord>(
        'SELECT * FROM files WHERE id = ?',
        [id]
      );

      return result ? this.mapRecordToMetadata(result) : null;
    } catch (error) {
      console.error('Failed to get GPX file by ID:', error);
      throw new Error(`Failed to get GPX file by ID: ${error}`);
    }
  }

  /**
   * Get all GPX files
   */
  public async getAll(): Promise<GPXFileMetadata[]> {
    const db = this.dbManager.getDatabase();

    try {
      const results = await db.getAllAsync<GPXFileRecord>(
        'SELECT * FROM files ORDER BY created_at DESC'
      );

      return results.map((record) => this.mapRecordToMetadata(record));
    } catch (error) {
      console.error('Failed to get all GPX files:', error);
      throw new Error(`Failed to get all GPX files: ${error}`);
    }
  }

  /**
   * Update GPX file metadata
   */
  public async update(
    id: string,
    metadata: Partial<GPXFileMetadata>
  ): Promise<void> {
    const db = this.dbManager.getDatabase();

    try {
      const updateFields: string[] = [];
      const values: any[] = [];

      // Build dynamic update query
      if (metadata.filename !== undefined) {
        updateFields.push('filename = ?');
        values.push(metadata.filename);
      }
      if (metadata.name !== undefined) {
        updateFields.push('name = ?');
        values.push(metadata.name);
      }
      if (metadata.description !== undefined) {
        updateFields.push('description = ?');
        values.push(metadata.description);
      }
      if (metadata.modifiedAt !== undefined) {
        updateFields.push('modified_at = ?');
        values.push(metadata.modifiedAt.getTime());
      }
      if (metadata.fileSize !== undefined) {
        updateFields.push('file_size = ?');
        values.push(metadata.fileSize);
      }
      if (metadata.trackCount !== undefined) {
        updateFields.push('track_count = ?');
        values.push(metadata.trackCount);
      }
      if (metadata.waypointCount !== undefined) {
        updateFields.push('waypoint_count = ?');
        values.push(metadata.waypointCount);
      }
      if (metadata.totalDistance !== undefined) {
        updateFields.push('total_distance = ?');
        values.push(metadata.totalDistance);
      }
      if (metadata.elevationGain !== undefined) {
        updateFields.push('elevation_gain = ?');
        values.push(metadata.elevationGain);
      }
      if (metadata.elevationLoss !== undefined) {
        updateFields.push('elevation_loss = ?');
        values.push(metadata.elevationLoss);
      }
      if (metadata.bounds !== undefined) {
        updateFields.push(
          'bounds_north = ?',
          'bounds_south = ?',
          'bounds_east = ?',
          'bounds_west = ?'
        );
        values.push(
          metadata.bounds.north,
          metadata.bounds.south,
          metadata.bounds.east,
          metadata.bounds.west
        );
      }
      if (metadata.thumbnail !== undefined) {
        updateFields.push('thumbnail = ?');
        values.push(metadata.thumbnail);
      }
      if (metadata.filePath !== undefined) {
        updateFields.push('file_path = ?');
        values.push(metadata.filePath);
      }

      if (updateFields.length === 0) {
        return; // Nothing to update
      }

      values.push(id); // Add ID for WHERE clause

      await db.runAsync(
        `UPDATE files SET ${updateFields.join(', ')} WHERE id = ?`,
        values
      );
    } catch (error) {
      console.error('Failed to update GPX file:', error);
      throw new Error(`Failed to update GPX file: ${error}`);
    }
  }

  /**
   * Delete GPX file by ID
   */
  public async delete(id: string): Promise<void> {
    const db = this.dbManager.getDatabase();

    try {
      await db.runAsync('DELETE FROM files WHERE id = ?', [id]);
    } catch (error) {
      console.error('Failed to delete GPX file:', error);
      throw new Error(`Failed to delete GPX file: ${error}`);
    }
  }

  /**
   * Search GPX files by name or filename
   */
  public async search(query: string): Promise<GPXFileMetadata[]> {
    const db = this.dbManager.getDatabase();

    try {
      const searchPattern = `%${query}%`;
      const results = await db.getAllAsync<GPXFileRecord>(
        `SELECT * FROM files 
         WHERE filename LIKE ? OR name LIKE ? OR description LIKE ?
         ORDER BY created_at DESC`,
        [searchPattern, searchPattern, searchPattern]
      );

      return results.map((record) => this.mapRecordToMetadata(record));
    } catch (error) {
      console.error('Failed to search GPX files:', error);
      throw new Error(`Failed to search GPX files: ${error}`);
    }
  }

  /**
   * Get files within date range
   */
  public async getByDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<GPXFileMetadata[]> {
    const db = this.dbManager.getDatabase();

    try {
      const results = await db.getAllAsync<GPXFileRecord>(
        'SELECT * FROM files WHERE created_at BETWEEN ? AND ? ORDER BY created_at DESC',
        [startDate.getTime(), endDate.getTime()]
      );

      return results.map((record) => this.mapRecordToMetadata(record));
    } catch (error) {
      console.error('Failed to get files by date range:', error);
      throw new Error(`Failed to get files by date range: ${error}`);
    }
  }

  /**
   * Get total count of files
   */
  public async getCount(): Promise<number> {
    const db = this.dbManager.getDatabase();

    try {
      const result = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM files'
      );

      return result?.count || 0;
    } catch (error) {
      console.error('Failed to get files count:', error);
      throw new Error(`Failed to get files count: ${error}`);
    }
  }

  /**
   * Check if file exists by filename
   */
  public async existsByFilename(filename: string): Promise<boolean> {
    const db = this.dbManager.getDatabase();

    try {
      const result = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM files WHERE filename = ?',
        [filename]
      );

      return (result?.count || 0) > 0;
    } catch (error) {
      console.error('Failed to check file existence:', error);
      throw new Error(`Failed to check file existence: ${error}`);
    }
  }

  /**
   * Map database record to GPXFileMetadata
   */
  private mapRecordToMetadata(record: GPXFileRecord): GPXFileMetadata {
    return {
      id: record.id,
      filename: record.filename,
      name: record.name || undefined,
      description: record.description || undefined,
      createdAt: new Date(record.created_at),
      modifiedAt: new Date(record.modified_at),
      fileSize: record.file_size,
      trackCount: record.track_count,
      waypointCount: record.waypoint_count,
      totalDistance: record.total_distance,
      elevationGain: record.elevation_gain,
      elevationLoss: record.elevation_loss,
      bounds: {
        north: record.bounds_north,
        south: record.bounds_south,
        east: record.bounds_east,
        west: record.bounds_west,
      },
      thumbnail: record.thumbnail || undefined,
      filePath: record.file_path,
    };
  }
}
