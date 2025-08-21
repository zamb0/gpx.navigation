/**
 * Integration tests for TrackRecordingService
 */

import {
  TrackRecordingService,
  RecordingState,
} from '../TrackRecordingService';

// Simple integration test to verify the service can be instantiated and basic methods work
describe('TrackRecordingService Integration', () => {
  let service: TrackRecordingService;

  beforeEach(() => {
    // Reset singleton for each test
    (TrackRecordingService as any).instance = undefined;
    service = TrackRecordingService.getInstance();
  });

  it('should create singleton instance', () => {
    const service1 = TrackRecordingService.getInstance();
    const service2 = TrackRecordingService.getInstance();
    expect(service1).toBe(service2);
  });

  it('should have initial stopped state', () => {
    expect(service.getRecordingState()).toBe(RecordingState.STOPPED);
  });

  it('should have initial empty stats', () => {
    const stats = service.getRecordingStats();
    expect(stats.distance).toBe(0);
    expect(stats.time).toBe(0);
    expect(stats.pointCount).toBe(0);
  });

  it('should have initial poor quality', () => {
    const quality = service.getRecordingQuality();
    expect(quality.gpsStatus).toBe('searching');
  });

  it('should have no current session initially', () => {
    expect(service.getCurrentSession()).toBeNull();
  });

  it('should allow subscribing to state changes', () => {
    const callback = jest.fn();
    const unsubscribe = service.onStateChange(callback);

    expect(typeof unsubscribe).toBe('function');
    unsubscribe();
  });

  it('should allow subscribing to stats updates', () => {
    const callback = jest.fn();
    const unsubscribe = service.onStatsUpdate(callback);

    expect(typeof unsubscribe).toBe('function');
    unsubscribe();
  });

  it('should allow subscribing to quality updates', () => {
    const callback = jest.fn();
    const unsubscribe = service.onQualityUpdate(callback);

    expect(typeof unsubscribe).toBe('function');
    unsubscribe();
  });

  it('should allow subscribing to errors', () => {
    const callback = jest.fn();
    const unsubscribe = service.onError(callback);

    expect(typeof unsubscribe).toBe('function');
    unsubscribe();
  });

  it('should allow subscribing to track points', () => {
    const callback = jest.fn();
    const unsubscribe = service.onTrackPoint(callback);

    expect(typeof unsubscribe).toBe('function');
    unsubscribe();
  });
});
