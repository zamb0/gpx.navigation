/**
 * Accessible text component with proper font scaling and contrast
 */

import React from 'react';
import { Text, TextProps, TextStyle } from 'react-native';
import { AccessibilityThemeService } from '../../services/accessibility/AccessibilityThemeService';

interface AccessibleTextProps extends TextProps {
  variant?: 'heading1' | 'heading2' | 'heading3' | 'body' | 'caption' | 'label';
  color?: 'primary' | 'secondary' | 'accent' | 'error' | 'warning' | 'success';
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  align?: 'left' | 'center' | 'right';
  accessibilityLabel?: string;
  accessibilityRole?: 'header' | 'text' | 'link';
}

export const AccessibleText: React.FC<AccessibleTextProps> = ({
  children,
  variant = 'body',
  color = 'primary',
  weight = 'normal',
  align = 'left',
  accessibilityLabel,
  accessibilityRole = 'text',
  style,
  ...props
}) => {
  const themeService = AccessibilityThemeService.getInstance();
  const theme = themeService.getTheme();

  const getTextStyle = (): TextStyle => {
    const baseStyle: TextStyle = {
      textAlign: align,
      lineHeight: theme.fonts.lineHeight * getFontSize(),
    };

    // Font size based on variant
    const fontSize = getFontSize();

    // Font weight
    const fontWeight = getFontWeight();

    // Color
    const textColor = getTextColor();

    return {
      ...baseStyle,
      fontSize,
      fontWeight,
      color: textColor,
    };
  };

  const getFontSize = (): number => {
    switch (variant) {
      case 'heading1':
        return themeService.getFontSize('extraLarge');
      case 'heading2':
        return themeService.getFontSize('large');
      case 'heading3':
        return themeService.getFontSize('medium') * 1.2;
      case 'body':
        return themeService.getFontSize('medium');
      case 'caption':
        return themeService.getFontSize('small');
      case 'label':
        return themeService.getFontSize('small') * 1.1;
      default:
        return themeService.getFontSize('medium');
    }
  };

  const getFontWeight = (): TextStyle['fontWeight'] => {
    if (variant.startsWith('heading')) {
      return 'bold';
    }

    switch (weight) {
      case 'medium':
        return '500';
      case 'semibold':
        return '600';
      case 'bold':
        return 'bold';
      default:
        return 'normal';
    }
  };

  const getTextColor = (): string => {
    switch (color) {
      case 'primary':
        return theme.colors.text;
      case 'secondary':
        return theme.colors.textSecondary;
      case 'accent':
        return theme.colors.accent;
      case 'error':
        return theme.colors.error;
      case 'warning':
        return theme.colors.warning;
      case 'success':
        return theme.colors.success;
      default:
        return theme.colors.text;
    }
  };

  const getAccessibilityRole = () => {
    if (variant.startsWith('heading')) {
      return 'header';
    }
    return accessibilityRole;
  };

  return (
    <Text
      style={[getTextStyle(), style]}
      accessible={true}
      accessibilityRole={getAccessibilityRole()}
      accessibilityLabel={accessibilityLabel}
      {...props}
    >
      {children}
    </Text>
  );
};
