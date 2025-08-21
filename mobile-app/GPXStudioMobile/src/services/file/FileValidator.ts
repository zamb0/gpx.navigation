import * as FileSystem from 'expo-file-system';
import { GPXValidationResult } from '../../types/gpx';
import { GPXValidator } from '../gpx/GPXValidator';

export interface FileValidationOptions {
  checkFileSize?: boolean;
  maxFileSize?: number; // in bytes
  checkEncoding?: boolean;
  validateXML?: boolean;
  validateGPXStructure?: boolean;
}

export interface FileInfo {
  uri: string;
  size: number;
  exists: boolean;
  isReadable: boolean;
}

export class FileValidator {
  private gpxValidator: GPXValidator;
  private readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB default
  private readonly SUPPORTED_EXTENSIONS = ['.gpx', '.xml'];

  constructor() {
    this.gpxValidator = new GPXValidator();
  }

  /**
   * Validate file before import
   */
  async validateFile(
    uri: string,
    options: FileValidationOptions = {}
  ): Promise<GPXValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check if file exists and get info
      const fileInfo = await this.getFileInfo(uri);

      if (!fileInfo.exists) {
        errors.push('File does not exist');
        return { isValid: false, errors, warnings };
      }

      if (!fileInfo.isReadable) {
        errors.push('File is not readable');
        return { isValid: false, errors, warnings };
      }

      // Check file size
      if (options.checkFileSize !== false) {
        const maxSize = options.maxFileSize || this.MAX_FILE_SIZE;
        if (fileInfo.size > maxSize) {
          errors.push(
            `File size (${this.formatFileSize(fileInfo.size)}) exceeds maximum allowed size (${this.formatFileSize(maxSize)})`
          );
        }

        if (fileInfo.size === 0) {
          errors.push('File is empty');
        }
      }

      // Check file extension
      const extension = this.getFileExtension(uri);
      if (!this.SUPPORTED_EXTENSIONS.includes(extension.toLowerCase())) {
        warnings.push(
          `Unsupported file extension: ${extension}. Expected .gpx or .xml`
        );
      }

      // If basic checks failed, return early
      if (errors.length > 0) {
        return { isValid: false, errors, warnings };
      }

      // Read and validate file content
      let content: string;
      try {
        content = await FileSystem.readAsStringAsync(uri);
      } catch (error) {
        errors.push(
          `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        return { isValid: false, errors, warnings };
      }

      // Check encoding
      if (options.checkEncoding !== false) {
        const encodingResult = this.validateEncoding(content);
        if (!encodingResult.isValid) {
          errors.push(...encodingResult.errors);
          warnings.push(...encodingResult.warnings);
        }
      }

      // Validate XML structure
      if (options.validateXML !== false) {
        const xmlResult = this.validateXMLStructure(content);
        if (!xmlResult.isValid) {
          errors.push(...xmlResult.errors);
          warnings.push(...xmlResult.warnings);
        }
      }

      // Validate GPX structure
      if (options.validateGPXStructure !== false && errors.length === 0) {
        const gpxResult = this.gpxValidator.validateGPXString(content);
        errors.push(...gpxResult.errors);
        warnings.push(...gpxResult.warnings);
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      errors.push(
        `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return { isValid: false, errors, warnings };
    }
  }

  /**
   * Get file information
   */
  async getFileInfo(uri: string): Promise<FileInfo> {
    try {
      const info = await FileSystem.getInfoAsync(uri);
      return {
        uri,
        size: (info as any).size || 0,
        exists: info.exists,
        isReadable: info.exists && !info.isDirectory,
      };
    } catch (error) {
      return {
        uri,
        size: 0,
        exists: false,
        isReadable: false,
      };
    }
  }

  /**
   * Validate file encoding
   */
  private validateEncoding(content: string): GPXValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check for BOM (Byte Order Mark)
      if (content.charCodeAt(0) === 0xfeff) {
        warnings.push('File contains BOM (Byte Order Mark)');
      }

