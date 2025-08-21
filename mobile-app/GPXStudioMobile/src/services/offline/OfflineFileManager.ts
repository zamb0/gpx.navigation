import * as FileSystem from 'expo-file-system';
import {
  MobileGPXFile,
  GPXFileMetadata,
  OfflineGPXFileMetadata,
} from '../../types/gpx';
import { OfflineService } from './OfflineService';
import { FileManager } from '../file/FileManager';

export interface OfflineFileConfig {
  enableOfflineAccess: boolean;
  maxOfflineFiles: number;
  offlineCacheSize: number; // bytes
  autoDownloadFavorites: boolean;
}

export interface OfflineFileStatus {
  isAvailableOffline: boolean;
  lastSyncedAt?: Date;
  sizeBytes: number;
  isFavorite: boolean;
}

export class OfflineFileManager extends FileManager {
  private offlineService: OfflineService;
  private config: OfflineFileConfig;
  private offlineFilesDir: string;
  private offlineIndex: Map<string, OfflineFileStatus> = new Map();

  constructor(
    offlineService: OfflineService,
    config?: Partial<OfflineFileConfig>
  ) {
    super();
    this.offlineService = offlineService;
    this.config = {
      enableOfflineAccess: true,
      maxOfflineFiles: 100,
      offlineCacheSize: 100 * 1024 * 1024, // 100MB
      autoDownloadFavorites: true,
      ...config,
    };

    this.offlineFilesDir = `${FileSystem.documentDirectory}offline_gpx/`;
    this.initializeOfflineStorage();
  }

