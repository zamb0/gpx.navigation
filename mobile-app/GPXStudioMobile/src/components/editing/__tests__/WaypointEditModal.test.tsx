import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { WaypointEditModal } from '../WaypointEditModal';
import { WaypointEditData } from '../../../types/editing';

// Mock Alert
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

// Mock the editing context
const mockEditingContext = {
  validateCurrentFile: jest.fn().mockReturnValue({
    isValid: true,
    errors: [],
    warnings: [],
  }),
};

jest.mock('../../../context/EditingContext', () => ({
  useEditing: () => mockEditingContext,
}));

describe('WaypointEditModal', () => {
  const defaultProps = {
    visible: true,
    onClose: jest.fn(),
    onSave: jest.fn(),
  };

  const mockWaypoint = {
    lat: 40.0,
    lon: -75.0,
    ele: 100,
    name: 'Test Waypoint',
    desc: 'Test description',
    cmt: 'Test comment',
    sym: 'Waypoint',
    type: 'test',
  };

  const mockPosition = {
    latitude: 41.0,
    longitude: -76.0,
    elevation: 200,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render modal when visible', () => {
    const { getByText } = render(<WaypointEditModal {...defaultProps} />);

    expect(getByText('New Waypoint')).toBeTruthy();
    expect(getByText('Basic Information')).toBeTruthy();
    expect(getByText('Classification')).toBeTruthy();
    expect(getByText('Coordinates')).toBeTruthy();
  });

  it('should not render modal when not visible', () => {
    const { queryByText } = render(
      <WaypointEditModal {...defaultProps} visible={false} />
    );

    expect(queryByText('New Waypoint')).toBeNull();
  });

  it('should show edit mode title when editing existing waypoint', () => {
    const { getByText } = render(
      <WaypointEditModal {...defaultProps} waypoint={mockWaypoint} />
    );

    expect(getByText('Edit Waypoint')).toBeTruthy();
  });

  it('should populate form with existing waypoint data', () => {
    const { getByDisplayValue } = render(
      <WaypointEditModal {...defaultProps} waypoint={mockWaypoint} />
    );

    expect(getByDisplayValue('Test Waypoint')).toBeTruthy();
    expect(getByDisplayValue('Test description')).toBeTruthy();
    expect(getByDisplayValue('Test comment')).toBeTruthy();
    expect(getByDisplayValue('40')).toBeTruthy();
    expect(getByDisplayValue('-75')).toBeTruthy();
    expect(getByDisplayValue('100')).toBeTruthy();
  });

  it('should populate form with initial position for new waypoint', () => {
    const { getByDisplayValue } = render(
      <WaypointEditModal {...defaultProps} initialPosition={mockPosition} />
    );

    expect(getByDisplayValue('41')).toBeTruthy();
    expect(getByDisplayValue('-76')).toBeTruthy();
    expect(getByDisplayValue('200')).toBeTruthy();
  });

  it('should handle form input changes', () => {
    const { getByPlaceholderText } = render(
      <WaypointEditModal {...defaultProps} />
    );

    const nameInput = getByPlaceholderText('Enter waypoint name');
    fireEvent.changeText(nameInput, 'New Name');

    expect(nameInput.props.value).toBe('New Name');
  });

  it('should validate required fields on save', async () => {
    const { getByText } = render(<WaypointEditModal {...defaultProps} />);

    fireEvent.press(getByText('Save'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Latitude and longitude are required'
      );
    });
  });

  it('should validate coordinate ranges', async () => {
    const { getByPlaceholderText, getByText } = render(
      <WaypointEditModal {...defaultProps} />
    );

    // Set invalid latitude
    fireEvent.changeText(getByPlaceholderText('0.000000'), '91');
    fireEvent.changeText(getByPlaceholderText('0.000000'), '-75');

    fireEvent.press(getByText('Save'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Latitude must be between -90 and 90 degrees'
      );
    });
  });

  it('should validate elevation as number', async () => {
    const { getByPlaceholderText, getByText } = render(
      <WaypointEditModal {...defaultProps} />
    );

    fireEvent.changeText(getByPlaceholderText('0.000000'), '40');
    fireEvent.changeText(getByPlaceholderText('0.000000'), '-75');
    fireEvent.changeText(getByPlaceholderText('0'), 'invalid');

    fireEvent.press(getByText('Save'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Elevation must be a valid number'
      );
    });
  });

  it('should call onSave with correct data when valid', async () => {
    const { getByPlaceholderText, getByText } = render(
      <WaypointEditModal {...defaultProps} />
    );

    // Fill in required fields
    fireEvent.changeText(
      getByPlaceholderText('Enter waypoint name'),
      'Test Name'
    );
    fireEvent.changeText(
      getByPlaceholderText('Enter description'),
      'Test Description'
    );
    fireEvent.changeText(getByPlaceholderText('0.000000'), '40');
    fireEvent.changeText(getByPlaceholderText('0.000000'), '-75');
    fireEvent.changeText(getByPlaceholderText('0'), '100');

    fireEvent.press(getByText('Save'));

    await waitFor(() => {
      expect(defaultProps.onSave).toHaveBeenCalledWith({
        latitude: 40,
        longitude: -75,
        elevation: 100,
        name: 'Test Name',
        description: 'Test Description',
        comment: undefined,
        symbol: 'Waypoint',
        type: undefined,
      });
    });

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('should handle save errors', async () => {
    const errorMessage = 'Save failed';
    const onSaveWithError = jest.fn().mockImplementation(() => {
      throw new Error(errorMessage);
    });

    const { getByPlaceholderText, getByText } = render(
      <WaypointEditModal {...defaultProps} onSave={onSaveWithError} />
    );

    // Fill in required fields
    fireEvent.changeText(getByPlaceholderText('0.000000'), '40');
    fireEvent.changeText(getByPlaceholderText('0.000000'), '-75');

    fireEvent.press(getByText('Save'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', errorMessage);
    });
  });

  it('should handle cancel action', () => {
    const { getByText } = render(<WaypointEditModal {...defaultProps} />);

    fireEvent.press(getByText('Cancel'));

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('should trim whitespace from text inputs', async () => {
    const { getByPlaceholderText, getByText } = render(
      <WaypointEditModal {...defaultProps} />
    );

    // Fill in fields with whitespace
    fireEvent.changeText(
      getByPlaceholderText('Enter waypoint name'),
      '  Test Name  '
    );
    fireEvent.changeText(
      getByPlaceholderText('Enter description'),
      '  Test Description  '
    );
    fireEvent.changeText(getByPlaceholderText('0.000000'), '40');
    fireEvent.changeText(getByPlaceholderText('0.000000'), '-75');

    fireEvent.press(getByText('Save'));

    await waitFor(() => {
      expect(defaultProps.onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Name',
          description: 'Test Description',
        })
      );
    });
  });

  it('should handle empty optional fields', async () => {
    const { getByPlaceholderText, getByText } = render(
      <WaypointEditModal {...defaultProps} />
    );

    // Fill in only required fields
    fireEvent.changeText(getByPlaceholderText('0.000000'), '40');
    fireEvent.changeText(getByPlaceholderText('0.000000'), '-75');

    fireEvent.press(getByText('Save'));

    await waitFor(() => {
      expect(defaultProps.onSave).toHaveBeenCalledWith({
        latitude: 40,
        longitude: -75,
        elevation: undefined,
        name: undefined,
        description: undefined,
        comment: undefined,
        symbol: 'Waypoint',
        type: undefined,
      });
    });
  });
});
