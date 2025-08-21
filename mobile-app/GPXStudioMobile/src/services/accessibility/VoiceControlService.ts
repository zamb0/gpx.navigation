/**
 * Voice control service for handling voice commands and speech recognition
 */

import { VoiceCommand } from '../../types/accessibility';
import { AccessibilityService } from './AccessibilityService';

export class VoiceControlService {
  private static instance: VoiceControlService;
  private isListening: boolean = false;
  private commands: Map<string, VoiceCommand> = new Map();
  private accessibilityService: AccessibilityService;

  private constructor() {
    this.accessibilityService = AccessibilityService.getInstance();
    this.initializeDefaultCommands();
  }

  public static getInstance(): VoiceControlService {
    if (!VoiceControlService.instance) {
      VoiceControlService.instance = new VoiceControlService();
    }
    return VoiceControlService.instance;
  }

  private initializeDefaultCommands(): void {
    // Navigation commands
    this.registerCommand({
      command: 'go to map',
      action: () => this.navigateToTab('map'),
      description: 'Navigate to map screen',
      category: 'navigation',
    });

    this.registerCommand({
      command: 'go to files',
      action: () => this.navigateToTab('files'),
      description: 'Navigate to files screen',
      category: 'navigation',
    });

    this.registerCommand({
      command: 'go to record',
      action: () => this.navigateToTab('record'),
      description: 'Navigate to record screen',
      category: 'navigation',
    });

    this.registerCommand({
      command: 'go to settings',
      action: () => this.navigateToTab('settings'),
      description: 'Navigate to settings screen',
      category: 'navigation',
    });

    // Recording commands
    this.registerCommand({
      command: 'start recording',
      action: () => this.executeRecordingAction('start'),
      description: 'Start GPS track recording',
      category: 'recording',
    });

    this.registerCommand({
      command: 'stop recording',
      action: () => this.executeRecordingAction('stop'),
      description: 'Stop GPS track recording',
      category: 'recording',
    });

    this.registerCommand({
      command: 'pause recording',
      action: () => this.executeRecordingAction('pause'),
      description: 'Pause GPS track recording',
      category: 'recording',
    });

    // Map commands
    this.registerCommand({
      command: 'center map',
      action: () => this.executeMapAction('center'),
      description: 'Center map on current location',
      category: 'map',
    });

    this.registerCommand({
      command: 'zoom in',
      action: () => this.executeMapAction('zoomIn'),
      description: 'Zoom in on map',
      category: 'map',
    });

    this.registerCommand({
      command: 'zoom out',
      action: () => this.executeMapAction('zoomOut'),
      description: 'Zoom out on map',
      category: 'map',
    });

    // File commands
    this.registerCommand({
      command: 'import file',
      action: () => this.executeFileAction('import'),
      description: 'Import GPX file',
      category: 'files',
    });

    this.registerCommand({
      command: 'refresh files',
      action: () => this.executeFileAction('refresh'),
      description: 'Refresh file list',
      category: 'files',
    });
  }

  public registerCommand(command: VoiceCommand): void {
    this.commands.set(command.command.toLowerCase(), command);
    this.accessibilityService.registerVoiceCommand(command);
  }

  public executeCommand(commandText: string): boolean {
    const normalizedCommand = commandText.toLowerCase().trim();
    const command = this.commands.get(normalizedCommand);

    if (command) {
      try {
        command.action();
        this.accessibilityService.announceForAccessibility({
          message: `Executed: ${command.description}`,
          priority: 'medium',
        });
        return true;
      } catch (error) {
        console.error('Error executing voice command:', error);
        this.accessibilityService.announceForAccessibility({
          message: 'Command failed to execute',
          priority: 'high',
        });
        return false;
      }
    }

    // Try partial matching for more flexible voice recognition
    const partialMatch = this.findPartialMatch(normalizedCommand);
    if (partialMatch) {
      return this.executeCommand(partialMatch.command);
    }

    this.accessibilityService.announceForAccessibility({
      message: 'Command not recognized. Say "help" for available commands.',
      priority: 'medium',
    });
    return false;
  }

  private findPartialMatch(input: string): VoiceCommand | null {
    const words = input.split(' ');

    for (const [commandText, command] of this.commands) {
      const commandWords = commandText.split(' ');
      const matchCount = words.filter((word) =>
        commandWords.includes(word)
      ).length;

      // If more than half the words match, consider it a partial match
      if (matchCount > commandWords.length / 2) {
        return command;
      }
    }

    return null;
  }

  public getAvailableCommands(category?: string): VoiceCommand[] {
    const allCommands = Array.from(this.commands.values());
    return category
      ? allCommands.filter((cmd) => cmd.category === category)
      : allCommands;
  }

  public startListening(): void {
    if (this.isListening) return;

    this.isListening = true;
    this.accessibilityService.announceForAccessibility({
      message: 'Voice control activated. Listening for commands.',
      priority: 'medium',
    });
  }

  public stopListening(): void {
    if (!this.isListening) return;

    this.isListening = false;
    this.accessibilityService.announceForAccessibility({
      message: 'Voice control deactivated.',
      priority: 'medium',
    });
  }

  public isVoiceControlActive(): boolean {
    return this.isListening;
  }

  // Navigation action handlers
  private navigateToTab(tabName: string): void {
    // This would integrate with the navigation system
    console.log(`Navigating to ${tabName} tab`);
  }

  private executeRecordingAction(action: string): void {
    // This would integrate with the recording service
    console.log(`Executing recording action: ${action}`);
  }

  private executeMapAction(action: string): void {
    // This would integrate with the map service
    console.log(`Executing map action: ${action}`);
  }

  private executeFileAction(action: string): void {
    // This would integrate with the file service
    console.log(`Executing file action: ${action}`);
  }
}