  private async initializeOfflineStorage(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.offlineFilesDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.offlineFilesDir, {
          intermediates: true,
        });
      }
      await this.loadOfflineIndex();
    } catch (error) {
      console.error('Failed to initialize offline storage:', error);
    }
  }

  private async loadOfflineIndex(): Promise<void> {
    try {
      const indexPath = `${this.offlineFilesDir}index.json`;
      const indexInfo = await FileSystem.getInfoAsync(indexPath);

      if (indexInfo.exists) {
        const indexContent = await FileSystem.readAsStringAsync(indexPath);
        const indexData = JSON.parse(indexContent);

        for (const [fileId, status] of Object.entries(indexData)) {
          this.offlineIndex.set(fileId, {
            ...(status as OfflineFileStatus),
            lastSyncedAt: (status as any).lastSyncedAt
              ? new Date((status as any).lastSyncedAt)
              : undefined,
          });
        }
      }
    } catch (error) {
      console.error('Failed to load offline index:', error);
    }
  }

  private async saveOfflineIndex(): Promise<void> {
    try {
      const indexPath = `${this.offlineFilesDir}index.json`;
      const indexData: Record<string, any> = {};

      Array.from(this.offlineIndex.entries()).forEach(([fileId, status]) => {
        indexData[fileId] = {
          ...status,
          lastSyncedAt: status.lastSyncedAt?.toISOString(),
        };
      });

      await FileSystem.writeAsStringAsync(indexPath, JSON.stringify(indexData));
    } catch (error) {
      console.error('Failed to save offline index:', error);
    }
  }

  private getOfflineFilePath(fileId: string): string {
    return `${this.offlineFilesDir}${fileId}.gpx`;
  }

  // Enhanced file operations with offline support
  async loadFile(fileId: string): Promise<MobileGPXFile | null> {
    return await this.offlineService.executeWithFallback(
      // Online operation
      async () => {
        const file = await super.getFile(fileId);
        if (file && this.config.enableOfflineAccess) {
          // Cache file for offline access
          await this.cacheFileOffline(fileId, file);
        }
        return file;
      },
      // Offline operation
      async () => {
        return await this.loadOfflineFile(fileId);
      }
    );
  }

  async saveFile(gpxFile: MobileGPXFile, filename: string): Promise<string> {
    const fileId = await this.offlineService.executeOrQueue(
      // Online operation
      async () => {
        // Generate a unique ID for the file
        const id = `gpx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Save the file metadata to database
        await this.gpxFilesRepository.create(gpxFile.metadata);

        if (this.config.enableOfflineAccess) {
          await this.cacheFileOffline(id, gpxFile);
        }
        return id;
      },
      // Queue data for later sync
      { gpxFile, filename },
      'file_upload'
    );

    // If online operation failed, save locally and queue for sync
    if (!fileId) {
      const localId = this.generateOfflineFileId();
      await this.saveOfflineFile(localId, gpxFile, filename);
      return localId;
    }

    return fileId;
  }

  async deleteFile(fileId: string): Promise<boolean> {
    await this.offlineService.executeOrQueue(
      // Online operation
      async () => {
        await super.deleteFile(fileId);
        await this.removeOfflineFile(fileId);
      },
      // Queue data for later sync
      { fileId, action: 'delete' },
      'sync_settings'
    );

    // Always remove from offline cache
    await this.removeOfflineFile(fileId);
    return true;
  }

  async getFileList(): Promise<GPXFileMetadata[]> {
    return await this.offlineService.executeWithFallback(
      // Online operation
      async () => {
        const onlineFiles = await super.getFileList();
        // Update offline status for each file
        return onlineFiles.map((file) => ({
          ...file,
          isAvailableOffline: this.isFileAvailableOffline(file.id),
        }));
      },
      // Offline operation
      async () => {
        return await this.getOfflineFileList();
      }
    );
  }

  // Offline-specific methods
  async cacheFileOffline(
    fileId: string,
    gpxFile: MobileGPXFile
  ): Promise<void> {
    if (!this.config.enableOfflineAccess) {
      return;
    }

    try {
      const filePath = this.getOfflineFilePath(fileId);
      const gpxContent = this.serializeGPXFile(gpxFile);

      await FileSystem.writeAsStringAsync(filePath, gpxContent);

      const fileInfo = await FileSystem.getInfoAsync(filePath);
      const sizeBytes =
        fileInfo.exists && 'size' in fileInfo ? fileInfo.size : 0;

      this.offlineIndex.set(fileId, {
        isAvailableOffline: true,
        lastSyncedAt: new Date(),
        sizeBytes,
        isFavorite: false, // This would be set based on user preferences
      });

      await this.saveOfflineIndex();
      await this.manageOfflineStorage();
    } catch (error) {
      console.error('Failed to cache file offline:', error);
    }
  }

  async loadOfflineFile(fileId: string): Promise<MobileGPXFile | null> {
    try {
      const filePath = this.getOfflineFilePath(fileId);
      const fileInfo = await FileSystem.getInfoAsync(filePath);

      if (!fileInfo.exists) {
        return null;
      }

      const gpxContent = await FileSystem.readAsStringAsync(filePath);
      return this.parseGPXContent(gpxContent);
    } catch (error) {
      console.error('Failed to load offline file:', error);
      return null;
    }
  }

  async saveOfflineFile(
    fileId: string,
    gpxFile: MobileGPXFile,
    filename: string
  ): Promise<void> {
    try {
      const filePath = this.getOfflineFilePath(fileId);
      const gpxContent = this.serializeGPXFile(gpxFile);

      await FileSystem.writeAsStringAsync(filePath, gpxContent);

      const fileInfo = await FileSystem.getInfoAsync(filePath);
      const sizeBytes =
        fileInfo.exists && 'size' in fileInfo ? fileInfo.size : 0;

      this.offlineIndex.set(fileId, {
        isAvailableOffline: true,
        lastSyncedAt: new Date(),
        sizeBytes,
        isFavorite: false,
      });

      await this.saveOfflineIndex();
    } catch (error) {
      console.error('Failed to save offline file:', error);
    }
  }

  async removeOfflineFile(fileId: string): Promise<void> {
    try {
      const filePath = this.getOfflineFilePath(fileId);
      const fileInfo = await FileSystem.getInfoAsync(filePath);

      if (fileInfo.exists) {
        await FileSystem.deleteAsync(filePath);
      }

      this.offlineIndex.delete(fileId);
      await this.saveOfflineIndex();
    } catch (error) {
      console.error('Failed to remove offline file:', error);
    }
  }

  async getOfflineFileList(): Promise<OfflineGPXFileMetadata[]> {
    const offlineFiles: OfflineGPXFileMetadata[] = [];

    for (const [fileId, status] of this.offlineIndex.entries()) {
      try {
        const gpxFile = await this.loadOfflineFile(fileId);
        if (gpxFile) {
          const metadata = this.extractMetadata(gpxFile, fileId);
          offlineFiles.push({
            ...metadata,
            isAvailableOffline: true,
          });
        }
      } catch (error) {
        console.error(`Failed to load offline file ${fileId}:`, error);
      }
    }

    return offlineFiles;
  }

  isFileAvailableOffline(fileId: string): boolean {
    const status = this.offlineIndex.get(fileId);
    return status?.isAvailableOffline ?? false;
  }

  async setFileFavorite(fileId: string, isFavorite: boolean): Promise<void> {
    const status = this.offlineIndex.get(fileId);
    if (status) {
      status.isFavorite = isFavorite;
      await this.saveOfflineIndex();

      // Auto-download favorites if enabled
      if (isFavorite && this.config.autoDownloadFavorites) {
        const file = await this.loadFile(fileId);
        if (file) {
          await this.cacheFileOffline(fileId, file);
        }
      }
    }
  }

  async getOfflineStorageInfo(): Promise<{
    totalFiles: number;
    totalSize: number;
    availableSpace: number;
  }> {
    let totalSize = 0;
    Array.from(this.offlineIndex.values()).forEach((status) => {
      totalSize += status.sizeBytes;
    });

    const availableSpace = this.config.offlineCacheSize - totalSize;

    return {
      totalFiles: this.offlineIndex.size,
      totalSize,
      availableSpace,
    };
  }

  async clearOfflineCache(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.offlineFilesDir);
      if (dirInfo.exists) {
        await FileSystem.deleteAsync(this.offlineFilesDir);
        await FileSystem.makeDirectoryAsync(this.offlineFilesDir, {
          intermediates: true,
        });
      }

      this.offlineIndex.clear();
      await this.saveOfflineIndex();
    } catch (error) {
      console.error('Failed to clear offline cache:', error);
    }
  }

  private async manageOfflineStorage(): Promise<void> {
    const storageInfo = await this.getOfflineStorageInfo();

    // If we're over the cache size limit, remove oldest non-favorite files
    if (storageInfo.totalSize > this.config.offlineCacheSize) {
      const sortedFiles = Array.from(this.offlineIndex.entries())
        .filter(([, status]) => !status.isFavorite)
        .sort(([, a], [, b]) => {
          const aTime = a.lastSyncedAt?.getTime() ?? 0;
          const bTime = b.lastSyncedAt?.getTime() ?? 0;
          return aTime - bTime; // Oldest first
        });

      let currentSize = storageInfo.totalSize;
      const targetSize = this.config.offlineCacheSize * 0.8; // Clean up to 80%

      for (const [fileId, status] of sortedFiles) {
        if (currentSize <= targetSize) {
          break;
        }

        await this.removeOfflineFile(fileId);
        currentSize -= status.sizeBytes;
      }
    }

    // If we have too many files, remove oldest non-favorites
    if (this.offlineIndex.size > this.config.maxOfflineFiles) {
      const sortedFiles = Array.from(this.offlineIndex.entries())
        .filter(([, status]) => !status.isFavorite)
        .sort(([, a], [, b]) => {
          const aTime = a.lastSyncedAt?.getTime() ?? 0;
          const bTime = b.lastSyncedAt?.getTime() ?? 0;
          return aTime - bTime;
        });

      const filesToRemove = sortedFiles.slice(
        0,
        this.offlineIndex.size - this.config.maxOfflineFiles
      );

      for (const [fileId] of filesToRemove) {
        await this.removeOfflineFile(fileId);
      }
    }
  }

  private serializeGPXFile(gpxFile: MobileGPXFile): string {
    // This would use the existing GPX library to serialize
    // For now, return JSON representation
    return JSON.stringify(gpxFile);
  }

  private parseGPXContent(content: string): MobileGPXFile {
    // This would use the existing GPX library to parse
    // For now, parse JSON representation
    return JSON.parse(content);
  }

  private extractMetadata(
    gpxFile: MobileGPXFile,
    fileId: string
  ): GPXFileMetadata {
    // Extract metadata from GPX file
    // This would use existing metadata extraction logic
    return {
      id: fileId,
      filename: gpxFile.metadata?.name || 'Untitled',
      name: gpxFile.metadata?.name,
      description: gpxFile.metadata.description,
      createdAt: new Date(),
      modifiedAt: new Date(),
      fileSize: 0, // Would be calculated
      trackCount: gpxFile.gpxFile.trk?.length || 0,
      waypointCount: gpxFile.gpxFile.wpt?.length || 0,
      totalDistance: 0, // Would be calculated
      elevationGain: 0, // Would be calculated
      elevationLoss: 0, // Would be calculated
      bounds: {
        north: 0,
        south: 0,
        east: 0,
        west: 0,
      }, // Would be calculated
      filePath: `${this.offlineFilesDir}${fileId}.gpx`,
    };
  }

  private generateOfflineFileId(): string {
    return `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
