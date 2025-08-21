/**
 * Recording Controls Component
 * Provides start, pause, stop, and resume controls for track recording
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useTrackRecording } from '../../hooks/useTrackRecording';
import { RecordingOptions } from '../../services/location/TrackRecordingService';
import { LocationAccuracy } from '../../types/location';

export interface RecordingControlsProps {
  style?: any;
  onRecordingStarted?: () => void;
  onRecordingPaused?: () => void;
  onRecordingResumed?: () => void;
  onRecordingStopped?: () => void;
  onRecordingCancelled?: () => void;
  showCancelButton?: boolean;
  defaultOptions?: Partial<RecordingOptions>;
}

export const RecordingControls: React.FC<RecordingControlsProps> = ({
  style,
  onRecordingStarted,
  onRecordingPaused,
  onRecordingResumed,
  onRecordingStopped,
  onRecordingCancelled,
  showCancelButton = true,
  defaultOptions = {},
}) => {
  const {
    recordingState,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    cancelRecording,
    canStart,
    canPause,
    canResume,
    canStop,
    error,
    clearError,
  } = useTrackRecording();

  const [isLoading, setIsLoading] = useState(false);

  const handleStartRecording = async () => {
    try {
      setIsLoading(true);
      clearError();

      const options: RecordingOptions = {
        accuracy: LocationAccuracy.HIGH,
        timeInterval: 1000,
        distanceInterval: 1,
        enableHighAccuracy: true,
        autoSave: true,
        ...defaultOptions,
      };

      await startRecording(options);
      onRecordingStarted?.();
    } catch (err) {
      console.error('Failed to start recording:', err);
      Alert.alert(
        'Recording Error',
        'Failed to start recording. Please check your GPS settings and permissions.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handlePauseRecording = async () => {
    try {
      setIsLoading(true);
      await pauseRecording();
      onRecordingPaused?.();
    } catch (err) {
      console.error('Failed to pause recording:', err);
      Alert.alert('Error', 'Failed to pause recording.', [{ text: 'OK' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResumeRecording = async () => {
    try {
      setIsLoading(true);
      await resumeRecording();
      onRecordingResumed?.();
    } catch (err) {
      console.error('Failed to resume recording:', err);
      Alert.alert('Error', 'Failed to resume recording.', [{ text: 'OK' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopRecording = async () => {
    Alert.alert(
      'Stop Recording',
      'Are you sure you want to stop recording? Your track will be saved.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Stop',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              const session = await stopRecording();
              onRecordingStopped?.();

              if (session) {
                Alert.alert(
                  'Recording Saved',
                  `Your track has been saved with ${session.trackPoints.length} points.`,
                  [{ text: 'OK' }]
                );
              }
            } catch (err) {
              console.error('Failed to stop recording:', err);
              Alert.alert('Error', 'Failed to stop recording.', [
                { text: 'OK' },
              ]);
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleCancelRecording = async () => {
    Alert.alert(
      'Cancel Recording',
      'Are you sure you want to cancel recording? All recorded data will be lost.',
      [
        { text: 'Keep Recording', style: 'cancel' },
        {
          text: 'Cancel Recording',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              await cancelRecording();
              onRecordingCancelled?.();
            } catch (err) {
              console.error('Failed to cancel recording:', err);
              Alert.alert('Error', 'Failed to cancel recording.', [
                { text: 'OK' },
              ]);
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const getButtonStyle = (
    type: 'start' | 'pause' | 'stop' | 'cancel',
    enabled: boolean
  ) => {
    const baseStyle: any[] = [styles.button];

    if (!enabled || isLoading) {
      baseStyle.push(styles.buttonDisabled);
      return baseStyle;
    }

    switch (type) {
      case 'start':
        baseStyle.push(styles.startButton);
        break;
      case 'pause':
        baseStyle.push(styles.pauseButton);
        break;
      case 'stop':
        baseStyle.push(styles.stopButton);
        break;
      case 'cancel':
        baseStyle.push(styles.cancelButton);
        break;
    }

    return baseStyle;
  };

  const getButtonText = () => {
    if (isLoading) return 'Loading...';

    switch (recordingState) {
      case 'stopped':
        return 'Start Recording';
      case 'recording':
        return 'Pause';
      case 'paused':
        return 'Resume';
      default:
        return 'Start Recording';
    }
  };

  const getPrimaryAction = () => {
    switch (recordingState) {
      case 'stopped':
        return handleStartRecording;
      case 'recording':
        return handlePauseRecording;
      case 'paused':
        return handleResumeRecording;
      default:
        return handleStartRecording;
    }
  };

  const getPrimaryButtonEnabled = () => {
    switch (recordingState) {
      case 'stopped':
        return canStart;
      case 'recording':
        return canPause;
      case 'paused':
        return canResume;
      default:
        return false;
    }
  };

  const getPrimaryButtonType = (): 'start' | 'pause' | 'stop' | 'cancel' => {
    switch (recordingState) {
      case 'stopped':
        return 'start';
      case 'recording':
        return 'pause';
      case 'paused':
        return 'start'; // Resume uses start styling
      default:
        return 'start';
    }
  };

  return (
    <View style={[styles.container, style]}>
      {/* Error Display */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error.message}</Text>
          <TouchableOpacity onPress={clearError} style={styles.errorDismiss}>
            <Text style={styles.errorDismissText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Main Controls */}
      <View style={styles.controlsRow}>
        {/* Primary Action Button */}
        <TouchableOpacity
          style={getButtonStyle(
            getPrimaryButtonType(),
            getPrimaryButtonEnabled()
          )}
          onPress={getPrimaryAction()}
          disabled={!getPrimaryButtonEnabled() || isLoading}
        >
          <Text style={styles.buttonText}>{getButtonText()}</Text>
        </TouchableOpacity>

        {/* Stop Button */}
        {canStop && (
          <TouchableOpacity
            style={getButtonStyle('stop', canStop)}
            onPress={handleStopRecording}
            disabled={!canStop || isLoading}
          >
            <Text style={styles.buttonText}>Stop</Text>
          </TouchableOpacity>
        )}

        {/* Cancel Button */}
        {showCancelButton && canStop && (
          <TouchableOpacity
            style={getButtonStyle('cancel', canStop)}
            onPress={handleCancelRecording}
            disabled={!canStop || isLoading}
          >
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderLeftWidth: 3,
    borderLeftColor: '#F44336',
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#C62828',
    lineHeight: 18,
  },
  errorDismiss: {
    padding: 4,
    marginLeft: 8,
  },
  errorDismissText: {
    fontSize: 16,
    color: '#C62828',
    fontWeight: 'bold',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  pauseButton: {
    backgroundColor: '#FF9800',
  },
  stopButton: {
    backgroundColor: '#F44336',
  },
  cancelButton: {
    backgroundColor: '#757575',
  },
  buttonDisabled: {
    backgroundColor: '#E0E0E0',
  },
});

export default RecordingControls;
