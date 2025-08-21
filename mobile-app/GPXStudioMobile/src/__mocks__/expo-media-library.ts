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

export default {
  requestPermissionsAsync,
  getPermissionsAsync,
};
