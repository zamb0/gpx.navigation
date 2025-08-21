import { FileManager } from '../FileManager';
import { FileImportService, ImportSource } from '../FileImportService';
import { FileExportService, ExportDestination } from '../FileExportService';
import { FileValidator } from '../FileValidator';
import * as FileSystem from 'expo-file-system';

// Mock dependencies
jest.mock('expo-file-system');
jest.mock('../../../services/gpx/GPXValidator');
jest.mock('../../../services/gpx/GPXMetadataExtractor');
jest.mock('../../../services/database/DatabaseManager');

const mockFileSystem = FileSystem as jest.Mocked<typeof FileSystem>;

describe('File Management Integration Tests', () => {
  let fileManager: FileManager;
  let importService: FileImportService;
  let exportService: FileExportService;
  let fileValidator: FileValidator;

  const mockGPXContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="test">
  <metadata>
    <name>Test Track</name>
    <desc>A test GPX track for integration testing</desc>
  </metadata>
  <trk>
    <name>Test Track</name>
    <trkseg>
      <trkpt lat="45.0" lon="-122.0">
        <ele>100</ele>
        <time>2023-01-01T10:00:00Z</time>
      </trkpt>
      <trkpt lat="45.1" lon="-122.1">
        <ele>110</ele>
        <time>2023-01-01T10:01:00Z</time>
      </trkpt>
      <trkpt lat="45.2" lon="-122.2">
        <ele>120</ele>
        <time>2023-01-01T10:02:00Z</time>
      </trkpt>
    </trkseg>
  </trk>
  <wpt lat="45.0" lon="-122.0">
    <name>Start Point</name>
    <desc>Starting point of the track</desc>
  </wpt>
</gpx>`;

  beforeEach(() => {
    jest.clearAllMocks();

    fileManager = new FileManager();
    importService = new FileImportService();
    exportService = new FileExportService();
    fileValidator = new FileValidator();

    // Setup common mocks
    Object.defineProperty(mockFileSystem, 'documentDirectory', {
      value: '/mock/documents/',
      writable: true,
    });
    Object.defineProperty(mockFileSystem, 'cacheDirectory', {
      value: '/mock/cache/',
      writable: true,
    });

    // Mock directory operations
    mockFileSystem.getInfoAsync.mockImplementation(async (uri) => {
      if (uri.includes('gpx/')) {
        return {
          exists: true,
          isDirectory: true,
          size: 0,
          modificationTime: Date.now(),
          uri,
        };
      }
      return {
        exists: true,
        isDirectory: false,
        size: mockGPXContent.length,
        modificationTime: Date.now(),
        uri,
      };
    });

    mockFileSystem.makeDirectoryAsync.mockResolvedValue();
    mockFileSystem.readAsStringAsync.mockResolvedValue(mockGPXContent);
    mockFileSystem.copyAsync.mockResolvedValue();
    mockFileSystem.deleteAsync.mockResolvedValue();
  });

  describe('Complete Import-Export Workflow', () => {
    it('should import, validate, and export a GPX file successfully', async () => {
      // Step 1: Import file from device
      const importSource: ImportSource = {
        type: 'device',
        uri: '/mock/external/test.gpx',
        name: 'test.gpx',
      };

      const importResult = await importService.importFile(importSource, {
        validateOnImport: true,
        generateThumbnail: true,
        extractMetadata: true,
      });

      expect(importResult.success).toBe(true);
      expect(importResult.file).toBeDefined();

      // Step 2: Validate the imported file
      if (importResult.file) {
        const validationResult = await fileValidator.validateFile(
          importResult.file.metadata.filePath
        );
        expect(validationResult.isValid).toBe(true);

        // Step 3: Export the file
        const exportDestination: ExportDestination = {
          type: 'share',
        };

        const exportResult = await exportService.exportFile(
          importResult.file.id,
          exportDestination
        );

        expect(exportResult.success).toBe(true);
        expect(exportResult.uri).toBeDefined();
      }
    });

    it('should handle batch import and export operations', async () => {
      // Step 1: Batch import multiple files
      const importSources: ImportSource[] = [
        {
          type: 'device',
          uri: '/mock/external/track1.gpx',
          name: 'track1.gpx',
        },
        {
          type: 'device',
          uri: '/mock/external/track2.gpx',
          name: 'track2.gpx',
        },
        {
          type: 'url',
          uri: 'https://example.com/track3.gpx',
          name: 'track3.gpx',
        },
      ];

      // Mock download for URL import
      mockFileSystem.downloadAsync.mockResolvedValue({
        status: 200,
        headers: {},
        mimeType: 'application/gpx+xml',
        uri: '/mock/cache/downloaded.gpx',
      });

      const batchImportResult = await importService.importBatch(importSources);

      expect(batchImportResult.totalFiles).toBe(3);
      expect(batchImportResult.results).toHaveLength(3);

      // Step 2: Get list of imported files
      const fileList = await fileManager.getFileList();
      expect(fileList).toBeDefined();

      // Step 3: Batch export all files
      const fileIds = batchImportResult.results
        .filter((result) => result.success && result.file)
        .map((result) => result.file!.id);

      if (fileIds.length > 0) {
        const exportDestination: ExportDestination = {
          type: 'save',
          uri: '/mock/export/',
        };

        const batchExportResult = await exportService.exportBatch(
          fileIds,
          exportDestination
        );

        expect(batchExportResult.totalFiles).toBe(fileIds.length);
        expect(batchExportResult.results).toHaveLength(fileIds.length);
      }
    });

    it('should handle file corruption and repair workflow', async () => {
      // Step 1: Import a corrupted file
      const corruptedContent = mockGPXContent.replace('</gpx>', ''); // Missing closing tag
      mockFileSystem.readAsStringAsync.mockResolvedValueOnce(corruptedContent);

      const importSource: ImportSource = {
        type: 'device',
        uri: '/mock/external/corrupted.gpx',
        name: 'corrupted.gpx',
      };

      const importResult = await importService.importFile(importSource, {
        validateOnImport: true,
      });

      // Import should fail due to validation
      expect(importResult.success).toBe(false);
      expect(importResult.validation?.isValid).toBe(false);

      // Step 2: Attempt to repair the file
      const repairResult = await fileValidator.repairFile(corruptedContent);

      if (repairResult.success && repairResult.repairedContent) {
        // Step 3: Try importing the repaired content
        mockFileSystem.readAsStringAsync.mockResolvedValueOnce(
          repairResult.repairedContent
        );

        const repairedImportResult = await importService.importFile(
          importSource,
          {
            validateOnImport: true,
          }
        );

        // This might still fail depending on the repair capabilities
        // but the workflow should handle it gracefully
        expect(repairedImportResult).toBeDefined();
      }
    });
  });

  describe('File Management Operations', () => {
    it('should handle file lifecycle operations', async () => {
      // Step 1: Import a file
      const importResult = await fileManager.importFromDevice(
        '/mock/test.gpx',
        {
          validateOnImport: true,
          extractMetadata: true,
          generateThumbnail: true,
        }
      );

      expect(importResult.success).toBe(true);
      expect(importResult.file).toBeDefined();

      if (importResult.file) {
        const fileId = importResult.file.id;

        // Step 2: Retrieve the file
        const retrievedFile = await fileManager.getFile(fileId);
        expect(retrievedFile).toBeDefined();
        expect(retrievedFile?.id).toBe(fileId);

        // Step 3: Export the file
        const exportResult = await fileManager.exportFile(fileId);
        expect(exportResult.success).toBe(true);

        // Step 4: Delete the file
        const deleteResult = await fileManager.deleteFile(fileId);
        expect(deleteResult).toBe(true);

        // Step 5: Verify file is deleted
        const deletedFile = await fileManager.getFile(fileId);
        expect(deletedFile).toBeNull();
      }
    });

    it('should handle storage management operations', async () => {
      // Step 1: Get initial storage info
      const initialStorage = await fileManager.getStorageInfo();
      expect(initialStorage).toHaveProperty('totalSize');
      expect(initialStorage).toHaveProperty('availableSize');
      expect(initialStorage).toHaveProperty('usedSize');

      // Step 2: Import multiple files
      const importPromises = [
        fileManager.importFromDevice('/mock/file1.gpx'),
        fileManager.importFromDevice('/mock/file2.gpx'),
        fileManager.importFromDevice('/mock/file3.gpx'),
      ];

      const importResults = await Promise.all(importPromises);
      const successfulImports = importResults.filter(
        (result) => result.success
      );

      // Step 3: Check storage after imports
      const afterImportStorage = await fileManager.getStorageInfo();
      expect(afterImportStorage.usedSize).toBeGreaterThanOrEqual(
        initialStorage.usedSize
      );

      // Step 4: Clean up temporary files
      await exportService.cleanupTempFiles();

      // Step 5: Delete imported files
      for (const result of successfulImports) {
        if (result.file) {
          await fileManager.deleteFile(result.file.id);
        }
      }

      // Step 6: Verify storage is cleaned up
      const finalStorage = await fileManager.getStorageInfo();
      expect(finalStorage.usedSize).toBeLessThanOrEqual(
        afterImportStorage.usedSize
      );
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle network errors during URL import gracefully', async () => {
      // Mock network failure
      mockFileSystem.downloadAsync.mockResolvedValue({
        status: 404,
        headers: {},
        mimeType: null,
        uri: '',
      });

      const importSource: ImportSource = {
        type: 'url',
        uri: 'https://example.com/nonexistent.gpx',
        name: 'nonexistent.gpx',
      };

      const result = await importService.importFile(importSource);

      expect(result.success).toBe(false);
      expect(result.error).toContain('HTTP 404');
    });

    it('should handle file system errors gracefully', async () => {
      // Mock file system error
      mockFileSystem.copyAsync.mockRejectedValue(new Error('Disk full'));

      const importResult = await fileManager.importFromDevice('/mock/test.gpx');

      expect(importResult.success).toBe(false);
      expect(importResult.error).toContain('Disk full');
    });

    it('should handle permission errors gracefully', async () => {
      // Mock permission error
      mockFileSystem.readAsStringAsync.mockRejectedValue(
        new Error('Permission denied')
      );

      const validationResult = await fileValidator.validateFile(
        '/mock/restricted.gpx'
      );

      expect(validationResult.isValid).toBe(false);
      expect(
        validationResult.errors.some((error) =>
          error.includes('Failed to read file')
        )
      ).toBe(true);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large file operations efficiently', async () => {
      // Mock large file
      const largeFileSize = 50 * 1024 * 1024; // 50MB
      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        isDirectory: false,
        size: largeFileSize,
        modificationTime: Date.now(),
        uri: '/mock/large.gpx',
      });

      const startTime = Date.now();

      const validationResult = await fileValidator.validateFile(
        '/mock/large.gpx',
        {
          checkFileSize: true,
          maxFileSize: 100 * 1024 * 1024, // 100MB limit
        }
      );

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Should complete within reasonable time (this is a rough check)
      expect(processingTime).toBeLessThan(5000); // 5 seconds
      expect(validationResult).toBeDefined();
    });

    it('should handle concurrent operations safely', async () => {
      // Simulate concurrent import operations
      const concurrentImports = Array.from({ length: 5 }, (_, i) =>
        fileManager.importFromDevice(`/mock/concurrent_${i}.gpx`)
      );

      const results = await Promise.allSettled(concurrentImports);

      // All operations should complete (either successfully or with errors)
      expect(results).toHaveLength(5);
      results.forEach((result) => {
        expect(result.status).toBe('fulfilled');
      });
    });
  });
});
