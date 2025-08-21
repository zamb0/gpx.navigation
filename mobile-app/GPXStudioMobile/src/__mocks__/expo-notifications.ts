export const requestPermissionsAsync = jest.fn().mockResolvedValue({
  status: 'granted',
  canAskAgain: true,
  granted: true,
  expires: 'never',
});

export const getPermissionsAsync = jest.fn().mockResolvedValue({
  status: 'granted',
  canAskAgain: true,
  granted: true,
  expires: 'never',
});

export const setNotificationHandler = jest.fn();
export const setNotificationCategoryAsync = jest.fn();
export const scheduleNotificationAsync = jest
  .fn()
  .mockResolvedValue('notification-id');
export const dismissNotificationAsync = jest.fn();
export const dismissAllNotificationsAsync = jest.fn();

export const AndroidNotificationPriority = {
  MIN: 'MIN',
  LOW: 'LOW',
  DEFAULT: 'DEFAULT',
  HIGH: 'HIGH',
  MAX: 'MAX',
};

export default {
  requestPermissionsAsync,
  getPermissionsAsync,
  setNotificationHandler,
  setNotificationCategoryAsync,
  scheduleNotificationAsync,
  dismissNotificationAsync,
  dismissAllNotificationsAsync,
  AndroidNotificationPriority,
};
