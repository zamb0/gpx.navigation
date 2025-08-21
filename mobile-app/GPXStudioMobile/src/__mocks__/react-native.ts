// Mock React Native components and APIs for testing

export const View = 'View';
export const Text = 'Text';
export const TouchableOpacity = 'TouchableOpacity';
export const ScrollView = 'ScrollView';
export const Dimensions = {
  get: jest.fn(() => ({ width: 375, height: 667 })),
};

export const Platform = {
  OS: 'ios',
  select: jest.fn((options) => options.ios || options.default),
};

export const Alert = {
  alert: jest.fn(),
};

export const StyleSheet = {
  create: jest.fn((styles) => styles),
  flatten: jest.fn((styles) => styles || {}),
};

export const Animated = {
  View: 'Animated.View',
  Value: jest.fn(() => ({
    setValue: jest.fn(),
    interpolate: jest.fn(() => 0),
  })),
  timing: jest.fn(() => ({
    start: jest.fn(),
  })),
};

export const PanResponder = {
  create: jest.fn(() => ({
    panHandlers: {},
  })),
};

// Mock other React Native modules as needed
export default {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  StyleSheet,
  Animated,
  PanResponder,
  Platform,
  Alert,
};
