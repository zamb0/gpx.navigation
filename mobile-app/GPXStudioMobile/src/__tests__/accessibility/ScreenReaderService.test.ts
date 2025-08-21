/**
 * Tests for ScreenReaderService
 */

import { ScreenReaderService } from '../../services/accessibility/ScreenReaderService';

// Mock React Native AccessibilityInfo
jest.mock('react-native', () => ({
  AccessibilityInfo: {
    isScreenReaderEnabled: jest.fn(() => Promise.resolve(true)),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    announceForAccessibility: jest.fn(),
  },
}));

describe('ScreenReaderService', () => {
  let service: ScreenReaderService;

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();

    service = ScreenReaderService.getInstance();

    // Manually set the service to enabled state for testing
    (service as any).isEnabled = true;

    // Ensure the service is initialized with screen reader enabled
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Announcements', () => {
    it('should announce high priority messages immediately', () => {
      const { AccessibilityInfo } = require('react-native');

      service.announce({
        message: 'High priority message',
        priority: 'high',
      });

      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
        'High priority message'
      );
    });

    it('should announce interrupt messages immediately', () => {
      const { AccessibilityInfo } = require('react-native');

      service.announce({
        message: 'Interrupt message',
        priority: 'medium',
        interrupt: true,
      });

      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
        'Interrupt message'
      );
    });

    it('should queue low priority messages', async () => {
      const { AccessibilityInfo } = require('react-native');

      service.announce({
        message: 'Low priority message',
        priority: 'low',
      });

      // Wait for queue processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
        'Low priority message'
      );
    });
  });

  describe('Accessibility Labels', () => {
    it('should create basic accessibility label', () => {
      const label = service.createAccessibilityLabel({
        label: 'Test button',
      });

      expect(label).toEqual({
        accessible: true,
        accessibilityLabel: 'Test button',
      });
    });

    it('should create accessibility label with hint', () => {
      const label = service.createAccessibilityLabel({
        label: 'Test button',
        hint: 'Tap to perform action',
      });

      expect(label).toEqual({
        accessible: true,
        accessibilityLabel: 'Test button',
        accessibilityHint: 'Tap to perform action',
      });
    });

    it('should create accessibility label with role', () => {
      const label = service.createAccessibilityLabel({
        label: 'Test button',
        role: 'button',
      });

      expect(label).toEqual({
        accessible: true,
        accessibilityLabel: 'Test button',
        accessibilityRole: 'button',
      });
    });

    it('should create accessibility label with state', () => {
      const label = service.createAccessibilityLabel({
        label: 'Test button',
        state: 'selected',
      });

      expect(label).toEqual({
        accessible: true,
        accessibilityLabel: 'Test button',
        accessibilityState: { selected: true },
      });
    });

    it('should create accessibility label with value', () => {
      const label = service.createAccessibilityLabel({
        label: 'Progress',
        value: '50%',
      });

      expect(label).toEqual({
        accessible: true,
        accessibilityLabel: 'Progress',
        accessibilityValue: { text: '50%' },
      });
    });
  });

  describe('Specialized Announcements', () => {
    it('should announce map updates', () => {
      const { AccessibilityInfo } = require('react-native');
      AccessibilityInfo.announceForAccessibility.mockClear();

      service.announceMapUpdate(3, 5);

      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
        'Map updated. 3 tracks and 5 waypoints displayed.'
      );
    });

    it('should announce recording start', () => {
      const { AccessibilityInfo } = require('react-native');

      service.announceRecordingStatus(true);

      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
        'Recording started. GPS tracking is now active.'
      );
    });

    it('should announce recording stop with stats', () => {
      const { AccessibilityInfo } = require('react-native');

      service.announceRecordingStatus(false, { distance: 5.2, time: 1800 });

      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
        'Recording stopped. Total distance: 5.2 kilometers, Duration: 30 minutes.'
      );
    });

    it('should announce navigation updates', () => {
      const { AccessibilityInfo } = require('react-native');
      AccessibilityInfo.announceForAccessibility.mockClear();

      service.announceNavigationUpdate(150, 'northeast');

      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
        '150 meters to track, heading northeast'
      );
    });

    it('should announce successful file operations', () => {
      const { AccessibilityInfo } = require('react-native');
      AccessibilityInfo.announceForAccessibility.mockClear();

      service.announceFileOperation('Import', 'test.gpx', true);

      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
        'Import successful: test.gpx'
      );
    });

    it('should announce failed file operations', () => {
      const { AccessibilityInfo } = require('react-native');

      service.announceFileOperation('Export', 'test.gpx', false);

      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
        'Export failed: test.gpx'
      );
    });
  });
});
