import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { NavigationControls } from '../NavigationControls';
import { NavigationService } from '../../../services/navigation/NavigationService';
import { NavigationMode, NavigationState } from '../../../types/navigation';
import { MobileGPXFile } from '../../../types/gpx';

// Mock NavigationService
jest.mock('../../../services/navigation/NavigationService');

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('NavigationControls', () => {
  let mockNavigationService: jest.Mocked<NavigationService>;
  let mockGPXFile: MobileGPXFile;
  let mockOnNavigationStart: jest.Mock;
  let mockOnNavigationStop: jest.Mock;
  let mockOnSettingsPress: jest.Mock;

  beforeEach(() => {
    mockNavigationService =
      NavigationService.getInstance() as jest.Mocked<NavigationService>;
    mockOnNavigationStart = jest.fn();
    mockOnNavigationStop = jest.fn();
    mockOnSettingsPress = jest.fn();

    mockGPXFile = {
      id: 'test-gpx-1',
      metadata: {
        id: 'test-gpx-1',
        filename: 'test-route.gpx',
        name: 'Test Route',
        description: 'A test route for navigation',
        createdAt: new Date(),
        modifiedAt: new Date(),
        fileSize: 1024,
        trackCount: 1,
        waypointCount: 3,
        totalDistance: 5000,
        elevationGain: 200,
        elevationLoss: 150,
        bounds: {
          north: 37.7849,
          south: 37.7649,
          east: -122.4094,
          west: -122.4294,
        },
        filePath: '/path/to/test-route.gpx',
      },
      gpxFile: {
        waypoints: [],
        tracks: [],
      },
    };

    mockNavigationService.onNavigationUpdate = jest
      .fn()
      .mockReturnValue(() => {});
    mockNavigationService.getNavigationState = jest.fn().mockReturnValue({
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
    mockNavigationService.startNavigation = jest
      .fn()
      .mockResolvedValue(undefined);
    mockNavigationService.stopNavigation = jest
      .fn()
      .mockResolvedValue(undefined);

    // Clear Alert mock
    (Alert.alert as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should render with no GPX file', () => {
      const { getByText, getByTestId } = render(
        <NavigationControls
          gpxFile={null}
          onNavigationStart={mockOnNavigationStart}
          onNavigationStop={mockOnNavigationStop}
          onSettingsPress={mockOnSettingsPress}
        />
      );

      expect(getByText('Navigate')).toBeTruthy();
      expect(getByTestId('navigation-button')).toBeDisabled();
    });

    it('should render with GPX file', () => {
      const { getByText, getByTestId } = render(
        <NavigationControls
          gpxFile={mockGPXFile}
          onNavigationStart={mockOnNavigationStart}
          onNavigationStop={mockOnNavigationStop}
          onSettingsPress={mockOnSettingsPress}
        />
      );

      expect(getByText('Navigate')).toBeTruthy();
      expect(getByText('Test Route')).toBeTruthy();
      expect(getByText('5.0km')).toBeTruthy();
      expect(getByText('3 waypoints')).toBeTruthy();
      expect(getByTestId('navigation-button')).not.toBeDisabled();
    });
  });

  describe('Navigation Mode Selection', () => {
    it('should show mode selector when not navigating', () => {
      const { getByText } = render(
        <NavigationControls
          gpxFile={mockGPXFile}
          onNavigationStart={mockOnNavigationStart}
          onNavigationStop={mockOnNavigationStop}
          onSettingsPress={mockOnSettingsPress}
        />
      );

      expect(getByText('Follow Track')).toBeTruthy();
    });

    it('should open mode selection dialog', () => {
      const { getByTestId } = render(
        <NavigationControls
          gpxFile={mockGPXFile}
          onNavigationStart={mockOnNavigationStart}
          onNavigationStop={mockOnNavigationStop}
          onSettingsPress={mockOnSettingsPress}
        />
      );

      fireEvent.press(getByTestId('mode-selector'));

      expect(Alert.alert).toHaveBeenCalledWith(
        'Navigation Mode',
        'Select navigation mode:',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Follow Track' }),
          expect.objectContaining({ text: 'Waypoint Navigation' }),
          expect.objectContaining({ text: 'Free Navigation' }),
          expect.objectContaining({ text: 'Cancel' }),
        ])
      );
    });

    it('should prevent mode change during navigation', () => {
      const navigatingState: NavigationState = {
        isNavigating: true,
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
      };

      mockNavigationService.onNavigationUpdate.mockImplementation(
        (callback) => {
          callback(navigatingState);
          return () => {};
        }
      );

      const { queryByTestId } = render(
        <NavigationControls
          gpxFile={mockGPXFile}
          onNavigationStart={mockOnNavigationStart}
          onNavigationStop={mockOnNavigationStop}
          onSettingsPress={mockOnSettingsPress}
        />
      );

      // Mode selector should not be visible during navigation
      expect(queryByTestId('mode-selector')).toBeNull();
    });
  });

  describe('Navigation Control', () => {
    it('should start navigation successfully', async () => {
      const { getByTestId } = render(
        <NavigationControls
          gpxFile={mockGPXFile}
          onNavigationStart={mockOnNavigationStart}
          onNavigationStop={mockOnNavigationStop}
          onSettingsPress={mockOnSettingsPress}
        />
      );

      fireEvent.press(getByTestId('navigation-button'));

      await waitFor(() => {
        expect(mockNavigationService.startNavigation).toHaveBeenCalledWith(
          mockGPXFile,
          NavigationMode.FOLLOW_TRACK
        );
        expect(mockOnNavigationStart).toHaveBeenCalled();
      });
    });

    it('should handle navigation start error', async () => {
      mockNavigationService.startNavigation.mockRejectedValue(
        new Error('GPS not available')
      );

      const { getByTestId } = render(
        <NavigationControls
          gpxFile={mockGPXFile}
          onNavigationStart={mockOnNavigationStart}
          onNavigationStop={mockOnNavigationStop}
          onSettingsPress={mockOnSettingsPress}
        />
      );

      fireEvent.press(getByTestId('navigation-button'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Navigation Error',
          'GPS not available'
        );
      });
    });

    it('should show alert when no GPX file selected', () => {
      const { getByTestId } = render(
        <NavigationControls
          gpxFile={null}
          onNavigationStart={mockOnNavigationStart}
          onNavigationStop={mockOnNavigationStop}
          onSettingsPress={mockOnSettingsPress}
        />
      );

      // Force press on disabled button (testing edge case)
      const button = getByTestId('navigation-button');
      fireEvent.press(button);

      expect(Alert.alert).toHaveBeenCalledWith(
        'No Route Selected',
        'Please select a GPX file to start navigation.'
      );
    });

    it('should stop navigation with confirmation', async () => {
      const navigatingState: NavigationState = {
        isNavigating: true,
        currentRoute: {
          id: 'test-route',
          name: 'Test Route',
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
      };

      mockNavigationService.onNavigationUpdate.mockImplementation(
        (callback) => {
          callback(navigatingState);
          return () => {};
        }
      );

      const { getByTestId, getByText } = render(
        <NavigationControls
          gpxFile={mockGPXFile}
          onNavigationStart={mockOnNavigationStart}
          onNavigationStop={mockOnNavigationStop}
          onSettingsPress={mockOnSettingsPress}
        />
      );

      expect(getByText('Stop')).toBeTruthy();

      fireEvent.press(getByTestId('navigation-button'));

      expect(Alert.alert).toHaveBeenCalledWith(
        'Stop Navigation',
        'Are you sure you want to stop navigation?',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Cancel' }),
          expect.objectContaining({ text: 'Stop' }),
        ])
      );
    });
  });

  describe('Settings Integration', () => {
    it('should open settings when settings button pressed', () => {
      const { getByTestId } = render(
        <NavigationControls
          gpxFile={mockGPXFile}
          onNavigationStart={mockOnNavigationStart}
          onNavigationStop={mockOnNavigationStop}
          onSettingsPress={mockOnSettingsPress}
        />
      );

      fireEvent.press(getByTestId('settings-button'));
      expect(mockOnSettingsPress).toHaveBeenCalled();
    });
  });

  describe('Navigation Status Display', () => {
    it('should show navigation status when navigating', () => {
      const navigatingState: NavigationState = {
        isNavigating: true,
        currentRoute: {
          id: 'test-route',
          name: 'Test Route',
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
        currentPosition: null,
        closestPoint: null,
        distanceToTrack: 25,
        distanceAlongTrack: 0,
        remainingDistance: 0,
        currentSpeed: 0,
        bearing: 0,
        isOffRoute: false,
        nextWaypoint: {
          latitude: 37.7799,
          longitude: -122.4144,
          name: 'Next Waypoint',
        },
        distanceToNextWaypoint: 150,
        bearingToNextWaypoint: 0,
        progress: 0,
      };

      mockNavigationService.onNavigationUpdate.mockImplementation(
        (callback) => {
          callback(navigatingState);
          return () => {};
        }
      );

      const { getByText } = render(
        <NavigationControls
          gpxFile={mockGPXFile}
          onNavigationStart={mockOnNavigationStart}
          onNavigationStop={mockOnNavigationStop}
          onSettingsPress={mockOnSettingsPress}
        />
      );

      expect(getByText('On Route')).toBeTruthy();
      expect(getByText('150m to waypoint')).toBeTruthy();
    });

    it('should show off-route status', () => {
      const offRouteState: NavigationState = {
        isNavigating: true,
        currentRoute: {
          id: 'test-route',
          name: 'Test Route',
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
        currentPosition: null,
        closestPoint: null,
        distanceToTrack: 75,
        distanceAlongTrack: 0,
        remainingDistance: 0,
        currentSpeed: 0,
        bearing: 0,
        isOffRoute: true,
        nextWaypoint: null,
        distanceToNextWaypoint: 0,
        bearingToNextWaypoint: 0,
        progress: 0,
      };

      mockNavigationService.onNavigationUpdate.mockImplementation(
        (callback) => {
          callback(offRouteState);
          return () => {};
        }
      );

      const { getByText } = render(
        <NavigationControls
          gpxFile={mockGPXFile}
          onNavigationStart={mockOnNavigationStart}
          onNavigationStop={mockOnNavigationStop}
          onSettingsPress={mockOnSettingsPress}
        />
      );

      expect(getByText('Off Route')).toBeTruthy();
    });
  });

  describe('Route Information Display', () => {
    it('should display route metadata correctly', () => {
      const { getByText } = render(
        <NavigationControls
          gpxFile={mockGPXFile}
          onNavigationStart={mockOnNavigationStart}
          onNavigationStop={mockOnNavigationStop}
          onSettingsPress={mockOnSettingsPress}
        />
      );

      expect(getByText('Test Route')).toBeTruthy();
      expect(getByText('5.0km')).toBeTruthy();
      expect(getByText('3 waypoints')).toBeTruthy();
    });

    it('should handle route with no name', () => {
      const gpxFileNoName = {
        ...mockGPXFile,
        metadata: {
          ...mockGPXFile.metadata,
          name: undefined,
        },
      };

      const { getByText } = render(
        <NavigationControls
          gpxFile={gpxFileNoName}
          onNavigationStart={mockOnNavigationStart}
          onNavigationStop={mockOnNavigationStop}
          onSettingsPress={mockOnSettingsPress}
        />
      );

      expect(getByText('test-route.gpx')).toBeTruthy();
    });
  });

  describe('Loading States', () => {
    it('should show loading state during navigation start', async () => {
      // Mock a delayed start
      mockNavigationService.startNavigation.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      const { getByTestId, getByText } = render(
        <NavigationControls
          gpxFile={mockGPXFile}
          onNavigationStart={mockOnNavigationStart}
          onNavigationStop={mockOnNavigationStop}
          onSettingsPress={mockOnSettingsPress}
        />
      );

      fireEvent.press(getByTestId('navigation-button'));

      // Should show loading state
      expect(getByText('Starting...')).toBeTruthy();

      await waitFor(() => {
        expect(mockNavigationService.startNavigation).toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility labels', () => {
      const { getByLabelText } = render(
        <NavigationControls
          gpxFile={mockGPXFile}
          onNavigationStart={mockOnNavigationStart}
          onNavigationStop={mockOnNavigationStop}
          onSettingsPress={mockOnSettingsPress}
        />
      );

      expect(getByLabelText('Select navigation mode')).toBeTruthy();
      expect(getByLabelText('Start navigation')).toBeTruthy();
      expect(getByLabelText('Navigation settings')).toBeTruthy();
    });

    it('should support screen reader navigation', () => {
      const { getByRole } = render(
        <NavigationControls
          gpxFile={mockGPXFile}
          onNavigationStart={mockOnNavigationStart}
          onNavigationStop={mockOnNavigationStop}
          onSettingsPress={mockOnSettingsPress}
        />
      );

      expect(getByRole('button', { name: 'Navigate' })).toBeTruthy();
      expect(getByRole('button', { name: 'Settings' })).toBeTruthy();
    });

    it('should indicate disabled state for screen readers', () => {
      const { getByTestId } = render(
        <NavigationControls
          gpxFile={null}
          onNavigationStart={mockOnNavigationStart}
          onNavigationStop={mockOnNavigationStop}
          onSettingsPress={mockOnSettingsPress}
        />
      );

      const button = getByTestId('navigation-button');
      expect(button).toHaveAccessibilityState({ disabled: true });
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing GPX metadata gracefully', () => {
      const incompleteGPXFile = {
        ...mockGPXFile,
        metadata: {
          ...mockGPXFile.metadata,
          totalDistance: 0,
          waypointCount: 0,
        },
      };

      const { getByText } = render(
        <NavigationControls
          gpxFile={incompleteGPXFile}
          onNavigationStart={mockOnNavigationStart}
          onNavigationStop={mockOnNavigationStop}
          onSettingsPress={mockOnSettingsPress}
        />
      );

      expect(getByText('0.0km')).toBeTruthy();
      expect(getByText('0 waypoints')).toBeTruthy();
    });

    it('should handle navigation service errors gracefully', async () => {
      mockNavigationService.startNavigation.mockRejectedValue(
        new Error('Unknown error')
      );

      const { getByTestId } = render(
        <NavigationControls
          gpxFile={mockGPXFile}
          onNavigationStart={mockOnNavigationStart}
          onNavigationStop={mockOnNavigationStop}
          onSettingsPress={mockOnSettingsPress}
        />
      );

      fireEvent.press(getByTestId('navigation-button'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Navigation Error',
          'Unknown error'
        );
      });
    });
  });
});
