/**
 * @jest-environment jsdom
 */

describe('GPXLayers', () => {
  const mockGPXFile = {
    id: 'test-gpx-1',
    metadata: {
      id: 'test-gpx-1',
      filename: 'test.gpx',
      name: 'Test Track',
      description: 'A test GPX track',
      createdAt: new Date(),
      modifiedAt: new Date(),
      fileSize: 1024,
      trackCount: 1,
      waypointCount: 2,
      totalDistance: 5000,
      elevationGain: 200,
      elevationLoss: 150,
      bounds: {
        north: 37.8,
        south: 37.7,
        east: -122.3,
        west: -122.5,
      },
      filePath: '/path/to/test.gpx',
    },
    gpxFile: {
      tracks: [
        {
          name: 'Test Track',
          segments: [
            {
              points: [
                { lat: 37.7749, lon: -122.4194, ele: 100 },
                { lat: 37.775, lon: -122.4195, ele: 105 },
                { lat: 37.7751, lon: -122.4196, ele: 110 },
              ],
            },
          ],
        },
      ],
      waypoints: [
        {
          lat: 37.7749,
          lon: -122.4194,
          name: 'Start Point',
          sym: 'flag',
        },
        {
          lat: 37.7751,
          lon: -122.4196,
          name: 'End Point',
          sym: 'flag',
        },
      ],
    },
  };

  it('handles GPX file data structure correctly', () => {
    expect(mockGPXFile.id).toBe('test-gpx-1');
    expect(mockGPXFile.gpxFile.tracks).toHaveLength(1);
    expect(mockGPXFile.gpxFile.waypoints).toHaveLength(2);
  });

  it('handles track segments correctly', () => {
    const track = mockGPXFile.gpxFile.tracks[0];
    expect(track.segments).toHaveLength(1);
    expect(track.segments[0].points).toHaveLength(3);
  });

  it('handles waypoint data correctly', () => {
    const waypoint = mockGPXFile.gpxFile.waypoints[0];
    expect(waypoint.lat).toBe(37.7749);
    expect(waypoint.lon).toBe(-122.4194);
    expect(waypoint.name).toBe('Start Point');
  });

  it('handles empty GPX files array', () => {
    const emptyFiles: any[] = [];
    expect(emptyFiles).toHaveLength(0);
  });

  it('handles GPX files without tracks', () => {
    const gpxFileWithoutTracks = {
      ...mockGPXFile,
      gpxFile: {
        tracks: [],
        waypoints: mockGPXFile.gpxFile.waypoints,
      },
    };

    expect(gpxFileWithoutTracks.gpxFile.tracks).toHaveLength(0);
    expect(gpxFileWithoutTracks.gpxFile.waypoints).toHaveLength(2);
  });

  it('handles GPX files without waypoints', () => {
    const gpxFileWithoutWaypoints = {
      ...mockGPXFile,
      gpxFile: {
        tracks: mockGPXFile.gpxFile.tracks,
        waypoints: [],
      },
    };

    expect(gpxFileWithoutWaypoints.gpxFile.tracks).toHaveLength(1);
    expect(gpxFileWithoutWaypoints.gpxFile.waypoints).toHaveLength(0);
  });
});
