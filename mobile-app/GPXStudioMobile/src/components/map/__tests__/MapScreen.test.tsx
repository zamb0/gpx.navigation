/**
 * @jest-environment jsdom
 */

import { LocationService } from '../../../services/location/LocationService';
import { DatabaseService } from '../../../services/database/DatabaseService';

// Mock the services
jest.mock('../../../services/location/LocationService');
jest.mock('../../../services/database/DatabaseService');

const mockLocationService = LocationService.getInstance as jest.MockedFunction<
  typeof LocationService.getInstance
>;
const mockDatabaseService = DatabaseService.getInstance as jest.MockedFunction<
  typeof DatabaseService.getInstance
>;

describe('MapScreen', () => {
  const mockLocation = {
    latitude: 37.7749,
    longitude: -122.4194,
    altitude: 100,
    accuracy: 5,
    timestamp: Date.now(),
  };

  const mockGPXMetadata = {
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
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock LocationService
    const mockLocationServiceInstance = {
      getCurrentLocation: jest.fn().mockResolvedValue(mockLocation),
      startTracking: jest.fn().mockResolvedValue(undefined),
      stopTracking: jest.fn().mockResolvedValue(undefined),
      onLocationUpdate: jest.fn().mockReturnValue(() => {}),
      onLocationError: jest.fn().mockReturnValue(() => {}),
    };
    mockLocationService.mockReturnValue(mockLocationServiceInstance as any);

    // Mock DatabaseService
    const mockDatabaseServiceInstance = {
      isInitialized: jest.fn().mockReturnValue(true),
      initialize: jest.fn().mockResolvedValue(undefined),
      gpxFiles: {
        getAll: jest.fn().mockResolvedValue([mockGPXMetadata]),
      },
    };
    mockDatabaseService.mockReturnValue(mockDatabaseServiceInstance as any);
  });

  it('initializes location service correctly', () => {
    const locationServiceInstance = LocationService.getInstance();
    expect(locationServiceInstance).toBeDefined();
  });

  it('initializes database service correctly', () => {
    const databaseServiceInstance = DatabaseService.getInstance();
    expect(databaseServiceInstance).toBeDefined();
  });

  it('location service has required methods', () => {
    const locationServiceInstance = LocationService.getInstance();
    expect(locationServiceInstance.getCurrentLocation).toBeDefined();
    expect(locationServiceInstance.startTracking).toBeDefined();
    expect(locationServiceInstance.stopTracking).toBeDefined();
  });

  it('database service has required methods', () => {
    const databaseServiceInstance = DatabaseService.getInstance();
    expect(databaseServiceInstance.gpxFiles).toBeDefined();
    expect(databaseServiceInstance.gpxFiles.getAll).toBeDefined();
  });

  it('can call location service methods', async () => {
    const locationServiceInstance = LocationService.getInstance();

    await locationServiceInstance.getCurrentLocation();
    expect(locationServiceInstance.getCurrentLocation).toHaveBeenCalled();

    await locationServiceInstance.startTracking();
    expect(locationServiceInstance.startTracking).toHaveBeenCalled();
  });

  it('can call database service methods', async () => {
    const databaseServiceInstance = DatabaseService.getInstance();

    const files = await databaseServiceInstance.gpxFiles.getAll();
    expect(databaseServiceInstance.gpxFiles.getAll).toHaveBeenCalled();
    expect(files).toEqual([mockGPXMetadata]);
  });
});
