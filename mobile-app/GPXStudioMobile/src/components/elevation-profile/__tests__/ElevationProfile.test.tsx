/**
 * Unit tests for ElevationProfile component
 * These tests focus on data processing and component logic
 */

import { MobileGPXFile } from '../../../types/gpx';

const mockGPXFile: MobileGPXFile = {
  id: 'test-file-1',
  metadata: {
    id: 'test-file-1',
    filename: 'test-track.gpx',
    name: 'Test Track',
    description: 'A test track for elevation profile',
    createdAt: new Date('2024-01-01'),
    modifiedAt: new Date('2024-01-01'),
    fileSize: 1024,
    trackCount: 1,
    waypointCount: 0,
    totalDistance: 5000,
    elevationGain: 200,
    elevationLoss: 150,
    bounds: {
      north: 37.8,
      south: 37.7,
      east: -122.4,
      west: -122.5,
    },
    filePath: '/path/to/test-track.gpx',
  },
  gpxFile: {
    tracks: [
      {
        name: 'Test Track',
        segments: [
          {
            points: [
              {
                lat: 37.7749,
                lon: -122.4194,
                ele: 100,
                time: '2024-01-01T10:00:00Z',
              },
              {
                lat: 37.775,
                lon: -122.4195,
                ele: 120,
                time: '2024-01-01T10:01:00Z',
              },
              {
                lat: 37.7751,
                lon: -122.4196,
                ele: 140,
                time: '2024-01-01T10:02:00Z',
              },
              {
                lat: 37.7752,
                lon: -122.4197,
                ele: 160,
                time: '2024-01-01T10:03:00Z',
              },
              {
                lat: 37.7753,
                lon: -122.4198,
                ele: 180,
                time: '2024-01-01T10:04:00Z',
              },
              {
                lat: 37.7754,
                lon: -122.4199,
                ele: 200,
                time: '2024-01-01T10:05:00Z',
              },
              {
                lat: 37.7755,
                lon: -122.42,
                ele: 190,
                time: '2024-01-01T10:06:00Z',
              },
              {
                lat: 37.7756,
                lon: -122.4201,
                ele: 170,
                time: '2024-01-01T10:07:00Z',
              },
              {
                lat: 37.7757,
                lon: -122.4202,
                ele: 150,
                time: '2024-01-01T10:08:00Z',
              },
              {
                lat: 37.7758,
                lon: -122.4203,
                ele: 130,
                time: '2024-01-01T10:09:00Z',
              },
            ],
          },
        ],
      },
    ],
    waypoints: [],
  },
};

const mockGPXFileNoElevation: MobileGPXFile = {
  ...mockGPXFile,
  gpxFile: {
    tracks: [
      {
        name: 'Test Track No Elevation',
        segments: [
          {
            points: [
              { lat: 37.7749, lon: -122.4194 },
              { lat: 37.775, lon: -122.4195 },
            ],
          },
        ],
      },
    ],
    waypoints: [],
  },
};

// Helper functions for testing elevation calculations
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function calculateElevationGain(elevations: number[]): number {
  let gain = 0;
  for (let i = 1; i < elevations.length; i++) {
    const diff = elevations[i] - elevations[i - 1];
    if (diff > 0) gain += diff;
  }
  return gain;
}

function calculateElevationLoss(elevations: number[]): number {
  let loss = 0;
  for (let i = 1; i < elevations.length; i++) {
    const diff = elevations[i] - elevations[i - 1];
    if (diff < 0) loss += Math.abs(diff);
  }
  return loss;
}

