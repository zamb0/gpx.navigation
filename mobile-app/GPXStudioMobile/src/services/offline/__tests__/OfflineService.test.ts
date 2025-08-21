import { OfflineService } from '../OfflineService';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock dependencies
jest.mock('@react-native-community/netinfo');
jest.mock('@react-native-async-storage/async-storage');

const mockNetInfo = NetInfo as jest.Mocked<typeof NetInfo>;
const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('OfflineService', () => {
  let offlineService: OfflineService;
  let mockNetInfoListener: (state: any) => void;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock NetInfo
    mockNetInfo.fetch.mockResolvedValue({ isConnected: true } as any);
    mockNetInfo.addEventListener.mockImplementation((listener) => {
      mockNetInfoListener = listener;
      return jest.fn(); // unsubscribe function
    });

    // Mock AsyncStorage
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue();

    offlineService = new OfflineService({
      maxQueueSize: 10,
      maxRetries: 3,
      retryDelay: 1000,
      enableAutoSync: true,
    });
  });

  describe('Connection Status', () => {
    it('should initialize with online status', async () => {
      await new Promise((resolve) => setTimeout(resolve, 100)); // Wait for initialization
      expect(offlineService.getConnectionStatus()).toBe(true);
    });

    it('should update status when connection changes', async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Simulate going offline
      mockNetInfoListener({ isConnected: false });
      expect(offlineService.getConnectionStatus()).toBe(false);

      // Simulate going back online
      mockNetInfoListener({ isConnected: true });
      expect(offlineService.getConnectionStatus()).toBe(true);
    });

    it('should notify listeners of connection changes', async () => {
      const listener = jest.fn();
      offlineService.addConnectionListener(listener);

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Simulate connection change
      mockNetInfoListener({ isConnected: false });
      expect(listener).toHaveBeenCalledWith(false);

      mockNetInfoListener({ isConnected: true });
      expect(listener).toHaveBeenCalledWith(true);
    });
  });

  describe('Operation Queue', () => {
    it('should queue operations when offline', async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Go offline
      mockNetInfoListener({ isConnected: false });

      const operationId = await offlineService.queueOperation('file_upload', {
        test: 'data',
      });

      expect(operationId).toBeDefined();
      expect(offlineService.getQueueSize()).toBe(1);
    });

    it('should execute operations immediately when online', async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Mock successful execution
      const originalExecuteOperation = (offlineService as any).executeOperation;
      (offlineService as any).executeOperation = jest
        .fn()
        .mockResolvedValue(true);

      const operationId = await offlineService.queueOperation('file_upload', {
        test: 'data',
      });

      expect(operationId).toBeDefined();
      expect(offlineService.getQueueSize()).toBe(0); // Should not be queued if executed successfully
    });

    it('should maintain queue size limit', async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Go offline
      mockNetInfoListener({ isConnected: false });

      // Queue more operations than the limit
      for (let i = 0; i < 15; i++) {
        await offlineService.queueOperation('file_upload', {
          test: `data${i}`,
        });
      }

      expect(offlineService.getQueueSize()).toBe(10); // Should be limited to maxQueueSize
    });

    it('should remove operations from queue', async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Go offline
      mockNetInfoListener({ isConnected: false });

      const operationId = await offlineService.queueOperation('file_upload', {
        test: 'data',
      });
      expect(offlineService.getQueueSize()).toBe(1);

      const removed = await offlineService.removeOperation(operationId);
      expect(removed).toBe(true);
      expect(offlineService.getQueueSize()).toBe(0);
    });

    it('should clear entire queue', async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Go offline
      mockNetInfoListener({ isConnected: false });

      // Add multiple operations
      await offlineService.queueOperation('file_upload', { test: 'data1' });
      await offlineService.queueOperation('file_download', { test: 'data2' });
      expect(offlineService.getQueueSize()).toBe(2);

      await offlineService.clearQueue();
      expect(offlineService.getQueueSize()).toBe(0);
    });
  });

  describe('Queue Persistence', () => {
    it('should save queue to storage', async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Go offline
      mockNetInfoListener({ isConnected: false });

      await offlineService.queueOperation('file_upload', { test: 'data' });

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'offline_operation_queue',
        expect.stringContaining('file_upload')
      );
    });

    it('should load queue from storage on initialization', async () => {
      const queueData = JSON.stringify([
        {
          id: 'test-op-1',
          type: 'file_upload',
          data: { test: 'data' },
          timestamp: new Date().toISOString(),
          retryCount: 0,
          maxRetries: 3,
        },
      ]);

      mockAsyncStorage.getItem.mockResolvedValue(queueData);

      const newService = new OfflineService();
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(newService.getQueueSize()).toBe(1);
    });
  });

  describe('Sync Operations', () => {
    it('should sync pending operations when coming back online', async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Mock successful execution
      const mockExecuteOperation = jest.fn().mockResolvedValue(true);
      (offlineService as any).executeOperation = mockExecuteOperation;

      // Go offline and queue operations
      mockNetInfoListener({ isConnected: false });
      await offlineService.queueOperation('file_upload', { test: 'data1' });
      await offlineService.queueOperation('file_download', { test: 'data2' });

      expect(offlineService.getQueueSize()).toBe(2);

      // Go back online (should trigger auto-sync)
      mockNetInfoListener({ isConnected: true });

      // Wait for sync to complete
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(mockExecuteOperation).toHaveBeenCalledTimes(2);
      expect(offlineService.getQueueSize()).toBe(0);
    });

    it('should handle failed operations with retry logic', async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Mock failed execution
      const mockExecuteOperation = jest.fn().mockResolvedValue(false);
      (offlineService as any).executeOperation = mockExecuteOperation;

      // Go offline and queue operation
      mockNetInfoListener({ isConnected: false });
      await offlineService.queueOperation('file_upload', { test: 'data' }, 2); // maxRetries = 2

      // Go back online and sync
      mockNetInfoListener({ isConnected: true });
      await offlineService.syncPendingOperations();

      // Should still be in queue after first failure
      expect(offlineService.getQueueSize()).toBe(1);

      // Sync again
      await offlineService.syncPendingOperations();

      // Should still be in queue after second failure
      expect(offlineService.getQueueSize()).toBe(1);

      // Sync third time (should exceed maxRetries and be removed)
      await offlineService.syncPendingOperations();
      expect(offlineService.getQueueSize()).toBe(0);
    });
  });

  describe('Graceful Degradation', () => {
    it('should execute online operation when connected', async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));

      const onlineOp = jest.fn().mockResolvedValue('online result');
      const offlineOp = jest.fn().mockResolvedValue('offline result');

      const result = await offlineService.executeWithFallback(
        onlineOp,
        offlineOp
      );

      expect(result).toBe('online result');
      expect(onlineOp).toHaveBeenCalled();
      expect(offlineOp).not.toHaveBeenCalled();
    });

    it('should fallback to offline operation when online fails', async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));

      const onlineOp = jest.fn().mockRejectedValue(new Error('Network error'));
      const offlineOp = jest.fn().mockResolvedValue('offline result');

      const result = await offlineService.executeWithFallback(
        onlineOp,
        offlineOp
      );

      expect(result).toBe('offline result');
      expect(onlineOp).toHaveBeenCalled();
      expect(offlineOp).toHaveBeenCalled();
    });

    it('should execute offline operation when disconnected', async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Go offline
      mockNetInfoListener({ isConnected: false });

      const onlineOp = jest.fn().mockResolvedValue('online result');
      const offlineOp = jest.fn().mockResolvedValue('offline result');

      const result = await offlineService.executeWithFallback(
        onlineOp,
        offlineOp
      );

      expect(result).toBe('offline result');
      expect(onlineOp).not.toHaveBeenCalled();
      expect(offlineOp).toHaveBeenCalled();
    });

    it('should queue operation when offline using executeOrQueue', async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Go offline
      mockNetInfoListener({ isConnected: false });

      const operation = jest.fn().mockResolvedValue('result');
      const result = await offlineService.executeOrQueue(
        operation,
        { test: 'data' },
        'file_upload'
      );

      expect(result).toBeNull();
      expect(operation).not.toHaveBeenCalled();
      expect(offlineService.getQueueSize()).toBe(1);
    });
  });

  describe('Listener Management', () => {
    it('should add and remove connection listeners', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      offlineService.addConnectionListener(listener1);
      offlineService.addConnectionListener(listener2);

      // Trigger connection change
      mockNetInfoListener({ isConnected: false });

      expect(listener1).toHaveBeenCalledWith(false);
      expect(listener2).toHaveBeenCalledWith(false);

      // Remove one listener
      offlineService.removeConnectionListener(listener1);

      // Trigger another change
      mockNetInfoListener({ isConnected: true });

      expect(listener1).toHaveBeenCalledTimes(1); // Should not be called again
      expect(listener2).toHaveBeenCalledWith(true);
    });
  });
});
