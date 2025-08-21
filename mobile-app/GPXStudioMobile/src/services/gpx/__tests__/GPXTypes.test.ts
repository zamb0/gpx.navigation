import {
  GPXFileMetadata,
  MobileTrackPoint,
  TrackingSession,
} from '../../../types/gpx';

describe('GPX Types', () => {
  it('should define GPXFileMetadata interface correctly', () => {
    const metadata: GPXFileMetadata = {
      id: 'test-id',
      filename: 'test.gpx',
      name: 'Test Track',
      description: 'Test description',
      createdAt: new Date(),
      modifiedAt: new Date(),
      fileSize: 1024,
      trackCount: 1,
      waypointCount: 2,
      totalDistance: 5.5,
      elevationGain: 100,
      elevationLoss: 50,
      bounds: {
        north: 37.8,
        south: 37.7,
        east: -122.4,
        west: -122.5,
      },
      filePath: '/path/to/file.gpx',
    };

    expect(metadata.id).toBe('test-id');
    expect(metadata.filename).toBe('test.gpx');
    expect(metadata.bounds.north).toBe(37.8);
  });

  it('should define MobileTrackPoint interface correctly', () => {
    const trackPoint: MobileTrackPoint = {
      latitude: 37.7749,
      longitude: -122.4194,
      elevation: 100,
      timestamp: new Date('2023-01-01T10:00:00Z'),
      accuracy: 5,
      speed: 10,
      bearing: 180,
    };

    expect(trackPoint.latitude).toBe(37.7749);
    expect(trackPoint.longitude).toBe(-122.4194);
    expect(trackPoint.elevation).toBe(100);
  });

  it('should define TrackingSession interface correctly', () => {
    const session: TrackingSession = {
      id: 'session-1',
      startTime: new Date('2023-01-01T10:00:00Z'),
      endTime: new Date('2023-01-01T11:00:00Z'),
      isActive: false,
      trackPoints: [],
      totalDistance: 5.5,
      totalTime: 3600,
      averageSpeed: 5.5,
      maxSpeed: 15,
      elevationGain: 100,
      elevationLoss: 50,
    };

    expect(session.id).toBe('session-1');
    expect(session.isActive).toBe(false);
    expect(session.totalDistance).toBe(5.5);
  });

  it('should handle optional properties correctly', () => {
    const minimalTrackPoint: MobileTrackPoint = {
      latitude: 37.7749,
      longitude: -122.4194,
    };

    expect(minimalTrackPoint.elevation).toBeUndefined();
    expect(minimalTrackPoint.timestamp).toBeUndefined();
    expect(minimalTrackPoint.accuracy).toBeUndefined();
  });
});
