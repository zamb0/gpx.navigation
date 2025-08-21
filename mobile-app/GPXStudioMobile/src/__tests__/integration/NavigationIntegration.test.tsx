import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { NavigationService } from '../../services/navigation/NavigationService';
import { LocationService } from '../../services/location/LocationService';
import { NavigationHUD } from '../../components/navigation/NavigationHUD';
import { NavigationControls } from '../../components/navigation/NavigationControls';
import { NavigationSettingsModal } from '../../components/navigation/NavigationSettingsModal';
import { NavigationMode, NavigationState } from '../../types/navigation';
import { MobileGPXFile } from '../../types/gpx';
import { LocationCoordinate } from '../../types/location';

// Mock services
jest.mock('../../services/navigation/NavigationService', () => ({
  NavigationService: {
    getInstance: jest.fn(),
  },
}));
jest.mock('../../services/location/LocationService', () => ({
  LocationService: {
    getInstance: jest.fn(),
  },
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('Navigation Integration Tests', () => {
  let mockNavigationService: jest.Mocked<NavigationService>;
  let mockLocationService: jest.Mocked<LocationService>;
  let mockGPXFile: MobileGPXFile;
  let navigationUpdateCallback: (state: NavigationState) => void;
  let locationUpdateCallback: (location: LocationCoordinate) => void;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    (Alert.alert as jest.Mock).mockClear();

    // Setup NavigationService mock
    mockNavigationService = {
      startNavigation: jest.fn().mockResolvedValue(undefined),
      stopNavigation: jest.fn().mockResolvedValue(undefined),
      getNavigationState: jest.fn(),
      getNavigationStats: jest.fn(),
      getSettings: jest.fn(),
      updateSettings: jest.fn(),
      onNavigationUpdate: jest.fn().mockImplementation((callback) => {
        navigationUpdateCallback = callback;
        return () => {};
      }),
      onNavigationAlert: jest.fn().mockReturnValue(() => {}),
      getAlerts: jest.fn().mockReturnValue([]),
      acknowledgeAlert: jest.fn(),
    } as any;

    (NavigationService.getInstance as jest.Mock).mockReturnValue(
      mockNavigationService
    );

    // Setup LocationService mock
    mockLocationService = {
      startTracking: jest.fn().mockResolvedValue(undefined),
      stopTracking: jest.fn().mockResolvedValue(undefined),
      onLocationUpdate: jest.fn().mockImplementation((callback) => {
        locationUpdateCallback = callback;
        return () => {};
      }),
    } as any;

    (LocationService.getInstance as jest.Mock).mockReturnValue(
      mockLocationService
    );

    // Create mock GPX file
    mockGPXFile = {
      id: 'integration-test-gpx',
      metadata: {
        id: 'integration-test-gpx',
        filename: 'integration-test.gpx',
        name: 'Integration Test Route',
        description: 'A route for integration testing',
        createdAt: new Date(),
        modifiedAt: new Date(),
        fileSize: 2048,
        trackCount: 1,
        waypointCount: 4,
        totalDistance: 10000, // 10km
        elevationGain: 300,
        elevationLoss: 250,
        bounds: {
          north: 37.7949,
          south: 37.7549,
          east: -122.3994,
          west: -122.4394,
        },
        filePath: '/path/to/integration-test.gpx',
      },
      gpxFile: {
        waypoints: [
          {
            lat: 37.7749,
            lon: -122.4194,
            name: 'Start',
            desc: 'Starting point',
          },
          {
            lat: 37.7799,
            lon: -122.4144,
            name: 'Checkpoint 1',
            desc: 'First checkpoint',
          },
          {
            lat: 37.7849,
            lon: -122.4094,
            name: 'Checkpoint 2',
            desc: 'Second checkpoint',
          },
          { lat: 37.7899, lon: -122.4044, name: 'Finish', desc: 'Finish line' },
        ],
        tracks: [
          {
            segments: [
              {
                points: Array.from({ length: 100 }, (_, i) => ({
                  lat: 37.7749 + i * 0.0015,
                  lon: -122.4194 + i * 0.0015,
                  ele: 100 + i * 2,
                  time: new Date(Date.now() + i * 60000), // 1 minute intervals
                })),
              },
            ],
          },
        ],
      },
    };

    // Setup default states
    mockNavigationService.getNavigationState.mockReturnValue({
      isNavigating: false,
      currentRoute: null,
      currentPosition: null,
      closestPoint: null,
      distanceToTrack: 0,
      distanceAlongTrack: 0,
      remainingDistance: 0,
      currentSpeed: 0,
      bearing: 0,
      isOffRoute: false,
      nextWaypoint: null,
      distanceToNextWaypoint: 0,
      bearingToNextWaypoint: 0,
      progress: 0,
    });

    mockNavigationService.getNavigationStats.mockReturnValue({
      startTime: new Date(),
      elapsedTime: 0,
      totalDistance: 0,
      averageSpeed: 0,
      maxSpeed: 0,
      elevationGain: 0,
      elevationLoss: 0,
      waypointsReached: 0,
      totalWaypoints: 4,
    });

    mockNavigationService.getSettings.mockReturnValue({
      offRouteThreshold: 50,
      offRouteAlertEnabled: true,
      voiceGuidanceEnabled: true,
      waypointAlertDistance: 100,
      waypointAlertEnabled: true,
      speedAlertEnabled: false,
      speedAlertThreshold: 30,
      autoRecenterMap: true,
      keepScreenOn: true,
      navigationAccuracy: 'high',
      updateInterval: 1000,
    });
  });

  describe('Complete Navigation Workflow', () => {
    it('should complete full navigation lifecycle', async () => {
      const mockOnNavigationStart = jest.fn();
      const mockOnNavigationStop = jest.fn();
      const mockOnSettingsPress = jest.fn();

      // Render navigation controls
      const { getByTestId, getByText, rerender } = render(
        <NavigationControls
          gpxFile={mockGPXFile}
          onNavigationStart={mockOnNavigationStart}
          onNavigationStop={mockOnNavigationStop}
          onSettingsPress={mockOnSettingsPress}
        />
      );

      // 1. Start navigation
      expect(getByText('Navigate')).toBeTruthy();
      fireEvent.press(getByTestId('navigation-button'));

      await waitFor(() => {
        expect(mockNavigationService.startNavigation).toHaveBeenCalledWith(
          mockGPXFile,
          NavigationMode.FOLLOW_TRACK
        );
        expect(mockOnNavigationStart).toHaveBeenCalled();
      });

      // 2. Simulate navigation state change to active
      const activeNavigationState: NavigationState = {
        isNavigating: true,
        currentRoute: {
          id: mockGPXFile.id,
          name: mockGPXFile.metadata.name!,
          description: mockGPXFile.metadata.description,
          waypoints: mockGPXFile.gpxFile.waypoints.map((wp: any) => ({
            latitude: wp.lat,
            longitude: wp.lon,
            name: wp.name,
            description: wp.desc,
          })),
          trackPoints: mockGPXFile.gpxFile.tracks[0].segments[0].points.map(
            (pt: any) => ({
              latitude: pt.lat,
              longitude: pt.lon,
              elevation: pt.ele,
              timestamp: pt.time,
            })
          ),
          totalDistance: mockGPXFile.metadata.totalDistance,
          bounds: mockGPXFile.metadata.bounds,
        },
        currentPosition: {
          latitude: 37.7749,
          longitude: -122.4194,
          elevation: 100,
          timestamp: new Date(),
        },
        closestPoint: {
          latitude: 37.775,
          longitude: -122.4195,
          elevation: 102,
        },
        distanceToTrack: 5,
        distanceAlongTrack: 0,
        remainingDistance: 10000,
        currentSpeed: 0,
        bearing: 45,
        isOffRoute: false,
        nextWaypoint: {
          latitude: 37.7799,
          longitude: -122.4144,
          name: 'Checkpoint 1',
        },
        distanceToNextWaypoint: 800,
        bearingToNextWaypoint: 45,
        progress: 0,
      };

      act(() => {
        navigationUpdateCallback(activeNavigationState);
      });

      // Re-render with updated state
      mockNavigationService.getNavigationState.mockReturnValue(
        activeNavigationState
      );

      rerender(
        <NavigationControls
          gpxFile={mockGPXFile}
          onNavigationStart={mockOnNavigationStart}
          onNavigationStop={mockOnNavigationStop}
          onSettingsPress={mockOnSettingsPress}
        />
      );

      // 3. Verify navigation is active
      expect(getByText('Stop')).toBeTruthy();
      expect(getByText('On Route')).toBeTruthy();
      expect(getByText('800m to waypoint')).toBeTruthy();

      // 4. Render HUD
      const { getByText: getHUDText } = render(
        <NavigationHUD visible={true} onStopNavigation={mockOnNavigationStop} />
      );

      // 5. Verify HUD displays navigation data
      expect(getHUDText('0 km/h')).toBeTruthy(); // Current speed
      expect(getHUDText('10.0km')).toBeTruthy(); // Remaining distance
      expect(getHUDText('0%')).toBeTruthy(); // Progress

      // 6. Simulate location updates during navigation
      const locationUpdates: LocationCoordinate[] = [
        {
          latitude: 37.7754,
          longitude: -122.4189,
          altitude: 105,
          speed: 2.5, // 2.5 m/s = 9 km/h
          heading: 45,
          timestamp: Date.now(),
        },
        {
          latitude: 37.7759,
          longitude: -122.4184,
          altitude: 110,
          speed: 3.0, // 3.0 m/s = 10.8 km/h
          heading: 45,
          timestamp: Date.now() + 5000,
        },
        {
          latitude: 37.7764,
          longitude: -122.4179,
          altitude: 115,
          speed: 3.5, // 3.5 m/s = 12.6 km/h
          heading: 45,
          timestamp: Date.now() + 10000,
        },
      ];

      for (const location of locationUpdates) {
        act(() => {
          locationUpdateCallback(location);
        });

        // Update navigation state to reflect progress
        const updatedState: NavigationState = {
          ...activeNavigationState,
          currentPosition: {
            latitude: location.latitude,
            longitude: location.longitude,
            elevation: location.altitude,
            timestamp: new Date(location.timestamp),
          },
          currentSpeed: location.speed || 0,
          bearing: location.heading || 0,
          distanceAlongTrack: activeNavigationState.distanceAlongTrack + 100, // Simulate progress
          remainingDistance: activeNavigationState.remainingDistance - 100,
          progress: (activeNavigationState.distanceAlongTrack + 100) / 10000,
        };

        act(() => {
          navigationUpdateCallback(updatedState);
        });
      }

      // 7. Stop navigation
      fireEvent.press(getByTestId('navigation-button'));

      expect(Alert.alert).toHaveBeenCalledWith(
        'Stop Navigation',
        'Are you sure you want to stop navigation?',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Cancel' }),
          expect.objectContaining({ text: 'Stop' }),
        ])
      );

      // Simulate user confirming stop
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const stopAction = alertCall[2].find(
        (action: any) => action.text === 'Stop'
      );
      await act(async () => {
        await stopAction.onPress();
      });

      expect(mockNavigationService.stopNavigation).toHaveBeenCalled();
    });

    it('should handle off-route scenarios', async () => {
      const mockOnNavigationStart = jest.fn();
      const mockOnNavigationStop = jest.fn();

      // Start navigation
      const { getByTestId } = render(
        <NavigationControls
          gpxFile={mockGPXFile}
          onNavigationStart={mockOnNavigationStart}
          onNavigationStop={mockOnNavigationStop}
        />
      );

      fireEvent.press(getByTestId('navigation-button'));

      // Simulate going off route
      const offRouteState: NavigationState = {
        isNavigating: true,
        currentRoute: {
          id: mockGPXFile.id,
          name: mockGPXFile.metadata.name!,
          waypoints: [],
          trackPoints: [],
          totalDistance: 10000,
          bounds: mockGPXFile.metadata.bounds,
        },
        currentPosition: {
          latitude: 37.8, // Far from route
          longitude: -122.4,
          timestamp: new Date(),
        },
        closestPoint: {
          latitude: 37.775,
          longitude: -122.4195,
        },
        distanceToTrack: 2500, // 2.5km off route
        distanceAlongTrack: 1000,
        remainingDistance: 9000,
        currentSpeed: 5,
        bearing: 90,
        isOffRoute: true,
        nextWaypoint: null,
        distanceToNextWaypoint: 0,
        bearingToNextWaypoint: 0,
        progress: 0.1,
      };

      act(() => {
        navigationUpdateCallback(offRouteState);
      });

      mockNavigationService.getNavigationState.mockReturnValue(offRouteState);

      // Render HUD to check off-route display
      const { getByText } = render(
        <NavigationHUD visible={true} onStopNavigation={mockOnNavigationStop} />
      );

      // Should show off-route status
      expect(getByText('18 km/h')).toBeTruthy(); // Speed
      expect(getByText('9.0km')).toBeTruthy(); // Remaining distance
    });

    it('should handle waypoint approach alerts', async () => {
      const mockAlertCallback = jest.fn();

      // Setup alert callback
      mockNavigationService.onNavigationAlert.mockImplementation((callback) => {
        mockAlertCallback.mockImplementation(callback);
        return () => {};
      });

      // Start navigation
      const { getByTestId } = render(
        <NavigationControls
          gpxFile={mockGPXFile}
          onNavigationStart={jest.fn()}
          onNavigationStop={jest.fn()}
        />
      );

      fireEvent.press(getByTestId('navigation-button'));

      // Simulate approaching waypoint
      const approachingWaypointState: NavigationState = {
        isNavigating: true,
        currentRoute: {
          id: mockGPXFile.id,
          name: mockGPXFile.metadata.name!,
          waypoints: mockGPXFile.gpxFile.waypoints.map((wp: any) => ({
            latitude: wp.lat,
            longitude: wp.lon,
            name: wp.name,
          })),
          trackPoints: [],
          totalDistance: 10000,
          bounds: mockGPXFile.metadata.bounds,
        },
        currentPosition: {
          latitude: 37.7795, // Close to first waypoint
          longitude: -122.4149,
          timestamp: new Date(),
        },
        closestPoint: null,
        distanceToTrack: 5,
        distanceAlongTrack: 5000,
        remainingDistance: 5000,
        currentSpeed: 3,
        bearing: 45,
        isOffRoute: false,
        nextWaypoint: {
          latitude: 37.7799,
          longitude: -122.4144,
          name: 'Checkpoint 1',
        },
        distanceToNextWaypoint: 75, // Within alert threshold
        bearingToNextWaypoint: 45,
        progress: 0.5,
      };

      act(() => {
        navigationUpdateCallback(approachingWaypointState);
      });

      // Simulate waypoint alert
      const waypointAlert = {
        id: 'waypoint-alert-1',
        type: 'waypoint_approach' as const,
        message: 'Approaching Checkpoint 1 in 75m',
        timestamp: new Date(),
        acknowledged: false,
        priority: 'high' as const,
      };

      mockNavigationService.getAlerts.mockReturnValue([waypointAlert]);

      act(() => {
        mockAlertCallback(waypointAlert);
      });

      // Render HUD to check alert display
      const { getByText } = render(
        <NavigationHUD visible={true} onStopNavigation={jest.fn()} />
      );

      expect(getByText('Approaching Checkpoint 1 in 75m')).toBeTruthy();
    });
  });

  describe('Settings Integration', () => {
    it('should update navigation behavior when settings change', async () => {
      // Render settings modal
      const { getByTestId } = render(
        <NavigationSettingsModal visible={true} onClose={jest.fn()} />
      );

      // Change off-route threshold
      const slider = getByTestId('off-route-threshold-slider');
      fireEvent(slider, 'onValueChange', 25);

      // Save settings
      const saveButton = getByTestId('save-button');
      fireEvent.press(saveButton);

      expect(mockNavigationService.updateSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          offRouteThreshold: 25,
        })
      );

      // Verify settings are applied during navigation
      const updatedSettings = {
        ...mockNavigationService.getSettings(),
        offRouteThreshold: 25,
      };
      mockNavigationService.getSettings.mockReturnValue(updatedSettings);

      // Start navigation with new settings
      const { getByTestId: getControlsTestId } = render(
        <NavigationControls
          gpxFile={mockGPXFile}
          onNavigationStart={jest.fn()}
          onNavigationStop={jest.fn()}
        />
      );

      fireEvent.press(getControlsTestId('navigation-button'));

      // Simulate location slightly off route (within old threshold but outside new one)
      const slightlyOffRouteState: NavigationState = {
        isNavigating: true,
        currentRoute: {
          id: mockGPXFile.id,
          name: mockGPXFile.metadata.name!,
          waypoints: [],
          trackPoints: [],
          totalDistance: 10000,
          bounds: mockGPXFile.metadata.bounds,
        },
        currentPosition: {
          latitude: 37.7749,
          longitude: -122.42, // 30m off route
          timestamp: new Date(),
        },
        closestPoint: null,
        distanceToTrack: 30,
        distanceAlongTrack: 0,
        remainingDistance: 10000,
        currentSpeed: 0,
        bearing: 0,
        isOffRoute: true, // Should be off route with new threshold
        nextWaypoint: null,
        distanceToNextWaypoint: 0,
        bearingToNextWaypoint: 0,
        progress: 0,
      };

      act(() => {
        navigationUpdateCallback(slightlyOffRouteState);
      });

      // Should detect off-route with tighter threshold
      expect(slightlyOffRouteState.isOffRoute).toBe(true);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle navigation service errors gracefully', async () => {
      mockNavigationService.startNavigation.mockRejectedValue(
        new Error('Location services unavailable')
      );

      const { getByTestId } = render(
        <NavigationControls
          gpxFile={mockGPXFile}
          onNavigationStart={jest.fn()}
          onNavigationStop={jest.fn()}
        />
      );

      fireEvent.press(getByTestId('navigation-button'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Navigation Error',
          'Location services unavailable'
        );
      });
    });

    it('should handle location service errors during navigation', async () => {
      // Start navigation successfully
      const { getByTestId } = render(
        <NavigationControls
          gpxFile={mockGPXFile}
          onNavigationStart={jest.fn()}
          onNavigationStop={jest.fn()}
        />
      );

      fireEvent.press(getByTestId('navigation-button'));

      // Simulate location service error
      const locationError = {
        code: 'POSITION_UNAVAILABLE',
        message: 'GPS signal lost',
      };

      // This would typically be handled by the NavigationService internally
      // and might trigger an alert or fallback behavior
      expect(mockNavigationService.startNavigation).toHaveBeenCalled();
    });
  });

  describe('Performance Integration', () => {
    it('should handle rapid navigation updates efficiently', async () => {
      // Start navigation
      const { getByTestId } = render(
        <NavigationControls
          gpxFile={mockGPXFile}
          onNavigationStart={jest.fn()}
          onNavigationStop={jest.fn()}
        />
      );

      fireEvent.press(getByTestId('navigation-button'));

      // Render HUD
      const { rerender } = render(
        <NavigationHUD visible={true} onStopNavigation={jest.fn()} />
      );

      const startTime = Date.now();

      // Simulate 50 rapid navigation state updates
      for (let i = 0; i < 50; i++) {
        const rapidUpdateState: NavigationState = {
          isNavigating: true,
          currentRoute: {
            id: mockGPXFile.id,
            name: mockGPXFile.metadata.name!,
            waypoints: [],
            trackPoints: [],
            totalDistance: 10000,
            bounds: mockGPXFile.metadata.bounds,
          },
          currentPosition: {
            latitude: 37.7749 + i * 0.0001,
            longitude: -122.4194 + i * 0.0001,
            timestamp: new Date(),
          },
          closestPoint: null,
          distanceToTrack: 5,
          distanceAlongTrack: i * 100,
          remainingDistance: 10000 - i * 100,
          currentSpeed: 5,
          bearing: 45,
          isOffRoute: false,
          nextWaypoint: null,
          distanceToNextWaypoint: 0,
          bearingToNextWaypoint: 0,
          progress: (i * 100) / 10000,
        };

        act(() => {
          navigationUpdateCallback(rapidUpdateState);
        });
      }

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Should process all updates in reasonable time (less than 1 second)
      expect(processingTime).toBeLessThan(1000);
    });
  });
});
