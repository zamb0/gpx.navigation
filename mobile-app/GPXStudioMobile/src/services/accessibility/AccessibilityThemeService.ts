/**
 * Accessibility theme service for managing high contrast, font scaling, and visual accessibility
 */

import { Appearance, AccessibilityInfo } from 'react-native';
import {
  ColorContrastSettings,
  MotionPreferences,
} from '../../types/accessibility';

export interface AccessibilityTheme {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    accent: string;
    error: string;
    warning: string;
    success: string;
    border: string;
    shadow: string;
  };
  fonts: {
    small: number;
    medium: number;
    large: number;
    extraLarge: number;
    lineHeight: number;
  };
  spacing: {
    touchTarget: number;
    padding: number;
    margin: number;
  };
  motion: {
    duration: number;
    easing: string;
    disabled: boolean;
  };
}

export class AccessibilityThemeService {
  private static instance: AccessibilityThemeService;
  private currentTheme: AccessibilityTheme;
  private contrastSettings: ColorContrastSettings;
  private motionPreferences: MotionPreferences;
  private fontScale: number = 1;
  private subscriptions: any[] = [];

  private constructor() {
    this.contrastSettings = {
      highContrast: false,
      contrastRatio: 4.5, // WCAG AA standard
    };

    this.motionPreferences = {
      reduceMotion: false,
      disableParallax: false,
      simplifyAnimations: false,
      staticContent: false,
    };

    this.currentTheme = this.createDefaultTheme();
    this.initializeAccessibilitySettings();
  }

  public static getInstance(): AccessibilityThemeService {
    if (!AccessibilityThemeService.instance) {
      AccessibilityThemeService.instance = new AccessibilityThemeService();
    }
    return AccessibilityThemeService.instance;
  }

  private async initializeAccessibilitySettings(): Promise<void> {
    try {
      // Check system accessibility settings
      const isReduceMotionEnabled =
        await AccessibilityInfo.isReduceMotionEnabled();
      const isReduceTransparencyEnabled =
        await AccessibilityInfo.isReduceTransparencyEnabled();

      this.motionPreferences.reduceMotion = isReduceMotionEnabled;
      this.contrastSettings.highContrast = isReduceTransparencyEnabled;

      // Listen for system changes
      this.subscriptions.push(
        AccessibilityInfo.addEventListener(
          'reduceMotionChanged',
          this.handleReduceMotionChange
        )
      );
      this.subscriptions.push(
        AccessibilityInfo.addEventListener(
          'reduceTransparencyChanged',
          this.handleReduceTransparencyChange
        )
      );
      this.subscriptions.push(
        Appearance.addChangeListener(this.handleAppearanceChange)
      );

      this.updateTheme();
    } catch (error) {
      console.error(
        'Failed to initialize accessibility theme settings:',
        error
      );
    }
  }

  private handleReduceMotionChange = (isEnabled: boolean): void => {
    this.motionPreferences.reduceMotion = isEnabled;
    this.updateTheme();
  };

  private handleReduceTransparencyChange = (isEnabled: boolean): void => {
    this.contrastSettings.highContrast = isEnabled;
    this.updateTheme();
  };

  private handleAppearanceChange = (preferences: any): void => {
    this.updateTheme();
  };

  private createDefaultTheme(): AccessibilityTheme {
    const isDark = Appearance.getColorScheme() === 'dark';

    return {
      colors: {
        primary: isDark ? '#4A90E2' : '#2E7BD6',
        secondary: isDark ? '#7B68EE' : '#6A5ACD',
        background: isDark ? '#000000' : '#FFFFFF',
        surface: isDark ? '#1C1C1E' : '#F2F2F7',
        text: isDark ? '#FFFFFF' : '#000000',
        textSecondary: isDark ? '#AEAEB2' : '#3C3C43',
        accent: '#FF6B35',
        error: '#FF3B30',
        warning: '#FF9500',
        success: '#34C759',
        border: isDark ? '#38383A' : '#C6C6C8',
        shadow: isDark ? '#000000' : '#00000029',
      },
      fonts: {
        small: 12 * this.fontScale,
        medium: 16 * this.fontScale,
        large: 20 * this.fontScale,
        extraLarge: 24 * this.fontScale,
        lineHeight: 1.4,
      },
      spacing: {
        touchTarget: 44, // Minimum iOS touch target
        padding: 16,
        margin: 8,
      },
      motion: {
        duration: this.motionPreferences.reduceMotion ? 0 : 300,
        easing: 'ease-in-out',
        disabled: this.motionPreferences.reduceMotion,
      },
    };
  }

