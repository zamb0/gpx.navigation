/**
 * Main performance manager that coordinates all performance optimization services
 */

import { LazyGPXLoader } from './LazyGPXLoader';
import { MemoryManager, MemoryConsumer } from './MemoryManager';
import { BackgroundProcessor } from './BackgroundProcessor';
import { BatteryOptimizer } from './BatteryOptimizer';
import { OptimizedTileCache } from './OptimizedTileCache';
import { MobileGPXFile } from '../../types/gpx';
import { MapBounds } from '../../types/map';

export interface PerformanceConfig {
  enableLazyLoading: boolean;
  enableMemoryManagement: boolean;
  enableBackgroundProcessing: boolean;
  enableBatteryOptimization: boolean;
  enableOptimizedTileCache: boolean;
  maxMemoryUsage: number; // MB
  maxConcurrentTasks: number;
}

export interface PerformanceStats {
  memory: {
    usage: number;
    limit: number;
    gpxData: number;
    tiles: number;
    images: number;
  };
  processing: {
    tasksQueued: number;
    tasksRunning: number;
    tasksCompleted: number;
  };
  battery: {
    level: number;
    isCharging: boolean;
    powerSavingActive: boolean;
  };
  tiles: {
    loading: number;
    queued: number;
    cacheHitRate: number;
  };
  gpx: {
    filesLoaded: number;
    chunksInMemory: number;
    memoryUsagePercent: number;
  };
}

export class PerformanceManager {
  private config: PerformanceConfig;
  private lazyLoader?: LazyGPXLoader;
  private memoryManager?: MemoryManager;
  private backgroundProcessor?: BackgroundProcessor;
  private batteryOptimizer?: BatteryOptimizer;
  private tileCache?: OptimizedTileCache;
  private isInitialized: boolean = false;

