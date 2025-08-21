import { Platform } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';

export interface SiriShortcut {
  id: string;
  title: string;
  subtitle?: string;
  phrase: string;
  action: string;
  parameters?: Record<string, any>;
}

export class SiriShortcutsService {
  private static instance: SiriShortcutsService;
  private shortcuts: SiriShortcut[] = [];

  static getInstance(): SiriShortcutsService {
    if (!SiriShortcutsService.instance) {
      SiriShortcutsService.instance = new SiriShortcutsService();
    }
    return SiriShortcutsService.instance;
  }

  async initialize(): Promise<void> {
    if (Platform.OS !== 'ios') {
      return;
    }

    // Define default shortcuts
    this.shortcuts = [
      {
        id: 'start-recording',
        title: 'Start GPS Recording',
        subtitle: 'Begin recording a new GPS track',
        phrase: 'Start recording GPS',
        action: 'START_RECORDING',
      },
      {
        id: 'stop-recording',
        title: 'Stop GPS Recording',
        subtitle: 'Stop the current GPS recording',
        phrase: 'Stop recording GPS',
        action: 'STOP_RECORDING',
      },
      {
        id: 'open-map',
        title: 'Open Map',
        subtitle: 'Open the map view',
        phrase: 'Open GPX map',
        action: 'OPEN_MAP',
      },
      {
        id: 'import-file',
        title: 'Import GPX File',
        subtitle: 'Import a new GPX file',
        phrase: 'Import GPX file',
        action: 'IMPORT_FILE',
      },
    ];

    await this.registerShortcuts();
  }

  private async registerShortcuts(): Promise<void> {
    if (Platform.OS !== 'ios') {
      return;
    }

    try {
      // Note: In a real implementation, you would use a native iOS module
      // or a library like react-native-siri-shortcut to register shortcuts
      // This is a placeholder implementation
      console.log('Registering Siri shortcuts:', this.shortcuts);

      // For now, we'll simulate the registration
      for (const shortcut of this.shortcuts) {
        await this.registerSingleShortcut(shortcut);
      }
    } catch (error) {
      console.error('Failed to register Siri shortcuts:', error);
    }
  }

  private async registerSingleShortcut(shortcut: SiriShortcut): Promise<void> {
    // Placeholder for actual Siri shortcut registration
    // In a real implementation, this would use native iOS APIs
    console.log(
      `Registering shortcut: ${shortcut.title} - "${shortcut.phrase}"`
    );
  }

  async handleShortcutAction(
    action: string,
    parameters?: Record<string, any>
  ): Promise<void> {
    console.log('Handling Siri shortcut action:', action, parameters);

    switch (action) {
      case 'START_RECORDING':
        await this.handleStartRecording();
        break;
      case 'STOP_RECORDING':
        await this.handleStopRecording();
        break;
      case 'OPEN_MAP':
        await this.handleOpenMap();
        break;
      case 'IMPORT_FILE':
        await this.handleImportFile();
        break;
      default:
        console.warn('Unknown shortcut action:', action);
    }
  }

  private async handleStartRecording(): Promise<void> {
    // Integration with recording service
    try {
      // This would integrate with the existing TrackRecordingService
      console.log('Starting GPS recording via Siri shortcut');
      // await TrackRecordingService.getInstance().startRecording();
    } catch (error) {
      console.error('Failed to start recording via Siri:', error);
    }
  }

  private async handleStopRecording(): Promise<void> {
    try {
      console.log('Stopping GPS recording via Siri shortcut');
      // await TrackRecordingService.getInstance().stopRecording();
    } catch (error) {
      console.error('Failed to stop recording via Siri:', error);
    }
  }

  private async handleOpenMap(): Promise<void> {
    try {
      console.log('Opening map via Siri shortcut');
      // Navigation logic would go here
    } catch (error) {
      console.error('Failed to open map via Siri:', error);
    }
  }

  private async handleImportFile(): Promise<void> {
    try {
      console.log('Opening file import via Siri shortcut');
      // File import logic would go here
    } catch (error) {
      console.error('Failed to open file import via Siri:', error);
    }
  }

  async addCustomShortcut(shortcut: SiriShortcut): Promise<boolean> {
    if (Platform.OS !== 'ios') {
      return false;
    }

    try {
      await this.registerSingleShortcut(shortcut);
      this.shortcuts.push(shortcut);
      return true;
    } catch (error) {
      console.error('Failed to add custom shortcut:', error);
      return false;
    }
  }

  getAvailableShortcuts(): SiriShortcut[] {
    return [...this.shortcuts];
  }

  async removeShortcut(shortcutId: string): Promise<boolean> {
    if (Platform.OS !== 'ios') {
      return false;
    }

    try {
      this.shortcuts = this.shortcuts.filter((s) => s.id !== shortcutId);
      // In a real implementation, you would also unregister from iOS
      return true;
    } catch (error) {
      console.error('Failed to remove shortcut:', error);
      return false;
    }
  }
}
