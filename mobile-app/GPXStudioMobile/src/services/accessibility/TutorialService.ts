/**
 * Tutorial service for providing contextual help and onboarding
 */

import { TutorialStep } from '../../types/accessibility';
import { AccessibilityService } from './AccessibilityService';

export class TutorialService {
  private static instance: TutorialService;
  private accessibilityService: AccessibilityService;
  private currentTutorial: string | null = null;
  private currentStep: number = 0;
  private tutorials: Map<string, TutorialStep[]> = new Map();
  private completedTutorials: Set<string> = new Set();

  private constructor() {
    this.accessibilityService = AccessibilityService.getInstance();
    this.initializeDefaultTutorials();
  }

  public static getInstance(): TutorialService {
    if (!TutorialService.instance) {
      TutorialService.instance = new TutorialService();
    }
    return TutorialService.instance;
  }

  private initializeDefaultTutorials(): void {
    // First-time user tutorial
    this.registerTutorial('first-time', [
      {
        id: 'welcome',
        title: 'Welcome to GPX Studio Mobile',
        description:
          'This app helps you manage, view, and record GPX tracks for outdoor activities.',
        position: 'center',
        skipable: true,
      },
      {
        id: 'navigation',
        title: 'Navigation',
        description:
          'Use the tabs at the bottom to navigate between Map, Files, Record, and Settings.',
        targetElement: 'tab-bar',
        position: 'top',
        action: 'tap',
        skipable: true,
      },
      {
        id: 'map-basics',
        title: 'Map View',
        description:
          'The map shows your GPX tracks and current location. Pinch to zoom, drag to pan.',
        targetElement: 'map-view',
        position: 'bottom',
        action: 'none',
        skipable: true,
      },
      {
        id: 'accessibility-features',
        title: 'Accessibility Features',
        description:
          'This app supports screen readers, voice commands, and high contrast mode. Check Settings for options.',
        position: 'center',
        skipable: true,
      },
    ]);

    // Map tutorial
    this.registerTutorial('map-features', [
      {
        id: 'map-controls',
        title: 'Map Controls',
        description:
          'Use the buttons on the right to center on your location, change map layers, and access settings.',
        targetElement: 'map-controls',
        position: 'left',
        action: 'tap',
        skipable: true,
      },
      {
        id: 'track-interaction',
        title: 'Track Interaction',
        description:
          'Tap on tracks to see details. Long press to start editing if editing mode is enabled.',
        targetElement: 'gpx-track',
        position: 'top',
        action: 'tap',
        skipable: true,
      },
      {
        id: 'elevation-profile',
        title: 'Elevation Profile',
        description:
          'Swipe up from the bottom to see elevation data. Tap on the profile to see corresponding map location.',
        targetElement: 'elevation-profile',
        position: 'top',
        action: 'swipe',
        skipable: true,
      },
    ]);

    // Recording tutorial
    this.registerTutorial('recording', [
      {
        id: 'recording-start',
        title: 'Start Recording',
        description:
          'Tap the record button to start tracking your movement. Make sure location permissions are enabled.',
        targetElement: 'record-button',
        position: 'top',
        action: 'tap',
        skipable: true,
      },
      {
        id: 'recording-controls',
        title: 'Recording Controls',
        description:
          'Use pause to temporarily stop recording, or stop to finish and save your track.',
        targetElement: 'recording-controls',
        position: 'top',
        action: 'none',
        skipable: true,
      },
      {
        id: 'live-stats',
        title: 'Live Statistics',
        description:
          'View real-time distance, speed, and elevation data while recording.',
        targetElement: 'live-stats',
        position: 'bottom',
        action: 'none',
        skipable: true,
      },
    ]);

    // Voice control tutorial
    this.registerTutorial('voice-control', [
      {
        id: 'voice-activation',
        title: 'Voice Control',
        description:
          'Enable voice control in Settings to use voice commands for navigation and basic operations.',
        position: 'center',
        skipable: true,
      },
      {
        id: 'voice-commands',
        title: 'Available Commands',
        description:
          'Try saying "go to map", "start recording", "center map", or "import file".',
        position: 'center',
        skipable: true,
      },
      {
        id: 'voice-help',
        title: 'Voice Help',
        description:
          'Say "help" at any time to hear available commands for the current screen.',
        position: 'center',
        skipable: true,
      },
    ]);
  }

