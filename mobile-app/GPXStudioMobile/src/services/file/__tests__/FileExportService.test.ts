import {
  FileExportService,
  ExportDestination,
  ExportProgress,
} from '../FileExportService';
import * as FileSystem from 'expo-file-system';

// Mock dependencies
jest.mock('expo-file-system');
jest.mock('../FileManager');

const mockFileSystem = FileSystem as jest.Mocked<typeof FileSystem>;

describe('FileExportService', () => {
  let exportService: FileExportService;
  let mockProgressCallback: jest.Mock<void, [ExportProgress]>;

  beforeEach(() => {
    jest.clearAllMocks();
    exportService = new FileExportService();
    mockProgressCallback = jest.fn();

    // Mock cache directory
    Object.defineProperty(mockFileSystem, 'cacheDirectory', {
      value: '/mock/cache/',
      writable: true,
    });
  });

  describe('exportFile', () => {
    it('should successfully export file for sharing', async () => {
      const fileId = 'test-file-id';
      const destination: ExportDestination = {
        type: 'share',
      };

      // Mock successful file copy
      mockFileSystem.copyAsync.mockResolvedValue();

      const result = await exportService.exportFile(
        fileId,
        destination,
        {},
        mockProgressCallback
      );

      expect(mockProgressCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          currentFile: 1,
          totalFiles: 1,
          status: 'preparing',
        })
      );

      expect(mockProgressCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'exporting',
        })
      );
    });

    it('should successfully export file for saving to destination', async () => {
      const fileId = 'test-file-id';
      const destination: ExportDestination = {
        type: 'save',
        uri: '/mock/destination/',
      };

      mockFileSystem.copyAsync.mockResolvedValue();

      const result = await exportService.exportFile(
        fileId,
        destination,
        {},
        mockProgressCallback
      );

      expect(mockFileSystem.copyAsync).toHaveBeenCalled();
    });

    it('should successfully export file for email', async () => {
      const fileId = 'test-file-id';
      const destination: ExportDestination = {
        type: 'email',
      };

      mockFileSystem.copyAsync.mockResolvedValue();

      const result = await exportService.exportFile(
        fileId,
        destination,
        {},
        mockProgressCallback
      );

      expect(mockFileSystem.copyAsync).toHaveBeenCalled();
    });

    it('should successfully export file to cloud', async () => {
      const fileId = 'test-file-id';
      const destination: ExportDestination = {
        type: 'cloud',
        uri: '/mock/cloud/sync/',
      };

      mockFileSystem.copyAsync.mockResolvedValue();

      const result = await exportService.exportFile(
        fileId,
        destination,
        {},
        mockProgressCallback
      );

      expect(mockFileSystem.copyAsync).toHaveBeenCalled();
    });

    it('should fail when destination URI is missing for save type', async () => {
      const fileId = 'test-file-id';
      const destination: ExportDestination = {
        type: 'save',
        // Missing URI
      };

      const result = await exportService.exportFile(fileId, destination);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No destination URI provided');
    });

    it('should fail when cloud destination URI is missing', async () => {
      const fileId = 'test-file-id';
      const destination: ExportDestination = {
        type: 'cloud',
        // Missing URI
      };

      const result = await exportService.exportFile(fileId, destination);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No cloud destination URI provided');
    });

    it('should handle export errors gracefully', async () => {
      const fileId = 'test-file-id';
      const destination: ExportDestination = {
        type: 'share',
      };

      // Mock file copy error
      mockFileSystem.copyAsync.mockRejectedValue(new Error('Copy failed'));

      const result = await exportService.exportFile(
        fileId,
        destination,
        {},
        mockProgressCallback
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Copy failed');

      expect(mockProgressCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
        })
      );
    });

    it('should report progress correctly', async () => {
      const fileId = 'test-file-id';
      const destination: ExportDestination = {
        type: 'share',
      };

      mockFileSystem.copyAsync.mockResolvedValue();

      await exportService.exportFile(
        fileId,
        destination,
        {},
        mockProgressCallback
      );

      // Should call progress callback at least twice (preparing and exporting)
      expect(mockProgressCallback).toHaveBeenCalledTimes(3); // preparing, exporting, complete

      const calls = mockProgressCallback.mock.calls;
      expect(calls[0][0].status).toBe('preparing');
      expect(calls[1][0].status).toBe('exporting');
      expect(calls[2][0].status).toBe('complete');
    });
  });

  describe('exportBatch', () => {
    it('should export multiple files successfully', async () => {
      const fileIds = ['file1', 'file2', 'file3'];
      const destination: ExportDestination = {
        type: 'share',
      };

      mockFileSystem.copyAsync.mockResolvedValue();

      const result = await exportService.exportBatch(
        fileIds,
        destination,
        {},
        mockProgressCallback
      );

      expect(result.totalFiles).toBe(3);
      expect(result.results).toHaveLength(3);

      // Should call progress callback for each file
      expect(mockProgressCallback).toHaveBeenCalled();
    });

    it('should handle mixed success and failure results', async () => {
      const fileIds = ['valid-file', 'invalid-file'];
      const destination: ExportDestination = {
        type: 'share',
      };

      // Mock first export success, second export failure
      let callCount = 0;
      jest
        .spyOn(exportService, 'exportFile')
        .mockImplementation(async (fileId) => {
          callCount++;
          if (callCount === 1) {
            return { success: true, uri: '/mock/exported1.gpx' };
          } else {
            return { success: false, error: 'Export failed' };
          }
        });

      const result = await exportService.exportBatch(
        fileIds,
        destination,
        {},
        mockProgressCallback
      );

      expect(result.totalFiles).toBe(2);
      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(1);
      expect(result.results).toHaveLength(2);
    });

    it('should handle batch export errors gracefully', async () => {
      const fileIds = ['test-file'];
      const destination: ExportDestination = {
        type: 'share',
      };

      // Mock export error
      jest
        .spyOn(exportService, 'exportFile')
        .mockRejectedValue(new Error('Batch export error'));

      const result = await exportService.exportBatch(
        fileIds,
        destination,
        {},
        mockProgressCallback
      );

      expect(result.totalFiles).toBe(1);
      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(1);
      expect(result.results[0].success).toBe(false);
      expect(result.results[0].error).toBe('Batch export error');
    });
  });

  describe('createArchive', () => {
    it('should create archive directory with files', async () => {
      const fileIds = ['file1', 'file2'];
      const archiveName = 'my_tracks.zip';

      // Mock directory creation
      mockFileSystem.makeDirectoryAsync.mockResolvedValue();
      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        isDirectory: false,
        size: 1024,
        modificationTime: Date.now(),
        uri: '/mock/file.gpx',
      });
      mockFileSystem.copyAsync.mockResolvedValue();

      const result = await exportService.createArchive(fileIds, archiveName);

      expect(result.success).toBe(true);
      expect(result.uri).toContain('my_tracks');
      expect(mockFileSystem.makeDirectoryAsync).toHaveBeenCalled();
    });

    it('should handle archive creation errors', async () => {
      const fileIds = ['file1'];

      // Mock directory creation error
      mockFileSystem.makeDirectoryAsync.mockRejectedValue(
        new Error('Cannot create directory')
      );

      const result = await exportService.createArchive(fileIds);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot create directory');
    });

    it('should use default archive name when not provided', async () => {
      const fileIds = ['file1'];

      mockFileSystem.makeDirectoryAsync.mockResolvedValue();
      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        isDirectory: false,
        size: 1024,
        modificationTime: Date.now(),
        uri: '/mock/file.gpx',
      });
      mockFileSystem.copyAsync.mockResolvedValue();

      const result = await exportService.createArchive(fileIds);

      expect(result.success).toBe(true);
      expect(result.uri).toContain('gpx_files');
    });
  });

  describe('utility methods', () => {
    it('should return supported export formats', () => {
      const formats = exportService.getSupportedExportFormats();

      expect(formats).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ format: 'gpx', extension: '.gpx' }),
          expect.objectContaining({ format: 'kml', extension: '.kml' }),
          expect.objectContaining({ format: 'tcx', extension: '.tcx' }),
        ])
      );
    });

    it('should estimate export time based on file size and format', () => {
      const gpxTime = exportService.estimateExportTime(10 * 1024 * 1024, 'gpx'); // 10MB GPX
      const kmlTime = exportService.estimateExportTime(10 * 1024 * 1024, 'kml'); // 10MB KML

      expect(gpxTime).toBeGreaterThan(0);
      expect(kmlTime).toBeGreaterThan(gpxTime); // Conversion takes extra time
    });

    it('should get export statistics', async () => {
      const stats = await exportService.getExportStatistics();

      expect(stats).toHaveProperty('totalExports');
      expect(stats).toHaveProperty('exportsByFormat');
      expect(stats).toHaveProperty('totalSizeExported');
      expect(stats.exportsByFormat).toHaveProperty('gpx');
      expect(stats.exportsByFormat).toHaveProperty('kml');
      expect(stats.exportsByFormat).toHaveProperty('tcx');
    });
  });

  describe('cleanupTempFiles', () => {
    it('should clean up temporary export files', async () => {
      const tempFiles = [
        'export_temp1.gpx',
        'share_temp2.gpx',
        'email_temp3.gpx',
        'normal_file.gpx',
      ];

      mockFileSystem.readDirectoryAsync.mockResolvedValue(tempFiles);
      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        isDirectory: false,
        size: 1024,
        modificationTime: Date.now(),
        uri: '/mock/cache/file.gpx',
      });
      mockFileSystem.deleteAsync.mockResolvedValue();

      await exportService.cleanupTempFiles();

      // Should delete temp files but not normal files
      expect(mockFileSystem.deleteAsync).toHaveBeenCalledTimes(3);
      expect(mockFileSystem.deleteAsync).toHaveBeenCalledWith(
        '/mock/cache/export_temp1.gpx'
      );
      expect(mockFileSystem.deleteAsync).toHaveBeenCalledWith(
        '/mock/cache/share_temp2.gpx'
      );
      expect(mockFileSystem.deleteAsync).toHaveBeenCalledWith(
        '/mock/cache/email_temp3.gpx'
      );
    });

    it('should handle cleanup errors gracefully', async () => {
      mockFileSystem.readDirectoryAsync.mockRejectedValue(
        new Error('Cannot read directory')
      );

      // Should not throw
      await expect(exportService.cleanupTempFiles()).resolves.toBeUndefined();
    });

    it('should handle missing cache directory', async () => {
      Object.defineProperty(mockFileSystem, 'cacheDirectory', {
        value: undefined,
        writable: true,
      });

      // Should not throw
      await expect(exportService.cleanupTempFiles()).resolves.toBeUndefined();
    });
  });
});
