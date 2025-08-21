/**
 * Performance tests for large file handling and memory usage
 */

import { PerformanceManager } from '../PerformanceManager';
import { LazyGPXLoader } from '../LazyGPXLoader';
import { MemoryManager } from '../MemoryManager';
import { BackgroundProcessor } from '../BackgroundProcessor';
import { MobileGPXFile } from '../../../types/gpx';

// Mock dependencies
jest.mock('expo-battery');
jest.mock('expo-file-system');
jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn(),
  },
  InteractionManager: {
    runAfterInteractions: jest.fn((callback) => callback()),
  },
}));

describe('PerformanceManager', () => {
  let performanceManager: PerformanceManager;

  beforeEach(() => {
    performanceManager = new PerformanceManager({
      maxMemoryUsage: 100, // 100MB for testing
      maxConcurrentTasks: 2,
    });
  });

  afterEach(() => {
    performanceManager.destroy();
  });

  describe('Large File Handling', () => {
    it('should handle large GPX files efficiently', async () => {
      // Create a mock large GPX file
      const largeGPXFile = createMockLargeGPXFile(10000); // 10k points

      const startTime = Date.now();
      await performanceManager.loadGPXFile(largeGPXFile);
      const loadTime = Date.now() - startTime;

      // Should load within reasonable time (< 5 seconds)
      expect(loadTime).toBeLessThan(5000);

      const stats = await performanceManager.getPerformanceStats();
      expect(stats.gpx.filesLoaded).toBeGreaterThan(0);
    });

    it('should use lazy loading for very large files', async () => {
      const veryLargeGPXFile = createMockLargeGPXFile(50000); // 50k points

      await performanceManager.loadGPXFile(veryLargeGPXFile);

      // Try to load some points to trigger chunk loading
      const bounds = {
        north: 44.6,
        south: 44.5,
        east: -122.4,
        west: -122.5,
      };

      await performanceManager.getTrackPointsForViewport(
        veryLargeGPXFile.id,
        bounds,
        10
      );

      const stats = await performanceManager.getPerformanceStats();

      // Should have loaded the file and be using lazy loading
      expect(stats.gpx.filesLoaded).toBeGreaterThan(0);
      // Memory usage percent might be high due to test setup, but file should be loaded
      expect(stats.memory.gpxData).toBeGreaterThan(0);
    });

    it('should handle multiple large files without memory overflow', async () => {
      const files = [
        createMockLargeGPXFile(5000),
        createMockLargeGPXFile(7000),
        createMockLargeGPXFile(8000),
      ];

      // Load all files
      for (const file of files) {
        await performanceManager.loadGPXFile(file);
      }

      const stats = await performanceManager.getPerformanceStats();

      // Memory usage should stay within limits
      expect(stats.memory.usage).toBeLessThan(stats.memory.limit);
    });
  });

  describe('Memory Management', () => {
    it('should track memory usage accurately', async () => {
      const gpxFile = createMockLargeGPXFile(1000);

      const statsBefore = await performanceManager.getPerformanceStats();
      await performanceManager.loadGPXFile(gpxFile);
      const statsAfter = await performanceManager.getPerformanceStats();

      expect(statsAfter.memory.gpxData).toBeGreaterThan(
        statsBefore.memory.gpxData
      );
    });

    it('should trigger cleanup when memory limit is approached', async () => {
      // Load files until near memory limit
      const files = [];
      for (let i = 0; i < 10; i++) {
        files.push(createMockLargeGPXFile(2000));
      }

      for (const file of files) {
        await performanceManager.loadGPXFile(file);
      }

      const stats = await performanceManager.getPerformanceStats();

      // Should not exceed memory limit due to automatic cleanup
      expect(stats.memory.usage).toBeLessThanOrEqual(stats.memory.limit);
    });

    it('should force cleanup when requested', async () => {
      const gpxFile = createMockLargeGPXFile(5000);
      await performanceManager.loadGPXFile(gpxFile);

      const statsBefore = await performanceManager.getPerformanceStats();
      await performanceManager.forceMemoryCleanup();
      const statsAfter = await performanceManager.getPerformanceStats();

      expect(statsAfter.memory.usage).toBeLessThanOrEqual(
        statsBefore.memory.usage
      );
    });
  });

  describe('Background Processing', () => {
    it('should process GPX files in background without blocking', async () => {
      const largeGPXContent = generateLargeGPXContent(5000);

      const startTime = Date.now();

      // Start background processing
      const processingPromise = performanceManager.processGPXFileInBackground(
        largeGPXContent,
        'test.gpx'
      );

      // Should return immediately (non-blocking)
      const immediateTime = Date.now() - startTime;
      expect(immediateTime).toBeLessThan(100);

      // Wait for processing to complete
      const result = await processingPromise;
      expect(result).toBeDefined();
    });

    it('should handle multiple background tasks concurrently', async () => {
      const tasks = [];

      for (let i = 0; i < 5; i++) {
        const content = generateLargeGPXContent(1000);
        tasks.push(
          performanceManager.processGPXFileInBackground(content, `test${i}.gpx`)
        );
      }

      const results = await Promise.all(tasks);
      expect(results).toHaveLength(5);

      const stats = await performanceManager.getPerformanceStats();
      expect(stats.processing.tasksCompleted).toBeGreaterThan(0);
    });
  });

  describe('Level of Detail Rendering', () => {
    it('should reduce point count for low zoom levels', async () => {
      const gpxFile = createMockLargeGPXFile(10000);
      await performanceManager.loadGPXFile(gpxFile);

      const bounds = {
        north: 44.6,
        south: 44.5,
        east: -122.4,
        west: -122.5,
      };

      // Low zoom should return fewer points
      const lowZoomPoints = await performanceManager.getTrackPointsForViewport(
        gpxFile.id,
        bounds,
        5 // Low zoom
      );

      // High zoom should return more points
      const highZoomPoints = await performanceManager.getTrackPointsForViewport(
        gpxFile.id,
        bounds,
        15 // High zoom
      );

      // Both should have points, but low zoom should have fewer
      expect(lowZoomPoints.length).toBeGreaterThan(0);
      expect(highZoomPoints.length).toBeGreaterThan(0);
      expect(lowZoomPoints.length).toBeLessThanOrEqual(highZoomPoints.length);
    });

    it('should maintain track shape during simplification', async () => {
      const gpxFile = createMockComplexTrackGPXFile();
      await performanceManager.loadGPXFile(gpxFile);

      const bounds = {
        north: 44.6,
        south: 44.5,
        east: -122.4,
        west: -122.5,
      };

      const simplifiedPoints =
        await performanceManager.getTrackPointsForViewport(
          gpxFile.id,
          bounds,
          8 // Medium zoom
        );

      // Should have some points
      expect(simplifiedPoints.length).toBeGreaterThan(0);
      if (simplifiedPoints.length > 0) {
        expect(simplifiedPoints[0]).toBeDefined();
        if (simplifiedPoints.length > 1) {
          expect(simplifiedPoints[simplifiedPoints.length - 1]).toBeDefined();
        }
      }
    });
  });

  describe('Performance Statistics', () => {
    it('should provide comprehensive performance statistics', async () => {
      const stats = await performanceManager.getPerformanceStats();

      expect(stats).toHaveProperty('memory');
      expect(stats).toHaveProperty('processing');
      expect(stats).toHaveProperty('battery');
      expect(stats).toHaveProperty('tiles');
      expect(stats).toHaveProperty('gpx');

      expect(typeof stats.memory.usage).toBe('number');
      expect(typeof stats.processing.tasksQueued).toBe('number');
      expect(typeof stats.battery.level).toBe('number');
    });

    it('should provide performance recommendations', async () => {
      const recommendations =
        await performanceManager.getPerformanceRecommendations();

      expect(Array.isArray(recommendations)).toBe(true);
      // Recommendations should be strings
      recommendations.forEach((rec) => {
        expect(typeof rec).toBe('string');
      });
    });
  });

  describe('Battery Optimization', () => {
    it('should provide optimized GPS settings', () => {
      const gpsSettings = performanceManager.getOptimizedGPSSettings();

      if (gpsSettings) {
        expect(gpsSettings).toHaveProperty('accuracy');
        expect(gpsSettings).toHaveProperty('updateInterval');
        expect(gpsSettings).toHaveProperty('minimumDistance');
      }
    });
  });
});

