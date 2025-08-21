import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationHUD } from '../NavigationHUD';
import { NavigationService } from '../../../services/navigation/NavigationService';
import { NavigationState, NavigationAlert } from '../../../types/navigation';

// Mock NavigationService
jest.mock('../../../services/navigation/NavigationService', () => ({
  NavigationService: {
    getInstance: jest.fn(),
  },
}));

describe('NavigationHUD', () => {
  let mockNavigationService: jest.Mocked<NavigationService>;
  let mockNavigationState: NavigationState;
  let mockOnToggleExpanded: jest.Mock;
  let mockOnStopNavigation: jest.Mock;

  beforeEach(() => {
    // Setup NavigationService mock
    mockNavigationService = {
      onNavigationUpdate: jest.fn().mockReturnValue(() => {}),
      onNavigationAlert: jest.fn().mockReturnValue(() => {}),
      getNavigationStats: jest.fn(),
      getAlerts: jest.fn().mockReturnValue([]),
      acknowledgeAlert: jest.fn(),
    } as any;

    (NavigationService.getInstance as jest.Mock).mockReturnValue(
      mockNavigationService
    );

    mockOnToggleExpanded = jest.fn();
    mockOnStopNavigation = jest.fn();

    mockNavigationState = {
      isNavigating: true,
      currentRoute: {
        id: 'test-route',
        name: 'Test Route',
        description: 'A test navigation route',
        waypoints: [],
        trackPoints: [],
        totalDistance: 5000,
        bounds: {
          north: 37.7849,
          south: 37.7649,
          east: -122.4094,
          west: -122.4294,
        },
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
      distanceAlongTrack: 2500,
      remainingDistance: 2500,
      currentSpeed: 5.5, // m/s
      bearing: 45,
      isOffRoute: false,
      nextWaypoint: {
        latitude: 37.7799,
        longitude: -122.4144,
        name: 'Next Waypoint',
      },
      distanceToNextWaypoint: 500,
      bearingToNextWaypoint: 30,
      progress: 0.5,
    };

    mockNavigationService.onNavigationUpdate = jest
      .fn()
      .mockReturnValue(() => {});
    mockNavigationService.onNavigationAlert = jest
      .fn()
      .mockReturnValue(() => {});
    mockNavigationService.getNavigationStats = jest.fn().mockReturnValue({
      startTime: new Date(Date.now() - 600000), // 10 minutes ago
      elapsedTime: 600000,
      totalDistance: 2500,
      averageSpeed: 4.17, // m/s
      maxSpeed: 8.33,
      elevationGain: 50,
      elevationLoss: 30,
      waypointsReached: 1,
      totalWaypoints: 3,
    });
    mockNavigationService.getAlerts = jest.fn().mockReturnValue([]);
    mockNavigationService.acknowledgeAlert = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Visibility and Animation', () => {
    it('should not render when not visible', () => {
      const { queryByTestId } = render(
        <NavigationHUD
          visible={false}
          onToggleExpanded={mockOnToggleExpanded}
          onStopNavigation={mockOnStopNavigation}
        />
      );

      expect(queryByTestId('navigation-hud')).toBeNull();
    });

    it('should render when visible', () => {
      mockNavigationService.onNavigationUpdate.mockImplementation(
        (callback) => {
          callback(mockNavigationState);
          return () => {};
        }
      );

      const { getByText } = render(
        <NavigationHUD
          visible={true}
          onToggleExpanded={mockOnToggleExpanded}
          onStopNavigation={mockOnStopNavigation}
        />
      );

      expect(getByText('20 km/h')).toBeTruthy(); // Speed display
      expect(getByText('2.5km')).toBeTruthy(); // Remaining distance
      expect(getByText('50%')).toBeTruthy(); // Progress
    });
  });

  describe('Navigation State Display', () => {
    beforeEach(() => {
      mockNavigationService.onNavigationUpdate.mockImplementation(
        (callback) => {
          callback(mockNavigationState);
          return () => {};
        }
      );
    });

    it('should display current speed correctly', () => {
      const { getByText } = render(
        <NavigationHUD
          visible={true}
          onToggleExpanded={mockOnToggleExpanded}
          onStopNavigation={mockOnStopNavigation}
        />
      );

      // Speed should be converted from m/s to km/h (5.5 * 3.6 = 19.8 ≈ 20)
      expect(getByText('20 km/h')).toBeTruthy();
    });

    it('should display remaining distance correctly', () => {
      const { getByText } = render(
        <NavigationHUD
          visible={true}
          onToggleExpanded={mockOnToggleExpanded}
          onStopNavigation={mockOnStopNavigation}
        />
      );

      expect(getByText('2.5km')).toBeTruthy();
    });

    it('should display progress percentage correctly', () => {
      const { getByText } = render(
        <NavigationHUD
          visible={true}
          onToggleExpanded={mockOnToggleExpanded}
          onStopNavigation={mockOnStopNavigation}
        />
      );

      expect(getByText('50%')).toBeTruthy();
    });

    it('should display bearing correctly', () => {
      const { getByText, getByTestId } = render(
        <NavigationHUD
          visible={true}
          onToggleExpanded={mockOnToggleExpanded}
          onStopNavigation={mockOnStopNavigation}
        />
      );

      // Expand to see bearing
      fireEvent.press(getByTestId('expand-button'));

      expect(getByText('45° NE')).toBeTruthy();
    });
  });

  describe('Expanded View', () => {
    beforeEach(() => {
      mockNavigationService.onNavigationUpdate.mockImplementation(
        (callback) => {
          callback(mockNavigationState);
          return () => {};
        }
      );
    });

    it('should toggle expanded view', () => {
      const { getByTestId, queryByText } = render(
        <NavigationHUD
          visible={true}
          onToggleExpanded={mockOnToggleExpanded}
          onStopNavigation={mockOnStopNavigation}
        />
      );

      // Initially collapsed
      expect(queryByText('45° NE')).toBeNull();

      // Expand
      fireEvent.press(getByTestId('expand-button'));
      expect(mockOnToggleExpanded).toHaveBeenCalled();
    });

    it('should display route information in expanded view', () => {
      const { getByTestId, getByText } = render(
        <NavigationHUD
          visible={true}
          onToggleExpanded={mockOnToggleExpanded}
          onStopNavigation={mockOnStopNavigation}
        />
      );

      // Expand the HUD
      fireEvent.press(getByTestId('expand-button'));

      expect(getByText('Test Route')).toBeTruthy();
      expect(getByText('A test navigation route')).toBeTruthy();
    });

    it('should display navigation statistics in expanded view', () => {
      const { getByTestId, getByText } = render(
        <NavigationHUD
          visible={true}
          onToggleExpanded={mockOnToggleExpanded}
          onStopNavigation={mockOnStopNavigation}
        />
      );

      // Expand the HUD
      fireEvent.press(getByTestId('expand-button'));

      expect(getByText('10:00')).toBeTruthy(); // Elapsed time
      expect(getByText('15 km/h')).toBeTruthy(); // Average speed
    });

    it('should display waypoint information when available', () => {
      const { getByTestId, getByText } = render(
        <NavigationHUD
          visible={true}
          onToggleExpanded={mockOnToggleExpanded}
          onStopNavigation={mockOnStopNavigation}
        />
      );

      // Expand the HUD
      fireEvent.press(getByTestId('expand-button'));

      expect(getByText('500m')).toBeTruthy(); // Distance to next waypoint
      expect(getByText('30° NE')).toBeTruthy(); // Bearing to waypoint
    });
  });

  describe('Alert System', () => {
    it('should display navigation alerts', () => {
      const mockAlert: NavigationAlert = {
        id: 'test-alert',
        type: 'off_route',
        message: 'You are 25m off the route',
        timestamp: new Date(),
        acknowledged: false,
        priority: 'medium',
      };

      mockNavigationService.getAlerts.mockReturnValue([mockAlert]);
      mockNavigationService.onNavigationAlert.mockImplementation((callback) => {
        callback(mockAlert);
        return () => {};
      });

      const { getByText } = render(
        <NavigationHUD
          visible={true}
          onToggleExpanded={mockOnToggleExpanded}
          onStopNavigation={mockOnStopNavigation}
        />
      );

      expect(getByText('You are 25m off the route')).toBeTruthy();
    });

    it('should allow dismissing alerts', () => {
      const mockAlert: NavigationAlert = {
        id: 'test-alert',
        type: 'waypoint_approach',
        message: 'Approaching waypoint in 50m',
        timestamp: new Date(),
        acknowledged: false,
        priority: 'high',
      };

      mockNavigationService.getAlerts.mockReturnValue([mockAlert]);

      const { getByTestId } = render(
        <NavigationHUD
          visible={true}
          onToggleExpanded={mockOnToggleExpanded}
          onStopNavigation={mockOnStopNavigation}
        />
      );

      fireEvent.press(getByTestId('dismiss-alert'));
      expect(mockNavigationService.acknowledgeAlert).toHaveBeenCalledWith(
        'test-alert'
      );
    });
  });

  describe('Control Interactions', () => {
    beforeEach(() => {
      mockNavigationService.onNavigationUpdate.mockImplementation(
        (callback) => {
          callback(mockNavigationState);
          return () => {};
        }
      );
    });

    it('should handle stop navigation button press', () => {
      const { getByTestId } = render(
        <NavigationHUD
          visible={true}
          onToggleExpanded={mockOnToggleExpanded}
          onStopNavigation={mockOnStopNavigation}
        />
      );

      fireEvent.press(getByTestId('stop-navigation'));
      expect(mockOnStopNavigation).toHaveBeenCalled();
    });

    it('should handle expand/collapse button press', () => {
      const { getByTestId } = render(
        <NavigationHUD
          visible={true}
          onToggleExpanded={mockOnToggleExpanded}
          onStopNavigation={mockOnStopNavigation}
        />
      );

      fireEvent.press(getByTestId('expand-button'));
      expect(mockOnToggleExpanded).toHaveBeenCalled();
    });
  });

  describe('Status Indicators', () => {
    it('should show off-route indicator when off route', () => {
      const offRouteState = {
        ...mockNavigationState,
        isOffRoute: true,
        distanceToTrack: 75,
      };

      mockNavigationService.onNavigationUpdate.mockImplementation(
        (callback) => {
          callback(offRouteState);
          return () => {};
        }
      );

      const { getByTestId, getByText } = render(
        <NavigationHUD
          visible={true}
          onToggleExpanded={mockOnToggleExpanded}
          onStopNavigation={mockOnStopNavigation}
        />
      );

      // Expand to see status indicators
      fireEvent.press(getByTestId('expand-button'));

      expect(getByText('Off Route')).toBeTruthy();
    });

    it('should show GPS active indicator', () => {
      const { getByTestId, getByText } = render(
        <NavigationHUD
          visible={true}
          onToggleExpanded={mockOnToggleExpanded}
          onStopNavigation={mockOnStopNavigation}
        />
      );

      // Expand to see status indicators
      fireEvent.press(getByTestId('expand-button'));

      expect(getByText('GPS Active')).toBeTruthy();
    });
  });

  describe('Progress Bar', () => {
    beforeEach(() => {
      mockNavigationService.onNavigationUpdate.mockImplementation(
        (callback) => {
          callback(mockNavigationState);
          return () => {};
        }
      );
    });

    it('should display progress bar with correct width', () => {
      const { getByTestId } = render(
        <NavigationHUD
          visible={true}
          onToggleExpanded={mockOnToggleExpanded}
          onStopNavigation={mockOnStopNavigation}
        />
      );

      // Expand to see progress bar
      fireEvent.press(getByTestId('expand-button'));

      const progressFill = getByTestId('progress-fill');
      expect(progressFill.props.style).toEqual(
        expect.objectContaining({ width: '50%' })
      );
    });

    it('should display distance progress text', () => {
      const { getByTestId, getByText } = render(
        <NavigationHUD
          visible={true}
          onToggleExpanded={mockOnToggleExpanded}
          onStopNavigation={mockOnStopNavigation}
        />
      );

      // Expand to see progress bar
      fireEvent.press(getByTestId('expand-button'));

      expect(getByText('2.5km / 5.0km')).toBeTruthy();
    });
  });

  describe('Format Functions', () => {
    beforeEach(() => {
      mockNavigationService.onNavigationUpdate.mockImplementation(
        (callback) => {
          callback(mockNavigationState);
          return () => {};
        }
      );
    });

    it('should format speed correctly', () => {
      const { getByText } = render(
        <NavigationHUD
          visible={true}
          onToggleExpanded={mockOnToggleExpanded}
          onStopNavigation={mockOnStopNavigation}
        />
      );

      // 5.5 m/s * 3.6 = 19.8 km/h, rounded to 20
      expect(getByText('20 km/h')).toBeTruthy();
    });

    it('should format distance correctly for meters', () => {
      const shortDistanceState = {
        ...mockNavigationState,
        distanceToNextWaypoint: 150,
      };

      mockNavigationService.onNavigationUpdate.mockImplementation(
        (callback) => {
          callback(shortDistanceState);
          return () => {};
        }
      );

      const { getByTestId, getByText } = render(
        <NavigationHUD
          visible={true}
          onToggleExpanded={mockOnToggleExpanded}
          onStopNavigation={mockOnStopNavigation}
        />
      );

      fireEvent.press(getByTestId('expand-button'));
      expect(getByText('150m')).toBeTruthy();
    });

    it('should format time correctly', () => {
      const { getByTestId, getByText } = render(
        <NavigationHUD
          visible={true}
          onToggleExpanded={mockOnToggleExpanded}
          onStopNavigation={mockOnStopNavigation}
        />
      );

      fireEvent.press(getByTestId('expand-button'));
      expect(getByText('10:00')).toBeTruthy(); // 600000ms = 10 minutes
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      mockNavigationService.onNavigationUpdate.mockImplementation(
        (callback) => {
          callback(mockNavigationState);
          return () => {};
        }
      );
    });

    it('should have proper accessibility labels', () => {
      const { getByLabelText } = render(
        <NavigationHUD
          visible={true}
          onToggleExpanded={mockOnToggleExpanded}
          onStopNavigation={mockOnStopNavigation}
        />
      );

      expect(
        getByLabelText('Current speed: 20 kilometers per hour')
      ).toBeTruthy();
      expect(getByLabelText('Remaining distance: 2.5 kilometers')).toBeTruthy();
      expect(getByLabelText('Progress: 50 percent')).toBeTruthy();
    });

    it('should support screen reader navigation', () => {
      const { getByRole } = render(
        <NavigationHUD
          visible={true}
          onToggleExpanded={mockOnToggleExpanded}
          onStopNavigation={mockOnStopNavigation}
        />
      );

      expect(
        getByRole('button', { name: 'Expand navigation details' })
      ).toBeTruthy();
      expect(getByRole('button', { name: 'Stop navigation' })).toBeTruthy();
    });
  });
});
