/**
 * Background processing service for heavy operations to maintain UI responsiveness
 */

import { InteractionManager } from 'react-native';

export interface BackgroundTask<T = any> {
  id: string;
  name: string;
  priority: 'low' | 'medium' | 'high';
  execute: () => Promise<T>;
  onProgress?: (progress: number) => void;
  onComplete?: (result: T) => void;
  onError?: (error: Error) => void;
  timeout?: number; // Timeout in milliseconds
  retries?: number; // Number of retries on failure
}

export interface TaskResult<T = any> {
  taskId: string;
  success: boolean;
  result?: T;
  error?: Error;
  executionTime: number;
}

export interface ProcessorStats {
  tasksQueued: number;
  tasksRunning: number;
  tasksCompleted: number;
  tasksFailed: number;
  averageExecutionTime: number;
}

export class BackgroundProcessor {
  private taskQueue: BackgroundTask[] = [];
  private runningTasks: Map<string, BackgroundTask> = new Map();
  private completedTasks: TaskResult[] = [];
  private maxConcurrentTasks: number;
  private isProcessing: boolean = false;
  private processingInterval?: NodeJS.Timeout;

  constructor(maxConcurrentTasks: number = 3) {
    this.maxConcurrentTasks = maxConcurrentTasks;
    this.startProcessing();
  }

