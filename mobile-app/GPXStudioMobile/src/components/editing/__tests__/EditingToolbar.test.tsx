import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { EditingToolbar } from '../EditingToolbar';
import { EditingProvider } from '../../../context/EditingContext';

// Mock the editing context with test values
const mockEditingContext = {
  mode: 'none' as any,
  setMode: jest.fn(),
  canUndo: false,
  canRedo: false,
  undo: jest.fn(),
  redo: jest.fn(),
  clearSelection: jest.fn(),
  selection: {
    selectedWaypoints: [] as string[],
    selectedTrackPoints: [] as Array<{
      trackId: string;
      segmentIndex: number;
      pointIndex: number;
    }>,
    selectedTracks: [] as string[],
  },
  validateCurrentFile: jest.fn().mockReturnValue({
    isValid: true,
    errors: [],
    warnings: [],
  }),
};

// Mock the useEditing hook
jest.mock('../../../context/EditingContext', () => ({
  ...jest.requireActual('../../../context/EditingContext'),
  useEditing: () => mockEditingContext,
}));

describe('EditingToolbar', () => {
  const defaultProps = {
    visible: true,
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render when visible', () => {
    const { getByText } = render(<EditingToolbar {...defaultProps} />);

    expect(getByText('Mode')).toBeTruthy();
    expect(getByText('Select')).toBeTruthy();
    expect(getByText('Waypoint')).toBeTruthy();
    expect(getByText('Track')).toBeTruthy();
    expect(getByText('History')).toBeTruthy();
    expect(getByText('Undo')).toBeTruthy();
    expect(getByText('Redo')).toBeTruthy();
  });

  it('should not render when not visible', () => {
    const { queryByText } = render(
      <EditingToolbar {...defaultProps} visible={false} />
    );

    expect(queryByText('Mode')).toBeNull();
  });

  it('should handle mode selection', () => {
    const { getByText } = render(<EditingToolbar {...defaultProps} />);

    fireEvent.press(getByText('Waypoint'));
    expect(mockEditingContext.setMode).toHaveBeenCalledWith('waypoint');

    fireEvent.press(getByText('Track'));
    expect(mockEditingContext.setMode).toHaveBeenCalledWith('track');

    fireEvent.press(getByText('Select'));
    expect(mockEditingContext.setMode).toHaveBeenCalledWith('select');
  });

  it('should toggle mode when pressing active mode', () => {
    mockEditingContext.mode = 'waypoint';
    const { getByText } = render(<EditingToolbar {...defaultProps} />);

    fireEvent.press(getByText('Waypoint'));
    expect(mockEditingContext.setMode).toHaveBeenCalledWith('none');
    expect(mockEditingContext.clearSelection).toHaveBeenCalled();
  });

  it('should handle undo/redo actions', () => {
    mockEditingContext.canUndo = true;
    mockEditingContext.canRedo = true;

    const { getByText } = render(<EditingToolbar {...defaultProps} />);

    fireEvent.press(getByText('Undo'));
    expect(mockEditingContext.undo).toHaveBeenCalled();

    fireEvent.press(getByText('Redo'));
    expect(mockEditingContext.redo).toHaveBeenCalled();
  });

  it('should disable undo/redo buttons when not available', () => {
    mockEditingContext.canUndo = false;
    mockEditingContext.canRedo = false;

    const { getByText } = render(<EditingToolbar {...defaultProps} />);

    const undoButton = getByText('Undo').parent;
    const redoButton = getByText('Redo').parent;

    expect(undoButton?.props.accessibilityState?.disabled).toBe(true);
    expect(redoButton?.props.accessibilityState?.disabled).toBe(true);
  });

  it('should show selection info when items are selected', () => {
    mockEditingContext.selection = {
      selectedWaypoints: ['wp1', 'wp2'],
      selectedTrackPoints: [
        { trackId: 'track1', segmentIndex: 0, pointIndex: 0 },
      ],
      selectedTracks: [],
    };

    const { getByText } = render(<EditingToolbar {...defaultProps} />);

    expect(getByText('Selected: 3 items')).toBeTruthy();
    expect(getByText('Clear')).toBeTruthy();
  });

  it('should handle clear selection', () => {
    mockEditingContext.selection = {
      selectedWaypoints: ['wp1'],
      selectedTrackPoints: [],
      selectedTracks: [],
    };

    const { getByText } = render(<EditingToolbar {...defaultProps} />);

    fireEvent.press(getByText('Clear'));
    expect(mockEditingContext.clearSelection).toHaveBeenCalled();
  });

  it('should handle validation', () => {
    const { getByText } = render(<EditingToolbar {...defaultProps} />);

    fireEvent.press(getByText('Validate'));
    expect(mockEditingContext.validateCurrentFile).toHaveBeenCalled();
  });

  it('should handle close action', () => {
    const { getByText } = render(<EditingToolbar {...defaultProps} />);

    fireEvent.press(getByText('Done'));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('should show active mode styling', () => {
    mockEditingContext.mode = 'waypoint';

    const { getByText } = render(<EditingToolbar {...defaultProps} />);

    const waypointButton = getByText('Waypoint').parent;
    expect(waypointButton?.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          backgroundColor: expect.any(String),
        }),
      ])
    );
  });
});
