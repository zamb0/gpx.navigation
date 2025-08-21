// Mock for expo-file-system
export const readAsStringAsync = jest.fn();
export const writeAsStringAsync = jest.fn();
export const documentDirectory = 'file://test/';

export default {
  readAsStringAsync,
  writeAsStringAsync,
  documentDirectory,
};
