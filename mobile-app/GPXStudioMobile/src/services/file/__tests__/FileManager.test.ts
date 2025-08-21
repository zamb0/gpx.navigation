import { FileManager } from '../FileManager';
import * as FileSystem from 'expo-file-system';

// Mock FileSystem
jest.mock('expo-file-system', () => ({
  documentDirectory: '/mock/documents/',
  cacheDirectory: '/mock/cache/',
  getInfoAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
  deleteAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(),
  getFreeDiskStorageAsync: jest.fn(),
}));

// Mock GPX services
jest.mock('../../../services/gpx/GPXValidator', () => ({
  GPXValidator: jest.fn().mockImplementation(() => ({
    validateGPXString: jest.fn().mockReturnValue({
      isValid: true,
      errors: [],
    }),
  })),
}));

jest.mock('../../../services/gpx/GPXMetadataExtractor', () => ({
  GPXMetadataExtractor: jest.fn().mockImplementation(() => ({
    extractMetadata: jest.fn(),
  })),
}));

jest.mock('../../../services/database/DatabaseManager', () => ({
  DatabaseManager: {
    getInstance: jest.fn(),
  },
}));

jest.mock('../../../services/database/GPXFilesRepository', () => ({
  GPXFilesRepository: jest.fn().mockImplementation(() => ({
    create: jest.fn(),
    getById: jest.fn(),
  })),
}));

const mockFileSystem = FileSystem as jest.Mocked<typeof FileSystem>;

describe('FileManager', () => {
  let fileManager: FileManager;

  const mockGPXContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="test">
  <trk>
    <trkseg>
      <trkpt lat="45.0" lon="-122.0">
        <ele>1000</ele>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;

  const mockFileInfo = {
    exists: true as const,
    isDirectory: false,
    modificationTime: Date.now(),
    size: 1000,
    uri: 'file://test.gpx',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    fileManager = new FileManager();
  });

  describe('importFile', () => {
    it('should successfully import a valid GPX file', async () => {
      const testUri = 'file://test.gpx';

      mockFileSystem.getInfoAsync.mockResolvedValue(mockFileInfo);
      mockFileSystem.readAsStringAsync.mockResolvedValue(mockGPXContent);

      const options = {
        extractMetadata: true,
      };

      const result = await fileManager.importFromDevice(testUri, options);

      expect(result).toBeDefined();
      expect(mockFileSystem.getInfoAsync).toHaveBeenCalledWith(testUri);
      expect(mockFileSystem.readAsStringAsync).toHaveBeenCalledWith(testUri);
    });

    it('should fail when file does not exist', async () => {
      const testUri = 'file://nonexistent.gpx';

      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: false as const,
        isDirectory: false,
        uri: 'file://test.gpx',
      });

      const result = await fileManager.importFromDevice(testUri);
      expect(result.success).toBe(false);
    });
  });

  describe('getStorageInfo', () => {
    it('should return storage information', async () => {
      // Mock 1GB free space
      mockFileSystem.getFreeDiskStorageAsync.mockResolvedValue(
        1024 * 1024 * 1024
      );

      const result = await fileManager.getStorageInfo();

      expect(result).toHaveProperty('availableSize');
      expect(result).toHaveProperty('totalSize');
      expect(result.availableSize).toBeGreaterThan(0);
    });
  });
});