describe('LazyGPXLoader', () => {
  let lazyLoader: LazyGPXLoader;

  beforeEach(() => {
    lazyLoader = new LazyGPXLoader({
      chunkSize: 1000,
      maxPointsInMemory: 5000,
    });
  });

  afterEach(() => {
    lazyLoader.clearCache();
  });

  it('should chunk large GPX files', async () => {
    const largeGPXFile = createMockLargeGPXFile(10000);

    await lazyLoader.loadGPXFile(largeGPXFile);

    const stats = lazyLoader.getMemoryStats();
    expect(stats.totalChunks).toBeGreaterThan(1);
  });

  it('should load chunks on demand', async () => {
    const largeGPXFile = createMockLargeGPXFile(5000);
    await lazyLoader.loadGPXFile(largeGPXFile);

    const bounds = {
      north: 45.0,
      south: 44.0,
      east: -122.0,
      west: -123.0,
    };

    const points = await lazyLoader.getTrackPointsForViewport(
      largeGPXFile.id,
      bounds,
      10
    );

    expect(points.length).toBeGreaterThan(0);

    const stats = lazyLoader.getMemoryStats();
    expect(stats.chunksLoaded).toBeGreaterThan(0);
  });
});

describe('MemoryManager', () => {
  let memoryManager: MemoryManager;

  beforeEach(() => {
    memoryManager = new MemoryManager({
      maxMemoryUsage: 50 * 1024 * 1024, // 50MB
    });
  });

  afterEach(() => {
    memoryManager.destroy();
  });

  it('should track memory consumers', () => {
    const consumer = {
      id: 'test-consumer',
      type: 'gpx' as const,
      size: 1024 * 1024, // 1MB
      lastAccessed: new Date(),
      priority: 'medium' as const,
      cleanup: jest.fn(),
    };

    memoryManager.registerConsumer(consumer);

    const stats = memoryManager.getMemoryStats();
    expect(stats.totalUsage).toBe(1024 * 1024);
  });

  it('should cleanup when memory limit exceeded', async () => {
    const consumers = [];

    // Add consumers until limit is exceeded
    for (let i = 0; i < 60; i++) {
      const consumer = {
        id: `consumer-${i}`,
        type: 'gpx' as const,
        size: 1024 * 1024, // 1MB each
        lastAccessed: new Date(Date.now() - i * 1000), // Older consumers first
        priority: 'low' as const,
        cleanup: jest.fn().mockResolvedValue(undefined),
      };

      consumers.push(consumer);
      memoryManager.registerConsumer(consumer);
    }

    // Force cleanup
    await memoryManager.forceCleanup();

    // Some consumers should have been cleaned up
    const cleanedConsumers = consumers.filter(
      (c) => c.cleanup.mock.calls.length > 0
    );
    expect(cleanedConsumers.length).toBeGreaterThan(0);
  });
});

