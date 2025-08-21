/**
 * Tests for AccessibilityService
 */

import { AccessibilityService } from '../../services/accessibility/AccessibilityService';
import { VoiceCommand } from '../../types/accessibility';

// Mock React Native AccessibilityInfo
jest.mock('react-native', () => ({
  AccessibilityInfo: {
    isScreenReaderEnabled: jest.fn(() => Promise.resolve(false)),
    isReduceMotionEnabled: jest.fn(() => Promise.resolve(false)),
    isReduceTransparencyEnabled: jest.fn(() => Promise.resolve(false)),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    announceForAccessibility: jest.fn(),
  },
}));

describe('AccessibilityService', () => {
  let service: AccessibilityService;

  beforeEach(() => {
    service = AccessibilityService.getInstance();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Settings Management', () => {
    it('should return default settings', () => {
      const settings = service.getSettings();

      expect(settings).toEqual({
        screenReader: false,
        highContrast: false,
        largeText: false,
        reducedMotion: false,
        voiceControl: false,
        hapticFeedback: true,
        fontSize: 'medium',
        touchTargetSize: 'standard',
      });
    });

    it('should update settings', () => {
      const newSettings = {
        screenReader: true,
        highContrast: true,
        fontSize: 'large' as const,
      };

      service.updateSettings(newSettings);
      const updatedSettings = service.getSettings();

      expect(updatedSettings.screenReader).toBe(true);
      expect(updatedSettings.highContrast).toBe(true);
      expect(updatedSettings.fontSize).toBe('large');
    });
  });

  describe('Voice Commands', () => {
    beforeEach(() => {
      // Clear any existing commands before each test
      const service = AccessibilityService.getInstance();
      // Reset the service state if needed
    });

    it('should register voice commands', () => {
      const command: VoiceCommand = {
        command: 'test command',
        action: jest.fn(),
        description: 'Test command',
        category: 'navigation',
      };

      service.registerVoiceCommand(command);
      const commands = service.getVoiceCommands();

      expect(commands).toContain(command);
    });

    it('should execute voice commands', () => {
      const mockAction = jest.fn();
      const command: VoiceCommand = {
        command: 'test command',
        action: mockAction,
        description: 'Test command',
        category: 'navigation',
      };

      service.registerVoiceCommand(command);
      const result = service.executeVoiceCommand('test command');

      expect(result).toBe(true);
      expect(mockAction).toHaveBeenCalled();
    });

    it('should return false for unknown commands', () => {
      const result = service.executeVoiceCommand('unknown command');
      expect(result).toBe(false);
    });

    it('should filter commands by category', () => {
      // Create a fresh service instance for this test
      const testService = AccessibilityService.getInstance();

      const navCommand: VoiceCommand = {
        command: 'unique nav command',
        action: jest.fn(),
        description: 'Navigation command',
        category: 'navigation',
      };

      const mapCommand: VoiceCommand = {
        command: 'unique map command',
        action: jest.fn(),
        description: 'Map command',
        category: 'map',
      };

      testService.registerVoiceCommand(navCommand);
      testService.registerVoiceCommand(mapCommand);

      const navCommands = testService.getVoiceCommands('navigation');
      const mapCommands = testService.getVoiceCommands('map');

      expect(
        navCommands.filter((cmd) => cmd.command === 'unique nav command')
      ).toHaveLength(1);
      expect(
        mapCommands.filter((cmd) => cmd.command === 'unique map command')
      ).toHaveLength(1);
    });
  });

  describe('Announcements', () => {
    it('should announce for accessibility when screen reader is enabled', () => {
      const { AccessibilityInfo } = require('react-native');

      service.updateSettings({ screenReader: true });
      service.announceForAccessibility({
        message: 'Test announcement',
        priority: 'medium',
      });

      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
        'Test announcement'
      );
    });

    it('should not announce when screen reader is disabled', () => {
      const { AccessibilityInfo } = require('react-native');

      service.updateSettings({ screenReader: false });
      service.announceForAccessibility({
        message: 'Test announcement',
        priority: 'medium',
      });

      expect(AccessibilityInfo.announceForAccessibility).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility State', () => {
    it('should return screen reader state', () => {
      service.updateSettings({ screenReader: true });
      expect(service.isScreenReaderEnabled()).toBe(true);

      service.updateSettings({ screenReader: false });
      expect(service.isScreenReaderEnabled()).toBe(false);
    });

    it('should return reduced motion state', () => {
      service.updateSettings({ reducedMotion: true });
      expect(service.isReducedMotionEnabled()).toBe(true);

      service.updateSettings({ reducedMotion: false });
      expect(service.isReducedMotionEnabled()).toBe(false);
    });

    it('should return high contrast state', () => {
      service.updateSettings({ highContrast: true });
      expect(service.isHighContrastEnabled()).toBe(true);

      service.updateSettings({ highContrast: false });
      expect(service.isHighContrastEnabled()).toBe(false);
    });

    it('should return font size', () => {
      service.updateSettings({ fontSize: 'large' });
      expect(service.getFontSize()).toBe('large');
    });

    it('should return touch target size', () => {
      service.updateSettings({ touchTargetSize: 'large' });
      expect(service.getTouchTargetSize()).toBe('large');
    });
  });
});
