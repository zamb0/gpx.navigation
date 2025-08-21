import { GPXFile, parseGPX, buildGPX } from 'gpx';
import * as FileSystem from 'expo-file-system';
import {
  GPXFileMetadata,
  MobileGPXFile,
  GPXImportOptions,
  GPXExportOptions,
  GPXValidationResult,
} from '../../types/gpx';
import { GPXValidator } from './GPXValidator';
import { GPXConverter } from './GPXConverter';
import { GPXMetadataExtractor } from './GPXMetadataExtractor';

/**
 * Main adapter class that bridges the GPX library with React Native
 * Provides high-level methods for GPX file operations in mobile context
 */
export class GPXAdapter {
  private validator: GPXValidator;
  private converter: GPXConverter;
  private metadataExtractor: GPXMetadataExtractor;

  constructor() {
    this.validator = new GPXValidator();
    this.converter = new GPXConverter();
    this.metadataExtractor = new GPXMetadataExtractor();
  }

  /**
   * Parse GPX file from string content
   */
  async parseFromString(
    gpxContent: string,
    filename: string,
    options: GPXImportOptions = {}
  ): Promise<MobileGPXFile> {
    try {
      // Clean up the content first
      const cleanedContent = this.cleanGPXContent(gpxContent);

      // Parse using the core GPX library first (it has its own validation)
      let gpxFile: GPXFile;
      try {
        gpxFile = parseGPX(cleanedContent);
      } catch (parseError) {
        console.error('GPX parsing error:', parseError);
        console.error(
          'Content preview:',
          cleanedContent.substring(0, 200) + '...'
        );

        // Check for common polyfill issues
        if (parseError instanceof ReferenceError) {
          const message = parseError.message;
          if (message.includes('Buffer')) {
            throw new Error(
              'Buffer polyfill not loaded. Please restart the app.'
            );
          } else if (message.includes('process')) {
            throw new Error(
              'Process polyfill not loaded. Please restart the app.'
            );
          }
        }

        throw new Error(
          `Failed to parse GPX: ${parseError instanceof Error ? parseError.message : String(parseError)}`
        );
      }

      // Validate if requested (after successful parsing)
      if (options.validateOnImport) {
        const validation = this.validator.validateGPXFile(gpxFile);
        if (!validation.isValid) {
          throw new Error(`Invalid GPX file: ${validation.errors.join(', ')}`);
        }
      }

      // Generate unique ID for mobile app
      const id = this.generateFileId();

      // Extract metadata
      const metadata = await this.metadataExtractor.extractMetadata(
        gpxFile,
        filename,
        id,
        options.generateThumbnail
      );

      return {
        id,
        metadata,
        gpxFile,
      };
    } catch (error) {
      throw new Error(
        `Failed to parse GPX file: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Parse GPX file from file URI
   */
  async parseFromFile(
    fileUri: string,
    options: GPXImportOptions = {}
  ): Promise<MobileGPXFile> {
    try {
      // Read file content
      const gpxContent = await FileSystem.readAsStringAsync(fileUri);

      // Extract filename from URI
      const filename = fileUri.split('/').pop() || 'unknown.gpx';

      return await this.parseFromString(gpxContent, filename, options);
    } catch (error) {
      throw new Error(
        `Failed to read GPX file from ${fileUri}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Parse GPX file from URL
   */
  async parseFromUrl(
    url: string,
    options: GPXImportOptions = {}
  ): Promise<MobileGPXFile> {
    try {
      // Download file content
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const gpxContent = await response.text();

      // Extract filename from URL
      const filename = url.split('/').pop()?.split('?')[0] || 'download.gpx';

      return await this.parseFromString(gpxContent, filename, options);
    } catch (error) {
      throw new Error(
        `Failed to download GPX file from ${url}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Export GPX file to string
   */
  exportToString(
    mobileGpxFile: MobileGPXFile,
    options: GPXExportOptions = {}
  ): string {
    try {
      const excludeFields: string[] = [];

      if (options.excludeTimestamps) {
        excludeFields.push('time');
      }
      if (options.excludeElevation) {
        excludeFields.push('ele');
      }
      if (options.excludeExtensions) {
        excludeFields.push('extensions');
      }

      return buildGPX(mobileGpxFile.gpxFile, excludeFields);
    } catch (error) {
      throw new Error(
        `Failed to export GPX file: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Export GPX file to local file system
   */
  async exportToFile(
    mobileGpxFile: MobileGPXFile,
    destinationUri: string,
    options: GPXExportOptions = {}
  ): Promise<void> {
    try {
      const gpxContent = this.exportToString(mobileGpxFile, options);
      await FileSystem.writeAsStringAsync(destinationUri, gpxContent);
    } catch (error) {
      throw new Error(
        `Failed to export GPX file to ${destinationUri}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Validate GPX file
   */
  validateGPXFile(mobileGpxFile: MobileGPXFile): GPXValidationResult {
    return this.validator.validateGPXFile(mobileGpxFile.gpxFile);
  }

  /**
   * Convert GPX file to GeoJSON
   */
  toGeoJSON(mobileGpxFile: MobileGPXFile): GeoJSON.FeatureCollection {
    return mobileGpxFile.gpxFile.toGeoJSON();
  }

  /**
   * Get GPX file statistics
   */
  getStatistics(mobileGpxFile: MobileGPXFile) {
    return mobileGpxFile.gpxFile.getStatistics();
  }

  /**
   * Convert track points to mobile format
   */
  getTrackPointsAsMobile(mobileGpxFile: MobileGPXFile) {
    return this.converter.convertTrackPointsToMobile(mobileGpxFile.gpxFile);
  }

  /**
   * Convert waypoints to mobile format
   */
  getWaypointsAsMobile(mobileGpxFile: MobileGPXFile) {
    return this.converter.convertWaypointsToMobile(mobileGpxFile.gpxFile);
  }

  /**
   * Update GPX file metadata
   */
  updateMetadata(
    mobileGpxFile: MobileGPXFile,
    updates: Partial<GPXFileMetadata>
  ): MobileGPXFile {
    return {
      ...mobileGpxFile,
      metadata: {
        ...mobileGpxFile.metadata,
        ...updates,
        modifiedAt: new Date(),
      },
    };
  }

  /**
   * Clone a GPX file
   */
  clone(mobileGpxFile: MobileGPXFile): MobileGPXFile {
    return {
      id: this.generateFileId(),
      metadata: {
        ...mobileGpxFile.metadata,
        id: this.generateFileId(),
        createdAt: new Date(),
        modifiedAt: new Date(),
      },
      gpxFile: mobileGpxFile.gpxFile.clone(),
    };
  }

  /**
   * Clean GPX content to handle common issues
   */
  private cleanGPXContent(content: string): string {
    let cleaned = content.trim();

    // Remove BOM if present
    if (cleaned.charCodeAt(0) === 0xfeff) {
      cleaned = cleaned.slice(1);
    }

    // Normalize line endings
    cleaned = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Remove any null characters
    cleaned = cleaned.replace(/\0/g, '');

    return cleaned;
  }

  /**
   * Generate unique file ID
   */
  private generateFileId(): string {
    return `gpx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