  public registerTutorial(name: string, steps: TutorialStep[]): void {
    this.tutorials.set(name, steps);
  }

  public startTutorial(name: string): boolean {
    const tutorial = this.tutorials.get(name);
    if (!tutorial || tutorial.length === 0) {
      return false;
    }

    this.currentTutorial = name;
    this.currentStep = 0;

    this.accessibilityService.announceForAccessibility({
      message: `Starting ${name} tutorial. ${tutorial.length} steps.`,
      priority: 'high',
    });

    this.showCurrentStep();
    return true;
  }

  public nextStep(): boolean {
    if (!this.currentTutorial) return false;

    const tutorial = this.tutorials.get(this.currentTutorial);
    if (!tutorial) return false;

    this.currentStep++;

    if (this.currentStep >= tutorial.length) {
      this.completeTutorial();
      return false;
    }

    this.showCurrentStep();
    return true;
  }

  public previousStep(): boolean {
    if (!this.currentTutorial || this.currentStep <= 0) return false;

    this.currentStep--;
    this.showCurrentStep();
    return true;
  }

  public skipTutorial(): void {
    if (!this.currentTutorial) return;

    this.accessibilityService.announceForAccessibility({
      message: 'Tutorial skipped.',
      priority: 'medium',
    });

    this.completeTutorial();
  }

  public skipStep(): boolean {
    const tutorial = this.tutorials.get(this.currentTutorial || '');
    if (!tutorial) return false;

    const currentStepData = tutorial[this.currentStep];
    if (!currentStepData?.skipable) {
      this.accessibilityService.announceForAccessibility({
        message: 'This step cannot be skipped.',
        priority: 'medium',
      });
      return false;
    }

    return this.nextStep();
  }

  private showCurrentStep(): void {
    if (!this.currentTutorial) return;

    const tutorial = this.tutorials.get(this.currentTutorial);
    if (!tutorial) return;

    const step = tutorial[this.currentStep];
    if (!step) return;

    // Announce step for screen readers
    this.accessibilityService.announceForAccessibility({
      message: `Step ${this.currentStep + 1} of ${tutorial.length}: ${step.title}. ${step.description}`,
      priority: 'high',
    });

    // Additional action guidance
    if (step.action && step.action !== 'none') {
      setTimeout(() => {
        this.accessibilityService.announceForAccessibility({
          message: `${step.action} to continue.`,
          priority: 'medium',
        });
      }, 2000);
    }
  }

  private completeTutorial(): void {
    if (!this.currentTutorial) return;

    this.completedTutorials.add(this.currentTutorial);

    this.accessibilityService.announceForAccessibility({
      message:
        'Tutorial completed. You can restart any tutorial from the Settings menu.',
      priority: 'medium',
    });

    this.currentTutorial = null;
    this.currentStep = 0;
  }

  public getCurrentTutorial(): {
    name: string;
    step: number;
    total: number;
  } | null {
    if (!this.currentTutorial) return null;

    const tutorial = this.tutorials.get(this.currentTutorial);
    if (!tutorial) return null;

    return {
      name: this.currentTutorial,
      step: this.currentStep,
      total: tutorial.length,
    };
  }

  public getCurrentStep(): TutorialStep | null {
    if (!this.currentTutorial) return null;

    const tutorial = this.tutorials.get(this.currentTutorial);
    if (!tutorial) return null;

    return tutorial[this.currentStep] || null;
  }

  public getAvailableTutorials(): string[] {
    return Array.from(this.tutorials.keys());
  }

  public isTutorialCompleted(name: string): boolean {
    return this.completedTutorials.has(name);
  }

  public resetTutorial(name: string): void {
    this.completedTutorials.delete(name);
  }

  public isTutorialActive(): boolean {
    return this.currentTutorial !== null;
  }
}
