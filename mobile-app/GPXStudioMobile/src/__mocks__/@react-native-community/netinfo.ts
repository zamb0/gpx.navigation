export default {
  fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
  addEventListener: jest.fn(() => jest.fn()), // Returns unsubscribe function
  useNetInfo: jest.fn(() => ({ isConnected: true })),
};
