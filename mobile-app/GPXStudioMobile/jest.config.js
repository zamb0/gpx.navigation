module.exports = {
  testEnvironment: 'jsdom',
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.{test,spec}.{js,jsx,ts,tsx}',
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/index.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    'expo-file-system': '<rootDir>/src/__mocks__/expo-file-system.ts',
    'expo-sqlite': '<rootDir>/src/__mocks__/expo-sqlite.ts',
    'expo-location': '<rootDir>/src/__mocks__/expo-location.ts',
    'expo-document-picker': '<rootDir>/src/__mocks__/expo-document-picker.ts',
    'expo-mail-composer': '<rootDir>/src/__mocks__/expo-mail-composer.ts',
    '@expo/vector-icons': '<rootDir>/src/__mocks__/@expo/vector-icons.ts',
    '../../constants/theme': '<rootDir>/src/__mocks__/theme.ts',
    'react-native-chart-kit':
      '<rootDir>/src/__mocks__/react-native-chart-kit.ts',
    '@react-native-picker/picker':
      '<rootDir>/src/__mocks__/@react-native-picker/picker.ts',
    '@react-native-async-storage/async-storage':
      '<rootDir>/src/__mocks__/@react-native-async-storage/async-storage.ts',
    '@react-native-community/netinfo':
      '<rootDir>/src/__mocks__/@react-native-community/netinfo.ts',
    '@react-native-community/slider':
      '<rootDir>/src/__mocks__/@react-native-community/slider.ts',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(gpx|fast-xml-parser|immer|@react-native-async-storage|@react-native-community)/)',
  ],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
};