  /**
   * Add a task to the background processing queue
   */
  addTask<T>(task: BackgroundTask<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const enhancedTask: BackgroundTask<T> = {
        ...task,
        onComplete: (result: T) => {
          task.onComplete?.(result);
          resolve(result);
        },
        onError: (error: Error) => {
          task.onError?.(error);
          reject(error);
        },
      };

      // Insert task based on priority
      this.insertTaskByPriority(enhancedTask);
      this.processQueue();
    });
  }

  /**
   * Add multiple tasks as a batch
   */
  addBatch<T>(tasks: BackgroundTask<T>[]): Promise<TaskResult<T>[]> {
    const promises = tasks.map((task) =>
      this.addTask(task)
        .then(
          (result) =>
            ({
              taskId: task.id,
              success: true,
              result,
              executionTime: 0,
            }) as TaskResult<T>
        )
        .catch(
          (error) =>
            ({
              taskId: task.id,
              success: false,
              error,
              executionTime: 0,
            }) as TaskResult<T>
        )
    );

    return Promise.all(promises);
  }

  /**
   * Cancel a queued task
   */
  cancelTask(taskId: string): boolean {
    const queueIndex = this.taskQueue.findIndex((task) => task.id === taskId);
    if (queueIndex > -1) {
      this.taskQueue.splice(queueIndex, 1);
      return true;
    }
    return false;
  }

  /**
   * Cancel all queued tasks
   */
  cancelAllTasks(): void {
    this.taskQueue = [];
  }

  /**
   * Get processor statistics
   */
  getStats(): ProcessorStats {
    const totalExecutionTime = this.completedTasks.reduce(
      (sum, task) => sum + task.executionTime,
      0
    );
    const averageExecutionTime =
      this.completedTasks.length > 0
        ? totalExecutionTime / this.completedTasks.length
        : 0;

    return {
      tasksQueued: this.taskQueue.length,
      tasksRunning: this.runningTasks.size,
      tasksCompleted: this.completedTasks.filter((t) => t.success).length,
      tasksFailed: this.completedTasks.filter((t) => !t.success).length,
      averageExecutionTime,
    };
  }

  /**
   * Clear completed task history
   */
  clearHistory(): void {
    this.completedTasks = [];
  }

  /**
   * Process GPX file in background with progress updates
   */
  processGPXFile(
    fileContent: string,
    filename: string,
    onProgress?: (progress: number) => void
  ): Promise<any> {
    return this.addTask({
      id: `gpx_process_${Date.now()}`,
      name: `Process GPX: ${filename}`,
      priority: 'high',
      execute: async () => {
        return await this.processGPXInChunks(fileContent, onProgress);
      },
      onProgress,
      timeout: 30000, // 30 seconds
      retries: 2,
    });
  }

  /**
   * Generate map thumbnail in background
   */
  generateMapThumbnail(
    bounds: any,
    width: number,
    height: number
  ): Promise<string> {
    return this.addTask({
      id: `thumbnail_${Date.now()}`,
      name: 'Generate Map Thumbnail',
      priority: 'medium',
      execute: async () => {
        return await this.generateThumbnailImage(bounds, width, height);
      },
      timeout: 15000, // 15 seconds
      retries: 1,
    });
  }

  /**
   * Calculate track statistics in background
   */
  calculateTrackStats(trackPoints: any[]): Promise<any> {
    return this.addTask({
      id: `stats_${Date.now()}`,
      name: 'Calculate Track Statistics',
      priority: 'medium',
      execute: async () => {
        return await this.calculateStatsInChunks(trackPoints);
      },
      timeout: 10000, // 10 seconds
    });
  }

  /**
   * Simplify track for different zoom levels in background
   */
  simplifyTrackForZoom(
    trackPoints: any[],
    zoomLevel: number,
    tolerance: number
  ): Promise<any[]> {
    return this.addTask({
      id: `simplify_${Date.now()}`,
      name: `Simplify Track (zoom: ${zoomLevel})`,
      priority: 'low',
      execute: async () => {
        return await this.simplifyTrackInChunks(trackPoints, tolerance);
      },
      timeout: 20000, // 20 seconds
    });
  }

  /**
   * Private methods
   */

  private insertTaskByPriority(task: BackgroundTask): void {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const taskPriority = priorityOrder[task.priority];

    let insertIndex = this.taskQueue.length;
    for (let i = 0; i < this.taskQueue.length; i++) {
      const queuedTaskPriority = priorityOrder[this.taskQueue[i].priority];
      if (taskPriority < queuedTaskPriority) {
        insertIndex = i;
        break;
      }
    }

    this.taskQueue.splice(insertIndex, 0, task);
  }

  private startProcessing(): void {
    if (this.isProcessing) return;

    this.isProcessing = true;
    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, 100); // Check queue every 100ms
  }

  private async processQueue(): Promise<void> {
    // Don't exceed max concurrent tasks
    if (this.runningTasks.size >= this.maxConcurrentTasks) {
      return;
    }

    // Get next task from queue
    const task = this.taskQueue.shift();
    if (!task) {
      return;
    }

    // Add to running tasks
    this.runningTasks.set(task.id, task);

    // Execute task after interactions are complete
    InteractionManager.runAfterInteractions(() => {
      this.executeTask(task);
    });
  }

  private async executeTask(task: BackgroundTask): Promise<void> {
    const startTime = Date.now();
    let retryCount = 0;
    const maxRetries = task.retries || 0;

    while (retryCount <= maxRetries) {
      try {
        // Set up timeout if specified
        const timeoutPromise = task.timeout
          ? new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Task timeout')), task.timeout)
            )
          : new Promise<never>(() => {}); // Never resolves

        // Execute task with timeout
        const result = await Promise.race([task.execute(), timeoutPromise]);

        // Task completed successfully
        const executionTime = Date.now() - startTime;
        this.runningTasks.delete(task.id);

        this.completedTasks.push({
          taskId: task.id,
          success: true,
          result,
          executionTime,
        });

        task.onComplete?.(result);
        return;
      } catch (error) {
        retryCount++;

        if (retryCount > maxRetries) {
          // Task failed after all retries
          const executionTime = Date.now() - startTime;
          this.runningTasks.delete(task.id);

          this.completedTasks.push({
            taskId: task.id,
            success: false,
            error: error as Error,
            executionTime,
          });

          task.onError?.(error as Error);
          return;
        }

        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount));
      }
    }
  }

  /**
   * Heavy processing methods that run in background
   */

  private async processGPXInChunks(
    fileContent: string,
    onProgress?: (progress: number) => void
  ): Promise<any> {
    // Simulate chunked GPX processing
    const chunks = Math.ceil(fileContent.length / 10000);
    let processed = 0;

    for (let i = 0; i < chunks; i++) {
      // Process chunk
      await new Promise((resolve) => setTimeout(resolve, 10)); // Simulate work

      processed++;
      const progress = (processed / chunks) * 100;
      onProgress?.(progress);

      // Yield to main thread periodically
      if (i % 10 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    return { processed: true, chunks };
  }

  private async generateThumbnailImage(
    bounds: any,
    width: number,
    height: number
  ): Promise<string> {
    // Simulate thumbnail generation
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Return base64 encoded thumbnail (placeholder)
    return `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==`;
  }

  private async calculateStatsInChunks(trackPoints: any[]): Promise<any> {
    const chunkSize = 1000;
    let totalDistance = 0;
    let elevationGain = 0;
    let elevationLoss = 0;

    for (let i = 0; i < trackPoints.length; i += chunkSize) {
      const chunk = trackPoints.slice(i, i + chunkSize);

      // Process chunk
      for (let j = 1; j < chunk.length; j++) {
        // Calculate distance (simplified)
        const prev = chunk[j - 1];
        const curr = chunk[j];
        const distance =
          Math.sqrt(
            Math.pow(curr.latitude - prev.latitude, 2) +
              Math.pow(curr.longitude - prev.longitude, 2)
          ) * 111000; // Rough conversion to meters

        totalDistance += distance;

        // Calculate elevation changes
        if (prev.elevation && curr.elevation) {
          const elevDiff = curr.elevation - prev.elevation;
          if (elevDiff > 0) {
            elevationGain += elevDiff;
          } else {
            elevationLoss += Math.abs(elevDiff);
          }
        }
      }

      // Yield to main thread
      if (i % (chunkSize * 5) === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    return {
      totalDistance,
      elevationGain,
      elevationLoss,
      pointCount: trackPoints.length,
    };
  }

  private async simplifyTrackInChunks(
    trackPoints: any[],
    tolerance: number
  ): Promise<any[]> {
    // Implement Douglas-Peucker simplification in chunks
    const chunkSize = 2000;
    const simplifiedChunks: any[][] = [];

    for (let i = 0; i < trackPoints.length; i += chunkSize) {
      const chunk = trackPoints.slice(
        i,
        Math.min(i + chunkSize, trackPoints.length)
      );

      // Simplify chunk (simplified implementation)
      const simplified = this.douglasPeuckerSimplified(chunk, tolerance);
      simplifiedChunks.push(simplified);

      // Yield to main thread
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    // Combine chunks
    return simplifiedChunks.flat();
  }

  private douglasPeuckerSimplified(points: any[], tolerance: number): any[] {
    if (points.length <= 2) return points;

    // Simple implementation - take every nth point based on tolerance
    const step = Math.max(1, Math.floor(tolerance * 100));
    return points.filter(
      (_, index) => index % step === 0 || index === points.length - 1
    );
  }

  /**
   * Cleanup and destroy the processor
   */
  destroy(): void {
    this.isProcessing = false;

    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }

    this.cancelAllTasks();
    this.runningTasks.clear();
    this.completedTasks = [];
  }
}
