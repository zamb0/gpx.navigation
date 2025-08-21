import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

export interface NotificationAction {
  id: string;
  title: string;
  icon?: string;
}

export interface RecordingNotificationData {
  isRecording: boolean;
  isPaused: boolean;
  distance: number;
  time: number;
  speed: number;
  trackName?: string;
}

export class NotificationService {
  private static instance: NotificationService;
  private recordingNotificationId?: string;
  private isInitialized = false;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async initialize(): Promise<void> {
    if (Platform.OS !== 'android' || this.isInitialized) {
      return;
    }

    try {
      // Request notification permissions
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Notification permissions not granted');
        return;
      }

      // Configure notification behavior
      await Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: false,
          shouldSetBadge: false,
        }),
      });

      // Set up notification categories with actions
      await this.setupNotificationCategories();

      this.isInitialized = true;
      console.log('Android notification service initialized');
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
    }
  }

  private async setupNotificationCategories(): Promise<void> {
    // Recording notification category with actions
    await Notifications.setNotificationCategoryAsync('recording', [
      {
        identifier: 'PAUSE_RECORDING',
        buttonTitle: 'Pause',
        options: {
          opensAppToForeground: false,
        },
      },
      {
        identifier: 'STOP_RECORDING',
        buttonTitle: 'Stop',
        options: {
          opensAppToForeground: false,
        },
      },
    ]);

    // Paused recording notification category
    await Notifications.setNotificationCategoryAsync('recording_paused', [
      {
        identifier: 'RESUME_RECORDING',
        buttonTitle: 'Resume',
        options: {
          opensAppToForeground: false,
        },
      },
      {
        identifier: 'STOP_RECORDING',
        buttonTitle: 'Stop',
        options: {
          opensAppToForeground: false,
        },
      },
    ]);
  }

  async showRecordingNotification(
    data: RecordingNotificationData
  ): Promise<void> {
    if (Platform.OS !== 'android' || !this.isInitialized) {
      return;
    }

    try {
      const title = data.isPaused
        ? 'GPS Recording Paused'
        : 'Recording GPS Track';
      const body = this.formatRecordingBody(data);
      const categoryId = data.isPaused ? 'recording_paused' : 'recording';

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          categoryIdentifier: categoryId,
          data: {
            type: 'recording',
            ...data,
          },
          sticky: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null, // Show immediately
      });

      // Cancel previous recording notification if exists
      if (this.recordingNotificationId) {
        await Notifications.dismissNotificationAsync(
          this.recordingNotificationId
        );
      }

      this.recordingNotificationId = notificationId;
    } catch (error) {
      console.error('Failed to show recording notification:', error);
    }
  }

  private formatRecordingBody(data: RecordingNotificationData): string {
    const distance = (data.distance / 1000).toFixed(2);
    const time = this.formatTime(data.time);
    const speed = data.speed.toFixed(1);

    let body = `${distance} km • ${time}`;
    if (data.speed > 0) {
      body += ` • ${speed} km/h`;
    }

    if (data.trackName) {
      body = `${data.trackName}\n${body}`;
    }

    return body;
  }

  private formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  async hideRecordingNotification(): Promise<void> {
    if (this.recordingNotificationId) {
      await Notifications.dismissNotificationAsync(
        this.recordingNotificationId
      );
      this.recordingNotificationId = undefined;
    }
  }

  async showGeneralNotification(
    title: string,
    body: string,
    data?: Record<string, any>
  ): Promise<string> {
    if (Platform.OS !== 'android' || !this.isInitialized) {
      return '';
    }

    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
        },
        trigger: null,
      });

      return notificationId;
    } catch (error) {
      console.error('Failed to show notification:', error);
      return '';
    }
  }

  async handleNotificationAction(
    actionId: string,
    notificationData: any
  ): Promise<void> {
    console.log('Handling notification action:', actionId, notificationData);

    switch (actionId) {
      case 'PAUSE_RECORDING':
        await this.handlePauseRecording();
        break;
      case 'RESUME_RECORDING':
        await this.handleResumeRecording();
        break;
      case 'STOP_RECORDING':
        await this.handleStopRecording();
        break;
      default:
        console.warn('Unknown notification action:', actionId);
    }
  }

  private async handlePauseRecording(): Promise<void> {
    try {
      console.log('Pausing recording from notification');
      // Integration with recording service
      // await TrackRecordingService.getInstance().pauseRecording();
    } catch (error) {
      console.error('Failed to pause recording from notification:', error);
    }
  }

  private async handleResumeRecording(): Promise<void> {
    try {
      console.log('Resuming recording from notification');
      // await TrackRecordingService.getInstance().resumeRecording();
    } catch (error) {
      console.error('Failed to resume recording from notification:', error);
    }
  }

  private async handleStopRecording(): Promise<void> {
    try {
      console.log('Stopping recording from notification');
      // await TrackRecordingService.getInstance().stopRecording();
      await this.hideRecordingNotification();
    } catch (error) {
      console.error('Failed to stop recording from notification:', error);
    }
  }

  async clearAllNotifications(): Promise<void> {
    await Notifications.dismissAllNotificationsAsync();
    this.recordingNotificationId = undefined;
  }
}
