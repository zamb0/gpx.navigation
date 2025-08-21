import {
  FileImportService,
  ImportSource,
  ImportProgress,
} from '../FileImportService';
import * as FileSystem from 'expo-file-system';

// Mock dependencies
jest.mock('expo-file-system');
jest.mock('../FileManager');
jest.mock('../FileValidator');

const mockFileSystem = FileSystem as jest.Mocked<typeof FileSystem>;

describe('FileImportService', () => {
  let importService: FileImportService;
  let mockProgressCallback: jest.Mock<void, [ImportProgress]>;

  beforeEach(() => {
    jest.clearAllMocks();
    importService = new FileImportService();
    mockProgressCallback = jest.fn();
  });

  describe('importFile', () => {
    it('should successfully import from device source', async () => {
      const source: ImportSource = {
        type: 'device',
        uri: '/mock/test.gpx',
        name: 'test.gpx',
      };

      // Mock validation success
      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        isDirectory: false,
        size: 1024,
        modificationTime: Date.now(),
        uri: source.uri,
      });

      const result = await importService.importFile(
        source,
        {},
        mockProgressCallback
      );

      expect(mockProgressCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          currentFile: 1,
          totalFiles: 1,
          currentFileName: 'test.gpx',
          status: 'validating',
        })
      );
    });

    it('should handle validation failures', async () => {
      const source: ImportSource = {
        type: 'device',
        uri: '/mock/invalid.gpx',
        name: 'invalid.gpx',
      };

      // Mock validation failure
      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: false,
        isDirectory: false,
        uri: source.uri,
      });

      const result = await importService.importFile(
        source,
        {},
        mockProgressCallback
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation failed');
    });

    it('should fail for unsupported source types', async () => {
      const source: ImportSource = {
        type: 'unsupported' as any,
        uri: '/mock/test.gpx',
        name: 'test.gpx',
      };

      const result = await importService.importFile(source);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported import source type');
    });
  });

  describe('importBatch', () => {
    it('should import multiple files successfully', async () => {
      const sources: ImportSource[] = [
        { type: 'device', uri: '/mock/test1.gpx', name: 'test1.gpx' },
        { type: 'device', uri: '/mock/test2.gpx', name: 'test2.gpx' },
      ];

      // Mock successful validation for all files
      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        isDirectory: false,
        size: 1024,
        modificationTime: Date.now(),
        uri: '/mock/test.gpx',
      });

      const result = await importService.importBatch(
        sources,
        {},
        mockProgressCallback
      );

      expect(result.totalFiles).toBe(2);
      expect(result.results).toHaveLength(2);
    });
  });

  describe('scanDirectoryForGPXFiles', () => {
    it('should find GPX files in directory', async () => {
      const directoryUri = '/mock/gpx_files/';

      // Mock directory exists
      mockFileSystem.getInfoAsync.mockResolvedValueOnce({
        exists: true,
        isDirectory: true,
        size: 0,
        modificationTime: Date.now(),
        uri: directoryUri,
      });

      // Mock directory contents
      mockFileSystem.readDirectoryAsync.mockResolvedValue([
        'track1.gpx',
        'track2.xml',
        'readme.txt',
      ]);

      // Mock file info for each item
      mockFileSystem.getInfoAsync
        .mockResolvedValueOnce({
          exists: true,
          isDirectory: false,
          size: 1024,
          modificationTime: Date.now(),
          uri: '/mock/gpx_files/track1.gpx',
        })
        .mockResolvedValueOnce({
          exists: true,
          isDirectory: false,
          size: 2048,
          modificationTime: Date.now(),
          uri: '/mock/gpx_files/track2.xml',
        })
        .mockResolvedValueOnce({
          exists: true,
          isDirectory: false,
          size: 512,
          modificationTime: Date.now(),
          uri: '/mock/gpx_files/readme.txt',
        });

      const result = await importService.scanDirectoryForGPXFiles(directoryUri);

      expect(result).toHaveLength(2); // Only GPX and XML files
      expect(result[0].name).toBe('track1.gpx');
      expect(result[1].name).toBe('track2.xml');
    });

    it('should return empty array for non-existent directory', async () => {
      const directoryUri = '/mock/nonexistent/';

      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: false,
        isDirectory: false,
        uri: directoryUri,
      });

      const result = await importService.scanDirectoryForGPXFiles(directoryUri);

      expect(result).toHaveLength(0);
    });
  });

  describe('utility methods', () => {
    it('should return supported file types', () => {
      const supportedTypes = importService.getSupportedFileTypes();

      expect(supportedTypes).toContain('.gpx');
      expect(supportedTypes).toContain('.xml');
    });

    it('should check if file type is supported', () => {
      expect(importService.isFileTypeSupported('test.gpx')).toBe(true);
      expect(importService.isFileTypeSupported('test.xml')).toBe(true);
      expect(importService.isFileTypeSupported('test.txt')).toBe(false);
    });

    it('should estimate import time based on file size', () => {
      const smallFileTime = importService.estimateImportTime(1024); // 1KB
      const largeFileTime = importService.estimateImportTime(10 * 1024 * 1024); // 10MB

      expect(smallFileTime).toBe(1); // Minimum 1 second
      expect(largeFileTime).toBeGreaterThan(smallFileTime);
    });
  });
});