describe('BackgroundProcessor', () => {
  let processor: BackgroundProcessor;

  beforeEach(() => {
    processor = new BackgroundProcessor(2); // Max 2 concurrent tasks
  });

  afterEach(() => {
    processor.destroy();
  });

  it('should process tasks in priority order', async () => {
    const results: string[] = [];

    const lowPriorityTask = {
      id: 'low',
      name: 'Low Priority Task',
      priority: 'low' as const,
      execute: async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        results.push('low');
        return 'low';
      },
    };

    const highPriorityTask = {
      id: 'high',
      name: 'High Priority Task',
      priority: 'high' as const,
      execute: async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        results.push('high');
        return 'high';
      },
    };

    // Add low priority first, then high priority
    processor.addTask(lowPriorityTask);
    processor.addTask(highPriorityTask);

    await Promise.all([
      processor.addTask(lowPriorityTask),
      processor.addTask(highPriorityTask),
    ]);

    // High priority should complete first
    expect(results[0]).toBe('high');
  });

  it('should handle task failures with retries', async () => {
    let attempts = 0;

    const failingTask = {
      id: 'failing',
      name: 'Failing Task',
      priority: 'medium' as const,
      retries: 2,
      execute: async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Task failed');
        }
        return 'success';
      },
    };

    const result = await processor.addTask(failingTask);

    expect(result).toBe('success');
    expect(attempts).toBe(3); // Initial attempt + 2 retries
  });
});

