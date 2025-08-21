import { Platform } from 'react-native';
import { BackgroundLocationService } from './ios/BackgroundLocationService';
import { SiriShortcutsService } from './ios/SiriShortcutsService';
import { WidgetService } from './android/WidgetService';
import { NotificationService } from './android/NotificationService';
import { PlatformPermissionService } from './PlatformPermissionService';
import { PlatformOptimizer } from './PlatformOptimizer';

export interface PlatformFeatures {
  backgroundLocation: boolean;
  shortcuts: boolean;
  widgets: boolean;
  notifications: boolean;
  voiceControl: boolean;
  hapticFeedback: boolean;
}

export interface PermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
  expires: string;
}

export interface PermissionRequest {
  type: string;
  rationale?: string;
}

export interface PlatformOptimizations {
  batteryOptimization: boolean;
  backgroundProcessing: boolean;
  memoryManagement: boolean;
}

export interface PerformanceMetrics {
  cpuUsage: number;
  memoryUsage: number;
  batteryLevel: number;
}

export class PlatformService {
  private static instance: PlatformService;
  private backgroundLocationService?: BackgroundLocationService;
  private siriShortcutsService?: SiriShortcutsService;
  private widgetService?: WidgetService;
  private notificationService?: NotificationService;
  private permissionService: PlatformPermissionService;
  private optimizer: PlatformOptimizer;
  private features: PlatformFeatures;

  static getInstance(): PlatformService {
    if (!PlatformService.instance) {
      PlatformService.instance = new PlatformService();
    }
    return PlatformService.instance;
  }

  constructor() {
    this.permissionService = PlatformPermissionService.getInstance();
    this.optimizer = PlatformOptimizer.getInstance();
    this.features = this.detectPlatformFeatures();
  }

  async initialize(): Promise<void> {
    console.log('Initializing platform service for', Platform.OS);

    // Initialize platform optimizer
    await this.optimizer.initialize();

    // Initialize platform-specific services
    if (Platform.OS === 'ios') {
      await this.initializeIOSServices();
    } else if (Platform.OS === 'android') {
      await this.initializeAndroidServices();
    }

    console.log('Platform service initialized with features:', this.features);
  }

  private async initializeIOSServices(): Promise<void> {
    try {
      // Initialize background location service
      this.backgroundLocationService = BackgroundLocationService.getInstance();
      await this.backgroundLocationService.initialize();

      // Initialize Siri shortcuts service
      this.siriShortcutsService = SiriShortcutsService.getInstance();
      await this.siriShortcutsService.initialize();

      console.log('iOS services initialized successfully');
    } catch (error) {
      console.error('Failed to initialize iOS services:', error);
    }
  }

  private async initializeAndroidServices(): Promise<void> {
    try {
      // Initialize widget service
      this.widgetService = WidgetService.getInstance();
      await this.widgetService.initialize();

      // Initialize notification service
      this.notificationService = NotificationService.getInstance();
      await this.notificationService.initialize();

      console.log('Android services initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Android services:', error);
    }
  }

  private detectPlatformFeatures(): PlatformFeatures {
    const isIOS = Platform.OS === 'ios';
    const isAndroid = Platform.OS === 'android';

    return {
      backgroundLocation: true, // Available on both platforms
      shortcuts: isIOS,
      widgets: isAndroid,
      notifications: true, // Available on both platforms
      voiceControl: isIOS,
      hapticFeedback: true, // Available on both platforms
    };
  }

  // Background Location Methods
  async startBackgroundTracking(): Promise<boolean> {
    if (!this.features.backgroundLocation) {
      return false;
    }

    // Request permissions first
    const locationPermission = await this.permissionService.requestPermission({
      type: 'location_background',
      rationale:
        'Background location is needed to continue recording GPS tracks when the app is not active.',
    });

    if (!locationPermission.granted) {
      return false;
    }

    if (Platform.OS === 'ios' && this.backgroundLocationService) {
      return await this.backgroundLocationService.startBackgroundTracking();
    }

    // Android background tracking would be handled differently
    return false;
  }

  async stopBackgroundTracking(): Promise<void> {
    if (Platform.OS === 'ios' && this.backgroundLocationService) {
      await this.backgroundLocationService.stopBackgroundTracking();
    }
  }

  // Shortcuts Methods (iOS)
  async handleShortcutAction(
    action: string,
    parameters?: Record<string, any>
  ): Promise<void> {
    if (Platform.OS === 'ios' && this.siriShortcutsService) {
      await this.siriShortcutsService.handleShortcutAction(action, parameters);
    }
  }

  async addCustomShortcut(shortcut: any): Promise<boolean> {
    if (Platform.OS === 'ios' && this.siriShortcutsService) {
      return await this.siriShortcutsService.addCustomShortcut(shortcut);
    }
    return false;
  }

  // Widget Methods (Android)
  updateWidgetRecordingState(isRecording: boolean, trackName?: string): void {
    if (Platform.OS === 'android' && this.widgetService) {
      this.widgetService.updateRecordingState(isRecording, trackName);
    }
  }

  updateWidgetTrackingData(
    distance: number,
    time: number,
    speed: number
  ): void {
    if (Platform.OS === 'android' && this.widgetService) {
      this.widgetService.updateTrackingData(distance, time, speed);
    }
  }

  async handleWidgetAction(action: string): Promise<void> {
    if (Platform.OS === 'android' && this.widgetService) {
      await this.widgetService.handleWidgetAction(action);
    }
  }

  // Notification Methods
  async showRecordingNotification(data: any): Promise<void> {
    if (Platform.OS === 'android' && this.notificationService) {
      await this.notificationService.showRecordingNotification(data);
    }
  }

  async hideRecordingNotification(): Promise<void> {
    if (Platform.OS === 'android' && this.notificationService) {
      await this.notificationService.hideRecordingNotification();
    }
  }

  async handleNotificationAction(actionId: string, data: any): Promise<void> {
    if (Platform.OS === 'android' && this.notificationService) {
      await this.notificationService.handleNotificationAction(actionId, data);
    }
  }

  // Permission Methods
  async requestPermissions(types: string[]): Promise<Record<string, any>> {
    const requests = types.map((type) => ({ type: type as any }));
    return await this.permissionService.requestMultiplePermissions(requests);
  }

  async checkPermissionStatus(type: string): Promise<any> {
    return await this.permissionService.checkPermissionStatus(type as any);
  }

  // Performance Methods
  async optimizeForTask(
    taskType: 'recording' | 'navigation' | 'editing' | 'idle'
  ): Promise<void> {
    await this.optimizer.optimizeForTask(taskType);
  }

  getPerformanceMetrics(): any {
    return this.optimizer.getPerformanceMetrics();
  }

  updateOptimizations(optimizations: any): void {
    this.optimizer.updateOptimizations(optimizations);
  }

  // Feature Detection
  getAvailableFeatures(): PlatformFeatures {
    return { ...this.features };
  }

  isFeatureAvailable(feature: keyof PlatformFeatures): boolean {
    return this.features[feature];
  }

  // Platform Information
  getPlatformInfo(): {
    os: string;
    version: string;
    features: PlatformFeatures;
  } {
    return {
      os: Platform.OS,
      version: Platform.Version.toString(),
      features: this.features,
    };
  }

  // Cleanup
  destroy(): void {
    this.optimizer.destroy();

    if (Platform.OS === 'android' && this.widgetService) {
      this.widgetService.destroy();
    }
  }
}
