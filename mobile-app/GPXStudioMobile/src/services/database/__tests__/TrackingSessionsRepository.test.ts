/**
 * Unit tests for TrackingSessionsRepository
 */

import { TrackingSessionsRepository } from '../TrackingSessionsRepository';
import { DatabaseManager } from '../DatabaseManager';
import { TrackingSession, MobileTrackPoint } from '../../../types';

// Mock DatabaseManager
jest.mock('../DatabaseManager');

describe('TrackingSessionsRepository', () => {
  let repository: TrackingSessionsRepository;
  let mockDbManager: jest.Mocked<DatabaseManager>;
  let mockDb: any;

  const mockTrackPoint: MobileTrackPoint = {
    latitude: 45.0,
    longitude: -122.0,
    elevation: 100,
    timestamp: new Date('2024-01-01T10:00:00Z'),
    accuracy: 5,
    speed: 10,
    bearing: 90,
  };

  const mockSession: TrackingSession = {
    id: 'session-1',
    startTime: new Date('2024-01-01T10:00:00Z'),
    endTime: new Date('2024-01-01T11:00:00Z'),
    isActive: false,
    trackPoints: [mockTrackPoint],
    totalDistance: 5000,
    totalTime: 3600,
    averageSpeed: 1.39,
    maxSpeed: 5.0,
    elevationGain: 100,
    elevationLoss: 50,
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
    repository = new TrackingSessionsRepository();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createSession', () => {
    it('should create tracking session with track points', async () => {
      mockDb.runAsync.mockResolvedValue({ changes: 1 });

      await repository.createSession(mockSession);

      expect(mockDbManager.executeTransaction).toHaveBeenCalled();
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO tracking_sessions'),
        expect.arrayContaining([
          mockSession.id,
          mockSession.startTime.getTime(),
          mockSession.endTime!.getTime(),
          0, // isActive false
          mockSession.totalDistance,
          mockSession.totalTime,
          mockSession.averageSpeed,
          mockSession.maxSpeed,
          mockSession.elevationGain,
          mockSession.elevationLoss,
        ])
      );

      // Should also insert track points
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO track_points'),
        expect.arrayContaining([
          mockSession.id,
          mockTrackPoint.latitude,
          mockTrackPoint.longitude,
          mockTrackPoint.elevation,
          mockTrackPoint.timestamp!.getTime(),
          mockTrackPoint.accuracy,
          mockTrackPoint.speed,
          mockTrackPoint.bearing,
        ])
      );
    });

    it('should handle create session error', async () => {
      mockDbManager.executeTransaction.mockRejectedValue(
        new Error('Database error')
      );

      await expect(repository.createSession(mockSession)).rejects.toThrow(
        'Failed to create tracking session'
      );
    });
  });

  describe('getSessionById', () => {
    it('should return tracking session with track points', async () => {
      const mockSessionRecord = {
        id: mockSession.id,
        start_time: mockSession.startTime.getTime(),
        end_time: mockSession.endTime!.getTime(),
        is_active: 0,
        total_distance: mockSession.totalDistance,
        total_time: mockSession.totalTime,
        average_speed: mockSession.averageSpeed,
        max_speed: mockSession.maxSpeed,
        elevation_gain: mockSession.elevationGain,
        elevation_loss: mockSession.elevationLoss,
      };

      const mockTrackPointRecord = {
        id: 1,
        session_id: mockSession.id,
        latitude: mockTrackPoint.latitude,
        longitude: mockTrackPoint.longitude,
        elevation: mockTrackPoint.elevation,
        timestamp: mockTrackPoint.timestamp!.getTime(),
        accuracy: mockTrackPoint.accuracy,
        speed: mockTrackPoint.speed,
        bearing: mockTrackPoint.bearing,
      };

      mockDb.getFirstAsync.mockResolvedValue(mockSessionRecord);
      mockDb.getAllAsync.mockResolvedValue([mockTrackPointRecord]);

      const result = await repository.getSessionById('session-1');

      expect(result).toEqual(mockSession);
      expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
        'SELECT * FROM tracking_sessions WHERE id = ?',
        ['session-1']
      );
      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        'SELECT * FROM track_points WHERE session_id = ? ORDER BY timestamp ASC',
        ['session-1']
      );
    });

    it('should return null if session not found', async () => {
      mockDb.getFirstAsync.mockResolvedValue(null);

      const result = await repository.getSessionById('non-existent');

      expect(result).toBeNull();
    });

    it('should handle getSessionById error', async () => {
      mockDb.getFirstAsync.mockRejectedValue(new Error('Database error'));

      await expect(repository.getSessionById('session-1')).rejects.toThrow(
        'Failed to get tracking session by ID'
      );
    });
  });

  describe('getAllSessions', () => {
    it('should return all tracking sessions', async () => {
      const mockSessionRecord = {
        id: mockSession.id,
        start_time: mockSession.startTime.getTime(),
        end_time: mockSession.endTime!.getTime(),
        is_active: 0,
        total_distance: mockSession.totalDistance,
        total_time: mockSession.totalTime,
        average_speed: mockSession.averageSpeed,
        max_speed: mockSession.maxSpeed,
        elevation_gain: mockSession.elevationGain,
        elevation_loss: mockSession.elevationLoss,
      };

      const mockTrackPointRecord = {
        id: 1,
        session_id: mockSession.id,
        latitude: mockTrackPoint.latitude,
        longitude: mockTrackPoint.longitude,
        elevation: mockTrackPoint.elevation,
        timestamp: mockTrackPoint.timestamp!.getTime(),
        accuracy: mockTrackPoint.accuracy,
        speed: mockTrackPoint.speed,
        bearing: mockTrackPoint.bearing,
      };

      mockDb.getAllAsync
        .mockResolvedValueOnce([mockSessionRecord]) // Sessions query
        .mockResolvedValueOnce([mockTrackPointRecord]); // Track points query

      const result = await repository.getAllSessions();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockSession);
    });
  });

  describe('getActiveSession', () => {
    it('should return active tracking session', async () => {
      const activeSession = { ...mockSession, isActive: true };
      const mockSessionRecord = {
        id: activeSession.id,
        start_time: activeSession.startTime.getTime(),
        end_time: activeSession.endTime!.getTime(),
        is_active: 1,
        total_distance: activeSession.totalDistance,
        total_time: activeSession.totalTime,
        average_speed: activeSession.averageSpeed,
        max_speed: activeSession.maxSpeed,
        elevation_gain: activeSession.elevationGain,
        elevation_loss: activeSession.elevationLoss,
      };

      const mockTrackPointRecord = {
        id: 1,
        session_id: activeSession.id,
        latitude: mockTrackPoint.latitude,
        longitude: mockTrackPoint.longitude,
        elevation: mockTrackPoint.elevation,
        timestamp: mockTrackPoint.timestamp!.getTime(),
        accuracy: mockTrackPoint.accuracy,
        speed: mockTrackPoint.speed,
        bearing: mockTrackPoint.bearing,
      };

      mockDb.getFirstAsync.mockResolvedValue(mockSessionRecord);
      mockDb.getAllAsync.mockResolvedValue([mockTrackPointRecord]);

      const result = await repository.getActiveSession();

      expect(result).toEqual(activeSession);
      expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
        'SELECT * FROM tracking_sessions WHERE is_active = 1 LIMIT 1'
      );
    });

    it('should return null if no active session', async () => {
      mockDb.getFirstAsync.mockResolvedValue(null);

      const result = await repository.getActiveSession();

      expect(result).toBeNull();
    });
  });

  describe('updateSession', () => {
    it('should update tracking session', async () => {
      mockDb.runAsync.mockResolvedValue({ changes: 1 });

      const updates = {
        isActive: false,
        totalDistance: 6000,
        endTime: new Date('2024-01-01T12:00:00Z'),
      };

      await repository.updateSession('session-1', updates);

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'UPDATE tracking_sessions SET end_time = ?, is_active = ?, total_distance = ? WHERE id = ?',
        [updates.endTime.getTime(), 0, updates.totalDistance, 'session-1']
      );
    });

    it('should handle empty updates', async () => {
      await repository.updateSession('session-1', {});

      expect(mockDb.runAsync).not.toHaveBeenCalled();
    });
  });

  describe('deleteSession', () => {
    it('should delete tracking session and track points', async () => {
      mockDb.runAsync.mockResolvedValue({ changes: 1 });

      await repository.deleteSession('session-1');

      expect(mockDbManager.executeTransaction).toHaveBeenCalled();
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'DELETE FROM track_points WHERE session_id = ?',
        ['session-1']
      );
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'DELETE FROM tracking_sessions WHERE id = ?',
        ['session-1']
      );
    });
  });

  describe('addTrackPoint', () => {
    it('should add single track point', async () => {
      mockDb.runAsync.mockResolvedValue({ changes: 1 });

      await repository.addTrackPoint('session-1', mockTrackPoint);

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO track_points'),
        expect.arrayContaining([
          'session-1',
          mockTrackPoint.latitude,
          mockTrackPoint.longitude,
          mockTrackPoint.elevation,
          mockTrackPoint.timestamp!.getTime(),
          mockTrackPoint.accuracy,
          mockTrackPoint.speed,
          mockTrackPoint.bearing,
        ])
      );
    });
  });

  describe('addTrackPoints', () => {
    it('should add multiple track points', async () => {
      mockDb.runAsync.mockResolvedValue({ changes: 1 });

      await repository.addTrackPoints('session-1', [
        mockTrackPoint,
        mockTrackPoint,
      ]);

      expect(mockDbManager.executeTransaction).toHaveBeenCalled();
      expect(mockDb.runAsync).toHaveBeenCalledTimes(2);
    });
  });

  describe('getSessionCount', () => {
    it('should return total count of sessions', async () => {
      mockDb.getFirstAsync.mockResolvedValue({ count: 3 });

      const result = await repository.getSessionCount();

      expect(result).toBe(3);
      expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM tracking_sessions'
      );
    });

    it('should return 0 if no count result', async () => {
      mockDb.getFirstAsync.mockResolvedValue(null);

      const result = await repository.getSessionCount();

      expect(result).toBe(0);
    });
  });
});
