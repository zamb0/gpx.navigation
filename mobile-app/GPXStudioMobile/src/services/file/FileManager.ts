import * as FileSystem from 'expo-file-system';
import {
  GPXFileMetadata,
  GPXImportOptions,
  GPXExportOptions,
  GPXValidationResult,
  MobileGPXFile,
} from '../../types/gpx';
import { GPXValidator } from '../gpx/GPXValidator';
import { GPXMetadataExtractor } from '../gpx/GPXMetadataExtractor';
import { GPXFilesRepository } from '../database/GPXFilesRepository';
import { DatabaseManager } from '../database/DatabaseManager';

export interface ImportResult {
  success: boolean;
  file?: MobileGPXFile;
  error?: string;
  validation?: GPXValidationResult;
}

export interface ExportResult {
  success: boolean;
  uri?: string;
  error?: string;
}

export class FileManager {
  private gpxValidator: GPXValidator;
  private metadataExtractor: GPXMetadataExtractor;
  protected gpxFilesRepository: GPXFilesRepository;
  private readonly documentsDirectory: string;
  private readonly gpxDirectory: string;

  constructor() {
    this.gpxValidator = new GPXValidator();
    this.metadataExtractor = new GPXMetadataExtractor();
    this.documentsDirectory = FileSystem.documentDirectory!;
    this.gpxDirectory = `${this.documentsDirectory}gpx/`;

    // Initialize repository
    this.gpxFilesRepository = new GPXFilesRepository();

    // Ensure GPX directory exists
    this.ensureGPXDirectoryExists();
  }

