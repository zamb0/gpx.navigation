import React from 'react';
import { render, act, waitFor } from '@testing-library/react-native';
import { Text, TouchableOpacity } from 'react-native';
import { EditingProvider, useEditing } from '../EditingContext';
import { MobileGPXFile } from '../../types/gpx';
import { WaypointEditData } from '../../types/editing';

// Mock GPX file for testing
const mockGpxFile: MobileGPXFile = {
  id: 'test-gpx-1',
  metadata: {
    id: 'test-gpx-1',
    filename: 'test.gpx',
    name: 'Test GPX',
    createdAt: new Date(),
    modifiedAt: new Date(),
    fileSize: 1024,
    trackCount: 1,
    waypointCount: 1,
    totalDistance: 1000,
    elevationGain: 100,
    elevationLoss: 50,
    bounds: {
      north: 40.0,
      south: 39.0,
      east: -74.0,
      west: -75.0,
    },
    filePath: '/test/path/test.gpx',
  },
  gpxFile: {
    tracks: [
      {
        name: 'Test Track',
        extensions: { id: 'track-1' },
        segments: [
          {
            points: [
              { lat: 39.5, lon: -74.5, ele: 100 },
              { lat: 39.6, lon: -74.4, ele: 110 },
            ],
          },
        ],
      },
    ],
    waypoints: [
      {
        lat: 39.55,
        lon: -74.45,
        ele: 105,
        name: 'Test Waypoint',
        extensions: { id: 'waypoint-1' },
      },
    ],
    clone: jest.fn().mockReturnThis(),
  },
};

// Test component that uses the editing context
const TestComponent: React.FC = () => {
  const {
    mode,
    isEditing,
    canUndo,
    canRedo,
    setMode,
    startEditing,
    stopEditing,
    addWaypoint,
    undo,
    redo,
    validateCurrentFile,
  } = useEditing();

  const handleAddWaypoint = async () => {
    const waypointData: WaypointEditData = {
      latitude: 40.0,
      longitude: -75.0,
      name: 'New Waypoint',
    };
    await addWaypoint(waypointData);
  };

  return (
    <>
      <Text testID="mode">{mode}</Text>
      <Text testID="isEditing">{isEditing.toString()}</Text>
      <Text testID="canUndo">{canUndo.toString()}</Text>
      <Text testID="canRedo">{canRedo.toString()}</Text>

      <TouchableOpacity
        testID="setWaypointMode"
        onPress={() => setMode('waypoint')}
      >
        <Text>Set Waypoint Mode</Text>
      </TouchableOpacity>

      <TouchableOpacity
        testID="startEditing"
        onPress={() => startEditing(mockGpxFile)}
      >
        <Text>Start Editing</Text>
      </TouchableOpacity>

      <TouchableOpacity testID="stopEditing" onPress={stopEditing}>
        <Text>Stop Editing</Text>
      </TouchableOpacity>

      <TouchableOpacity testID="addWaypoint" onPress={handleAddWaypoint}>
        <Text>Add Waypoint</Text>
      </TouchableOpacity>

      <TouchableOpacity testID="undo" onPress={undo}>
        <Text>Undo</Text>
      </TouchableOpacity>

      <TouchableOpacity testID="redo" onPress={redo}>
        <Text>Redo</Text>
      </TouchableOpacity>

      <TouchableOpacity
        testID="validate"
        onPress={() => {
          const result = validateCurrentFile();
          console.log('Validation result:', result);
        }}
      >
        <Text>Validate</Text>
      </TouchableOpacity>
    </>
  );
};

const renderWithProvider = (component: React.ReactElement) => {
  return render(<EditingProvider>{component}</EditingProvider>);
};

describe('EditingContext', () => {
  it('should provide initial state', () => {
    const { getByTestId } = renderWithProvider(<TestComponent />);

    expect(getByTestId('mode')).toHaveTextContent('none');
    expect(getByTestId('isEditing')).toHaveTextContent('false');
    expect(getByTestId('canUndo')).toHaveTextContent('false');
    expect(getByTestId('canRedo')).toHaveTextContent('false');
  });

  it('should allow setting editing mode', async () => {
    const { getByTestId } = renderWithProvider(<TestComponent />);

    await act(async () => {
      getByTestId('setWaypointMode').props.onPress();
    });

    expect(getByTestId('mode')).toHaveTextContent('waypoint');
  });

  it('should start and stop editing', async () => {
    const { getByTestId } = renderWithProvider(<TestComponent />);

    // Start editing
    await act(async () => {
      getByTestId('startEditing').props.onPress();
    });

    expect(getByTestId('isEditing')).toHaveTextContent('true');

    // Stop editing
    await act(async () => {
      getByTestId('stopEditing').props.onPress();
    });

    expect(getByTestId('isEditing')).toHaveTextContent('false');
    expect(getByTestId('mode')).toHaveTextContent('none');
  });

  it('should handle waypoint operations', async () => {
    const { getByTestId } = renderWithProvider(<TestComponent />);

    // Start editing first
    await act(async () => {
      getByTestId('startEditing').props.onPress();
    });

    // Add waypoint
    await act(async () => {
      getByTestId('addWaypoint').props.onPress();
    });

    // Should be able to undo after adding waypoint
    await waitFor(() => {
      expect(getByTestId('canUndo')).toHaveTextContent('true');
    });

    // Perform undo
    await act(async () => {
      getByTestId('undo').props.onPress();
    });

    // Should be able to redo after undo
    await waitFor(() => {
      expect(getByTestId('canRedo')).toHaveTextContent('true');
    });

    // Perform redo
    await act(async () => {
      getByTestId('redo').props.onPress();
    });

    // Should be able to undo again after redo
    await waitFor(() => {
      expect(getByTestId('canUndo')).toHaveTextContent('true');
    });
  });

  it('should validate GPX file', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const { getByTestId } = renderWithProvider(<TestComponent />);

    // Start editing first
    await act(async () => {
      getByTestId('startEditing').props.onPress();
    });

    // Validate
    await act(async () => {
      getByTestId('validate').props.onPress();
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      'Validation result:',
      expect.objectContaining({
        isValid: expect.any(Boolean),
        errors: expect.any(Array),
        warnings: expect.any(Array),
      })
    );

    consoleSpy.mockRestore();
  });

  it('should handle errors when no file is being edited', async () => {
    const { getByTestId } = renderWithProvider(<TestComponent />);

    // Try to add waypoint without starting editing
    await act(async () => {
      try {
        getByTestId('addWaypoint').props.onPress();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain(
          'No GPX file is currently being edited'
        );
      }
    });
  });

  it('should provide custom configuration', () => {
    const customConfig = {
      maxUndoOperations: 10,
      validateOnEdit: false,
    };

    const { getByTestId } = render(
      <EditingProvider config={customConfig}>
        <TestComponent />
      </EditingProvider>
    );

    // Should render without errors with custom config
    expect(getByTestId('mode')).toHaveTextContent('none');
  });

  it('should throw error when used outside provider', () => {
    // Mock console.error to avoid noise in test output
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    expect(() => render(<TestComponent />)).toThrow(
      'useEditing must be used within an EditingProvider'
    );

    consoleSpy.mockRestore();
  });
});
