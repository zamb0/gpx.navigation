/**
 * React hook for track recording functionality
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  TrackRecordingService,
  RecordingState,
  RecordingStats,
  RecordingQuality,
  RecordingOptions,
} from '../services/location/TrackRecordingService';
import { TrackingSession, MobileTrackPoint, LocationError } from '../types';

export interface UseTrackRecordingReturn {
  // State
  recordingState: RecordingState;
  stats: RecordingStats;
  quality: RecordingQuality;
  currentSession: TrackingSession | null;
  error: LocationError | null;
  isInitialized: boolean;

  // Actions
  startRecording: (options?: RecordingOptions) => Promise<void>;
  pauseRecording: () => Promise<void>;
  resumeRecording: () => Promise<void>;
  stopRecording: () => Promise<TrackingSession | null>;
  cancelRecording: () => Promise<void>;
  clearError: () => void;

  // Computed values
  isRecording: boolean;
  isPaused: boolean;
  isStopped: boolean;
  canStart: boolean;
  canPause: boolean;
  canResume: boolean;
  canStop: boolean;
}

export function useTrackRecording(): UseTrackRecordingReturn {
  const [recordingState, setRecordingState] = useState<RecordingState>(
    RecordingState.STOPPED
  );
  const [stats, setStats] = useState<RecordingStats>({
    distance: 0,
    time: 0,
    speed: 0,
    averageSpeed: 0,
    maxSpeed: 0,
    elevation: 0,
    elevationGain: 0,
    elevationLoss: 0,
    pointCount: 0,
  });
  const [quality, setQuality] = useState<RecordingQuality>({
    signalQuality: 'poor' as any,
    averageAccuracy: 0,
    gpsStatus: 'searching',
  });
  const [currentSession, setCurrentSession] = useState<TrackingSession | null>(
    null
  );
  const [error, setError] = useState<LocationError | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const serviceRef = useRef<TrackRecordingService | undefined>(undefined);
  const unsubscribeRefs = useRef<(() => void)[]>([]);

  // Initialize service and set up subscriptions
  useEffect(() => {
    const initializeService = async () => {
      try {
        serviceRef.current = TrackRecordingService.getInstance();
        await serviceRef.current.initialize();

        // Set up subscriptions
        const unsubscribes = [
          serviceRef.current.onStateChange(setRecordingState),
          serviceRef.current.onStatsUpdate(setStats),
          serviceRef.current.onQualityUpdate(setQuality),
          serviceRef.current.onError(setError),
        ];

        unsubscribeRefs.current = unsubscribes;

        // Get initial state
        setRecordingState(serviceRef.current.getRecordingState());
        setStats(serviceRef.current.getRecordingStats());
        setQuality(serviceRef.current.getRecordingQuality());
        setCurrentSession(serviceRef.current.getCurrentSession());

        setIsInitialized(true);
      } catch (err) {
        console.error('Failed to initialize track recording service:', err);
        setError({
          code: 'UNKNOWN' as any,
          message: 'Failed to initialize recording service',
        });
      }
    };

    initializeService();

    // Cleanup subscriptions on unmount
    return () => {
      unsubscribeRefs.current.forEach((unsubscribe) => unsubscribe());
      unsubscribeRefs.current = [];
    };
  }, []);

  // Update current session when recording state changes
  useEffect(() => {
    if (serviceRef.current) {
      setCurrentSession(serviceRef.current.getCurrentSession());
    }
  }, [recordingState]);

  const startRecording = useCallback(async (options?: RecordingOptions) => {
    if (!serviceRef.current) {
      throw new Error('Recording service not initialized');
    }

    try {
      setError(null);
      await serviceRef.current.startRecording(options);
    } catch (err) {
      setError(err as LocationError);
      throw err;
    }
  }, []);

  const pauseRecording = useCallback(async () => {
    if (!serviceRef.current) {
      throw new Error('Recording service not initialized');
    }

    try {
      setError(null);
      await serviceRef.current.pauseRecording();
    } catch (err) {
      setError(err as LocationError);
      throw err;
    }
  }, []);

  const resumeRecording = useCallback(async () => {
    if (!serviceRef.current) {
      throw new Error('Recording service not initialized');
    }

    try {
      setError(null);
      await serviceRef.current.resumeRecording();
    } catch (err) {
      setError(err as LocationError);
      throw err;
    }
  }, []);

  const stopRecording =
    useCallback(async (): Promise<TrackingSession | null> => {
      if (!serviceRef.current) {
        throw new Error('Recording service not initialized');
      }

      try {
        setError(null);
        const session = await serviceRef.current.stopRecording();
        return session;
      } catch (err) {
        setError(err as LocationError);
        throw err;
      }
    }, []);

  const cancelRecording = useCallback(async () => {
    if (!serviceRef.current) {
      throw new Error('Recording service not initialized');
    }

    try {
      setError(null);
      await serviceRef.current.cancelRecording();
    } catch (err) {
      setError(err as LocationError);
      throw err;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Computed values
  const isRecording = recordingState === RecordingState.RECORDING;
  const isPaused = recordingState === RecordingState.PAUSED;
  const isStopped = recordingState === RecordingState.STOPPED;
  const canStart = isStopped || isPaused;
  const canPause = isRecording;
  const canResume = isPaused;
  const canStop = isRecording || isPaused;

  return {
    // State
    recordingState,
    stats,
    quality,
    currentSession,
    error,
    isInitialized,

    // Actions
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    cancelRecording,
    clearError,

    // Computed values
    isRecording,
    isPaused,
    isStopped,
    canStart,
    canPause,
    canResume,
    canStop,
  };
}

/**
 * Hook for subscribing to live track points during recording
 */
export function useTrackPoints(): MobileTrackPoint[] {
  const [trackPoints, setTrackPoints] = useState<MobileTrackPoint[]>([]);
  const serviceRef = useRef<TrackRecordingService | undefined>(undefined);

  useEffect(() => {
    serviceRef.current = TrackRecordingService.getInstance();

    const unsubscribe = serviceRef.current.onTrackPoint((point) => {
      setTrackPoints((prev) => [...prev, point]);
    });

    // Clear track points when recording stops
    const stateUnsubscribe = serviceRef.current.onStateChange((state) => {
      if (state === RecordingState.STOPPED) {
        setTrackPoints([]);
      }
    });

    return () => {
      unsubscribe();
      stateUnsubscribe();
    };
  }, []);

  return trackPoints;
}
