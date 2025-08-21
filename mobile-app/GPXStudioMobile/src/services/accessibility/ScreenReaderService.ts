/**
 * Screen reader service for managing screen reader support and announcements
 */

import { AccessibilityInfo } from 'react-native';
import {
  AccessibilityLabel,
  AccessibilityAnnouncement,
} from '../../types/accessibility';

export class ScreenReaderService {
  private static instance: ScreenReaderService;
  private isEnabled: boolean = false;
  private announcementQueue: AccessibilityAnnouncement[] = [];
  private isProcessingQueue: boolean = false;
  private screenReaderSubscription: any;

  private constructor() {
    this.initializeScreenReader();
  }

  public static getInstance(): ScreenReaderService {
    if (!ScreenReaderService.instance) {
      ScreenReaderService.instance = new ScreenReaderService();
    }
    return ScreenReaderService.instance;
  }

  private async initializeScreenReader(): Promise<void> {
    try {
      this.isEnabled = await AccessibilityInfo.isScreenReaderEnabled();
      this.screenReaderSubscription = AccessibilityInfo.addEventListener(
        'screenReaderChanged',
        this.handleScreenReaderChange
      );
    } catch (error) {
      console.error('Failed to initialize screen reader:', error);
    }
  }

  private handleScreenReaderChange = (enabled: boolean): void => {
    this.isEnabled = enabled;
    if (enabled) {
      this.announce({
        message:
          'Screen reader enabled. GPX Studio Mobile is ready for accessibility.',
        priority: 'high',
      });
    }
  };

  public announce(announcement: AccessibilityAnnouncement): void {
    if (!this.isEnabled) return;

    if (announcement.interrupt || announcement.priority === 'high') {
      AccessibilityInfo.announceForAccessibility(announcement.message);
    } else {
      this.announcementQueue.push(announcement);
      this.processAnnouncementQueue();
    }
  }

  private async processAnnouncementQueue(): Promise<void> {
    if (this.isProcessingQueue || this.announcementQueue.length === 0) return;

    this.isProcessingQueue = true;

    while (this.announcementQueue.length > 0) {
      const announcement = this.announcementQueue.shift();
      if (announcement) {
        AccessibilityInfo.announceForAccessibility(announcement.message);
        // Wait between announcements to avoid overwhelming the user
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    this.isProcessingQueue = false;
  }

  public createAccessibilityLabel(label: AccessibilityLabel): any {
    const accessibilityProps: any = {
      accessible: true,
      accessibilityLabel: label.label,
    };

    if (label.hint) {
      accessibilityProps.accessibilityHint = label.hint;
    }

    if (label.role) {
      accessibilityProps.accessibilityRole = label.role;
    }

    if (label.state) {
      accessibilityProps.accessibilityState = { [label.state]: true };
    }

    if (label.value) {
      accessibilityProps.accessibilityValue = { text: label.value };
    }

    return accessibilityProps;
  }

  public announceMapUpdate(trackCount: number, waypointCount: number): void {
    this.announce({
      message: `Map updated. ${trackCount} tracks and ${waypointCount} waypoints displayed.`,
      priority: 'medium',
    });
  }

  public announceRecordingStatus(
    isRecording: boolean,
    stats?: { distance: number; time: number }
  ): void {
    if (isRecording) {
      this.announce({
        message: 'Recording started. GPS tracking is now active.',
        priority: 'high',
      });
    } else if (stats) {
      this.announce({
        message: `Recording stopped. Total distance: ${stats.distance.toFixed(1)} kilometers, Duration: ${Math.floor(stats.time / 60)} minutes.`,
        priority: 'high',
      });
    }
  }

  public announceNavigationUpdate(distance: number, bearing: string): void {
    this.announce({
      message: `${distance.toFixed(0)} meters to track, heading ${bearing}`,
      priority: 'low',
    });
  }

  public announceFileOperation(
    operation: string,
    filename: string,
    success: boolean
  ): void {
    const message = success
      ? `${operation} successful: ${filename}`
      : `${operation} failed: ${filename}`;

    this.announce({
      message,
      priority: success ? 'medium' : 'high',
    });
  }

  public isScreenReaderEnabled(): boolean {
    return this.isEnabled;
  }

  public cleanup(): void {
    if (
      this.screenReaderSubscription &&
      typeof this.screenReaderSubscription.remove === 'function'
    ) {
      this.screenReaderSubscription.remove();
    }
  }
}
