import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  ReactNode,
} from 'react';
import { MobileGPXFile } from '../types/gpx';
import {
  EditingMode,
  EditingContext as EditingContextType,
  EditOperation,
  SelectionState,
  WaypointEditData,
  TrackEditData,
  TrackPointEditData,
  EditingConfig,
  DEFAULT_EDITING_CONFIG,
} from '../types/editing';
import { GPXEditingService } from '../services/gpx/GPXEditingService';

// Action types
type EditingAction =
  | { type: 'SET_MODE'; mode: EditingMode }
  | { type: 'START_EDITING'; gpxFile: MobileGPXFile }
  | { type: 'STOP_EDITING' }
  | { type: 'SET_SELECTION'; selection: Partial<SelectionState> }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'ADD_OPERATION'; operation: EditOperation }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'CLEAR_OPERATIONS' }
  | { type: 'UPDATE_GPX_FILE'; gpxFile: MobileGPXFile };

// State interface
interface EditingState extends EditingContextType {
  currentGpxFile: MobileGPXFile | null;
  editingService: GPXEditingService;
}

// Context interface
interface EditingContextInterface extends EditingState {
  setMode: (mode: EditingMode) => void;
  startEditing: (gpxFile: MobileGPXFile) => void;
  stopEditing: () => void;
  setSelection: (selection: Partial<SelectionState>) => void;
  clearSelection: () => void;
  addWaypoint: (waypointData: WaypointEditData) => Promise<void>;
  deleteWaypoint: (waypointId: string) => Promise<void>;
  moveWaypoint: (
    waypointId: string,
    latitude: number,
    longitude: number,
    elevation?: number
  ) => Promise<void>;
  editWaypointProperties: (
    waypointId: string,
    properties: Partial<WaypointEditData>
  ) => Promise<void>;
  addTrackPoint: (
    trackId: string,
    segmentIndex: number,
    insertIndex: number,
    pointData: TrackPointEditData
  ) => Promise<void>;
  deleteTrackPoint: (
    trackId: string,
    segmentIndex: number,
    pointIndex: number
  ) => Promise<void>;
  moveTrackPoint: (
    trackId: string,
    segmentIndex: number,
    pointIndex: number,
    latitude: number,
    longitude: number,
    elevation?: number
  ) => Promise<void>;
  editTrackProperties: (
    trackId: string,
    properties: Partial<TrackEditData>
  ) => Promise<void>;
  undo: () => void;
  redo: () => void;
  clearOperations: () => void;
  validateCurrentFile: () => {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
}

// Initial state
const initialState: EditingState = {
  mode: 'none',
  isEditing: false,
  selection: {
    selectedWaypoints: [],
    selectedTrackPoints: [],
    selectedTracks: [],
  },
  operations: [],
  currentOperationIndex: -1,
  canUndo: false,
  canRedo: false,
  currentGpxFile: null,
  editingService: new GPXEditingService(),
};

// Reducer
function editingReducer(
  state: EditingState,
  action: EditingAction
): EditingState {
  switch (action.type) {
    case 'SET_MODE':
      return {
        ...state,
        mode: action.mode,
      };

    case 'START_EDITING':
      return {
        ...state,
        isEditing: true,
        currentGpxFile: action.gpxFile,
        operations: [],
        currentOperationIndex: -1,
        canUndo: false,
        canRedo: false,
      };

    case 'STOP_EDITING':
      return {
        ...state,
        isEditing: false,
        mode: 'none',
        currentGpxFile: null,
        selection: {
          selectedWaypoints: [],
          selectedTrackPoints: [],
          selectedTracks: [],
        },
        operations: [],
        currentOperationIndex: -1,
        canUndo: false,
        canRedo: false,
      };

    case 'SET_SELECTION':
      return {
        ...state,
        selection: {
          ...state.selection,
          ...action.selection,
        },
      };

    case 'CLEAR_SELECTION':
      return {
        ...state,
        selection: {
          selectedWaypoints: [],
          selectedTrackPoints: [],
          selectedTracks: [],
        },
      };

    case 'ADD_OPERATION':
      const newOperations = [...state.operations, action.operation];
      const newIndex = newOperations.length - 1;
      return {
        ...state,
        operations: newOperations,
        currentOperationIndex: newIndex,
        canUndo: newIndex >= 0,
        canRedo: false,
      };

    case 'UNDO':
      const undoIndex = state.currentOperationIndex - 1;
      return {
        ...state,
        currentOperationIndex: undoIndex,
        canUndo: undoIndex >= 0,
        canRedo: true,
      };

    case 'REDO':
      const redoIndex = state.currentOperationIndex + 1;
      return {
        ...state,
        currentOperationIndex: redoIndex,
        canUndo: true,
        canRedo: redoIndex < state.operations.length - 1,
      };

    case 'CLEAR_OPERATIONS':
      return {
        ...state,
        operations: [],
        currentOperationIndex: -1,
        canUndo: false,
        canRedo: false,
      };

    case 'UPDATE_GPX_FILE':
      return {
        ...state,
        currentGpxFile: action.gpxFile,
      };

    default:
      return state;
  }
}

// Context
const EditingContext = createContext<EditingContextInterface | null>(null);

// Provider component
interface EditingProviderProps {
  children: ReactNode;
  config?: Partial<EditingConfig>;
}

export const EditingProvider: React.FC<EditingProviderProps> = ({
  children,
  config,
}) => {
  const [state, dispatch] = useReducer(editingReducer, {
    ...initialState,
    editingService: new GPXEditingService(config),
  });

  // Actions
  const setMode = useCallback((mode: EditingMode) => {
    dispatch({ type: 'SET_MODE', mode });
  }, []);

  const startEditing = useCallback(
    (gpxFile: MobileGPXFile) => {
      dispatch({ type: 'START_EDITING', gpxFile });
      state.editingService.clearOperations();
    },
    [state.editingService]
  );

  const stopEditing = useCallback(() => {
    dispatch({ type: 'STOP_EDITING' });
    state.editingService.clearOperations();
  }, [state.editingService]);

  const setSelection = useCallback((selection: Partial<SelectionState>) => {
    dispatch({ type: 'SET_SELECTION', selection });
  }, []);

  const clearSelection = useCallback(() => {
    dispatch({ type: 'CLEAR_SELECTION' });
  }, []);

  // Waypoint operations
  const addWaypoint = useCallback(
    async (waypointData: WaypointEditData) => {
      if (!state.currentGpxFile) {
        throw new Error('No GPX file is currently being edited');
      }

      try {
        const { gpxFile, operation } = state.editingService.addWaypoint(
          state.currentGpxFile,
          waypointData
        );
        dispatch({ type: 'UPDATE_GPX_FILE', gpxFile });
        dispatch({ type: 'ADD_OPERATION', operation });
      } catch (error) {
        throw error;
      }
    },
    [state.currentGpxFile, state.editingService]
  );

  const deleteWaypoint = useCallback(
    async (waypointId: string) => {
      if (!state.currentGpxFile) {
        throw new Error('No GPX file is currently being edited');
      }

      try {
        const { gpxFile, operation } = state.editingService.deleteWaypoint(
          state.currentGpxFile,
          waypointId
        );
        dispatch({ type: 'UPDATE_GPX_FILE', gpxFile });
        dispatch({ type: 'ADD_OPERATION', operation });
      } catch (error) {
        throw error;
      }
    },
    [state.currentGpxFile, state.editingService]
  );

  const moveWaypoint = useCallback(
    async (
      waypointId: string,
      latitude: number,
      longitude: number,
      elevation?: number
    ) => {
      if (!state.currentGpxFile) {
        throw new Error('No GPX file is currently being edited');
      }

      try {
        const { gpxFile, operation } = state.editingService.moveWaypoint(
          state.currentGpxFile,
          waypointId,
          latitude,
          longitude,
          elevation
        );
        dispatch({ type: 'UPDATE_GPX_FILE', gpxFile });
        dispatch({ type: 'ADD_OPERATION', operation });
      } catch (error) {
        throw error;
      }
    },
    [state.currentGpxFile, state.editingService]
  );

  const editWaypointProperties = useCallback(
    async (waypointId: string, properties: Partial<WaypointEditData>) => {
      if (!state.currentGpxFile) {
        throw new Error('No GPX file is currently being edited');
      }

      try {
        const { gpxFile, operation } =
          state.editingService.editWaypointProperties(
            state.currentGpxFile,
            waypointId,
            properties
          );
        dispatch({ type: 'UPDATE_GPX_FILE', gpxFile });
        dispatch({ type: 'ADD_OPERATION', operation });
      } catch (error) {
        throw error;
      }
    },
    [state.currentGpxFile, state.editingService]
  );

  // Track point operations
  const addTrackPoint = useCallback(
    async (
      trackId: string,
      segmentIndex: number,
      insertIndex: number,
      pointData: TrackPointEditData
    ) => {
      if (!state.currentGpxFile) {
        throw new Error('No GPX file is currently being edited');
      }

      try {
        const { gpxFile, operation } = state.editingService.addTrackPoint(
          state.currentGpxFile,
          trackId,
          segmentIndex,
          insertIndex,
          pointData
        );
        dispatch({ type: 'UPDATE_GPX_FILE', gpxFile });
        dispatch({ type: 'ADD_OPERATION', operation });
      } catch (error) {
        throw error;
      }
    },
    [state.currentGpxFile, state.editingService]
  );

  const deleteTrackPoint = useCallback(
    async (trackId: string, segmentIndex: number, pointIndex: number) => {
      if (!state.currentGpxFile) {
        throw new Error('No GPX file is currently being edited');
      }

      try {
        const { gpxFile, operation } = state.editingService.deleteTrackPoint(
          state.currentGpxFile,
          trackId,
          segmentIndex,
          pointIndex
        );
        dispatch({ type: 'UPDATE_GPX_FILE', gpxFile });
        dispatch({ type: 'ADD_OPERATION', operation });
      } catch (error) {
        throw error;
      }
    },
    [state.currentGpxFile, state.editingService]
  );

  const moveTrackPoint = useCallback(
    async (
      trackId: string,
      segmentIndex: number,
      pointIndex: number,
      latitude: number,
      longitude: number,
      elevation?: number
    ) => {
      if (!state.currentGpxFile) {
        throw new Error('No GPX file is currently being edited');
      }

      try {
        const { gpxFile, operation } = state.editingService.moveTrackPoint(
          state.currentGpxFile,
          trackId,
          segmentIndex,
          pointIndex,
          latitude,
          longitude,
          elevation
        );
        dispatch({ type: 'UPDATE_GPX_FILE', gpxFile });
        dispatch({ type: 'ADD_OPERATION', operation });
      } catch (error) {
        throw error;
      }
    },
    [state.currentGpxFile, state.editingService]
  );

  const editTrackProperties = useCallback(
    async (trackId: string, properties: Partial<TrackEditData>) => {
      if (!state.currentGpxFile) {
        throw new Error('No GPX file is currently being edited');
      }

      try {
        const { gpxFile, operation } = state.editingService.editTrackProperties(
          state.currentGpxFile,
          trackId,
          properties
        );
        dispatch({ type: 'UPDATE_GPX_FILE', gpxFile });
        dispatch({ type: 'ADD_OPERATION', operation });
      } catch (error) {
        throw error;
      }
    },
    [state.currentGpxFile, state.editingService]
  );

  // Undo/Redo operations
  const undo = useCallback(() => {
    const operation = state.editingService.undo();
    if (operation && state.currentGpxFile) {
      // Apply the inverse operation
      // This would need to be implemented based on the operation type
      dispatch({ type: 'UNDO' });
    }
  }, [state.editingService, state.currentGpxFile]);

  const redo = useCallback(() => {
    const operation = state.editingService.redo();
    if (operation && state.currentGpxFile) {
      // Apply the operation
      // This would need to be implemented based on the operation type
      dispatch({ type: 'REDO' });
    }
  }, [state.editingService, state.currentGpxFile]);

  const clearOperations = useCallback(() => {
    state.editingService.clearOperations();
    dispatch({ type: 'CLEAR_OPERATIONS' });
  }, [state.editingService]);

  // Validation
  const validateCurrentFile = useCallback(() => {
    if (!state.currentGpxFile) {
      return {
        isValid: false,
        errors: ['No file is being edited'],
        warnings: [],
      };
    }

    const result = state.editingService.validateGPXFile(state.currentGpxFile);
    return {
      isValid: result.isValid,
      errors: result.errors.map((e) => e.message),
      warnings: result.warnings.map((w) => w.message),
    };
  }, [state.currentGpxFile, state.editingService]);

  const contextValue: EditingContextInterface = {
    ...state,
    setMode,
    startEditing,
    stopEditing,
    setSelection,
    clearSelection,
    addWaypoint,
    deleteWaypoint,
    moveWaypoint,
    editWaypointProperties,
    addTrackPoint,
    deleteTrackPoint,
    moveTrackPoint,
    editTrackProperties,
    undo,
    redo,
    clearOperations,
    validateCurrentFile,
  };

  return (
    <EditingContext.Provider value={contextValue}>
      {children}
    </EditingContext.Provider>
  );
};

// Hook to use the editing context
export const useEditing = (): EditingContextInterface => {
  const context = useContext(EditingContext);
  if (!context) {
    throw new Error('useEditing must be used within an EditingProvider');
  }
  return context;
};

export default EditingContext;
