import * as FileSystem from 'expo-file-system';
import { FileManager, ImportResult } from './FileManager';
import { FileValidator, FileValidationOptions } from './FileValidator';
import { GPXImportOptions } from '../../types/gpx';

export interface ImportSource {
  type: 'device' | 'url' | 'email' | 'cloud';
  uri: string;
  name?: string;
  metadata?: Record<string, any>;
}

export interface BatchImportResult {
  totalFiles: number;
  successCount: number;
  failureCount: number;
  results: Array<ImportResult & { source: ImportSource }>;
}

export interface ImportProgress {
  currentFile: number;
  totalFiles: number;
  currentFileName: string;
  status: 'validating' | 'importing' | 'processing' | 'complete' | 'error';
}

export class FileImportService {
  private fileManager: FileManager;
  private fileValidator: FileValidator;

  constructor() {
    this.fileManager = new FileManager();
    this.fileValidator = new FileValidator();
  }

  /**
   * Import single file from various sources
   */
  async importFile(
    source: ImportSource,
    options: GPXImportOptions = {},
    onProgress?: (progress: ImportProgress) => void
  ): Promise<ImportResult> {
    const progress: ImportProgress = {
      currentFile: 1,
      totalFiles: 1,
      currentFileName: source.name || source.uri.split('/').pop() || 'Unknown',
      status: 'validating',
    };

    try {
      // Report validation progress
      onProgress?.(progress);

      // Validate file first
      const validationOptions: FileValidationOptions = {
        checkFileSize: true,
        checkEncoding: true,
        validateXML: true,
        validateGPXStructure: options.validateOnImport !== false,
      };

      const validationResult = await this.fileValidator.validateFile(
        source.uri,
        validationOptions
      );

      if (!validationResult.isValid) {
        return {
          success: false,
          error: `Validation failed: ${validationResult.errors.join(', ')}`,
          validation: validationResult,
        };
      }

      // Report import progress
      progress.status = 'importing';
      onProgress?.(progress);

      // Import based on source type
      let result: ImportResult;

      switch (source.type) {
        case 'device':
          result = await this.fileManager.importFromDevice(source.uri, options);
          break;

        case 'url':
          result = await this.fileManager.importFromUrl(source.uri, options);
          break;

        case 'email':
          // Email attachments are typically saved to device first
          result = await this.importFromEmailAttachment(source, options);
          break;

        case 'cloud':
          result = await this.importFromCloudService(source, options);
          break;

        default:
          return {
            success: false,
            error: `Unsupported import source type: ${source.type}`,
          };
      }

      // Report completion
      progress.status = result.success ? 'complete' : 'error';
      onProgress?.(progress);

      return result;
    } catch (error) {
      progress.status = 'error';
      onProgress?.(progress);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Import failed',
      };
    }
  }

  /**
   * Import multiple files in batch
   */
  async importBatch(
    sources: ImportSource[],
    options: GPXImportOptions = {},
    onProgress?: (progress: ImportProgress) => void
  ): Promise<BatchImportResult> {
    const results: Array<ImportResult & { source: ImportSource }> = [];
    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < sources.length; i++) {
      const source = sources[i];

      const progress: ImportProgress = {
        currentFile: i + 1,
        totalFiles: sources.length,
        currentFileName:
          source.name || source.uri.split('/').pop() || 'Unknown',
        status: 'validating',
      };

      onProgress?.(progress);

      try {
        const result = await this.importFile(source, options, onProgress);

        results.push({ ...result, source });

        if (result.success) {
          successCount++;
        } else {
          failureCount++;
        }
      } catch (error) {
        const errorResult: ImportResult & { source: ImportSource } = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          source,
        };

        results.push(errorResult);
        failureCount++;
      }
    }

    return {
      totalFiles: sources.length,
      successCount,
      failureCount,
      results,
    };
  }

  /**
   * Import from email attachment
   */
  private async importFromEmailAttachment(
    source: ImportSource,
    options: GPXImportOptions
  ): Promise<ImportResult> {
    try {
      // Email attachments are typically already saved to a temporary location
      // We need to copy them to our app directory
      return await this.fileManager.importFromDevice(source.uri, options);
    } catch (error) {
      return {
        success: false,
        error: `Failed to import email attachment: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Import from cloud service
   */
  private async importFromCloudService(
    source: ImportSource,
    options: GPXImportOptions
  ): Promise<ImportResult> {
    try {
      // For cloud services, we typically get a download URL
      // This is similar to URL import but might need authentication

      if (source.uri.startsWith('http')) {
        return await this.fileManager.importFromUrl(source.uri, options);
      } else {
        // If it's a local file path from cloud sync
        return await this.fileManager.importFromDevice(source.uri, options);
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to import from cloud service: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Scan directory for GPX files
   */
  async scanDirectoryForGPXFiles(
    directoryUri: string
  ): Promise<ImportSource[]> {
    try {
      const sources: ImportSource[] = [];

      // Check if directory exists
      const dirInfo = await FileSystem.getInfoAsync(directoryUri);
      if (!dirInfo.exists || !dirInfo.isDirectory) {
        return sources;
      }

      // Read directory contents
      const files = await FileSystem.readDirectoryAsync(directoryUri);

      for (const filename of files) {
        const fileUri = `${directoryUri}/${filename}`;
        const fileInfo = await FileSystem.getInfoAsync(fileUri);

        // Skip directories and non-GPX files
        if (fileInfo.isDirectory) {
          continue;
        }

        const extension = filename.toLowerCase().split('.').pop();
        if (extension === 'gpx' || extension === 'xml') {
          sources.push({
            type: 'device',
            uri: fileUri,
            name: filename,
          });
        }
      }

      return sources;
    } catch (error) {
      console.error('Error scanning directory:', error);
      return [];
    }
  }

  /**
   * Get supported file types
   */
  getSupportedFileTypes(): string[] {
    return ['.gpx', '.xml'];
  }

  /**
   * Check if file type is supported
   */
  isFileTypeSupported(filename: string): boolean {
    const extension = filename.toLowerCase().split('.').pop();
    return extension === 'gpx' || extension === 'xml';
  }

  /**
   * Estimate import time based on file size
   */
  estimateImportTime(fileSizeBytes: number): number {
    // Rough estimation: 1MB per second for processing
    const baseSizePerSecond = 1024 * 1024; // 1MB
    const estimatedSeconds = Math.max(
      1,
      Math.ceil(fileSizeBytes / baseSizePerSecond)
    );
    return estimatedSeconds;
  }

  /**
   * Get import statistics
   */
  async getImportStatistics(): Promise<{
    totalImports: number;
    successfulImports: number;
    failedImports: number;
    totalSizeImported: number;
  }> {
    try {
      const files = await this.fileManager.getFileList();

      return {
        totalImports: files.length,
        successfulImports: files.length, // All files in the list are successful
        failedImports: 0, // We don't store failed imports
        totalSizeImported: files.reduce(
          (total, file) => total + file.fileSize,
          0
        ),
      };
    } catch (error) {
      return {
        totalImports: 0,
        successfulImports: 0,
        failedImports: 0,
        totalSizeImported: 0,
      };
    }
  }
}
