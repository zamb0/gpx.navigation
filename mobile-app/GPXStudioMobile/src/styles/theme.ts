/**
 * Theme System per GPX Studio Mobile
 * Mantiene coerenza con l'app web usando lo stesso sistema di colori HSL
 */

export interface Theme {
  colors: {
    background: string;
    foreground: string;
    primary: string;
    primaryForeground: string;
    secondary: string;
    secondaryForeground: string;
    muted: string;
    mutedForeground: string;
    accent: string;
    accentForeground: string;
    destructive: string;
    destructiveForeground: string;
    border: string;
    input: string;
    ring: string;
    card: string;
    cardForeground: string;
    popover: string;
    popoverForeground: string;
    support: string;
    link: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    '2xl': number;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  typography: {
    heading1: {
      fontSize: number;
      fontWeight: string;
      lineHeight: number;
    };
    heading2: {
      fontSize: number;
      fontWeight: string;
      lineHeight: number;
    };
    heading3: {
      fontSize: number;
      fontWeight: string;
      lineHeight: number;
    };
    body: {
      fontSize: number;
      fontWeight: string;
      lineHeight: number;
    };
    bodyLarge: {
      fontSize: number;
      fontWeight: string;
      lineHeight: number;
    };
    caption: {
      fontSize: number;
      fontWeight: string;
      lineHeight: number;
    };
  };
}

export const lightTheme: Theme = {
  colors: {
    background: 'hsl(0, 0%, 100%)',
    foreground: 'hsl(222.2, 84%, 4.9%)',
    primary: 'hsl(222.2, 47.4%, 11.2%)',
    primaryForeground: 'hsl(210, 40%, 98%)',
    secondary: 'hsl(210, 40%, 96.1%)',
    secondaryForeground: 'hsl(222.2, 47.4%, 11.2%)',
    muted: 'hsl(210, 40%, 96.1%)',
    mutedForeground: 'hsl(215.4, 16.3%, 45%)',
    accent: 'hsl(210, 40%, 92%)',
    accentForeground: 'hsl(222.2, 47.4%, 11.2%)',
    destructive: 'hsl(0, 72.2%, 50.6%)',
    destructiveForeground: 'hsl(210, 40%, 98%)',
    border: 'hsl(214.3, 31.8%, 91.4%)',
    input: 'hsl(214.3, 31.8%, 91.4%)',
    ring: 'hsl(222.2, 84%, 4.9%)',
    card: 'hsl(0, 0%, 100%)',
    cardForeground: 'hsl(222.2, 84%, 4.9%)',
    popover: 'hsl(0, 0%, 100%)',
    popoverForeground: 'hsl(222.2, 84%, 4.9%)',
    support: 'rgb(220, 130, 190)',
    link: 'rgb(0, 110, 180)',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 48,
  },
  borderRadius: {
    sm: 4,
    md: 6,
    lg: 8,
    xl: 12,
  },
  typography: {
    heading1: {
      fontSize: 32,
      fontWeight: '600',
      lineHeight: 40,
    },
    heading2: {
      fontSize: 24,
      fontWeight: '600',
      lineHeight: 32,
    },
    heading3: {
      fontSize: 20,
      fontWeight: '500',
      lineHeight: 28,
    },
    body: {
      fontSize: 14,
      fontWeight: '400',
      lineHeight: 20,
    },
    bodyLarge: {
      fontSize: 16,
      fontWeight: '400',
      lineHeight: 24,
    },
    caption: {
      fontSize: 12,
      fontWeight: '400',
      lineHeight: 16,
    },
  },
};

export const darkTheme: Theme = {
  ...lightTheme,
  colors: {
    background: 'hsl(222.2, 84%, 4.9%)',
    foreground: 'hsl(210, 40%, 98%)',
    primary: 'hsl(210, 40%, 98%)',
    primaryForeground: 'hsl(222.2, 47.4%, 11.2%)',
    secondary: 'hsl(217.2, 32.6%, 17.5%)',
    secondaryForeground: 'hsl(210, 40%, 98%)',
    muted: 'hsl(217.2, 32.6%, 17.5%)',
    mutedForeground: 'hsl(215, 20.2%, 65.1%)',
    accent: 'hsl(217.2, 32.6%, 30%)',
    accentForeground: 'hsl(210, 40%, 98%)',
    destructive: 'hsl(0, 62.8%, 30.6%)',
    destructiveForeground: 'hsl(210, 40%, 98%)',
    border: 'hsl(217.2, 32.6%, 17.5%)',
    input: 'hsl(217.2, 32.6%, 17.5%)',
    ring: 'hsl(212.7, 26.8%, 83.9%)',
    card: 'hsl(222.2, 84%, 4.9%)',
    cardForeground: 'hsl(210, 40%, 98%)',
    popover: 'hsl(222.2, 84%, 4.9%)',
    popoverForeground: 'hsl(210, 40%, 98%)',
    support: 'rgb(255, 110, 190)',
    link: 'rgb(80, 190, 255)',
  },
};

export type ThemeMode = 'light' | 'dark';

/**
 * Hook per ottenere il tema corrente
 */
export const getTheme = (mode: ThemeMode): Theme => {
  return mode === 'dark' ? darkTheme : lightTheme;
};

/**
 * Utility per convertire colori HSL in RGB per React Native
 */
export const hslToRgb = (hslString: string): string => {
  // Parse HSL values from string like 'hsl(222.2, 84%, 4.9%)'
  const hslMatch = hslString.match(/hsl\((\d+\.?\d*),\s*(\d+\.?\d*)%,\s*(\d+\.?\d*)%\)/);
  if (!hslMatch) return hslString;

  const h = parseFloat(hslMatch[1]) / 360;
  const s = parseFloat(hslMatch[2]) / 100;
  const l = parseFloat(hslMatch[3]) / 100;

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  const r = Math.round(hue2rgb(p, q, h + 1/3) * 255);
  const g = Math.round(hue2rgb(p, q, h) * 255);
  const b = Math.round(hue2rgb(p, q, h - 1/3) * 255);

  return `rgb(${r}, ${g}, ${b})`;
};

/**
 * Converte tutti i colori HSL del tema in RGB per React Native
 */
export const convertThemeToRgb = (theme: Theme): Theme => {
  const convertedColors = Object.entries(theme.colors).reduce((acc, [key, value]) => {
    acc[key as keyof Theme['colors']] = value.startsWith('hsl') ? hslToRgb(value) : value;
    return acc;
  }, {} as Theme['colors']);

  return {
    ...theme,
    colors: convertedColors,
  };
};
