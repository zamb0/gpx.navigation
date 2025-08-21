import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../../constants';

interface SettingsRowProps {
  label: string;
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  isLast?: boolean;
}

export const SettingsRow: React.FC<SettingsRowProps> = ({
  label,
  children,
  onPress,
  disabled = false,
  isLast = false,
}) => {
  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      style={[
        styles.container,
        !isLast && styles.borderBottom,
        disabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.label, disabled && styles.disabledText]}>
        {label}
      </Text>
      <View style={styles.control}>{children}</View>
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    minHeight: 56,
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSecondary,
  },
  label: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    flex: 1,
    marginRight: theme.spacing.md,
  },
  control: {
    alignItems: 'flex-end',
  },
  disabled: {
    opacity: 0.5,
  },
  disabledText: {
    color: theme.colors.textSecondary,
  },
});
