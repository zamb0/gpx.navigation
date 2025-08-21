/**
 * Core accessibility service for managing accessibility features
 */

import { AccessibilityInfo } from 'react-native';
import {
  AccessibilitySettings,
  AccessibilityAnnouncement,
  VoiceCommand,
} from '../../types/accessibility';

export class AccessibilityService {
  private static instance: AccessibilityService;
  private settings: AccessibilitySettings;
  private voiceCommands: Map<string, VoiceCommand> = new Map();
  private announcements: AccessibilityAnnouncement[] = [];
  private subscriptions: any[] = [];

  private constructor() {
    this.settings = {
      screenReader: false,
      highContrast: false,
      largeText: false,
      reducedMotion: false,
      voiceControl: false,
      hapticFeedback: true,
      fontSize: 'medium',
      touchTargetSize: 'standard',
    };
    this.initializeAccessibility();
  }

  public static getInstance(): AccessibilityService {
    if (!AccessibilityService.instance) {
      AccessibilityService.instance = new AccessibilityService();
    }
    return AccessibilityService.instance;
  }

  private async initializeAccessibility(): Promise<void> {
    try {
      // Check system accessibility settings
      const isScreenReaderEnabled =
        await AccessibilityInfo.isScreenReaderEnabled();
      const isReduceMotionEnabled =
        await AccessibilityInfo.isReduceMotionEnabled();
      const isReduceTransparencyEnabled =
        await AccessibilityInfo.isReduceTransparencyEnabled();

      this.settings.screenReader = isScreenReaderEnabled;
      this.settings.reducedMotion = isReduceMotionEnabled;
      this.settings.highContrast = isReduceTransparencyEnabled;

      // Listen for accessibility changes
      this.subscriptions.push(
        AccessibilityInfo.addEventListener(
          'screenReaderChanged',
          this.handleScreenReaderChange
        )
      );
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
    } catch (error) {
      console.error('Failed to initialize accessibility settings:', error);
    }
  }

  private handleScreenReaderChange = (isEnabled: boolean): void => {
    this.settings.screenReader = isEnabled;
    this.announceChange(
      'Screen reader ' + (isEnabled ? 'enabled' : 'disabled')
    );
  };

  private handleReduceMotionChange = (isEnabled: boolean): void => {
    this.settings.reducedMotion = isEnabled;
    this.announceChange('Motion settings updated');
  };

  private handleReduceTransparencyChange = (isEnabled: boolean): void => {
    this.settings.highContrast = isEnabled;
    this.announceChange('Contrast settings updated');
  };

  public getSettings(): AccessibilitySettings {
    return { ...this.settings };
  }

  public updateSettings(newSettings: Partial<AccessibilitySettings>): void {
    this.settings = { ...this.settings, ...newSettings };
  }

  public announceForAccessibility(
    announcement: AccessibilityAnnouncement
  ): void {
    if (this.settings.screenReader) {
      AccessibilityInfo.announceForAccessibility(announcement.message);
      this.announcements.push(announcement);
    }
  }

  private announceChange(message: string): void {
    this.announceForAccessibility({
      message,
      priority: 'medium',
    });
  }

  public registerVoiceCommand(command: VoiceCommand): void {
    this.voiceCommands.set(command.command.toLowerCase(), command);
  }

  public executeVoiceCommand(commandText: string): boolean {
    const command = this.voiceCommands.get(commandText.toLowerCase());
    if (command) {
      command.action();
      this.announceForAccessibility({
        message: `Executed: ${command.description}`,
        priority: 'medium',
      });
      return true;
    }
    return false;
  }

  public getVoiceCommands(category?: string): VoiceCommand[] {
    const commands = Array.from(this.voiceCommands.values());
    return category
      ? commands.filter((cmd) => cmd.category === category)
      : commands;
  }

  public isScreenReaderEnabled(): boolean {
    return this.settings.screenReader;
  }

  public isReducedMotionEnabled(): boolean {
    return this.settings.reducedMotion;
  }

  public isHighContrastEnabled(): boolean {
    return this.settings.highContrast;
  }

  public getFontSize(): string {
    return this.settings.fontSize;
  }

  public getTouchTargetSize(): string {
    return this.settings.touchTargetSize;
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
