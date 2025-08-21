/**
 * Accessibility types and interfaces for the GPX Studio Mobile app
 */

export interface AccessibilitySettings {
  screenReader: boolean;
  highContrast: boolean;
  largeText: boolean;
  reducedMotion: boolean;
  voiceControl: boolean;
  hapticFeedback: boolean;
  fontSize: 'small' | 'medium' | 'large' | 'extraLarge';
  touchTargetSize: 'standard' | 'large' | 'extraLarge';
}

export interface AccessibilityLabel {
  label: string;
  hint?: string;
  role?: 'button' | 'link' | 'text' | 'image' | 'header' | 'search' | 'tab';
  state?: 'selected' | 'disabled' | 'expanded' | 'collapsed';
  value?: string;
}

export interface VoiceCommand {
  command: string;
  action: () => void;
  description: string;
  category: 'navigation' | 'map' | 'recording' | 'files' | 'settings';
}

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  targetElement?: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: 'tap' | 'swipe' | 'longPress' | 'none';
  skipable: boolean;
}

export interface AccessibilityAnnouncement {
  message: string;
  priority: 'low' | 'medium' | 'high';
  interrupt?: boolean;
}

export interface MotionPreferences {
  reduceMotion: boolean;
  disableParallax: boolean;
  simplifyAnimations: boolean;
  staticContent: boolean;
}

export interface ColorContrastSettings {
  highContrast: boolean;
  contrastRatio: number;
  customColors?: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
    accent: string;
  };
}
