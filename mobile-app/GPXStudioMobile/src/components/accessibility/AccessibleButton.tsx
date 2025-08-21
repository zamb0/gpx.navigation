/**
 * Accessible button component with proper labeling and touch targets
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { AccessibilityThemeService } from '../../services/accessibility/AccessibilityThemeService';
import { AccessibilityService } from '../../services/accessibility/AccessibilityService';

interface AccessibleButtonProps {
  title: string;
  onPress: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline' | 'text';
  size?: 'small' | 'medium' | 'large';
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const AccessibleButton: React.FC<AccessibleButtonProps> = ({
  title,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  disabled = false,
  variant = 'primary',
  size = 'medium',
  icon,
  style,
  textStyle,
}) => {
  const themeService = AccessibilityThemeService.getInstance();
  const accessibilityService = AccessibilityService.getInstance();
  const theme = themeService.getTheme();

  const handlePress = () => {
    if (disabled) return;

    // Provide haptic feedback if enabled
    if (accessibilityService.getSettings().hapticFeedback) {
      // In a real implementation, you'd use Haptics.impactAsync()
    }

    onPress();
  };

  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      minHeight: themeService.getTouchTargetSize(
        accessibilityService.getSettings().touchTargetSize
      ),
      paddingHorizontal: theme.spacing.padding,
      paddingVertical: theme.spacing.padding / 2,
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      opacity: disabled ? 0.6 : 1,
    };

    switch (variant) {
      case 'primary':
        return {
          ...baseStyle,
          backgroundColor: theme.colors.primary,
        };
      case 'secondary':
        return {
          ...baseStyle,
          backgroundColor: theme.colors.secondary,
        };
      case 'outline':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderColor: theme.colors.primary,
        };
      case 'text':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
          paddingHorizontal: theme.spacing.padding / 2,
        };
      default:
        return baseStyle;
    }
  };

  const getTextStyle = (): TextStyle => {
    const baseStyle: TextStyle = {
      fontSize: themeService.getFontSize(
        size === 'small' ? 'small' : size === 'large' ? 'large' : 'medium'
      ),
      fontWeight: '600',
      textAlign: 'center',
    };

    switch (variant) {
      case 'primary':
      case 'secondary':
        return {
          ...baseStyle,
          color: theme.colors.background, // Contrasting color
        };
      case 'outline':
      case 'text':
        return {
          ...baseStyle,
          color: theme.colors.primary,
        };
      default:
        return baseStyle;
    }
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={handlePress}
      disabled={disabled}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
    >
      {icon && <>{icon}</>}
      <Text
        style={[getTextStyle(), textStyle, icon ? { marginLeft: 8 } : null]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // Additional styles if needed
});