  private createHighContrastTheme(): AccessibilityTheme {
    const baseTheme = this.createDefaultTheme();

    return {
      ...baseTheme,
      colors: {
        ...baseTheme.colors,
        primary: '#0000FF', // Pure blue for high contrast
        secondary: '#800080', // Pure purple
        background: '#FFFFFF',
        surface: '#F0F0F0',
        text: '#000000',
        textSecondary: '#333333',
        accent: '#FF0000', // Pure red for high visibility
        error: '#CC0000',
        warning: '#FF6600',
        success: '#008000',
        border: '#000000',
        shadow: '#000000',
      },
    };
  }

  public updateTheme(): void {
    if (this.contrastSettings.highContrast) {
      this.currentTheme = this.createHighContrastTheme();
    } else {
      this.currentTheme = this.createDefaultTheme();
    }

    // Apply custom colors if set
    if (this.contrastSettings.customColors) {
      this.currentTheme.colors = {
        ...this.currentTheme.colors,
        ...this.contrastSettings.customColors,
      };
    }
  }

  public getTheme(): AccessibilityTheme {
    return { ...this.currentTheme };
  }

  public setHighContrast(enabled: boolean): void {
    this.contrastSettings.highContrast = enabled;
    this.updateTheme();
  }

  public setFontScale(scale: number): void {
    this.fontScale = Math.max(0.8, Math.min(2.0, scale)); // Limit scale between 0.8x and 2.0x
    this.updateTheme();
  }

  public setReduceMotion(enabled: boolean): void {
    this.motionPreferences.reduceMotion = enabled;
    this.motionPreferences.simplifyAnimations = enabled;
    this.updateTheme();
  }

  public setCustomColors(colors: Partial<AccessibilityTheme['colors']>): void {
    this.contrastSettings.customColors = {
      primary:
        colors.primary ||
        this.contrastSettings.customColors?.primary ||
        '#000000',
      secondary:
        colors.secondary ||
        this.contrastSettings.customColors?.secondary ||
        '#666666',
      background:
        colors.background ||
        this.contrastSettings.customColors?.background ||
        '#FFFFFF',
      text:
        colors.text || this.contrastSettings.customColors?.text || '#000000',
      accent:
        colors.accent ||
        this.contrastSettings.customColors?.accent ||
        '#007AFF',
    };
    this.updateTheme();
  }

  public getTouchTargetSize(size: 'standard' | 'large' | 'extraLarge'): number {
    switch (size) {
      case 'large':
        return 56;
      case 'extraLarge':
        return 68;
      default:
        return 44;
    }
  }

  public getFontSize(
    size: 'small' | 'medium' | 'large' | 'extraLarge'
  ): number {
    return this.currentTheme.fonts[size];
  }

  public getAnimationDuration(baseMs: number): number {
    if (this.motionPreferences.reduceMotion) {
      return 0;
    }
    return baseMs;
  }

  public shouldReduceMotion(): boolean {
    return this.motionPreferences.reduceMotion;
  }

  public isHighContrastEnabled(): boolean {
    return this.contrastSettings.highContrast;
  }

  public getContrastRatio(): number {
    return this.contrastSettings.contrastRatio;
  }

  public validateColorContrast(
    foreground: string,
    background: string
  ): boolean {
    // Simplified contrast ratio calculation
    // In a real implementation, you'd use a proper color contrast library
    const fgLuminance = this.getLuminance(foreground);
    const bgLuminance = this.getLuminance(background);

    const contrast =
      (Math.max(fgLuminance, bgLuminance) + 0.05) /
      (Math.min(fgLuminance, bgLuminance) + 0.05);

    return contrast >= this.contrastSettings.contrastRatio;
  }

  private getLuminance(color: string): number {
    // Simplified luminance calculation
    // This is a basic implementation - use a proper color library in production
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  public cleanup(): void {
    this.subscriptions.forEach((subscription) => {
      if (subscription && typeof subscription.remove === 'function') {
        subscription.remove();
      }
    });
    this.subscriptions = [];
  }
}
