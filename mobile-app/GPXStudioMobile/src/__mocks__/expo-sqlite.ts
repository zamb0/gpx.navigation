/**
 * Mock for expo-sqlite
 */

export const openDatabaseAsync = jest.fn();

export interface SQLiteDatabase {
  execAsync: jest.Mock;
  runAsync: jest.Mock;
  getFirstAsync: jest.Mock;
  getAllAsync: jest.Mock;
  withTransactionAsync: jest.Mock;
  closeAsync: jest.Mock;
}

export default {
  openDatabaseAsync,
};
