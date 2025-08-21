import { Platform } from 'react-native';

export interface WidgetData {
  isRecording: boolean;
  currentDistance: number;
  currentTime: number;
  currentSpeed: number;
  trackName?: string;
}

export interface WidgetConfig {
  showDistance: boolean;
  showTime: boolean;
  showSpeed: boolean;
  updateInterval: number; // milliseconds
  theme: 'light' | 'dark' | 'auto';
}

export class WidgetService {
  private static instance: WidgetService;
  private widgetData: WidgetData = {
    isRecording: false,
    currentDistance: 0,
    currentTime: 0,
    currentSpeed: 0,
  };
  private config: WidgetConfig = {
    showDistance: true,
    showTime: true,
    showSpeed: true,
    updateInterval: 5000,
    theme: 'auto',
  };
  private updateInterval?: NodeJS.Timeout;

  static getInstance(): WidgetService {
    if (!WidgetService.instance) {
      WidgetService.instance = new WidgetService();
    }
    return WidgetService.instance;
  }

  async initialize(): Promise<void> {
    if (Platform.OS !== 'android') {
      return;
    }

    console.log('Initializing Android widget service');
    await this.setupWidget();
  }

  private async setupWidget(): Promise<void> {
    // In a real implementation, this would communicate with a native Android widget
    // through a bridge or native module
    console.log('Setting up Android home screen widget');

    // Start periodic updates
    this.startPeriodicUpdates();
  }

  private startPeriodicUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.updateInterval = setInterval(() => {
      this.updateWidgetSync(); // Use sync version for testing
    }, this.config.updateInterval);
  }

  private async updateWidget(): Promise<void> {
    if (Platform.OS !== 'android') {
      return;
    }

    try {
      // Send data to native Android widget
      await this.sendDataToNativeWidget(this.widgetData);
    } catch (error) {
      console.error('Failed to update widget:', error);
    }
  }

  // Synchronous update for testing
  private updateWidgetSync(): void {
    console.log('Updating widget with data:', this.widgetData);
  }

  private async sendDataToNativeWidget(data: WidgetData): Promise<void> {
    // Placeholder for native bridge communication
    // In a real implementation, this would use a native module
    console.log('Updating widget with data:', data);
  }

  updateRecordingState(isRecording: boolean, trackName?: string): void {
    this.widgetData.isRecording = isRecording;
    this.widgetData.trackName = trackName;
    this.updateWidgetSync();
  }

  updateTrackingData(distance: number, time: number, speed: number): void {
    this.widgetData.currentDistance = distance;
    this.widgetData.currentTime = time;
    this.widgetData.currentSpeed = speed;
    this.updateWidgetSync();
  }

  updateConfig(newConfig: Partial<WidgetConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Restart updates if interval changed
    if (newConfig.updateInterval) {
      this.startPeriodicUpdates();
    }

    this.updateWidgetSync();
  }

  getConfig(): WidgetConfig {
    return { ...this.config };
  }

  async handleWidgetAction(action: string): Promise<void> {
    console.log('Handling widget action:', action);

    switch (action) {
      case 'START_RECORDING':
        await this.handleStartRecording();
        break;
      case 'STOP_RECORDING':
        await this.handleStopRecording();
        break;
      case 'PAUSE_RECORDING':
        await this.handlePauseRecording();
        break;
      case 'OPEN_APP':
        await this.handleOpenApp();
        break;
      default:
        console.warn('Unknown widget action:', action);
    }
  }

  private async handleStartRecording(): Promise<void> {
    try {
      console.log('Starting recording from widget');
      // Integration with recording service
      // await TrackRecordingService.getInstance().startRecording();
    } catch (error) {
      console.error('Failed to start recording from widget:', error);
    }
  }

  private async handleStopRecording(): Promise<void> {
    try {
      console.log('Stopping recording from widget');
      // await TrackRecordingService.getInstance().stopRecording();
    } catch (error) {
      console.error('Failed to stop recording from widget:', error);
    }
  }

  private async handlePauseRecording(): Promise<void> {
    try {
      console.log('Pausing recording from widget');
      // await TrackRecordingService.getInstance().pauseRecording();
    } catch (error) {
      console.error('Failed to pause recording from widget:', error);
    }
  }

  private async handleOpenApp(): Promise<void> {
    try {
      console.log('Opening app from widget');
      // Deep link to app or bring to foreground
    } catch (error) {
      console.error('Failed to open app from widget:', error);
    }
  }

  destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = undefined;
    }
  }
}
