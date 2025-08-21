export const PermissionStatus = {
  UNDETERMINED: 'undetermined',
  DENIED: 'denied',
  GRANTED: 'granted',
};

export const Accuracy = {
  Low: 1,
  Balanced: 2,
  High: 3,
  BestForNavigation: 4,
};

export const requestForegroundPermissionsAsync = jest.fn();
export const requestBackgroundPermissionsAsync = jest.fn();
export const getForegroundPermissionsAsync = jest.fn();
export const getBackgroundPermissionsAsync = jest.fn();
export const hasServicesEnabledAsync = jest.fn();
export const getCurrentPositionAsync = jest.fn();
export const watchPositionAsync = jest.fn();
export const startLocationUpdatesAsync = jest.fn();
export const stopLocationUpdatesAsync = jest.fn();
