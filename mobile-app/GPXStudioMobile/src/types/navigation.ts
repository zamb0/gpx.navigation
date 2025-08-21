export type RootStackParamList = {
  '(tabs)': undefined;
};

export type TabParamList = {
  map:
    | {
        fileId?: string;
        lat?: number;
        lng?: number;
        zoom?: number;
        navigationMode?: boolean;
      }
    | undefined;
  files:
    | {
        importUrl?: string;
        filter?: string;
      }
    | undefined;
  record:
    | {
        autoStart?: boolean;
      }
    | undefined;
  settings:
    | {
        section?: 'units' | 'map' | 'gps' | 'appearance' | 'navigation';
      }
    | undefined;
};

// Navigation-specific types
export interface NavigationPoint {
  latitude: number;
  longitude: number;
  elevation?: number;
  name?: string;
  description?: string;
  symbol?: string;
  timestamp?: Date;
}

export interface NavigationRoute {
  id: string;
  name: string;
  description?: string;
  waypoints: NavigationPoint[];
  trackPoints: NavigationPoint[];
  totalDistance: number;
  estimatedDuration?: number;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

export interface NavigationState {
  isNavigating: boolean;
  currentRoute: NavigationRoute | null;
  currentPosition: NavigationPoint | null;
  closestPoint: NavigationPoint | null;
  distanceToTrack: number;
  distanceAlongTrack: number;
  remainingDistance: number;
  currentSpeed: number;
  bearing: number;
  isOffRoute: boolean;
  nextWaypoint: NavigationPoint | null;
  distanceToNextWaypoint: number;
  bearingToNextWaypoint: number;
  progress: number; // 0-1
}

export interface NavigationSettings {
  offRouteThreshold: number; // meters
  offRouteAlertEnabled: boolean;
  voiceGuidanceEnabled: boolean;
  waypointAlertDistance: number; // meters
  waypointAlertEnabled: boolean;
  speedAlertEnabled: boolean;
  speedAlertThreshold: number; // km/h or mph
  autoRecenterMap: boolean;
  keepScreenOn: boolean;
  navigationAccuracy: 'high' | 'medium' | 'low';
  updateInterval: number; // milliseconds
}

export interface NavigationAlert {
  id: string;
  type: 'off_route' | 'waypoint_approach' | 'speed_alert' | 'route_complete';
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  priority: 'low' | 'medium' | 'high';
}

export interface NavigationStats {
  startTime: Date;
  elapsedTime: number;
  totalDistance: number;
  averageSpeed: number;
  maxSpeed: number;
  elevationGain: number;
  elevationLoss: number;
  waypointsReached: number;
  totalWaypoints: number;
}

export enum NavigationMode {
  FOLLOW_TRACK = 'follow_track',
  WAYPOINT_NAVIGATION = 'waypoint_navigation',
  FREE_NAVIGATION = 'free_navigation',
}

export interface TurnInstruction {
  id: string;
  type: 'straight' | 'left' | 'right' | 'sharp_left' | 'sharp_right' | 'u_turn';
  distance: number;
  description: string;
  waypoint?: NavigationPoint;
}

export type NavigationUpdateCallback = (state: NavigationState) => void;
export type NavigationAlertCallback = (alert: NavigationAlert) => void;

// Deep link parameter types
export interface DeepLinkParams {
  fileId?: string;
  importUrl?: string;
  lat?: number;
  lng?: number;
  zoom?: number;
  autoStart?: boolean;
  filter?: string;
  section?: string;
}

// Tab configuration
export interface TabConfig {
  name: keyof TabParamList;
  title: string;
  iconName: string;
  iconNameFocused: string;
  headerShown?: boolean;
}

export const TAB_CONFIGS: TabConfig[] = [
  {
    name: 'map',
    title: 'Map',
    iconName: 'map-outline',
    iconNameFocused: 'map',
    headerShown: false,
  },
  {
    name: 'files',
    title: 'Files',
    iconName: 'folder-outline',
    iconNameFocused: 'folder',
    headerShown: true,
  },
  {
    name: 'record',
    title: 'Record',
    iconName: 'radio-button-off',
    iconNameFocused: 'radio-button-on',
    headerShown: true,
  },
  {
    name: 'settings',
    title: 'Settings',
    iconName: 'settings-outline',
    iconNameFocused: 'settings',
    headerShown: true,
  },
];
