/**
 * Custom hook for accessibility features and settings
 */

import { useEffect, useState, useCallback } from 'react';
import { AccessibilityService } from '../services/accessibility/AccessibilityService';
import { ScreenReaderService } from '../services/accessibility/ScreenReaderService';
import { VoiceControlService } from '../services/accessibility/VoiceControlService';
import { TutorialService } from '../services/accessibility/TutorialService';
import { AccessibilityThemeService } from '../services/accessibility/AccessibilityThemeService';
import {
  AccessibilitySettings,
  AccessibilityAnnouncement,
  VoiceCommand,
} from '../types/accessibility';

export interface UseAccessibilityReturn {
  // Settings
  settings: AccessibilitySettings;
  updateSettings: (newSettings: Partial<AccessibilitySettings>) => void;

  // Screen reader
  isScreenReaderEnabled: boolean;
  announce: (announcement: AccessibilityAnnouncement) => void;

  // Voice control
  isVoiceControlActive: boolean;
  startVoiceControl: () => void;
  stopVoiceControl: () => void;
  registerVoiceCommand: (command: VoiceCommand) => void;

  // Tutorial
  isTutorialActive: boolean;
  startTutorial: (name: string) => boolean;
  nextTutorialStep: () => boolean;
  skipTutorial: () => void;

  // Theme
  theme: any;
  isHighContrast: boolean;
  shouldReduceMotion: boolean;
  getFontSize: (size: string) => number;
  getTouchTargetSize: (size: string) => number;
}

export const useAccessibility = (): UseAccessibilityReturn => {
  const [settings, setSettings] = useState<AccessibilitySettings>({
    screenReader: false,
    highContrast: false,
    largeText: false,
    reducedMotion: false,
    voiceControl: false,
    hapticFeedback: true,
    fontSize: 'medium',
    touchTargetSize: 'standard',
  });

  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(false);
  const [isVoiceControlActive, setIsVoiceControlActive] = useState(false);
  const [isTutorialActive, setIsTutorialActive] = useState(false);
  const [theme, setTheme] = useState<any>(null);

  // Service instances
  const accessibilityService = AccessibilityService.getInstance();
  const screenReaderService = ScreenReaderService.getInstance();
  const voiceControlService = VoiceControlService.getInstance();
  const tutorialService = TutorialService.getInstance();
  const themeService = AccessibilityThemeService.getInstance();

  useEffect(() => {
    // Initialize settings
    const currentSettings = accessibilityService.getSettings();
    setSettings(currentSettings);
    setIsScreenReaderEnabled(screenReaderService.isScreenReaderEnabled());
    setIsVoiceControlActive(voiceControlService.isVoiceControlActive());
    setIsTutorialActive(tutorialService.isTutorialActive());
    setTheme(themeService.getTheme());

    // Set up polling for dynamic states
    const interval = setInterval(() => {
      setIsVoiceControlActive(voiceControlService.isVoiceControlActive());
      setIsTutorialActive(tutorialService.isTutorialActive());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const updateSettings = useCallback(
    (newSettings: Partial<AccessibilitySettings>) => {
      const updatedSettings = { ...settings, ...newSettings };
      setSettings(updatedSettings);
      accessibilityService.updateSettings(newSettings);

      // Update theme service settings
      if (newSettings.highContrast !== undefined) {
        themeService.setHighContrast(newSettings.highContrast);
      }
      if (newSettings.reducedMotion !== undefined) {
        themeService.setReduceMotion(newSettings.reducedMotion);
      }
      if (newSettings.fontSize !== undefined) {
        const scaleMap = {
          small: 0.9,
          medium: 1.0,
          large: 1.2,
          extraLarge: 1.4,
        };
        themeService.setFontScale(scaleMap[newSettings.fontSize] || 1.0);
      }

      // Update theme
      setTheme(themeService.getTheme());
    },
    [settings]
  );

  const announce = useCallback((announcement: AccessibilityAnnouncement) => {
    screenReaderService.announce(announcement);
  }, []);

  const startVoiceControl = useCallback(() => {
    voiceControlService.startListening();
    setIsVoiceControlActive(true);
  }, []);

  const stopVoiceControl = useCallback(() => {
    voiceControlService.stopListening();
    setIsVoiceControlActive(false);
  }, []);

  const registerVoiceCommand = useCallback((command: VoiceCommand) => {
    voiceControlService.registerCommand(command);
  }, []);

  const startTutorial = useCallback((name: string): boolean => {
    const started = tutorialService.startTutorial(name);
    setIsTutorialActive(started);
    return started;
  }, []);

  const nextTutorialStep = useCallback((): boolean => {
    const hasNext = tutorialService.nextStep();
    if (!hasNext) {
      setIsTutorialActive(false);
    }
    return hasNext;
  }, []);

  const skipTutorial = useCallback(() => {
    tutorialService.skipTutorial();
    setIsTutorialActive(false);
  }, []);

  const isHighContrast = themeService.isHighContrastEnabled();
  const shouldReduceMotion = themeService.shouldReduceMotion();

  const getFontSize = useCallback((size: string) => {
    return themeService.getFontSize(size as any);
  }, []);

  const getTouchTargetSize = useCallback((size: string) => {
    return themeService.getTouchTargetSize(size as any);
  }, []);

  return {
    // Settings
    settings,
    updateSettings,

    // Screen reader
    isScreenReaderEnabled,
    announce,

    // Voice control
    isVoiceControlActive,
    startVoiceControl,
    stopVoiceControl,
    registerVoiceCommand,

    // Tutorial
    isTutorialActive,
    startTutorial,
    nextTutorialStep,
    skipTutorial,

    // Theme
    theme,
    isHighContrast,
    shouldReduceMotion,
    getFontSize,
    getTouchTargetSize,
  };
};