      // Check for null characters
      if (content.includes('\0')) {
        errors.push(
          'File contains null characters, may be corrupted or binary'
        );
      }

      // Check for common encoding issues
      if (content.includes('�')) {
        warnings.push(
          'File may have encoding issues (replacement characters found)'
        );
      }

      // Basic UTF-8 validation
      try {
        encodeURIComponent(content);
      } catch {
        errors.push('File contains invalid UTF-8 characters');
      }
    } catch (error) {
      errors.push(
        `Encoding validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate XML structure
   */
  private validateXMLStructure(content: string): GPXValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check for XML declaration
      if (!content.trim().startsWith('<?xml')) {
        warnings.push('Missing XML declaration');
      }

      // Basic XML structure checks
      const openTags = content.match(/<[^/][^>]*>/g) || [];
      const closeTags = content.match(/<\/[^>]*>/g) || [];
      const selfClosingTags = content.match(/<[^>]*\/>/g) || [];

      // Simple tag balance check (not perfect but catches obvious issues)
      const openTagNames = openTags
        .map((tag) => {
          const match = tag.match(/<([^\s>]+)/);
          return match ? match[1] : '';
        })
        .filter(
          (name) =>
            name && !selfClosingTags.some((selfTag) => selfTag.includes(name))
        );

      const closeTagNames = closeTags.map((tag) => {
        const match = tag.match(/<\/([^>]+)>/);
        return match ? match[1] : '';
      });

      if (openTagNames.length !== closeTagNames.length) {
        errors.push('Mismatched XML tags detected');
      }

      // Check for GPX root element
      if (!content.includes('<gpx')) {
        errors.push('Missing GPX root element');
      }

      // Check for common XML issues
      if (content.includes('&') && !content.match(/&(amp|lt|gt|quot|apos);/)) {
        warnings.push('Unescaped ampersand characters found');
      }
    } catch (error) {
      errors.push(
        `XML validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get file extension
   */
  private getFileExtension(uri: string): string {
    const lastDot = uri.lastIndexOf('.');
    return lastDot !== -1 ? uri.substring(lastDot) : '';
  }

  /**
   * Format file size for display
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Attempt to repair common GPX file issues
   */
  async repairFile(content: string): Promise<{
    success: boolean;
    repairedContent?: string;
    changes: string[];
  }> {
    const changes: string[] = [];
    let repairedContent = content;

    try {
      // Remove BOM if present
      if (repairedContent.charCodeAt(0) === 0xfeff) {
        repairedContent = repairedContent.substring(1);
        changes.push('Removed BOM (Byte Order Mark)');
      }

      // Fix common XML entity issues
      const entityFixes = [
        { from: /&(?!(amp|lt|gt|quot|apos);)/g, to: '&amp;' },
        { from: /</g, to: '&lt;' }, // This might be too aggressive
        { from: />/g, to: '&gt;' }, // This might be too aggressive
      ];

      // Only apply entity fixes if they seem safe
      if (
        repairedContent.includes('&') &&
        !repairedContent.match(/&(amp|lt|gt|quot|apos);/)
      ) {
        repairedContent = repairedContent.replace(
          /&(?!(amp|lt|gt|quot|apos);)/g,
          '&amp;'
        );
        changes.push('Fixed unescaped ampersand characters');
      }

      // Add XML declaration if missing
      if (!repairedContent.trim().startsWith('<?xml')) {
        repairedContent =
          '<?xml version="1.0" encoding="UTF-8"?>\n' + repairedContent;
        changes.push('Added XML declaration');
      }

      return {
        success: changes.length > 0,
        repairedContent: changes.length > 0 ? repairedContent : undefined,
        changes,
      };
    } catch (error) {
      return {
        success: false,
        changes: [
          `Repair failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ],
      };
    }
  }
}
