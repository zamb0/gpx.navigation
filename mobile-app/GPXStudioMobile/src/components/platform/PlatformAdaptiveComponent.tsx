import React from 'react';
import { Platform, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { theme } from '../../constants/theme';

export interface PlatformStyles {
  ios?: ViewStyle | TextStyle;
  android?: ViewStyle | TextStyle;
  default?: ViewStyle | TextStyle;
}

export interface PlatformAdaptiveProps {
  children: React.ReactNode;
  style?: PlatformStyles;
  iosStyle?: ViewStyle | TextStyle;
  androidStyle?: ViewStyle | TextStyle;
}

export const PlatformAdaptiveView: React.FC<PlatformAdaptiveProps> = ({
  children,
  style,
  iosStyle,
  androidStyle,
}) => {
  const platformStyle = React.useMemo(() => {
    const baseStyle = style?.default || {};

    if (Platform.OS === 'ios') {
      return [baseStyle, style?.ios, iosStyle];
    } else if (Platform.OS === 'android') {
      return [baseStyle, style?.android, androidStyle];
    }

    return baseStyle;
  }, [style, iosStyle, androidStyle]);

  return React.createElement(
    Platform.OS === 'ios' ? 'View' : 'View',
    { style: platformStyle },
    children
  );
};

export const createPlatformStyles = (styles: {
  ios?: Record<string, ViewStyle | TextStyle>;
  android?: Record<string, ViewStyle | TextStyle>;
  default?: Record<string, ViewStyle | TextStyle>;
}) => {
  const platformStyles: Record<string, ViewStyle | TextStyle> = {};

  const baseStyles = styles.default || {};
  const platformSpecificStyles =
    Platform.OS === 'ios' ? styles.ios : styles.android;

  Object.keys(baseStyles).forEach((key) => {
    platformStyles[key] = {
      ...baseStyles[key],
      ...platformSpecificStyles?.[key],
    };
  });

  return platformStyles as any;
};

// Platform-specific design tokens
export const platformDesignTokens = {
  ios: {
    borderRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 0,
    buttonHeight: 44,
    headerHeight: 44,
    tabBarHeight: 83,
    statusBarHeight: 44,
    safeAreaInsets: {
      top: 44,
      bottom: 34,
    },
    hapticFeedback: 'light',
    animation: {
      duration: 300,
      easing: 'ease-out',
    },
  },
  android: {
    borderRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 4,
    buttonHeight: 48,
    headerHeight: 56,
    tabBarHeight: 56,
    statusBarHeight: 24,
    safeAreaInsets: {
      top: 24,
      bottom: 0,
    },
    hapticFeedback: 'medium',
    animation: {
      duration: 250,
      easing: 'ease-in-out',
    },
  },
};

export const getPlatformDesignTokens = () => {
  return Platform.OS === 'ios'
    ? platformDesignTokens.ios
    : platformDesignTokens.android;
};

// Platform-specific component styles
export const platformComponentStyles = createPlatformStyles({
  default: {
    button: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: 8,
      padding: 16,
      marginVertical: 8,
    },
    header: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tabBar: {
      backgroundColor: theme.colors.surface,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
  },
  ios: {
    button: {
      borderRadius: 8,
      height: 44,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
    },
    card: {
      borderRadius: 12,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    header: {
      height: 44,
      borderBottomWidth: 0,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    },
    tabBar: {
      height: 83,
      paddingBottom: 34, // Safe area bottom
      borderTopWidth: 0,
      shadowOffset: { width: 0, height: -1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    },
  },
  android: {
    button: {
      borderRadius: 4,
      height: 48,
      elevation: 2,
    },
    card: {
      borderRadius: 8,
      elevation: 2,
    },
    header: {
      height: 56,
      elevation: 4,
      borderBottomWidth: 0,
    },
    tabBar: {
      height: 56,
      elevation: 8,
      borderTopWidth: 0,
    },
  },
});

// Platform-specific typography
export const platformTypography = createPlatformStyles({
  default: {
    title: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.colors.text,
    },
    subtitle: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.textSecondary,
    },
    body: {
      fontSize: 14,
      fontWeight: '400',
      color: theme.colors.text,
    },
    caption: {
      fontSize: 12,
      fontWeight: '400',
      color: theme.colors.textSecondary,
    },
  },
  ios: {
    title: {
      fontSize: 22,
      fontWeight: '600',
      fontFamily: 'System',
    },
    subtitle: {
      fontSize: 17,
      fontWeight: '500',
      fontFamily: 'System',
    },
    body: {
      fontSize: 15,
      fontWeight: '400',
      fontFamily: 'System',
    },
    caption: {
      fontSize: 13,
      fontWeight: '400',
      fontFamily: 'System',
    },
  },
  android: {
    title: {
      fontSize: 20,
      fontWeight: '500',
      fontFamily: 'Roboto',
    },
    subtitle: {
      fontSize: 16,
      fontWeight: '400',
      fontFamily: 'Roboto',
    },
    body: {
      fontSize: 14,
      fontWeight: '400',
      fontFamily: 'Roboto',
    },
    caption: {
      fontSize: 12,
      fontWeight: '400',
      fontFamily: 'Roboto',
    },
  },
});

// Platform-specific colors
export const platformColors = {
  ios: {
    primary: '#007AFF',
    secondary: '#5856D6',
    success: '#34C759',
    warning: '#FF9500',
    error: '#FF3B30',
    background: '#F2F2F7',
    surface: '#FFFFFF',
    text: '#000000',
    textSecondary: '#8E8E93',
    border: '#C6C6C8',
    separator: '#E5E5EA',
  },
  android: {
    primary: '#2196F3',
    secondary: '#9C27B0',
    success: '#4CAF50',
    warning: '#FF9800',
    error: '#F44336',
    background: '#FAFAFA',
    surface: '#FFFFFF',
    text: '#212121',
    textSecondary: '#757575',
    border: '#E0E0E0',
    separator: '#EEEEEE',
  },
};

export const getPlatformColors = () => {
  return Platform.OS === 'ios' ? platformColors.ios : platformColors.android;
};

// Platform-specific animations
export const platformAnimations = {
  ios: {
    fadeIn: {
      duration: 300,
      useNativeDriver: true,
    },
    slideIn: {
      duration: 350,
      useNativeDriver: true,
    },
    spring: {
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    },
  },
  android: {
    fadeIn: {
      duration: 250,
      useNativeDriver: true,
    },
    slideIn: {
      duration: 300,
      useNativeDriver: true,
    },
    spring: {
      tension: 120,
      friction: 7,
      useNativeDriver: true,
    },
  },
};

export const getPlatformAnimations = () => {
  return Platform.OS === 'ios'
    ? platformAnimations.ios
    : platformAnimations.android;
};