  constructor(config?: Partial<PerformanceConfig>) {
    this.config = {
      enableLazyLoading: true,
      enableMemoryManagement: true,
      enableBackgroundProcessing: true,
      enableBatteryOptimization: true,
      enableOptimizedTileCache: true,
      maxMemoryUsage: 200, // 200MB
      maxConcurrentTasks: 3,
      ...config,
    };

    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      // Initialize lazy loading
      if (this.config.enableLazyLoading) {
        this.lazyLoader = new LazyGPXLoader();
      }

      // Initialize memory management
      if (this.config.enableMemoryManagement) {
        this.memoryManager = new MemoryManager({
          maxMemoryUsage: this.config.maxMemoryUsage * 1024 * 1024, // Convert to bytes
        });

        // Set up memory warning listener
        this.memoryManager.addMemoryWarningListener((stats) => {
          console.warn('Memory warning:', stats);
          this.handleMemoryWarning(stats);
        });
      }

      // Initialize background processing
      if (this.config.enableBackgroundProcessing) {
        this.backgroundProcessor = new BackgroundProcessor(
          this.config.maxConcurrentTasks
        );
      }

      // Initialize battery optimization
      if (this.config.enableBatteryOptimization) {
        this.batteryOptimizer = new BatteryOptimizer();

        // Set up battery optimization listener
        this.batteryOptimizer.addOptimizationListener((settings) => {
          this.handleBatteryOptimization(settings);
        });
      }

      // Initialize optimized tile cache
      if (this.config.enableOptimizedTileCache) {
        this.tileCache = new OptimizedTileCache();
      }

      this.isInitialized = true;
      console.log('Performance manager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize performance manager:', error);
    }
  }

  /**
   * Load GPX file with performance optimizations
   */
  async loadGPXFile(gpxFile: MobileGPXFile): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Performance manager not initialized');
    }

    // Register GPX file as memory consumer
    if (this.memoryManager) {
      const estimatedSize = this.estimateGPXFileSize(gpxFile);

      const consumer: MemoryConsumer = {
        id: `gpx_${gpxFile.id}`,
        type: 'gpx',
        size: estimatedSize,
        lastAccessed: new Date(),
        priority: 'high',
        cleanup: async () => {
          await this.unloadGPXFile(gpxFile.id);
        },
      };

      this.memoryManager.registerConsumer(consumer);
    }

    // Use lazy loading if enabled
    if (this.lazyLoader) {
      await this.lazyLoader.loadGPXFile(gpxFile);
    }
  }

  /**
   * Get track points for viewport with optimizations
   */
  async getTrackPointsForViewport(
    fileId: string,
    bounds: MapBounds,
    zoom: number,
    userLocation?: { latitude: number; longitude: number }
  ): Promise<any[]> {
    if (!this.lazyLoader) {
      throw new Error('Lazy loading not enabled');
    }

    // Touch memory consumer to mark as accessed
    if (this.memoryManager) {
      this.memoryManager.touchConsumer(`gpx_${fileId}`);
    }

    return await this.lazyLoader.getTrackPointsForViewport(
      fileId,
      bounds,
      zoom,
      userLocation
    );
  }

  /**
   * Process GPX file in background
   */
  async processGPXFileInBackground(
    fileContent: string,
    filename: string,
    onProgress?: (progress: number) => void
  ): Promise<any> {
    if (!this.backgroundProcessor) {
      throw new Error('Background processing not enabled');
    }

    return await this.backgroundProcessor.processGPXFile(
      fileContent,
      filename,
      onProgress
    );
  }

  /**
   * Load map tiles with optimizations
   */
  async loadMapTiles(
    provider: string,
    bounds: MapBounds,
    zoom: number,
    userLocation?: { latitude: number; longitude: number }
  ): Promise<void> {
    if (!this.tileCache) {
      throw new Error('Optimized tile cache not enabled');
    }

    await this.tileCache.loadTilesForViewport(
      provider,
      bounds,
      zoom,
      userLocation
    );
  }

  /**
   * Get optimized GPS settings based on battery state
   */
  getOptimizedGPSSettings(): any {
    if (!this.batteryOptimizer) {
      return null;
    }

    return this.batteryOptimizer.getOptimizedGPSSettings();
  }

  /**
   * Get comprehensive performance statistics
   */
  async getPerformanceStats(): Promise<PerformanceStats> {
    const stats: PerformanceStats = {
      memory: {
        usage: 0,
        limit: this.config.maxMemoryUsage * 1024 * 1024,
        gpxData: 0,
        tiles: 0,
        images: 0,
      },
      processing: {
        tasksQueued: 0,
        tasksRunning: 0,
        tasksCompleted: 0,
      },
      battery: {
        level: 1,
        isCharging: false,
        powerSavingActive: false,
      },
      tiles: {
        loading: 0,
        queued: 0,
        cacheHitRate: 0,
      },
      gpx: {
        filesLoaded: 0,
        chunksInMemory: 0,
        memoryUsagePercent: 0,
      },
    };

    // Memory stats
    if (this.memoryManager) {
      const memoryStats = this.memoryManager.getMemoryStats();
      stats.memory.usage = memoryStats.totalUsage;
      stats.memory.gpxData = memoryStats.gpxDataUsage;
      stats.memory.tiles = memoryStats.mapTileUsage;
      stats.memory.images = memoryStats.imageUsage;
    }

    // Processing stats
    if (this.backgroundProcessor) {
      const processingStats = this.backgroundProcessor.getStats();
      stats.processing.tasksQueued = processingStats.tasksQueued;
      stats.processing.tasksRunning = processingStats.tasksRunning;
      stats.processing.tasksCompleted = processingStats.tasksCompleted;
    }

    // Battery stats
    if (this.batteryOptimizer) {
      const batteryStats = await this.batteryOptimizer.getBatteryStats();
      stats.battery.level = batteryStats.level;
      stats.battery.isCharging = batteryStats.isCharging;
      stats.battery.powerSavingActive = batteryStats.powerSavingActive;
    }

    // Tile cache stats
    if (this.tileCache) {
      const tileStats = this.tileCache.getLoadingStats();
      stats.tiles.loading = tileStats.tilesLoading;
      stats.tiles.queued = tileStats.tilesQueued;
      stats.tiles.cacheHitRate = tileStats.cacheHitRate;
    }

    // GPX lazy loading stats
    if (this.lazyLoader) {
      const gpxStats = this.lazyLoader.getMemoryStats();
      stats.gpx.chunksInMemory = gpxStats.chunksLoaded;
      stats.gpx.memoryUsagePercent = gpxStats.memoryUsagePercent;
    }

    // Count loaded GPX files from memory manager
    if (this.memoryManager) {
      const consumers = this.memoryManager.getTopConsumers(100);
      stats.gpx.filesLoaded = consumers.filter((c) => c.type === 'gpx').length;
    }

    return stats;
  }

  /**
   * Force memory cleanup
   */
  async forceMemoryCleanup(): Promise<void> {
    if (this.memoryManager) {
      await this.memoryManager.forceCleanup();
    }

    if (this.lazyLoader) {
      this.lazyLoader.clearCache();
    }
  }

  /**
   * Clear all caches
   */
  async clearAllCaches(): Promise<void> {
    if (this.tileCache) {
      await this.tileCache.clearCache();
    }

    if (this.lazyLoader) {
      this.lazyLoader.clearCache();
    }

    if (this.backgroundProcessor) {
      this.backgroundProcessor.clearHistory();
    }
  }

  /**
   * Update performance configuration
   */
  updateConfig(newConfig: Partial<PerformanceConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Reinitialize if needed
    if (!this.isInitialized) {
      this.initialize();
    }
  }

  /**
   * Private methods
   */

  private async handleMemoryWarning(stats: any): Promise<void> {
    console.log('Handling memory warning - starting cleanup');

    // Clear low priority items first
    if (this.lazyLoader) {
      this.lazyLoader.clearCache();
    }

    // Cancel low priority background tasks
    if (this.backgroundProcessor) {
      // This would cancel low priority tasks if the API supported it
    }

    // Enable aggressive power saving if memory is critical
    if (stats.isCriticalMemory && this.batteryOptimizer) {
      this.batteryOptimizer.setPowerSavingMode(true);
    }
  }

  private handleBatteryOptimization(settings: any): void {
    console.log('Battery optimization settings updated:', settings);

    // Adjust tile cache behavior based on power saving
    if (this.tileCache && settings.powerSaving.limitBackgroundProcessing) {
      // Reduce concurrent tile loads
      // This would require extending the OptimizedTileCache API
    }

    // Adjust background processing based on battery level
    if (this.backgroundProcessor && settings.battery.level < 0.2) {
      // Reduce concurrent tasks for low battery
      // This would require extending the BackgroundProcessor API
    }
  }

  private estimateGPXFileSize(gpxFile: MobileGPXFile): number {
    // Rough estimation based on track points and metadata
    let estimatedSize = 1000; // Base size for metadata

    for (const track of gpxFile.gpxFile.tracks) {
      for (const segment of track.segments) {
        estimatedSize += segment.points.length * 50; // ~50 bytes per point
      }
    }

    estimatedSize += gpxFile.gpxFile.waypoints.length * 100; // ~100 bytes per waypoint

    return estimatedSize;
  }

  private async unloadGPXFile(fileId: string): Promise<void> {
    console.log(`Unloading GPX file: ${fileId}`);

    if (this.lazyLoader) {
      // Clear specific file from lazy loader cache
      // This would require extending the LazyGPXLoader API
    }

    if (this.memoryManager) {
      this.memoryManager.unregisterConsumer(`gpx_${fileId}`);
    }
  }

  /**
   * Get performance recommendations
   */
  async getPerformanceRecommendations(): Promise<string[]> {
    const recommendations: string[] = [];
    const stats = await this.getPerformanceStats();

    // Memory recommendations
    if (stats.memory.usage > stats.memory.limit * 0.8) {
      recommendations.push(
        'Consider clearing some cached GPX files to free memory'
      );
    }

    // Battery recommendations
    if (stats.battery.level < 0.2 && !stats.battery.isCharging) {
      recommendations.push('Enable power saving mode to extend battery life');
    }

    // Performance recommendations
    if (stats.processing.tasksQueued > 10) {
      recommendations.push(
        'Many background tasks queued - consider reducing concurrent operations'
      );
    }

    // Tile cache recommendations
    if (stats.tiles.cacheHitRate < 0.5) {
      recommendations.push(
        'Low tile cache hit rate - consider preloading map areas you frequently visit'
      );
    }

    return recommendations;
  }

  /**
   * Cleanup and destroy the performance manager
   */
  destroy(): void {
    if (this.lazyLoader) {
      this.lazyLoader.clearCache();
    }

    if (this.memoryManager) {
      this.memoryManager.destroy();
    }

    if (this.backgroundProcessor) {
      this.backgroundProcessor.destroy();
    }

    if (this.batteryOptimizer) {
      this.batteryOptimizer.destroy();
    }

    if (this.tileCache) {
      this.tileCache.destroy();
    }

    this.isInitialized = false;
  }
}
