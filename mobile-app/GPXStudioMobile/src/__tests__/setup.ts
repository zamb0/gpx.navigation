// Test setup file
import '@testing-library/jest-native/extend-expect';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock global objects that might be needed
global.window = global.window || {};
global.document = global.document || {};

// Mock React Native Animated API - simplified
global.requestAnimationFrame = (cb: any) => setTimeout(cb, 0) as any;

// Mock StyleSheet.flatten for testing-library
jest.mock('react-native/Libraries/StyleSheet/StyleSheet', () => ({
  ...jest.requireActual('react-native/Libraries/StyleSheet/StyleSheet'),
  flatten: jest.fn((styles) => styles || {}),
}));

// Setup any global test utilities here
