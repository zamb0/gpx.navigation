/**
 * Memory management service for efficient handling of complex tracks and large datasets
 */

import { AppState, AppStateStatus } from 'react-native';

export interface MemoryConfig {
  maxMemoryUsage: number; // Maximum memory usage in MB
  warningThreshold: number; // Warning threshold as percentage (0-1)
  criticalThreshold: number; // Critical threshold as percentage (0-1)
  cleanupInterval: number; // Cleanup interval in milliseconds
  enableBackgroundCleanup: boolean;
}

export interface MemoryStats {
  totalUsage: number; // Total memory usage in bytes
  gpxDataUsage: number; // GPX data memory usage
  mapTileUsage: number; // Map tile cache usage
  imageUsage: number; // Image cache usage
  availableMemory: number; // Available memory
  isLowMemory: boolean;
  isCriticalMemory: boolean;
}

export interface MemoryConsumer {
  id: string;
  type: 'gpx' | 'tiles' | 'images' | 'other';
  size: number; // Size in bytes
  lastAccessed: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
  cleanup: () => Promise<void>;
}

export class MemoryManager {
  private config: MemoryConfig;
  private consumers: Map<string, MemoryConsumer> = new Map();
  private cleanupTimer?: NodeJS.Timeout;
  private memoryWarningListeners: Array<(stats: MemoryStats) => void> = [];
  private appStateSubscription?: any;

  constructor(config?: Partial<MemoryConfig>) {
    this.config = {
      maxMemoryUsage: 200 * 1024 * 1024, // 200MB default
      warningThreshold: 0.7, // 70%
      criticalThreshold: 0.9, // 90%
      cleanupInterval: 30000, // 30 seconds
      enableBackgroundCleanup: true,
      ...config,
    };

    this.initialize();
  }

  private initialize(): void {
    // Start periodic cleanup if enabled
    if (this.config.enableBackgroundCleanup) {
      this.startPeriodicCleanup();
    }

    // Listen for app state changes
    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange.bind(this)
    );

