/**
 * Repository for tracking sessions CRUD operations
 */

import * as SQLite from 'expo-sqlite';
import { DatabaseManager } from './DatabaseManager';
import { TrackingSession, MobileTrackPoint } from '../../types';

export interface TrackingSessionRecord {
  id: string;
  start_time: number;
  end_time?: number;
  is_active: number;
  total_distance: number;
  total_time: number;
  average_speed: number;
  max_speed: number;
  elevation_gain: number;
  elevation_loss: number;
}

export interface TrackPointRecord {
  id: number;
  session_id: string;
  latitude: number;
  longitude: number;
  elevation?: number;
  timestamp: number;
  accuracy?: number;
  speed?: number;
  bearing?: number;
}

export class TrackingSessionsRepository {
  private dbManager: DatabaseManager;

  constructor() {
    this.dbManager = DatabaseManager.getInstance();
  }

  /**
   * Create a new tracking session
   */
  public async createSession(session: TrackingSession): Promise<void> {
    const db = this.dbManager.getDatabase();

    try {
      await this.dbManager.executeTransaction(async (db) => {
        // Insert session
        await db.runAsync(
          `INSERT INTO tracking_sessions (
            id, start_time, end_time, is_active, total_distance,
            total_time, average_speed, max_speed, elevation_gain, elevation_loss
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            session.id,
            session.startTime.getTime(),
            session.endTime?.getTime() || null,
            session.isActive ? 1 : 0,
            session.totalDistance,
            session.totalTime,
            session.averageSpeed,
            session.maxSpeed,
            session.elevationGain,
            session.elevationLoss,
          ]
        );

        // Insert track points if any
        if (session.trackPoints.length > 0) {
          await this.insertTrackPoints(db, session.id, session.trackPoints);
        }
      });
    } catch (error) {
      console.error('Failed to create tracking session:', error);
      throw new Error(`Failed to create tracking session: ${error}`);
    }
  }

  /**
   * Get tracking session by ID
   */
  public async getSessionById(id: string): Promise<TrackingSession | null> {
    const db = this.dbManager.getDatabase();

    try {
      const sessionResult = await db.getFirstAsync<TrackingSessionRecord>(
        'SELECT * FROM tracking_sessions WHERE id = ?',
        [id]
      );

      if (!sessionResult) {
        return null;
      }

      const trackPoints = await this.getTrackPointsBySessionId(id);
      return this.mapRecordToSession(sessionResult, trackPoints);
    } catch (error) {
      console.error('Failed to get tracking session by ID:', error);
      throw new Error(`Failed to get tracking session by ID: ${error}`);
    }
  }

  /**
   * Get all tracking sessions
   */
  public async getAllSessions(): Promise<TrackingSession[]> {
    const db = this.dbManager.getDatabase();

    try {
      const sessionResults = await db.getAllAsync<TrackingSessionRecord>(
        'SELECT * FROM tracking_sessions ORDER BY start_time DESC'
      );

      const sessions: TrackingSession[] = [];

      for (const sessionRecord of sessionResults) {
        const trackPoints = await this.getTrackPointsBySessionId(
          sessionRecord.id
        );
        sessions.push(this.mapRecordToSession(sessionRecord, trackPoints));
      }

      return sessions;
    } catch (error) {
      console.error('Failed to get all tracking sessions:', error);
      throw new Error(`Failed to get all tracking sessions: ${error}`);
    }
  }

  /**
   * Get active tracking session
   */
  public async getActiveSession(): Promise<TrackingSession | null> {
    const db = this.dbManager.getDatabase();

    try {
      const sessionResult = await db.getFirstAsync<TrackingSessionRecord>(
        'SELECT * FROM tracking_sessions WHERE is_active = 1 LIMIT 1'
      );

      if (!sessionResult) {
        return null;
      }

      const trackPoints = await this.getTrackPointsBySessionId(
        sessionResult.id
      );
      return this.mapRecordToSession(sessionResult, trackPoints);
    } catch (error) {
      console.error('Failed to get active tracking session:', error);
      throw new Error(`Failed to get active tracking session: ${error}`);
    }
  }

  /**
   * Update tracking session
   */
  public async updateSession(
    id: string,
    updates: Partial<TrackingSession>
  ): Promise<void> {
    const db = this.dbManager.getDatabase();

    try {
      const updateFields: string[] = [];
      const values: any[] = [];

      if (updates.endTime !== undefined) {
        updateFields.push('end_time = ?');
        values.push(updates.endTime?.getTime() || null);
      }
      if (updates.isActive !== undefined) {
        updateFields.push('is_active = ?');
        values.push(updates.isActive ? 1 : 0);
      }
      if (updates.totalDistance !== undefined) {
        updateFields.push('total_distance = ?');
        values.push(updates.totalDistance);
      }
      if (updates.totalTime !== undefined) {
        updateFields.push('total_time = ?');
        values.push(updates.totalTime);
      }
      if (updates.averageSpeed !== undefined) {
        updateFields.push('average_speed = ?');
        values.push(updates.averageSpeed);
      }
      if (updates.maxSpeed !== undefined) {
        updateFields.push('max_speed = ?');
        values.push(updates.maxSpeed);
      }
      if (updates.elevationGain !== undefined) {
        updateFields.push('elevation_gain = ?');
        values.push(updates.elevationGain);
      }
      if (updates.elevationLoss !== undefined) {
        updateFields.push('elevation_loss = ?');
        values.push(updates.elevationLoss);
      }

      if (updateFields.length === 0) {
        return; // Nothing to update
      }

      values.push(id); // Add ID for WHERE clause

      await db.runAsync(
        `UPDATE tracking_sessions SET ${updateFields.join(', ')} WHERE id = ?`,
        values
      );
    } catch (error) {
      console.error('Failed to update tracking session:', error);
      throw new Error(`Failed to update tracking session: ${error}`);
    }
  }

  /**
   * Delete tracking session and all its track points
   */
  public async deleteSession(id: string): Promise<void> {
    const db = this.dbManager.getDatabase();

    try {
      await this.dbManager.executeTransaction(async (db) => {
        // Delete track points first (foreign key constraint)
        await db.runAsync('DELETE FROM track_points WHERE session_id = ?', [
          id,
        ]);

        // Delete session
        await db.runAsync('DELETE FROM tracking_sessions WHERE id = ?', [id]);
      });
    } catch (error) {
      console.error('Failed to delete tracking session:', error);
      throw new Error(`Failed to delete tracking session: ${error}`);
    }
  }

  /**
   * Add track point to session
   */
  public async addTrackPoint(
    sessionId: string,
    trackPoint: MobileTrackPoint
  ): Promise<void> {
    const db = this.dbManager.getDatabase();

    try {
      await db.runAsync(
        `INSERT INTO track_points (
          session_id, latitude, longitude, elevation, timestamp, accuracy, speed, bearing
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          sessionId,
          trackPoint.latitude,
          trackPoint.longitude,
          trackPoint.elevation || null,
          trackPoint.timestamp?.getTime() || Date.now(),
          trackPoint.accuracy || null,
          trackPoint.speed || null,
          trackPoint.bearing || null,
        ]
      );
    } catch (error) {
      console.error('Failed to add track point:', error);
      throw new Error(`Failed to add track point: ${error}`);
    }
  }

  /**
   * Add multiple track points to session
   */
  public async addTrackPoints(
    sessionId: string,
    trackPoints: MobileTrackPoint[]
  ): Promise<void> {
    const db = this.dbManager.getDatabase();

    try {
      await this.dbManager.executeTransaction(async (db) => {
        await this.insertTrackPoints(db, sessionId, trackPoints);
      });
    } catch (error) {
      console.error('Failed to add track points:', error);
      throw new Error(`Failed to add track points: ${error}`);
    }
  }

  /**
   * Get track points for a session
   */
  public async getTrackPointsBySessionId(
    sessionId: string
  ): Promise<MobileTrackPoint[]> {
    const db = this.dbManager.getDatabase();

    try {
      const results = await db.getAllAsync<TrackPointRecord>(
        'SELECT * FROM track_points WHERE session_id = ? ORDER BY timestamp ASC',
        [sessionId]
      );

      return results.map((record) => this.mapRecordToTrackPoint(record));
    } catch (error) {
      console.error('Failed to get track points:', error);
      throw new Error(`Failed to get track points: ${error}`);
    }
  }

  /**
   * Get sessions within date range
   */
  public async getSessionsByDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<TrackingSession[]> {
    const db = this.dbManager.getDatabase();

    try {
      const sessionResults = await db.getAllAsync<TrackingSessionRecord>(
        'SELECT * FROM tracking_sessions WHERE start_time BETWEEN ? AND ? ORDER BY start_time DESC',
        [startDate.getTime(), endDate.getTime()]
      );

      const sessions: TrackingSession[] = [];

      for (const sessionRecord of sessionResults) {
        const trackPoints = await this.getTrackPointsBySessionId(
          sessionRecord.id
        );
        sessions.push(this.mapRecordToSession(sessionRecord, trackPoints));
      }

      return sessions;
    } catch (error) {
      console.error('Failed to get sessions by date range:', error);
      throw new Error(`Failed to get sessions by date range: ${error}`);
    }
  }

  /**
   * Get total count of sessions
   */
  public async getSessionCount(): Promise<number> {
    const db = this.dbManager.getDatabase();

    try {
      const result = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM tracking_sessions'
      );

      return result?.count || 0;
    } catch (error) {
      console.error('Failed to get session count:', error);
      throw new Error(`Failed to get session count: ${error}`);
    }
  }

  /**
   * Helper method to insert multiple track points
   */
  private async insertTrackPoints(
    db: SQLite.SQLiteDatabase,
    sessionId: string,
    trackPoints: MobileTrackPoint[]
  ): Promise<void> {
    for (const trackPoint of trackPoints) {
      await db.runAsync(
        `INSERT INTO track_points (
          session_id, latitude, longitude, elevation, timestamp, accuracy, speed, bearing
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          sessionId,
          trackPoint.latitude,
          trackPoint.longitude,
          trackPoint.elevation || null,
          trackPoint.timestamp?.getTime() || Date.now(),
          trackPoint.accuracy || null,
          trackPoint.speed || null,
          trackPoint.bearing || null,
        ]
      );
    }
  }

  /**
   * Map database record to TrackingSession
   */
  private mapRecordToSession(
    record: TrackingSessionRecord,
    trackPoints: MobileTrackPoint[]
  ): TrackingSession {
    return {
      id: record.id,
      startTime: new Date(record.start_time),
      endTime: record.end_time ? new Date(record.end_time) : undefined,
      isActive: record.is_active === 1,
      trackPoints,
      totalDistance: record.total_distance,
      totalTime: record.total_time,
      averageSpeed: record.average_speed,
      maxSpeed: record.max_speed,
      elevationGain: record.elevation_gain,
      elevationLoss: record.elevation_loss,
    };
  }

  /**
   * Map database record to MobileTrackPoint
   */
  private mapRecordToTrackPoint(record: TrackPointRecord): MobileTrackPoint {
    return {
      latitude: record.latitude,
      longitude: record.longitude,
      elevation: record.elevation || undefined,
      timestamp: new Date(record.timestamp),
      accuracy: record.accuracy || undefined,
      speed: record.speed || undefined,
      bearing: record.bearing || undefined,
    };
  }
}
