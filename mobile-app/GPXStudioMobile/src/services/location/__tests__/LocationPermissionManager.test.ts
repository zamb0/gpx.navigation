import { Alert, Linking } from 'react-native';
import { LocationPermissionManager } from '../LocationPermissionManager';
import { LocationService } from '../LocationService';
import { LocationPermissionStatus } from '../../../types/location';

// Mock React Native modules
jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
  Linking: {
    openSettings: jest.fn(),
  },
}));

// Mock LocationService
jest.mock('../LocationService');

describe('LocationPermissionManager', () => {
  let permissionManager: LocationPermissionManager;
  let mockLocationService: jest.Mocked<LocationService>;

  beforeEach(() => {
    // Reset singleton instance
    (LocationPermissionManager as any).instance = undefined;
    permissionManager = LocationPermissionManager.getInstance();

    // Create mock LocationService
    mockLocationService = {
      getPermissionStatus: jest.fn(),
      requestPermissions: jest.fn(),
      requestBackgroundPermissions: jest.fn(),
    } as any;

    (LocationService.getInstance as jest.Mock).mockReturnValue(
      mockLocationService
    );

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = LocationPermissionManager.getInstance();
      const instance2 = LocationPermissionManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Location Permission Request', () => {
    it('should return immediately if permission already granted', async () => {
      const grantedResponse = {
        status: LocationPermissionStatus.GRANTED,
        canAskAgain: true,
        expires: 'never' as const,
      };

      mockLocationService.getPermissionStatus.mockResolvedValue(
        grantedResponse
      );

      const result = await permissionManager.requestLocationPermission();

      expect(result).toEqual(grantedResponse);
      expect(Alert.alert).not.toHaveBeenCalled();
      expect(mockLocationService.requestPermissions).not.toHaveBeenCalled();
    });

    it('should show explanation dialog before requesting permission', async () => {
      const deniedResponse = {
        status: LocationPermissionStatus.DENIED,
        canAskAgain: true,
        expires: 'never' as const,
      };

      const grantedResponse = {
        status: LocationPermissionStatus.GRANTED,
        canAskAgain: true,
        expires: 'never' as const,
      };

      mockLocationService.getPermissionStatus.mockResolvedValue(deniedResponse);
      mockLocationService.requestPermissions.mockResolvedValue(grantedResponse);

      // Mock user accepting the explanation
      (Alert.alert as jest.Mock).mockImplementation(
        (title, message, buttons) => {
          const acceptButton = buttons.find(
            (b: any) => b.text === 'Allow Location Access'
          );
          acceptButton.onPress();
        }
      );

      const result = await permissionManager.requestLocationPermission();

      expect(Alert.alert).toHaveBeenCalledWith(
        'Location Access Required',
        expect.stringContaining('This app needs access to your location'),
        expect.arrayContaining([
          expect.objectContaining({ text: 'Not Now' }),
          expect.objectContaining({ text: 'Allow Location Access' }),
        ]),
        { cancelable: false }
      );

      expect(mockLocationService.requestPermissions).toHaveBeenCalled();
      expect(result).toEqual(grantedResponse);
    });

    it('should handle user declining explanation dialog', async () => {
      const deniedResponse = {
        status: LocationPermissionStatus.DENIED,
        canAskAgain: true,
        expires: 'never' as const,
      };

      mockLocationService.getPermissionStatus.mockResolvedValue(deniedResponse);

      // Mock user declining the explanation
      (Alert.alert as jest.Mock).mockImplementation(
        (title, message, buttons) => {
          const cancelButton = buttons.find((b: any) => b.text === 'Not Now');
          cancelButton.onPress();
        }
      );

      const result = await permissionManager.requestLocationPermission();

      expect(mockLocationService.requestPermissions).not.toHaveBeenCalled();
      expect(result.status).toBe(LocationPermissionStatus.DENIED);
    });

    it('should show settings prompt when permission permanently denied', async () => {
      const permanentlyDeniedResponse = {
        status: LocationPermissionStatus.DENIED,
        canAskAgain: false,
        expires: 'never' as const,
      };

      mockLocationService.getPermissionStatus.mockResolvedValue(
        permanentlyDeniedResponse
      );

      // Mock settings prompt
      (Alert.alert as jest.Mock).mockImplementation(
        (title, message, buttons) => {
          const cancelButton = buttons.find((b: any) => b.text === 'Cancel');
          cancelButton.onPress();
        }
      );

      const result = await permissionManager.requestLocationPermission();

      expect(Alert.alert).toHaveBeenCalledWith(
        'Location Permission Required',
        expect.stringContaining('Location access has been denied'),
        expect.arrayContaining([
          expect.objectContaining({ text: 'Cancel' }),
          expect.objectContaining({ text: 'Open Settings' }),
        ]),
        { cancelable: false }
      );

      expect(result.status).toBe(LocationPermissionStatus.DENIED);
      expect(result.canAskAgain).toBe(false);
    });

    it('should open settings when user chooses to', async () => {
      const permanentlyDeniedResponse = {
        status: LocationPermissionStatus.DENIED,
        canAskAgain: false,
        expires: 'never' as const,
      };

      const updatedResponse = {
        status: LocationPermissionStatus.GRANTED,
        canAskAgain: true,
        expires: 'never' as const,
      };

      mockLocationService.getPermissionStatus
        .mockResolvedValueOnce(permanentlyDeniedResponse)
        .mockResolvedValueOnce(updatedResponse);

      (Linking.openSettings as jest.Mock).mockResolvedValue(undefined);

      // Mock user choosing to open settings
      (Alert.alert as jest.Mock).mockImplementation(
        (title, message, buttons) => {
          const settingsButton = buttons.find(
            (b: any) => b.text === 'Open Settings'
          );
          settingsButton.onPress();
        }
      );

      const result = await permissionManager.requestLocationPermission();

      expect(Linking.openSettings).toHaveBeenCalled();
      expect(result).toEqual(updatedResponse);
    });

    it('should use custom prompt configuration', async () => {
      const deniedResponse = {
        status: LocationPermissionStatus.DENIED,
        canAskAgain: true,
        expires: 'never' as const,
      };

      mockLocationService.getPermissionStatus.mockResolvedValue(deniedResponse);

      const customConfig = {
        title: 'Custom Title',
        message: 'Custom message',
        buttonText: 'Custom Button',
        cancelText: 'Custom Cancel',
      };

      // Mock user declining
      (Alert.alert as jest.Mock).mockImplementation(
        (title, message, buttons) => {
          expect(title).toBe('Custom Title');
          expect(message).toBe('Custom message');

          const cancelButton = buttons.find(
            (b: any) => b.text === 'Custom Cancel'
          );
          cancelButton.onPress();
        }
      );

      await permissionManager.requestLocationPermission(customConfig);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Custom Title',
        'Custom message',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Custom Cancel' }),
          expect.objectContaining({ text: 'Custom Button' }),
        ]),
        { cancelable: false }
      );
    });
  });

  describe('Background Permission Request', () => {
    it('should request foreground permission first', async () => {
      const deniedForegroundResponse = {
        status: LocationPermissionStatus.DENIED,
        canAskAgain: true,
        expires: 'never' as const,
      };

      mockLocationService.getPermissionStatus.mockResolvedValue(
        deniedForegroundResponse
      );

      // Mock user declining foreground permission
      (Alert.alert as jest.Mock).mockImplementation(
        (title, message, buttons) => {
          const cancelButton = buttons.find((b: any) => b.text === 'Not Now');
          cancelButton.onPress();
        }
      );

      const result =
        await permissionManager.requestBackgroundLocationPermission();

      expect(result.status).toBe(LocationPermissionStatus.DENIED);
      expect(
        mockLocationService.requestBackgroundPermissions
      ).not.toHaveBeenCalled();
    });

    it('should request background permission after foreground is granted', async () => {
      const grantedForegroundResponse = {
        status: LocationPermissionStatus.GRANTED,
        canAskAgain: true,
        expires: 'never' as const,
      };

      const grantedBackgroundResponse = {
        status: LocationPermissionStatus.GRANTED,
        canAskAgain: true,
        expires: 'never' as const,
      };

      mockLocationService.getPermissionStatus.mockResolvedValue(
        grantedForegroundResponse
      );
      mockLocationService.requestBackgroundPermissions.mockResolvedValue(
        grantedBackgroundResponse
      );

      // Mock user accepting background permission explanation
      (Alert.alert as jest.Mock).mockImplementation(
        (title, message, buttons) => {
          expect(title).toBe('Background Location Access');
          const acceptButton = buttons.find(
            (b: any) => b.text === 'Allow Background Access'
          );
          acceptButton.onPress();
        }
      );

      const result =
        await permissionManager.requestBackgroundLocationPermission();

      expect(
        mockLocationService.requestBackgroundPermissions
      ).toHaveBeenCalled();
      expect(result).toEqual(grantedBackgroundResponse);
    });

    it('should handle user declining background permission explanation', async () => {
      const grantedForegroundResponse = {
        status: LocationPermissionStatus.GRANTED,
        canAskAgain: true,
        expires: 'never' as const,
      };

      mockLocationService.getPermissionStatus.mockResolvedValue(
        grantedForegroundResponse
      );

      // Mock user declining background permission explanation
      (Alert.alert as jest.Mock).mockImplementation(
        (title, message, buttons) => {
          const cancelButton = buttons.find((b: any) => b.text === 'Not Now');
          cancelButton.onPress();
        }
      );

      const result =
        await permissionManager.requestBackgroundLocationPermission();

      expect(
        mockLocationService.requestBackgroundPermissions
      ).not.toHaveBeenCalled();
      expect(result.status).toBe(LocationPermissionStatus.DENIED);
    });
  });

  describe('Permission Status Check', () => {
    it('should check if location permission is granted', async () => {
      const grantedResponse = {
        status: LocationPermissionStatus.GRANTED,
        canAskAgain: true,
        expires: 'never' as const,
      };

      mockLocationService.getPermissionStatus.mockResolvedValue(
        grantedResponse
      );

      const hasPermission = await permissionManager.hasLocationPermission();

      expect(hasPermission).toBe(true);
      expect(mockLocationService.getPermissionStatus).toHaveBeenCalled();
    });

    it('should return false when permission is denied', async () => {
      const deniedResponse = {
        status: LocationPermissionStatus.DENIED,
        canAskAgain: true,
        expires: 'never' as const,
      };

      mockLocationService.getPermissionStatus.mockResolvedValue(deniedResponse);

      const hasPermission = await permissionManager.hasLocationPermission();

      expect(hasPermission).toBe(false);
    });
  });

  describe('Utility Prompts', () => {
    it('should show location services disabled prompt', async () => {
      (Alert.alert as jest.Mock).mockImplementation(
        (title, message, buttons) => {
          expect(title).toBe('Location Services Disabled');
          expect(message).toContain('Location services are turned off');

          const cancelButton = buttons.find((b: any) => b.text === 'Cancel');
          cancelButton.onPress();
        }
      );

      await permissionManager.showLocationServicesDisabledPrompt();

      expect(Alert.alert).toHaveBeenCalled();
    });

    it('should show accuracy warning', async () => {
      const accuracy = 25.5;

      (Alert.alert as jest.Mock).mockImplementation(
        (title, message, buttons) => {
          expect(title).toBe('GPS Accuracy Warning');
          expect(message).toContain('25.5 meters');

          const continueButton = buttons.find(
            (b: any) => b.text === 'Continue Anyway'
          );
          continueButton.onPress();
        }
      );

      const result = await permissionManager.showAccuracyWarning(accuracy);

      expect(result).toBe(true);
      expect(Alert.alert).toHaveBeenCalled();
    });

    it('should show battery optimization warning', async () => {
      (Alert.alert as jest.Mock).mockImplementation(
        (title, message, buttons) => {
          expect(title).toBe('Battery Usage Notice');
          expect(message).toContain(
            'Background location tracking will use more battery'
          );

          const okButton = buttons.find((b: any) => b.text === 'OK');
          okButton.onPress();
        }
      );

      const result = await permissionManager.showBatteryOptimizationWarning();

      expect(result).toBe(true);
      expect(Alert.alert).toHaveBeenCalled();
    });
  });
});
