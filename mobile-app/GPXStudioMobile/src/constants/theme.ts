// Theme configuration for consistent styling across the app
export const theme = {
  colors: {
    primary: '#007AFF',
    primaryLight: '#B3D9FF',
    primaryDark: '#0056CC',
    primaryRgb: '0, 122, 255',
    secondary: '#5856D6',
    success: '#34C759',
    warning: '#FF9500',
    error: '#FF3B30',
    info: '#5AC8FA',

    // Background colors
    background: '#FFFFFF',
    backgroundSecondary: '#F8F9FA',
    backgroundTertiary: '#F2F2F7',

    // Text colors
    text: '#000000',
    textSecondary: '#6C6C70',
    textTertiary: '#8E8E93',
    textRgb: '0, 0, 0',

    // Border colors
    border: '#C6C6C8',
    borderSecondary: '#E5E5EA',

    // Shadow colors
    shadow: '#000000',

    // Tab bar colors
    tabBarBackground: '#FFFFFF',
    tabBarBorder: '#E5E5EA',
    tabBarActive: '#007AFF',
    tabBarInactive: '#8E8E93',

    // Header colors
    headerBackground: '#F8F9FA',
    headerText: '#000000',

    // Additional surface and background colors
    surface: '#FFFFFF',
    primaryBackground: '#E3F2FD',
    warningBackground: '#FFF3E0',
    successBackground: '#E8F5E8',
    errorBackground: '#FFEBEE',

    // Dark mode colors (for future implementation)
    dark: {
      background: '#000000',
      backgroundSecondary: '#1C1C1E',
      backgroundTertiary: '#2C2C2E',
      text: '#FFFFFF',
      textSecondary: '#AEAEB2',
      textTertiary: '#8E8E93',
      border: '#38383A',
      borderSecondary: '#48484A',
      tabBarBackground: '#1C1C1E',
      tabBarBorder: '#38383A',
      headerBackground: '#1C1C1E',
      headerText: '#FFFFFF',
    },
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },

  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
  },

  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
  },

  fontWeight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },

  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.18,
      shadowRadius: 1.0,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.23,
      shadowRadius: 2.62,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.3,
      shadowRadius: 4.65,
      elevation: 8,
    },
  },
};

export type Theme = typeof theme;
