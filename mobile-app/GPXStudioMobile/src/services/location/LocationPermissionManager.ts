import { Alert, Linking } from 'react-native';
import {
  LocationPermissionStatus,
  LocationPermissionResponse,
  LocationPermissionCallback,
} from '../../types/location';
import { LocationService } from './LocationService';

export interface PermissionPromptConfig {
  title: string;
  message: string;
  buttonText: string;
  cancelText?: string;
  showSettingsOption?: boolean;
}

export class LocationPermissionManager {
  private static instance: LocationPermissionManager;
  private locationService: LocationService;

  private constructor() {
    this.locationService = LocationService.getInstance();
  }

  public static getInstance(): LocationPermissionManager {
    if (!LocationPermissionManager.instance) {
      LocationPermissionManager.instance = new LocationPermissionManager();
    }
    return LocationPermissionManager.instance;
  }

  /**
   * Request location permission with user-friendly prompts
   */
  public async requestLocationPermission(
    config?: Partial<PermissionPromptConfig>
  ): Promise<LocationPermissionResponse> {
    const currentStatus = await this.locationService.getPermissionStatus();

    // If already granted, return immediately
    if (currentStatus.status === LocationPermissionStatus.GRANTED) {
      return currentStatus;
    }

    // If denied and can't ask again, show settings prompt
    if (
      currentStatus.status === LocationPermissionStatus.DENIED &&
      !currentStatus.canAskAgain
    ) {
      return this.showSettingsPrompt(config);
    }

    // Show explanation prompt before requesting permission
    const shouldRequest = await this.showPermissionExplanation(config);
    if (!shouldRequest) {
      return {
        status: LocationPermissionStatus.DENIED,
        canAskAgain: currentStatus.canAskAgain,
        expires: currentStatus.expires,
      };
    }

    // Request the permission
    const response = await this.locationService.requestPermissions();

    // If denied after request, show settings option
    if (
      response.status === LocationPermissionStatus.DENIED &&
      !response.canAskAgain
    ) {
      await this.showSettingsPrompt(config);
    }

    return response;
  }

  /**
   * Request background location permission with explanation
   */
  public async requestBackgroundLocationPermission(
    config?: Partial<PermissionPromptConfig>
  ): Promise<LocationPermissionResponse> {
    // First ensure foreground permission
    const foregroundResponse = await this.requestLocationPermission(config);
    if (foregroundResponse.status !== LocationPermissionStatus.GRANTED) {
      return foregroundResponse;
    }

    const backgroundConfig = {
      title: 'Background Location Access',
      message:
        'To record tracks while the app is in the background, we need access to your location even when the app is not in use. This allows continuous track recording during your activities.',
      buttonText: 'Allow Background Access',
      cancelText: 'Not Now',
      showSettingsOption: true,
      ...config,
    };

    const shouldRequest =
      await this.showPermissionExplanation(backgroundConfig);
    if (!shouldRequest) {
      return {
        status: LocationPermissionStatus.DENIED,
        canAskAgain: true,
        expires: 'never',
      };
    }

    return this.locationService.requestBackgroundPermissions();
  }

  /**
   * Check if location permission is granted
   */
  public async hasLocationPermission(): Promise<boolean> {
    const status = await this.locationService.getPermissionStatus();
    return status.status === LocationPermissionStatus.GRANTED;
  }

  /**
   * Show permission explanation dialog
   */
  private showPermissionExplanation(
    config?: Partial<PermissionPromptConfig>
  ): Promise<boolean> {
    const promptConfig = {
      title: 'Location Access Required',
      message:
        'This app needs access to your location to display your position on the map, record GPS tracks, and provide navigation features.',
      buttonText: 'Allow Location Access',
      cancelText: 'Not Now',
      ...config,
    };

    return new Promise((resolve) => {
      Alert.alert(
        promptConfig.title,
        promptConfig.message,
        [
          {
            text: promptConfig.cancelText || 'Not Now',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: promptConfig.buttonText,
            onPress: () => resolve(true),
          },
        ],
        { cancelable: false }
      );
    });
  }

  /**
   * Show settings prompt when permission is permanently denied
   */
  private showSettingsPrompt(
    config?: Partial<PermissionPromptConfig>
  ): Promise<LocationPermissionResponse> {
    const promptConfig = {
      title: 'Location Permission Required',
      message:
        'Location access has been denied. To use location features, please enable location permissions in your device settings.',
      buttonText: 'Open Settings',
      cancelText: 'Cancel',
      showSettingsOption: true,
      ...config,
    };

    return new Promise((resolve) => {
      const buttons: Array<{
        text: string;
        style: 'cancel' | 'default' | 'destructive';
        onPress: () => void;
      }> = [
        {
          text: promptConfig.cancelText || 'Cancel',
          style: 'cancel',
          onPress: () =>
            resolve({
              status: LocationPermissionStatus.DENIED,
              canAskAgain: false,
              expires: 'never',
            }),
        },
      ];

      if (promptConfig.showSettingsOption) {
        buttons.push({
          text: promptConfig.buttonText,
          style: 'default',
          onPress: () => {
            Linking.openSettings().then(async () => {
              // After opening settings, check permission status again
              const newStatus =
                await this.locationService.getPermissionStatus();
              resolve(newStatus);
            });
          },
        });
      }

      Alert.alert(promptConfig.title, promptConfig.message, buttons, {
        cancelable: false,
      });
    });
  }

  /**
   * Show location services disabled prompt
   */
  public showLocationServicesDisabledPrompt(): Promise<void> {
    return new Promise((resolve) => {
      Alert.alert(
        'Location Services Disabled',
        'Location services are turned off on your device. Please enable location services in your device settings to use location features.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve(),
          },
          {
            text: 'Open Settings',
            onPress: async () => {
              await Linking.openSettings();
              resolve();
            },
          },
        ],
        { cancelable: false }
      );
    });
  }

  /**
   * Show GPS accuracy warning
   */
  public showAccuracyWarning(accuracy: number): Promise<boolean> {
    return new Promise((resolve) => {
      Alert.alert(
        'GPS Accuracy Warning',
        `Current GPS accuracy is ${accuracy.toFixed(1)} meters. This may affect the quality of your track recording. Do you want to continue?`,
        [
          {
            text: 'Wait for Better Signal',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: 'Continue Anyway',
            onPress: () => resolve(true),
          },
        ],
        { cancelable: false }
      );
    });
  }

  /**
   * Show battery optimization warning for background tracking
   */
  public showBatteryOptimizationWarning(): Promise<boolean> {
    return new Promise((resolve) => {
      Alert.alert(
        'Battery Usage Notice',
        'Background location tracking will use more battery. Consider enabling battery optimization features in settings for longer recording sessions.',
        [
          {
            text: 'OK',
            onPress: () => resolve(true),
          },
        ],
        { cancelable: false }
      );
    });
  }
}