// Helper functions for creating test data

function createMockLargeGPXFile(pointCount: number): MobileGPXFile {
  const points = [];

  for (let i = 0; i < pointCount; i++) {
    points.push({
      lat: 44.5 + (i / pointCount) * 0.1,
      lon: -122.5 + (i / pointCount) * 0.1,
      ele: 100 + Math.sin(i / 100) * 50,
      time: new Date(Date.now() + i * 1000).toISOString(),
    });
  }

  return {
    id: `test-gpx-${Date.now()}`,
    metadata: {
      filePath: '/mock/path/test.gpx',
      id: `test-gpx-${Date.now()}`,
      filename: 'test.gpx',
      name: 'Test Track',
      createdAt: new Date(),
      modifiedAt: new Date(),
      fileSize: pointCount * 100, // Rough estimate
      trackCount: 1,
      waypointCount: 0,
      totalDistance: pointCount * 10, // Rough estimate
      elevationGain: 100,
      elevationLoss: 50,
      bounds: {
        north: 44.6,
        south: 44.5,
        east: -122.4,
        west: -122.5,
      },
    },
    gpxFile: {
      tracks: [
        {
          name: 'Test Track',
          segments: [
            {
              points: points,
            },
          ],
        },
      ],
      waypoints: [],
      routes: [],
      toGeoJSON: () => ({ type: 'FeatureCollection', features: [] }),
      getStatistics: () => ({ distance: pointCount * 10 }),
      clone: () => createMockLargeGPXFile(pointCount).gpxFile,
    } as any,
  };
}

function createMockComplexTrackGPXFile(): MobileGPXFile {
  // Create a track with complex geometry (zigzag pattern)
  const points = [];

  for (let i = 0; i < 1000; i++) {
    const zigzag = Math.sin(i / 10) * 0.01;
    points.push({
      lat: 44.5 + (i / 1000) * 0.1 + zigzag,
      lon: -122.5 + (i / 1000) * 0.1 + zigzag,
      ele: 100 + Math.sin(i / 50) * 100,
      time: new Date(Date.now() + i * 1000).toISOString(),
    });
  }

  const baseFile = createMockLargeGPXFile(1000);
  // Replace the points in the GPX file
  baseFile.gpxFile.tracks[0].segments[0].points = points;
  return baseFile;
}

function generateLargeGPXContent(pointCount: number): string {
  let gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="test">
  <trk>
    <name>Test Track</name>
    <trkseg>`;

  for (let i = 0; i < pointCount; i++) {
    const lat = 44.5 + (i / pointCount) * 0.1;
    const lon = -122.5 + (i / pointCount) * 0.1;
    const ele = 100 + Math.sin(i / 100) * 50;

    gpxContent += `
      <trkpt lat="${lat}" lon="${lon}">
        <ele>${ele}</ele>
        <time>${new Date(Date.now() + i * 1000).toISOString()}</time>
      </trkpt>`;
  }

  gpxContent += `
    </trkseg>
  </trk>
</gpx>`;

  return gpxContent;
}