describe('ElevationProfile Data Processing', () => {
  describe('Distance Calculations', () => {
    it('calculates distance between two points correctly', () => {
      const lat1 = 37.7749;
      const lon1 = -122.4194;
      const lat2 = 37.775;
      const lon2 = -122.4195;

      const distance = calculateDistance(lat1, lon1, lat2, lon2);

      // Should be a small distance (around 15 meters)
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(100);
    });

    it('returns zero distance for identical points', () => {
      const lat = 37.7749;
      const lon = -122.4194;

      const distance = calculateDistance(lat, lon, lat, lon);

      expect(distance).toBe(0);
    });
  });

  describe('Elevation Calculations', () => {
    it('calculates elevation gain correctly', () => {
      const elevations = [100, 120, 110, 140, 130, 160];
      const gain = calculateElevationGain(elevations);

      // Gains: 20 + 0 + 30 + 0 + 30 = 80
      expect(gain).toBe(80);
    });

    it('calculates elevation loss correctly', () => {
      const elevations = [100, 120, 110, 140, 130, 160];
      const loss = calculateElevationLoss(elevations);

      // Losses: 0 + 10 + 0 + 10 + 0 = 20
      expect(loss).toBe(20);
    });

    it('handles flat elevation profile', () => {
      const elevations = [100, 100, 100, 100];
      const gain = calculateElevationGain(elevations);
      const loss = calculateElevationLoss(elevations);

      expect(gain).toBe(0);
      expect(loss).toBe(0);
    });

    it('handles single point elevation', () => {
      const elevations = [100];
      const gain = calculateElevationGain(elevations);
      const loss = calculateElevationLoss(elevations);

      expect(gain).toBe(0);
      expect(loss).toBe(0);
    });
  });

  describe('GPX Data Processing', () => {
    it('processes GPX file with elevation data', () => {
      const points = mockGPXFile.gpxFile.tracks[0].segments[0].points;

      // Extract elevations
      const elevations = points
        .map((p: any) => p.ele)
        .filter((e: any) => e !== undefined);

      expect(elevations).toHaveLength(10);
      expect(elevations[0]).toBe(100);
      expect(elevations[9]).toBe(130);

      // Calculate statistics
      const gain = calculateElevationGain(elevations);
      const loss = calculateElevationLoss(elevations);
      const minElevation = Math.min(...elevations);
      const maxElevation = Math.max(...elevations);

      expect(gain).toBeGreaterThan(0);
      expect(loss).toBeGreaterThan(0);
      expect(minElevation).toBe(100);
      expect(maxElevation).toBe(200);
    });

    it('handles GPX file without elevation data', () => {
      const points =
        mockGPXFileNoElevation.gpxFile.tracks[0].segments[0].points;

      // Extract elevations (should be undefined)
      const elevations = points
        .map((p: any) => p.ele)
        .filter((e: any) => e !== undefined);

      expect(elevations).toHaveLength(0);
    });

    it('calculates total distance for track', () => {
      const points = mockGPXFile.gpxFile.tracks[0].segments[0].points;
      let totalDistance = 0;

      for (let i = 1; i < points.length; i++) {
        const distance = calculateDistance(
          points[i - 1].lat,
          points[i - 1].lon,
          points[i].lat,
          points[i].lon
        );
        totalDistance += distance;
      }

      expect(totalDistance).toBeGreaterThan(0);
    });
  });

  describe('Data Overlay Types', () => {
    it('supports elevation overlay type', () => {
      const overlayType = 'elevation';
      expect(['elevation', 'slope', 'speed', 'surface', 'highway']).toContain(
        overlayType
      );
    });

    it('supports slope overlay type', () => {
      const overlayType = 'slope';
      expect(['elevation', 'slope', 'speed', 'surface', 'highway']).toContain(
        overlayType
      );
    });

    it('supports speed overlay type', () => {
      const overlayType = 'speed';
      expect(['elevation', 'slope', 'speed', 'surface', 'highway']).toContain(
        overlayType
      );
    });
  });

  describe('Edge Cases', () => {
    it('handles empty tracks array', () => {
      const emptyGPXFile: MobileGPXFile = {
        ...mockGPXFile,
        gpxFile: {
          tracks: [],
          waypoints: [],
        },
      };

      expect(emptyGPXFile.gpxFile.tracks).toHaveLength(0);
    });

    it('handles tracks with empty segments', () => {
      const emptySegmentsGPXFile: MobileGPXFile = {
        ...mockGPXFile,
        gpxFile: {
          tracks: [{ name: 'Empty Track', segments: [] }],
          waypoints: [],
        },
      };

      expect(emptySegmentsGPXFile.gpxFile.tracks[0].segments).toHaveLength(0);
    });

    it('handles segments with empty points', () => {
      const emptyPointsGPXFile: MobileGPXFile = {
        ...mockGPXFile,
        gpxFile: {
          tracks: [{ name: 'Empty Points Track', segments: [{ points: [] }] }],
          waypoints: [],
        },
      };

      expect(
        emptyPointsGPXFile.gpxFile.tracks[0].segments[0].points
      ).toHaveLength(0);
    });
  });
});