  /**
   * Ensure the GPX directory exists
   */
  private async ensureGPXDirectoryExists(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.gpxDirectory);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.gpxDirectory, {
          intermediates: true,
        });
      }
    } catch (error) {
      console.error('Error creating GPX directory:', error);
      throw new Error('Failed to create GPX storage directory');
    }
  }

  /**
   * Import GPX file from device storage
   */
  async importFromDevice(
    uri: string,
    options: GPXImportOptions = {}
  ): Promise<ImportResult> {
    try {
      // Check if file exists
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) {
        return { success: false, error: 'File not found' };
      }

      // Read file content
      const content = await FileSystem.readAsStringAsync(uri);

      // Validate if requested
      let validation: GPXValidationResult | undefined;
      if (options.validateOnImport !== false) {
        validation = this.gpxValidator.validateGPXString(content);
        if (!validation.isValid) {
          return {
            success: false,
            error: `Invalid GPX file: ${validation.errors.join(', ')}`,
            validation,
          };
        }
      }

      // Generate unique filename
      const originalFilename = uri.split('/').pop() || 'imported.gpx';
      const filename = await this.generateUniqueFilename(originalFilename);
      const destinationUri = `${this.gpxDirectory}${filename}`;

      // Copy file to app directory
      await FileSystem.copyAsync({
        from: uri,
        to: destinationUri,
      });

      // Extract metadata if requested
      let metadata: GPXFileMetadata | undefined;
      if (options.extractMetadata !== false) {
        // For now, create a basic metadata object
        // In a real implementation, we would parse the GPX content first
        const fileId = this.generateFileId();
        metadata = {
          id: fileId,
          filename,
          name: filename.replace(/\.[^/.]+$/, ''),
          description: undefined,
          createdAt: new Date(),
          modifiedAt: new Date(),
          fileSize: fileInfo.size || 0,
          trackCount: 1, // Placeholder
          waypointCount: 0, // Placeholder
          totalDistance: 0, // Placeholder
          elevationGain: 0, // Placeholder
          elevationLoss: 0, // Placeholder
          bounds: { north: 0, south: 0, east: 0, west: 0 }, // Placeholder
          thumbnail: undefined,
          filePath: destinationUri,
        };
      }

      // Generate thumbnail if requested
      if (options.generateThumbnail && metadata) {
        metadata.thumbnail = await this.generateThumbnail(metadata);
      }

      // Save to database
      if (metadata) {
        await this.gpxFilesRepository.create(metadata);

        const mobileGPXFile: MobileGPXFile = {
          id: metadata.id,
          metadata,
          gpxFile: content, // Store the raw content for now
        };

        return {
          success: true,
          file: mobileGPXFile,
          validation,
        };
      }

      return { success: false, error: 'Failed to extract metadata' };
    } catch (error) {
      console.error('Error importing file from device:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Import GPX file from URL
   */
  async importFromUrl(
    url: string,
    options: GPXImportOptions = {}
  ): Promise<ImportResult> {
    try {
      // Download file
      const filename = this.extractFilenameFromUrl(url) || 'downloaded.gpx';
      const destinationUri = `${this.gpxDirectory}${await this.generateUniqueFilename(filename)}`;

      const downloadResult = await FileSystem.downloadAsync(
        url,
        destinationUri
      );

      if (downloadResult.status !== 200) {
        return {
          success: false,
          error: `Failed to download file: HTTP ${downloadResult.status}`,
        };
      }

      // Process the downloaded file
      return await this.importFromDevice(downloadResult.uri, options);
    } catch (error) {
      console.error('Error importing file from URL:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to download file',
      };
    }
  }

  /**
   * Export GPX file
   */
  async exportFile(
    fileId: string,
    options: GPXExportOptions = {}
  ): Promise<ExportResult> {
    try {
      // Get file metadata from database
      const metadata = await this.gpxFilesRepository.getById(fileId);
      if (!metadata) {
        return { success: false, error: 'File not found' };
      }

      // Check if source file exists
      const fileInfo = await FileSystem.getInfoAsync(metadata.filePath);
      if (!fileInfo.exists) {
        return { success: false, error: 'Source file not found' };
      }

      // For now, just copy the file to a shareable location
      // In the future, this could apply export options like format conversion
      const exportFilename = `exported_${metadata.filename}`;
      const exportUri = `${FileSystem.cacheDirectory}${exportFilename}`;

      await FileSystem.copyAsync({
        from: metadata.filePath,
        to: exportUri,
      });

      return { success: true, uri: exportUri };
    } catch (error) {
      console.error('Error exporting file:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Export failed',
      };
    }
  }

  /**
   * Delete GPX file
   */
  async deleteFile(fileId: string): Promise<boolean> {
    try {
      // Get file metadata
      const metadata = await this.gpxFilesRepository.getById(fileId);
      if (!metadata) {
        return false;
      }

      // Delete physical file
      const fileInfo = await FileSystem.getInfoAsync(metadata.filePath);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(metadata.filePath);
      }

      // Delete from database
      await this.gpxFilesRepository.delete(fileId);

      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }

  /**
   * Get list of all GPX files
   */
  async getFileList(): Promise<GPXFileMetadata[]> {
    try {
      return await this.gpxFilesRepository.getAll();
    } catch (error) {
      console.error('Error getting file list:', error);
      return [];
    }
  }

  /**
   * Get GPX file by ID
   */
  async getFile(fileId: string): Promise<MobileGPXFile | null> {
    try {
      const metadata = await this.gpxFilesRepository.getById(fileId);
      if (!metadata) {
        return null;
      }

      // Check if file exists
      const fileInfo = await FileSystem.getInfoAsync(metadata.filePath);
      if (!fileInfo.exists) {
        return null;
      }

      // Read file content
      const content = await FileSystem.readAsStringAsync(metadata.filePath);

      return {
        id: metadata.id,
        metadata,
        gpxFile: content,
      };
    } catch (error) {
      console.error('Error getting file:', error);
      return null;
    }
  }

  /**
   * Validate GPX file content
   */
  async validateFile(content: string): Promise<GPXValidationResult> {
    return this.gpxValidator.validateGPXString(content);
  }

  /**
   * Get storage info
   */
  async getStorageInfo(): Promise<{
    totalSize: number;
    availableSize: number;
    usedSize: number;
  }> {
    try {
      const files = await this.getFileList();
      const usedSize = files.reduce((total, file) => total + file.fileSize, 0);

      // Get available space (this is approximate)
      const freeSpace = await FileSystem.getFreeDiskStorageAsync();

      return {
        totalSize: freeSpace + usedSize,
        availableSize: freeSpace,
        usedSize,
      };
    } catch (error) {
      console.error('Error getting storage info:', error);
      return { totalSize: 0, availableSize: 0, usedSize: 0 };
    }
  }

  /**
   * Generate unique filename
   */
  private async generateUniqueFilename(
    originalFilename: string
  ): Promise<string> {
    const baseName = originalFilename.replace(/\.[^/.]+$/, '');
    const extension = originalFilename.includes('.')
      ? originalFilename.split('.').pop()
      : 'gpx';

    let counter = 0;
    let filename = originalFilename;

    while (true) {
      const filePath = `${this.gpxDirectory}${filename}`;
      const fileInfo = await FileSystem.getInfoAsync(filePath);

      if (!fileInfo.exists) {
        break;
      }

      counter++;
      filename = `${baseName}_${counter}.${extension}`;
    }

    return filename;
  }

  /**
   * Generate unique file ID
   */
  private generateFileId(): string {
    return `gpx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Extract filename from URL
   */
  private extractFilenameFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const filename = pathname.split('/').pop();

      if (filename && filename.includes('.')) {
        return filename;
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Generate thumbnail for GPX file
   * This is a placeholder - in a real implementation, this would generate
   * a small map image showing the track
   */
  private async generateThumbnail(metadata: GPXFileMetadata): Promise<string> {
    // Placeholder implementation
    // In a real app, this would generate a small map image
    return `data:image/svg+xml;base64,${Buffer.from(
      `
      <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" fill="#f0f0f0"/>
        <text x="50" y="50" text-anchor="middle" dy=".3em" font-family="Arial" font-size="12">
          GPX
        </text>
      </svg>
    `
    ).toString('base64')}`;
  }
}
