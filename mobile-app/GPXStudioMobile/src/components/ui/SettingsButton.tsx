import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { theme } from '../../constants';

interface SettingsButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
}

export const SettingsButton: React.FC<SettingsButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
}) => {
  return (
    <TouchableOpacity
      testID="settings-button"
      style={[
        styles.button,
        variant === 'danger' && styles.dangerButton,
        (disabled || loading) && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator
          testID="activity-indicator"
          size="small"
          color="#FFFFFF"
        />
      ) : (
        <Text
          style={[
            styles.buttonText,
            variant === 'danger' && styles.dangerButtonText,
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
  },
  dangerButton: {
    backgroundColor: theme.colors.error,
  },
  dangerButtonText: {
    color: '#FFFFFF',
  },
  disabled: {
    opacity: 0.5,
  },
});
