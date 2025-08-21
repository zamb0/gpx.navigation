import { Platform, Alert, Linking } from 'react-native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as MediaLibrary from 'expo-media-library';

export interface PermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
  status: string;
}

export interface PermissionRequest {
  type:
    | 'location'
    | 'location_background'
    | 'notifications'
    | 'media_library'
    | 'camera';
  rationale?: string;
  settingsMessage?: string;
}

export class PlatformPermissionService {
  private static instance: PlatformPermissionService;

  static getInstance(): PlatformPermissionService {
    if (!PlatformPermissionService.instance) {
      PlatformPermissionService.instance = new PlatformPermissionService();
    }
    return PlatformPermissionService.instance;
  }

  async requestPermission(
    request: PermissionRequest
  ): Promise<PermissionStatus> {
    switch (request.type) {
      case 'location':
        return this.requestLocationPermission(request);
      case 'location_background':
        return this.requestBackgroundLocationPermission(request);
      case 'notifications':
        return this.requestNotificationPermission(request);
      case 'media_library':
        return this.requestMediaLibraryPermission(request);
      default:
        throw new Error(`Unsupported permission type: ${request.type}`);
    }
  }

  private async requestLocationPermission(
    request: PermissionRequest
  ): Promise<PermissionStatus> {
    try {
      // Show rationale if provided
      if (request.rationale) {
        await this.showPermissionRationale(
          'Location Permission Required',
          request.rationale
        );
      }

      const { status, canAskAgain } =
        await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted' && !canAskAgain) {
        await this.showSettingsAlert(
          'Location Permission Denied',
          request.settingsMessage ||
            'Please enable location permissions in Settings to use GPS features.'
        );
      }

      return {
        granted: status === 'granted',
        canAskAgain,
        status,
      };
    } catch (error) {
      console.error('Failed to request location permission:', error);
      return { granted: false, canAskAgain: false, status: 'error' };
    }
  }

  private async requestBackgroundLocationPermission(
    request: PermissionRequest
  ): Promise<PermissionStatus> {
    try {
      // First ensure foreground permission is granted
      const foregroundResult = await this.requestLocationPermission({
        type: 'location',
        rationale:
          'Location access is required before requesting background location.',
      });

      if (!foregroundResult.granted) {
        return foregroundResult;
      }

      // Platform-specific background permission handling
      if (Platform.OS === 'ios') {
        return this.requestIOSBackgroundLocation(request);
      } else {
        return this.requestAndroidBackgroundLocation(request);
      }
    } catch (error) {
      console.error('Failed to request background location permission:', error);
      return { granted: false, canAskAgain: false, status: 'error' };
    }
  }

  private async requestIOSBackgroundLocation(
    request: PermissionRequest
  ): Promise<PermissionStatus> {
    const rationale =
      request.rationale ||
      'Background location access allows the app to continue recording your GPS track even when the app is not actively in use. This is essential for accurate track recording during long activities.';

    await this.showPermissionRationale(
      'Background Location Permission',
      rationale
    );

    const { status, canAskAgain } =
      await Location.requestBackgroundPermissionsAsync();

    if (status !== 'granted' && !canAskAgain) {
      await this.showSettingsAlert(
        'Background Location Denied',
        'To enable background GPS tracking, please go to Settings > Privacy & Security > Location Services > GPX Studio and select "Always".'
      );
    }

    return {
      granted: status === 'granted',
      canAskAgain,
      status,
    };
  }

  private async requestAndroidBackgroundLocation(
    request: PermissionRequest
  ): Promise<PermissionStatus> {
    const rationale =
      request.rationale ||
      'Background location access is needed to continue recording GPS tracks when the app is minimized or the screen is off.';

    await this.showPermissionRationale(
      'Background Location Permission',
      rationale
    );

    const { status, canAskAgain } =
      await Location.requestBackgroundPermissionsAsync();

    if (status !== 'granted' && !canAskAgain) {
      await this.showSettingsAlert(
        'Background Location Denied',
        'Please enable "Allow all the time" location permission in Settings > Apps > GPX Studio > Permissions > Location.'
      );
    }

    return {
      granted: status === 'granted',
      canAskAgain,
      status,
    };
  }

  private async requestNotificationPermission(
    request: PermissionRequest
  ): Promise<PermissionStatus> {
    try {
      if (Platform.OS === 'ios') {
        const rationale =
          request.rationale ||
          'Notifications help you stay informed about GPS recording status and receive important updates.';

        await this.showPermissionRationale(
          'Notification Permission',
          rationale
        );
      }

      const { status, canAskAgain } =
        await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
          },
        });

      if (status !== 'granted' && !canAskAgain) {
        const settingsMessage =
          Platform.OS === 'ios'
            ? 'Please enable notifications in Settings > Notifications > GPX Studio.'
            : 'Please enable notifications in Settings > Apps > GPX Studio > Notifications.';

        await this.showSettingsAlert(
          'Notification Permission Denied',
          request.settingsMessage || settingsMessage
        );
      }

      return {
        granted: status === 'granted',
        canAskAgain,
        status,
      };
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return { granted: false, canAskAgain: false, status: 'error' };
    }
  }

  private async requestMediaLibraryPermission(
    request: PermissionRequest
  ): Promise<PermissionStatus> {
    try {
      const rationale =
        request.rationale ||
        'Media library access is needed to save and import GPX files from your device.';

      await this.showPermissionRationale('Media Library Permission', rationale);

      const { status, canAskAgain } =
        await MediaLibrary.requestPermissionsAsync();

      if (status !== 'granted' && !canAskAgain) {
        const settingsMessage =
          Platform.OS === 'ios'
            ? 'Please enable photo library access in Settings > Privacy & Security > Photos > GPX Studio.'
            : 'Please enable storage permission in Settings > Apps > GPX Studio > Permissions > Storage.';

        await this.showSettingsAlert(
          'Media Library Permission Denied',
          request.settingsMessage || settingsMessage
        );
      }

      return {
        granted: status === 'granted',
        canAskAgain,
        status,
      };
    } catch (error) {
      console.error('Failed to request media library permission:', error);
      return { granted: false, canAskAgain: false, status: 'error' };
    }
  }

  private async showPermissionRationale(
    title: string,
    message: string
  ): Promise<void> {
    return new Promise((resolve) => {
      Alert.alert(
        title,
        message,
        [
          {
            text: 'OK',
            onPress: () => resolve(),
          },
        ],
        { cancelable: false }
      );
    });
  }

  private async showSettingsAlert(
    title: string,
    message: string
  ): Promise<void> {
    return new Promise((resolve) => {
      Alert.alert(title, message, [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => resolve(),
        },
        {
          text: 'Open Settings',
          onPress: () => {
            Linking.openSettings();
            resolve();
          },
        },
      ]);
    });
  }

  async checkPermissionStatus(
    type: PermissionRequest['type']
  ): Promise<PermissionStatus> {
    try {
      switch (type) {
        case 'location': {
          const { status, canAskAgain } =
            await Location.getForegroundPermissionsAsync();
          return { granted: status === 'granted', canAskAgain, status };
        }
        case 'location_background': {
          const { status, canAskAgain } =
            await Location.getBackgroundPermissionsAsync();
          return { granted: status === 'granted', canAskAgain, status };
        }
        case 'notifications': {
          const { status, canAskAgain } =
            await Notifications.getPermissionsAsync();
          return { granted: status === 'granted', canAskAgain, status };
        }
        case 'media_library': {
          const { status, canAskAgain } =
            await MediaLibrary.getPermissionsAsync();
          return { granted: status === 'granted', canAskAgain, status };
        }
        default:
          throw new Error(`Unsupported permission type: ${type}`);
      }
    } catch (error) {
      console.error('Failed to check permission status:', error);
      return { granted: false, canAskAgain: false, status: 'error' };
    }
  }

  async requestMultiplePermissions(
    requests: PermissionRequest[]
  ): Promise<Record<string, PermissionStatus>> {
    const results: Record<string, PermissionStatus> = {};

    for (const request of requests) {
      results[request.type] = await this.requestPermission(request);
    }

    return results;
  }
}