    // Listen for memory warnings (iOS specific)
    if ((global as any).nativeCallSyncHook) {
      // This would be implemented with native modules for actual memory warnings
      this.setupNativeMemoryWarnings();
    }
  }

  /**
   * Register a memory consumer
   */
  registerConsumer(consumer: MemoryConsumer): void {
    this.consumers.set(consumer.id, consumer);
    this.checkMemoryPressure();
  }

  /**
   * Unregister a memory consumer
   */
  unregisterConsumer(consumerId: string): void {
    this.consumers.delete(consumerId);
  }

  /**
   * Update consumer size
   */
  updateConsumerSize(consumerId: string, newSize: number): void {
    const consumer = this.consumers.get(consumerId);
    if (consumer) {
      consumer.size = newSize;
      consumer.lastAccessed = new Date();
      this.checkMemoryPressure();
    }
  }

  /**
   * Mark consumer as accessed
   */
  touchConsumer(consumerId: string): void {
    const consumer = this.consumers.get(consumerId);
    if (consumer) {
      consumer.lastAccessed = new Date();
    }
  }

  /**
   * Get current memory statistics
   */
  getMemoryStats(): MemoryStats {
    let totalUsage = 0;
    let gpxDataUsage = 0;
    let mapTileUsage = 0;
    let imageUsage = 0;

    for (const consumer of this.consumers.values()) {
      totalUsage += consumer.size;

      switch (consumer.type) {
        case 'gpx':
          gpxDataUsage += consumer.size;
          break;
        case 'tiles':
          mapTileUsage += consumer.size;
          break;
        case 'images':
          imageUsage += consumer.size;
          break;
      }
    }

    const availableMemory = this.config.maxMemoryUsage - totalUsage;
    const usagePercent = totalUsage / this.config.maxMemoryUsage;

    return {
      totalUsage,
      gpxDataUsage,
      mapTileUsage,
      imageUsage,
      availableMemory,
      isLowMemory: usagePercent >= this.config.warningThreshold,
      isCriticalMemory: usagePercent >= this.config.criticalThreshold,
    };
  }

  /**
   * Force memory cleanup
   */
  async forceCleanup(targetReduction?: number): Promise<void> {
    const stats = this.getMemoryStats();
    const targetSize = targetReduction || stats.totalUsage * 0.3; // Default: reduce by 30%

    // Sort consumers by priority and last accessed time
    const sortedConsumers = Array.from(this.consumers.values()).sort((a, b) => {
      // First sort by priority (lower priority first)
      const priorityOrder = { low: 0, medium: 1, high: 2, critical: 3 };
      const priorityDiff =
        priorityOrder[a.priority] - priorityOrder[b.priority];

      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      // Then by last accessed time (older first)
      return a.lastAccessed.getTime() - b.lastAccessed.getTime();
    });

    let cleanedSize = 0;
    const cleanupPromises: Promise<void>[] = [];

    for (const consumer of sortedConsumers) {
      if (cleanedSize >= targetSize) {
        break;
      }

      // Don't cleanup critical priority items unless absolutely necessary
      if (consumer.priority === 'critical' && cleanedSize > 0) {
        continue;
      }

      cleanupPromises.push(
        consumer
          .cleanup()
          .then(() => {
            cleanedSize += consumer.size;
            this.consumers.delete(consumer.id);
          })
          .catch((error) => {
            console.error(`Failed to cleanup consumer ${consumer.id}:`, error);
          })
      );
    }

    await Promise.allSettled(cleanupPromises);
    console.log(`Memory cleanup completed. Freed ${cleanedSize} bytes.`);
  }

  /**
   * Add memory warning listener
   */
  addMemoryWarningListener(listener: (stats: MemoryStats) => void): void {
    this.memoryWarningListeners.push(listener);
  }

  /**
   * Remove memory warning listener
   */
  removeMemoryWarningListener(listener: (stats: MemoryStats) => void): void {
    const index = this.memoryWarningListeners.indexOf(listener);
    if (index > -1) {
      this.memoryWarningListeners.splice(index, 1);
    }
  }

  /**
   * Check memory pressure and trigger cleanup if needed
   */
  private async checkMemoryPressure(): Promise<void> {
    const stats = this.getMemoryStats();

    // Notify listeners of memory warnings
    if (stats.isLowMemory || stats.isCriticalMemory) {
      this.notifyMemoryWarning(stats);
    }

    // Automatic cleanup for critical memory situations
    if (stats.isCriticalMemory) {
      console.warn(
        'Critical memory usage detected. Starting automatic cleanup...'
      );
      await this.forceCleanup();
    }
  }

  /**
   * Notify memory warning listeners
   */
  private notifyMemoryWarning(stats: MemoryStats): void {
    for (const listener of this.memoryWarningListeners) {
      try {
        listener(stats);
      } catch (error) {
        console.error('Error in memory warning listener:', error);
      }
    }
  }

  /**
   * Start periodic cleanup
   */
  private startPeriodicCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.performPeriodicCleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Perform periodic cleanup of old/unused data
   */
  private async performPeriodicCleanup(): Promise<void> {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes
    const cleanupCandidates: MemoryConsumer[] = [];

    for (const consumer of this.consumers.values()) {
      const age = now - consumer.lastAccessed.getTime();

      // Only cleanup low priority items that haven't been accessed recently
      if (consumer.priority === 'low' && age > maxAge) {
        cleanupCandidates.push(consumer);
      }
    }

    // Cleanup up to 20% of old low-priority items
    const maxCleanup = Math.ceil(cleanupCandidates.length * 0.2);
    const toCleanup = cleanupCandidates.slice(0, maxCleanup);

    for (const consumer of toCleanup) {
      try {
        await consumer.cleanup();
        this.consumers.delete(consumer.id);
      } catch (error) {
        console.error(`Failed to cleanup consumer ${consumer.id}:`, error);
      }
    }

    if (toCleanup.length > 0) {
      console.log(`Periodic cleanup: removed ${toCleanup.length} old items`);
    }
  }

  /**
   * Handle app state changes
   */
  private handleAppStateChange(nextAppState: AppStateStatus): void {
    if (nextAppState === 'background') {
      // App going to background - aggressive cleanup
      this.performBackgroundCleanup();
    } else if (nextAppState === 'active') {
      // App becoming active - restart periodic cleanup
      if (this.config.enableBackgroundCleanup && !this.cleanupTimer) {
        this.startPeriodicCleanup();
      }
    }
  }

  /**
   * Perform aggressive cleanup when app goes to background
   */
  private async performBackgroundCleanup(): Promise<void> {
    console.log('App backgrounded - performing aggressive memory cleanup');

    // Stop periodic cleanup to save battery
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }

    // Cleanup all low and medium priority items
    const cleanupCandidates = Array.from(this.consumers.values()).filter(
      (consumer) =>
        consumer.priority === 'low' || consumer.priority === 'medium'
    );

    for (const consumer of cleanupCandidates) {
      try {
        await consumer.cleanup();
        this.consumers.delete(consumer.id);
      } catch (error) {
        console.error(`Failed to cleanup consumer ${consumer.id}:`, error);
      }
    }

    console.log(
      `Background cleanup: removed ${cleanupCandidates.length} items`
    );
  }

  /**
   * Setup native memory warnings (platform-specific)
   */
  private setupNativeMemoryWarnings(): void {
    // This would be implemented with native modules
    // For now, we'll simulate with a simple check
    setInterval(() => {
      const stats = this.getMemoryStats();
      if (stats.isCriticalMemory) {
        this.notifyMemoryWarning(stats);
      }
    }, 10000); // Check every 10 seconds
  }

  /**
   * Get memory usage by type
   */
  getMemoryUsageByType(): Record<string, number> {
    const usage: Record<string, number> = {
      gpx: 0,
      tiles: 0,
      images: 0,
      other: 0,
    };

    for (const consumer of this.consumers.values()) {
      usage[consumer.type] += consumer.size;
    }

    return usage;
  }

  /**
   * Get top memory consumers
   */
  getTopConsumers(limit: number = 10): MemoryConsumer[] {
    return Array.from(this.consumers.values())
      .sort((a, b) => b.size - a.size)
      .slice(0, limit);
  }

  /**
   * Cleanup and destroy the memory manager
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }

    this.consumers.clear();
    this.memoryWarningListeners = [];
  }
}
