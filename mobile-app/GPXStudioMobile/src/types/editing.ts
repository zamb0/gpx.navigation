import { TrackPoint, WaypointType } from 'gpx';

// Editing modes
export type EditingMode = 'none' | 'waypoint' | 'track' | 'select';

// Edit operations for undo/redo
export interface EditOperation {
  id: string;
  type: EditOperationType;
  timestamp: Date;
  data: any;
  inverse?: EditOperation;
}

export type EditOperationType =
  | 'add_waypoint'
  | 'delete_waypoint'
  | 'move_waypoint'
  | 'edit_waypoint_properties'
  | 'add_track_point'
  | 'delete_track_point'
  | 'move_track_point'
  | 'edit_track_properties'
  | 'split_track'
  | 'merge_tracks';

// Waypoint editing data
export interface WaypointEditData {
  id?: string;
  latitude: number;
  longitude: number;
  elevation?: number;
  name?: string;
  description?: string;
  comment?: string;
  symbol?: string;
  type?: string;
  time?: Date;
}

// Track editing data
export interface TrackEditData {
  id?: string;
  name?: string;
  description?: string;
  comment?: string;
  color?: string;
  width?: number;
  opacity?: number;
}

// Track point editing data
export interface TrackPointEditData {
  trackId: string;
  segmentIndex: number;
  pointIndex: number;
  latitude: number;
  longitude: number;
  elevation?: number;
  time?: Date;
}

// Selection state
export interface SelectionState {
  selectedWaypoints: string[];
  selectedTrackPoints: TrackPointSelection[];
  selectedTracks: string[];
}

export interface TrackPointSelection {
  trackId: string;
  segmentIndex: number;
  pointIndex: number;
}

// Editing context
export interface EditingContext {
  mode: EditingMode;
  isEditing: boolean;
  selection: SelectionState;
  operations: EditOperation[];
  currentOperationIndex: number;
  canUndo: boolean;
  canRedo: boolean;
}

// Validation result
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  type: 'track' | 'waypoint' | 'general';
  message: string;
  details?: any;
}

export interface ValidationWarning {
  type: 'track' | 'waypoint' | 'general';
  message: string;
  details?: any;
}

// Editing configuration
export interface EditingConfig {
  maxUndoOperations: number;
  autoSave: boolean;
  validateOnEdit: boolean;
  snapToGrid: boolean;
  gridSize: number; // in meters
  minTrackPointDistance: number; // minimum distance between track points in meters
  maxTrackPoints: number;
  maxWaypoints: number;
}

// Default editing configuration
export const DEFAULT_EDITING_CONFIG: EditingConfig = {
  maxUndoOperations: 50,
  autoSave: true,
  validateOnEdit: true,
  snapToGrid: false,
  gridSize: 10,
  minTrackPointDistance: 1,
  maxTrackPoints: 10000,
  maxWaypoints: 1000,
};

// Waypoint symbols (common GPX symbols)
export const WAYPOINT_SYMBOLS = [
  'Flag, Red',
  'Flag, Blue',
  'Flag, Green',
  'Waypoint',
  'Summit',
  'Campground',
  'Parking Area',
  'Restroom',
  'Restaurant',
  'Gas Station',
  'Lodging',
  'Shopping Center',
  'Medical Facility',
  'Information',
  'Scenic Area',
  'Picnic Area',
  'Fishing Area',
  'Swimming Area',
  'Skiing Area',
  'Trail Head',
  'Danger',
  'Water Source',
  'Bridge',
  'Building',
  'Cemetery',
  'Church',
  'Civil',
  'Crossing',
  'Dam',
  'Exit',
  'Forest',
  'Ghost Town',
  'Glider Area',
  'Golf Course',
  'Heliport',
  'Horn',
  'Hunting Area',
  'Large Game',
  'Lighthouse',
  'Mine',
  'Oil Field',
  'Park',
  'Post Office',
  'Radio Beacon',
  'RV Park',
  'Scales',
  'School',
  'Seaplane Base',
  'Shipwreck',
  'Small Game',
  'Stadium',
  'Toll Booth',
  'Truck Stop',
  'Tunnel',
  'Ultralight Area',
  'Upland Game',
  'Waterfowl',
  'Wetlands',
  'Zoo',
] as const;

export type WaypointSymbol = (typeof WAYPOINT_SYMBOLS)[number];
