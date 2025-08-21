import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface OfflineOperation {
  id: string;
  type: 'file_upload' | 'file_download' | 'sync_settings' | 'cache_tiles';
  data: any;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
}

export interface OfflineConfig {
  maxQueueSize: number;
  maxRetries: number;
  retryDelay: number; // milliseconds
  enableAutoSync: boolean;
}

export class OfflineService {
  private isOnline: boolean = true;
  private operationQueue: OfflineOperation[] = [];
  private config: OfflineConfig;
  private listeners: Array<(isOnline: boolean) => void> = [];
  private syncInProgress: boolean = false;

  constructor(config?: Partial<OfflineConfig>) {
    this.config = {
      maxQueueSize: 100,
      maxRetries: 3,
      retryDelay: 5000,
      enableAutoSync: true,
      ...config,
    };

    this.initializeNetworkMonitoring();
    this.loadQueueFromStorage();
  }

  private async initializeNetworkMonitoring(): Promise<void> {
    // Get initial network state
    const netInfoState = await NetInfo.fetch();
    this.isOnline = netInfoState.isConnected ?? false;

    // Subscribe to network state changes
    NetInfo.addEventListener((state: NetInfoState) => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected ?? false;

      // Notify listeners of connectivity change
      this.notifyListeners();

      // If we just came back online, start sync
      if (!wasOnline && this.isOnline && this.config.enableAutoSync) {
        this.syncPendingOperations();
      }
    });
  }

  private async loadQueueFromStorage(): Promise<void> {
    try {
      const queueData = await AsyncStorage.getItem('offline_operation_queue');
      if (queueData) {
        const parsedQueue = JSON.parse(queueData);
        this.operationQueue = parsedQueue.map((op: any) => ({
          ...op,
          timestamp: new Date(op.timestamp),
        }));
      }
    } catch (error) {
      console.error('Failed to load offline operation queue:', error);
    }
  }

  private async saveQueueToStorage(): Promise<void> {
    try {
      const queueData = JSON.stringify(this.operationQueue);
      await AsyncStorage.setItem('offline_operation_queue', queueData);
    } catch (error) {
      console.error('Failed to save offline operation queue:', error);
    }
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.isOnline);
      } catch (error) {
        console.error('Error in offline service listener:', error);
      }
    }
  }

  // Public API
  getConnectionStatus(): boolean {
    return this.isOnline;
  }

  addConnectionListener(listener: (isOnline: boolean) => void): void {
    this.listeners.push(listener);
  }

  removeConnectionListener(listener: (isOnline: boolean) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  async queueOperation(
    type: OfflineOperation['type'],
    data: any,
    maxRetries?: number
  ): Promise<string> {
    const operation: OfflineOperation = {
      id: this.generateOperationId(),
      type,
      data,
      timestamp: new Date(),
      retryCount: 0,
      maxRetries: maxRetries ?? this.config.maxRetries,
    };

    // If we're online, try to execute immediately
    if (this.isOnline) {
      const success = await this.executeOperation(operation);
      if (success) {
        return operation.id;
      }
    }

    // Add to queue if offline or execution failed
    this.operationQueue.push(operation);

    // Maintain queue size limit
    if (this.operationQueue.length > this.config.maxQueueSize) {
      this.operationQueue.shift(); // Remove oldest operation
    }

    await this.saveQueueToStorage();
    return operation.id;
  }

  async removeOperation(operationId: string): Promise<boolean> {
    const index = this.operationQueue.findIndex((op) => op.id === operationId);
    if (index > -1) {
      this.operationQueue.splice(index, 1);
      await this.saveQueueToStorage();
      return true;
    }
    return false;
  }

  getQueuedOperations(): OfflineOperation[] {
    return [...this.operationQueue];
  }

  getQueueSize(): number {
    return this.operationQueue.length;
  }

  async clearQueue(): Promise<void> {
    this.operationQueue = [];
    await this.saveQueueToStorage();
  }

  async syncPendingOperations(): Promise<void> {
    if (!this.isOnline || this.syncInProgress) {
      return;
    }

    this.syncInProgress = true;

    try {
      const operationsToSync = [...this.operationQueue];
      const successfulOperations: string[] = [];

      for (const operation of operationsToSync) {
        const success = await this.executeOperation(operation);

        if (success) {
          successfulOperations.push(operation.id);
        } else {
          // Increment retry count
          operation.retryCount++;

          // Remove if max retries exceeded
          if (operation.retryCount >= operation.maxRetries) {
            successfulOperations.push(operation.id);
            console.warn(
              `Operation ${operation.id} failed after ${operation.maxRetries} retries`
            );
          }
        }

        // Small delay between operations to avoid overwhelming services
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Remove successful operations from queue
      this.operationQueue = this.operationQueue.filter(
        (op) => !successfulOperations.includes(op.id)
      );

      await this.saveQueueToStorage();
    } catch (error) {
      console.error('Error during sync:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  private async executeOperation(
    operation: OfflineOperation
  ): Promise<boolean> {
    try {
      switch (operation.type) {
        case 'file_upload':
          return await this.handleFileUpload(operation.data);
        case 'file_download':
          return await this.handleFileDownload(operation.data);
        case 'sync_settings':
          return await this.handleSettingsSync(operation.data);
        case 'cache_tiles':
          return await this.handleTileCache(operation.data);
        default:
          console.warn(`Unknown operation type: ${operation.type}`);
          return false;
      }
    } catch (error) {
      console.error(`Failed to execute operation ${operation.id}:`, error);
      return false;
    }
  }

  private async handleFileUpload(data: any): Promise<boolean> {
    // Implement file upload logic
    // This would typically involve uploading to cloud storage
    console.log('Executing file upload:', data);
    return true; // Placeholder
  }

  private async handleFileDownload(data: any): Promise<boolean> {
    // Implement file download logic
    console.log('Executing file download:', data);
    return true; // Placeholder
  }

  private async handleSettingsSync(data: any): Promise<boolean> {
    // Implement settings synchronization
    console.log('Executing settings sync:', data);
    return true; // Placeholder
  }

  private async handleTileCache(data: any): Promise<boolean> {
    // Implement tile caching logic
    console.log('Executing tile cache:', data);
    return true; // Placeholder
  }

  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Graceful degradation helpers
  async executeWithFallback<T>(
    onlineOperation: () => Promise<T>,
    offlineOperation: () => Promise<T>
  ): Promise<T> {
    if (this.isOnline) {
      try {
        return await onlineOperation();
      } catch (error) {
        console.warn(
          'Online operation failed, falling back to offline:',
          error
        );
        return await offlineOperation();
      }
    } else {
      return await offlineOperation();
    }
  }

  async executeOrQueue<T>(
    operation: () => Promise<T>,
    queueData: any,
    operationType: OfflineOperation['type']
  ): Promise<T | null> {
    if (this.isOnline) {
      try {
        return await operation();
      } catch (error) {
        console.warn('Operation failed, queuing for later:', error);
        await this.queueOperation(operationType, queueData);
        return null;
      }
    } else {
      await this.queueOperation(operationType, queueData);
      return null;
    }
  }
}
