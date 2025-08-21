/**
 * Enhanced FileImportService with comprehensive error handling
 * This demonstrates how to integrate the error handling system into existing services
 */

import * as FileSystem from 'expo-file-system';
import { FileManager, ImportResult } from './FileManager';
import { FileValidator, FileValidationOptions } from './FileValidator';
import { GPXImportOptions } from '../../types/gpx';
import { ErrorFactory, ErrorHandler } from '../error';
import {
  ImportSource,
  BatchImportResult,
  ImportProgress,
} from './FileImportService';

export class EnhancedFileImportService {
  private fileManager: FileManager;
  private fileValidator: FileValidator;
  private errorHandler: ErrorHandler;

  constructor() {
    this.fileManager = new FileManager();
    this.fileValidator = new FileValidator();
    this.errorHandler = ErrorHandler.getInstance();
  }

  /**
   * Import single file with comprehensive error handling
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

      // Check if file exists and is accessible
      await this.validateFileAccess(source);

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
        const error = ErrorFactory.createInvalidGPXError(
          progress.currentFileName,
          validationResult.errors.join(', ')
        );
        throw error;
      }

      // Report import progress
      progress.status = 'importing';
      onProgress?.(progress);

      // Import based on source type
      let result: ImportResult;

      switch (source.type) {
        case 'device':
          result = await this.importFromDevice(source, options);
          break;

        case 'url':
          result = await this.importFromUrl(source, options);
          break;

        case 'email':
          result = await this.importFromEmailAttachment(source, options);
          break;

        case 'cloud':
          result = await this.importFromCloudService(source, options);
          break;

        default:
          throw ErrorFactory.createUnknownError(
            new Error(`Unsupported import source type: ${source.type}`),
            'FileImport'
          );
      }

      // Report completion
      progress.status = 'complete';
      onProgress?.(progress);

      return result;
    } catch (error) {
      // Report error status
      progress.status = 'error';
      onProgress?.(progress);

      // Handle and re-throw the error
      await this.errorHandler.handleError(error as Error, 'FileImport');
      throw error;
    }
  }

  /**
   * Import multiple files with batch error handling
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

      try {
        const result = await this.importFile(source, options, onProgress);
        results.push({ ...result, source });

        if (result.success) {
          successCount++;
        } else {
          failureCount++;
        }
      } catch (error) {
        // Log individual file errors but continue with batch
        await this.errorHandler.handleError(
          error as Error,
          `BatchImport:${source.uri}`
        );

        results.push({
          success: false,
          error: (error as Error).message,
          source,
        });
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
   * Validate file access with proper error handling
   */
  private async validateFileAccess(source: ImportSource): Promise<void> {
    try {
      if (source.type === 'device') {
        const fileInfo = await FileSystem.getInfoAsync(source.uri);

        if (!fileInfo.exists) {
          throw ErrorFactory.createFileNotFoundError(
            source.name || source.uri.split('/').pop() || 'Unknown'
          );
        }

        if (fileInfo.size === 0) {
          throw ErrorFactory.createInvalidGPXError(
            source.name || 'Unknown',
            'File is empty'
          );
        }

        // Check file size limits (10MB max)
        const maxSize = 10 * 1024 * 1024;
        if (fileInfo.size > maxSize) {
          throw ErrorFactory.createFileTooLargeError(
            source.name || 'Unknown',
            fileInfo.size,
            maxSize
          );
        }
      }
    } catch (error: any) {
      if (error.code === 'ENOENT' || error.code === 'EACCES') {
        throw ErrorFactory.createFilePermissionError('read');
      }
      throw error;
    }
  }

  /**
   * Import from device with error handling
   */
  private async importFromDevice(
    source: ImportSource,
    options: GPXImportOptions
  ): Promise<ImportResult> {
    try {
      return await this.fileManager.importFromDevice(source.uri, options);
    } catch (error: any) {
      // Transform generic errors into specific file errors
      if (error.message && error.message.includes('permission')) {
        throw ErrorFactory.createFilePermissionError('read');
      }
      if (error.message && error.message.includes('not found')) {
        throw ErrorFactory.createFileNotFoundError(source.name || 'Unknown');
      }
      if (error.message && error.message.includes('storage')) {
        throw ErrorFactory.createStorageFullError();
      }

      throw ErrorFactory.createUnknownError(error as Error, 'DeviceImport');
    }
  }

  /**
   * Import from URL with network error handling
   */
  private async importFromUrl(
    source: ImportSource,
    options: GPXImportOptions
  ): Promise<ImportResult> {
    try {
      return await this.fileManager.importFromUrl(source.uri, options);
    } catch (error) {
      const errorMessage = (error as Error).message.toLowerCase();

      if (
        errorMessage.includes('network') ||
        errorMessage.includes('connection')
      ) {
        throw ErrorFactory.createNoInternetError();
      }
      if (errorMessage.includes('timeout')) {
        throw ErrorFactory.createNetworkTimeoutError('file download');
      }
      if (errorMessage.includes('404') || errorMessage.includes('not found')) {
        throw ErrorFactory.createFileNotFoundError(source.uri);
      }
      if (errorMessage.includes('500') || errorMessage.includes('server')) {
        throw ErrorFactory.createServerError(500, 'file download');
      }

      throw ErrorFactory.createUnknownError(error as Error, 'URLImport');
    }
  }

  /**
   * Import from email attachment with error handling
   */
  private async importFromEmailAttachment(
    source: ImportSource,
    options: GPXImportOptions
  ): Promise<ImportResult> {
    try {
      // Email attachments are typically saved to device first
      return await this.fileManager.importFromDevice(source.uri, options);
    } catch (error) {
      throw ErrorFactory.createUnknownError(error as Error, 'EmailImport');
    }
  }

  /**
   * Import from cloud service with error handling
   */
  private async importFromCloudService(
    source: ImportSource,
    options: GPXImportOptions
  ): Promise<ImportResult> {
    try {
      // This would integrate with cloud service APIs
      // For now, treat as URL import
      return await this.importFromUrl(source, options);
    } catch (error) {
      throw ErrorFactory.createUnknownError(error as Error, 'CloudImport');
    }
  }

  /**
   * Cancel ongoing import operation
   */
  async cancelImport(): Promise<void> {
    try {
      // Implementation would cancel ongoing operations
      // For now, just create a cancellation error
      throw ErrorFactory.createOperationCancelledError('file import');
    } catch (error) {
      // Don't handle cancellation errors - they're expected
      throw error;
    }
  }
}
