/**
 * Loading indicator component with progress feedback
 */

import React from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { LoadingState } from '../../types/errors';
import { theme } from '../../constants/theme';

interface LoadingIndicatorProps {
  loading: LoadingState;
  onCancel?: () => void;
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  loading,
  onCancel,
}) => {
  const progressAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (loading.progress !== undefined) {
      Animated.timing(progressAnim, {
        toValue: loading.progress,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [loading.progress, progressAnim]);

  if (!loading.isLoading) {
    return null;
  }

  return (
    <Modal
      transparent
      animationType="fade"
      visible={loading.isLoading}
      onRequestClose={loading.cancellable ? onCancel : undefined}
      testID="loading-modal"
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <ActivityIndicator
            size="large"
            color={theme.colors.primary}
            style={styles.spinner}
            testID="loading-spinner"
          />

          {loading.message && (
            <Text style={styles.message}>{loading.message}</Text>
          )}

          {loading.progress !== undefined && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar} testID="progress-bar">
                <Animated.View
                  style={[
                    styles.progressFill,
                    {
                      width: progressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }),
                    },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {Math.round(loading.progress * 100)}%
              </Text>
            </View>
          )}

          {loading.cancellable && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel || loading.onCancel}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 24,
    minWidth: 200,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  spinner: {
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cancelText: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '500',
  },
});

export default LoadingIndicator;
