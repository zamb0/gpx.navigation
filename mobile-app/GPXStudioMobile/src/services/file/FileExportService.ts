import * as FileSystem from 'expo-file-system';
import { FileManager, ExportResult } from './FileManager';
import { GPXExportOptions, GPXFileMetadata } from '../../types/gpx';

export interface ExportDestination {
  type: 'share' | 'save' | 'email' | 'cloud';
  uri?: string;
  metadata?: Record<string, any>;
}

export interface BatchExportResult {
  totalFiles: number;
  successCount: number;
  failureCount: number;
  results: Array<ExportResult & { fileId: string; filename: string }>;
}

export interface ExportProgress {
  currentFile: number;
  totalFiles: number;
  currentFileName: string;
  status: 'preparing' | 'exporting' | 'complete' | 'error';
}

export class FileExportService {
  private fileManager: FileManager;

  constructor() {
    this.fileManager = new FileManager();
  }

  /**
   * Export single file
   */
  async exportFile(
    fileId: string,
    destination: ExportDestination,
    options: GPXExportOptions = {},
    onProgress?: (progress: ExportProgress) => void
  ): Promise<ExportResult> {
    try {
      // Get file metadata for progress reporting
      const files = await this.fileManager.getFileList();
      const fileMetadata = files.find((f) => f.id === fileId);
      const filename = fileMetadata?.filename || 'unknown.gpx';

      const progress: ExportProgress = {
        currentFile: 1,
        totalFiles: 1,
        currentFileName: filename,
        status: 'preparing',
      };

      onProgress?.(progress);

      // Export the file
      progress.status = 'exporting';
      onProgress?.(progress);

      const result = await this.fileManager.exportFile(fileId, options);

      if (!result.success || !result.uri) {
        progress.status = 'error';
        onProgress?.(progress);
        return result;
      }

      // Handle different destination types
      let finalResult: ExportResult;

      switch (destination.type) {
        case 'save':
          finalResult = await this.saveToDestination(
            result.uri,
            destination,
            filename
          );
          break;

        case 'share':
          finalResult = await this.prepareForSharing(result.uri, filename);
          break;

        case 'email':
          finalResult = await this.prepareForEmail(result.uri, filename);
          break;

        case 'cloud':
          finalResult = await this.uploadToCloud(
            result.uri,
            destination,
            filename
          );
          break;

        default:
          finalResult = result; // Use the basic export result
      }

      progress.status = finalResult.success ? 'complete' : 'error';
      onProgress?.(progress);

      return finalResult;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Export failed',
      };
    }
  }

  /**
   * Export multiple files in batch
   */
  async exportBatch(
    fileIds: string[],
    destination: ExportDestination,
    options: GPXExportOptions = {},
    onProgress?: (progress: ExportProgress) => void
  ): Promise<BatchExportResult> {
    const results: Array<ExportResult & { fileId: string; filename: string }> =
      [];
    let successCount = 0;
    let failureCount = 0;

    // Get file metadata for all files
    const allFiles = await this.fileManager.getFileList();
    const filesToExport = allFiles.filter((f) => fileIds.includes(f.id));

    for (let i = 0; i < fileIds.length; i++) {
      const fileId = fileIds[i];
      const fileMetadata = filesToExport.find((f) => f.id === fileId);
      const filename = fileMetadata?.filename || `file_${i + 1}.gpx`;

      const progress: ExportProgress = {
        currentFile: i + 1,
        totalFiles: fileIds.length,
        currentFileName: filename,
        status: 'preparing',
      };

      onProgress?.(progress);

      try {
        const result = await this.exportFile(
          fileId,
          destination,
          options,
          onProgress
        );

        results.push({ ...result, fileId, filename });

        if (result.success) {
          successCount++;
        } else {
          failureCount++;
        }
      } catch (error) {
        const errorResult = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          fileId,
          filename,
        };

        results.push(errorResult);
        failureCount++;
      }
    }

    return {
      totalFiles: fileIds.length,
      successCount,
      failureCount,
      results,
    };
  }

  /**
   * Create ZIP archive of multiple GPX files
   */
  async createArchive(
    fileIds: string[],
    archiveName: string = 'gpx_files.zip'
  ): Promise<ExportResult> {
    try {
      // For now, we'll create a simple directory with all files
      // In a real implementation, you'd use a ZIP library
      const archiveDir = `${FileSystem.cacheDirectory}${archiveName.replace('.zip', '')}/`;

      // Create archive directory
      await FileSystem.makeDirectoryAsync(archiveDir, { intermediates: true });

      const allFiles = await this.fileManager.getFileList();
      const filesToArchive = allFiles.filter((f) => fileIds.includes(f.id));

      // Copy files to archive directory
      for (const file of filesToArchive) {
        const sourceUri = file.filePath;
        const destUri = `${archiveDir}${file.filename}`;

        const fileInfo = await FileSystem.getInfoAsync(sourceUri);
        if (fileInfo.exists) {
          await FileSystem.copyAsync({
            from: sourceUri,
            to: destUri,
          });
        }
      }

      return {
        success: true,
        uri: archiveDir,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to create archive',
      };
    }
  }

  /**
   * Save to specific destination
   */
  private async saveToDestination(
    sourceUri: string,
    destination: ExportDestination,
    filename: string
  ): Promise<ExportResult> {
    try {
      if (!destination.uri) {
        return {
          success: false,
          error: 'No destination URI provided',
        };
      }

      await FileSystem.copyAsync({
        from: sourceUri,
        to: `${destination.uri}/${filename}`,
      });

      return {
        success: true,
        uri: `${destination.uri}/${filename}`,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to save to destination',
      };
    }
  }

  /**
   * Prepare file for sharing
   */
  private async prepareForSharing(
    sourceUri: string,
    filename: string
  ): Promise<ExportResult> {
    try {
      // Copy to a shareable location (cache directory)
      const shareUri = `${FileSystem.cacheDirectory}share_${filename}`;

      await FileSystem.copyAsync({
        from: sourceUri,
        to: shareUri,
      });

      return {
        success: true,
        uri: shareUri,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to prepare file for sharing',
      };
    }
  }

  /**
   * Prepare file for email
   */
  private async prepareForEmail(
    sourceUri: string,
    filename: string
  ): Promise<ExportResult> {
    try {
      // Similar to sharing, but might need different formatting
      const emailUri = `${FileSystem.cacheDirectory}email_${filename}`;

      await FileSystem.copyAsync({
        from: sourceUri,
        to: emailUri,
      });

      return {
        success: true,
        uri: emailUri,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to prepare file for email',
      };
    }
  }

  /**
   * Upload to cloud service
   */
  private async uploadToCloud(
    sourceUri: string,
    destination: ExportDestination,
    filename: string
  ): Promise<ExportResult> {
    try {
      // This is a placeholder for cloud upload functionality
      // In a real implementation, this would integrate with cloud APIs

      if (!destination.uri) {
        return {
          success: false,
          error: 'No cloud destination URI provided',
        };
      }

      // For now, just copy to a cloud-sync directory if available
      const cloudUri = `${destination.uri}/${filename}`;

      await FileSystem.copyAsync({
        from: sourceUri,
        to: cloudUri,
      });

      return {
        success: true,
        uri: cloudUri,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to upload to cloud',
      };
    }
  }

  /**
   * Get export formats
   */
  getSupportedExportFormats(): Array<{
    format: string;
    extension: string;
    description: string;
  }> {
    return [
      { format: 'gpx', extension: '.gpx', description: 'GPS Exchange Format' },
      {
        format: 'kml',
        extension: '.kml',
        description: 'Keyhole Markup Language (Future)',
      },
      {
        format: 'tcx',
        extension: '.tcx',
        description: 'Training Center XML (Future)',
      },
    ];
  }

  /**
   * Estimate export time
   */
  estimateExportTime(fileSizeBytes: number, format: string = 'gpx'): number {
    // Base time for GPX export (very fast)
    let baseTime = Math.max(1, Math.ceil(fileSizeBytes / (10 * 1024 * 1024))); // 10MB per second

    // Add time for format conversion if needed
    if (format !== 'gpx') {
      baseTime *= 2; // Conversion takes extra time
    }

    return baseTime;
  }

  /**
   * Get export statistics
   */
  async getExportStatistics(): Promise<{
    totalExports: number;
    exportsByFormat: Record<string, number>;
    totalSizeExported: number;
  }> {
    // This would typically be stored in a database
    // For now, return placeholder data
    return {
      totalExports: 0,
      exportsByFormat: {
        gpx: 0,
        kml: 0,
        tcx: 0,
      },
      totalSizeExported: 0,
    };
  }

  /**
   * Clean up temporary export files
   */
  async cleanupTempFiles(): Promise<void> {
    try {
      const cacheDir = FileSystem.cacheDirectory;
      if (!cacheDir) return;

      const files = await FileSystem.readDirectoryAsync(cacheDir);

      for (const filename of files) {
        if (
          filename.startsWith('export_') ||
          filename.startsWith('share_') ||
          filename.startsWith('email_')
        ) {
          const fileUri = `${cacheDir}${filename}`;
          const fileInfo = await FileSystem.getInfoAsync(fileUri);

          if (fileInfo.exists) {
            await FileSystem.deleteAsync(fileUri);
          }
        }
      }
    } catch (error) {
      console.error('Error cleaning up temp files:', error);
    }
  }
}
