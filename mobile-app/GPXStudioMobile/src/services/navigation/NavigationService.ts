import {
  NavigationPoint,
  NavigationRoute,
  NavigationState,
  NavigationSettings,
  NavigationAlert,
  NavigationStats,
  NavigationMode,
  TurnInstruction,
  NavigationUpdateCallback,
  NavigationAlertCallback,
} from '../../types/navigation';
import { LocationCoordinate, LocationAccuracy } from '../../types/location';
import { LocationService } from '../location/LocationService';
import { MobileGPXFile } from '../../types/gpx';

export class NavigationService {
  private static instance: NavigationService;
  private locationService: LocationService;
  private isNavigating = false;
  private currentState!: NavigationState;
  private settings!: NavigationSettings;
  private stats!: NavigationStats;
  private updateCallbacks: NavigationUpdateCallback[] = [];
  private alertCallbacks: NavigationAlertCallback[] = [];
  private locationUnsubscribe: (() => void) | null = null;
  private updateInterval: NodeJS.Timeout | null = null;
  private alerts: NavigationAlert[] = [];

  private constructor() {
    this.locationService = LocationService.getInstance();
    this.initializeDefaultState();
    this.initializeDefaultSettings();
  }

  public static getInstance(): NavigationService {
    if (!NavigationService.instance) {
      NavigationService.instance = new NavigationService();
    }
    return NavigationService.instance;
  }

  /**
   * Start navigation with a GPX route
   */
  public async startNavigation(
    gpxFile: MobileGPXFile,
    mode: NavigationMode = NavigationMode.FOLLOW_TRACK
  ): Promise<void> {
    if (this.isNavigating) {
      await this.stopNavigation();
    }

    try {
      // Convert GPX file to navigation route
      const route = this.convertGPXToRoute(gpxFile);

      // Initialize navigation state
      this.currentState = {
        ...this.currentState,
        isNavigating: true,
        currentRoute: route,
      };

      // Initialize stats
      this.stats = {
        startTime: new Date(),
        elapsedTime: 0,
        totalDistance: 0,
        averageSpeed: 0,
        maxSpeed: 0,
        elevationGain: 0,
        elevationLoss: 0,
        waypointsReached: 0,
        totalWaypoints: route.waypoints.length,
      };

      // Start location tracking
      await this.locationService.startTracking({
        accuracy: this.getLocationAccuracy(),
        timeInterval: this.settings.updateInterval,
        distanceInterval: 1, // 1 meter
      });

      // Subscribe to location updates
      this.locationUnsubscribe = this.locationService.onLocationUpdate(
        this.handleLocationUpdate.bind(this)
      );

      // Start navigation update loop
      this.startUpdateLoop();

      this.isNavigating = true;
      this.notifyStateUpdate();

      // Create start navigation alert
      this.createAlert('route_complete', 'Navigation started', 'low');
    } catch (error) {
      throw new Error(
        `Failed to start navigation: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Stop navigation
   */
  public async stopNavigation(): Promise<void> {
    if (!this.isNavigating) {
      return;
    }

    // Stop location tracking
    if (this.locationUnsubscribe) {
      this.locationUnsubscribe();
      this.locationUnsubscribe = null;
    }

    // Stop update loop
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    // Reset state
    this.currentState = {
      ...this.currentState,
      isNavigating: false,
      currentRoute: null,
      closestPoint: null,
      distanceToTrack: 0,
      distanceAlongTrack: 0,
      remainingDistance: 0,
      isOffRoute: false,
      nextWaypoint: null,
      distanceToNextWaypoint: 0,
      bearingToNextWaypoint: 0,
      progress: 0,
    };

    this.isNavigating = false;
    this.notifyStateUpdate();

    // Create stop navigation alert
    this.createAlert('route_complete', 'Navigation stopped', 'low');
  }

  /**
   * Get current navigation state
   */
  public getNavigationState(): NavigationState {
    return { ...this.currentState };
  }

  /**
   * Get navigation statistics
   */
  public getNavigationStats(): NavigationStats {
    return { ...this.stats };
  }

  /**
   * Update navigation settings
   */
  public updateSettings(newSettings: Partial<NavigationSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
  }

  /**
   * Get current navigation settings
   */
  public getSettings(): NavigationSettings {
    return { ...this.settings };
  }

  /**
   * Subscribe to navigation state updates
   */
  public onNavigationUpdate(callback: NavigationUpdateCallback): () => void {
    this.updateCallbacks.push(callback);
    return () => {
      const index = this.updateCallbacks.indexOf(callback);
      if (index > -1) {
        this.updateCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to navigation alerts
   */
  public onNavigationAlert(callback: NavigationAlertCallback): () => void {
    this.alertCallbacks.push(callback);
    return () => {
      const index = this.alertCallbacks.indexOf(callback);
      if (index > -1) {
        this.alertCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Get all navigation alerts
   */
  public getAlerts(): NavigationAlert[] {
    return [...this.alerts];
  }

  /**
   * Acknowledge an alert
   */
  public acknowledgeAlert(alertId: string): void {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
    }
  }

  /**
   * Clear all alerts
   */
  public clearAlerts(): void {
    this.alerts = [];
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  public static calculateDistance(
    point1: NavigationPoint,
    point2: NavigationPoint
  ): number {
    const R = 6371000; // Earth's radius in meters
    const lat1Rad = (point1.latitude * Math.PI) / 180;
    const lat2Rad = (point2.latitude * Math.PI) / 180;
    const deltaLatRad = ((point2.latitude - point1.latitude) * Math.PI) / 180;
    const deltaLonRad = ((point2.longitude - point1.longitude) * Math.PI) / 180;

    const a =
      Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
      Math.cos(lat1Rad) *
        Math.cos(lat2Rad) *
        Math.sin(deltaLonRad / 2) *
        Math.sin(deltaLonRad / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Calculate bearing between two points
   */
  public static calculateBearing(
    point1: NavigationPoint,
    point2: NavigationPoint
  ): number {
    const lat1Rad = (point1.latitude * Math.PI) / 180;
    const lat2Rad = (point2.latitude * Math.PI) / 180;
    const deltaLonRad = ((point2.longitude - point1.longitude) * Math.PI) / 180;

    const y = Math.sin(deltaLonRad) * Math.cos(lat2Rad);
    const x =
      Math.cos(lat1Rad) * Math.sin(lat2Rad) -
      Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(deltaLonRad);

    const bearingRad = Math.atan2(y, x);
    return ((bearingRad * 180) / Math.PI + 360) % 360;
  }

  /**
   * Find closest point on track to current position
   */
  public findClosestPointOnTrack(
    currentPosition: NavigationPoint,
    trackPoints: NavigationPoint[]
  ): { point: NavigationPoint; distance: number; index: number } {
    let closestPoint = trackPoints[0];
    let minDistance = NavigationService.calculateDistance(
      currentPosition,
      closestPoint
    );
    let closestIndex = 0;

    for (let i = 1; i < trackPoints.length; i++) {
      const distance = NavigationService.calculateDistance(
        currentPosition,
        trackPoints[i]
      );
      if (distance < minDistance) {
        minDistance = distance;
        closestPoint = trackPoints[i];
        closestIndex = i;
      }
    }

    // Check if we're closer to a point on the line segment between two track points
    for (let i = 0; i < trackPoints.length - 1; i++) {
      const segmentPoint = this.getClosestPointOnSegment(
        currentPosition,
        trackPoints[i],
        trackPoints[i + 1]
      );
      const segmentDistance = NavigationService.calculateDistance(
        currentPosition,
        segmentPoint
      );

      if (segmentDistance < minDistance) {
        minDistance = segmentDistance;
        closestPoint = segmentPoint;
        closestIndex = i;
      }
    }

    return { point: closestPoint, distance: minDistance, index: closestIndex };
  }

  // Private methods

  private initializeDefaultState(): void {
    this.currentState = {
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
    };
  }

  private initializeDefaultSettings(): void {
    this.settings = {
      offRouteThreshold: 50, // 50 meters
      offRouteAlertEnabled: true,
      voiceGuidanceEnabled: true,
      waypointAlertDistance: 100, // 100 meters
      waypointAlertEnabled: true,
      speedAlertEnabled: false,
      speedAlertThreshold: 30, // 30 km/h
      autoRecenterMap: true,
      keepScreenOn: true,
      navigationAccuracy: 'high',
      updateInterval: 1000, // 1 second
    };
  }

  private convertGPXToRoute(gpxFile: MobileGPXFile): NavigationRoute {
    const gpx = gpxFile.gpxFile;
    const metadata = gpxFile.metadata;

    // Extract waypoints
    const waypoints: NavigationPoint[] =
      gpx.waypoints?.map((wp: any) => ({
        latitude: wp.lat,
        longitude: wp.lon,
        elevation: wp.ele,
        name: wp.name,
        description: wp.desc,
        symbol: wp.sym,
      })) || [];

    // Extract track points from all tracks and segments
    const trackPoints: NavigationPoint[] = [];
    if (gpx.tracks) {
      for (const track of gpx.tracks) {
        if (track.segments) {
          for (const segment of track.segments) {
            for (const point of segment.points) {
              trackPoints.push({
                latitude: point.lat,
                longitude: point.lon,
                elevation: point.ele,
                timestamp: point.time ? new Date(point.time) : undefined,
              });
            }
          }
        }
      }
    }

    return {
      id: gpxFile.id,
      name: metadata.name || metadata.filename,
      description: metadata.description,
      waypoints,
      trackPoints,
      totalDistance: metadata.totalDistance,
      bounds: {
        north: metadata.bounds.north,
        south: metadata.bounds.south,
        east: metadata.bounds.east,
        west: metadata.bounds.west,
      },
    };
  }

  private handleLocationUpdate(location: LocationCoordinate): void {
    if (!this.isNavigating || !this.currentState.currentRoute) {
      return;
    }

    const currentPosition: NavigationPoint = {
      latitude: location.latitude,
      longitude: location.longitude,
      elevation: location.altitude,
      timestamp: new Date(location.timestamp),
    };

    this.currentState.currentPosition = currentPosition;
    this.currentState.currentSpeed = location.speed || 0;
    this.currentState.bearing = location.heading || 0;

    // Update navigation calculations
    this.updateNavigationCalculations(currentPosition);
    this.updateNavigationStats(location);
    this.checkForAlerts(currentPosition);

    this.notifyStateUpdate();
  }

  private updateNavigationCalculations(currentPosition: NavigationPoint): void {
    if (!this.currentState.currentRoute) return;

    const route = this.currentState.currentRoute;

    // Find closest point on track
    const closestResult = this.findClosestPointOnTrack(
      currentPosition,
      route.trackPoints
    );
    this.currentState.closestPoint = closestResult.point;
    this.currentState.distanceToTrack = closestResult.distance;

    // Check if off route
    this.currentState.isOffRoute =
      closestResult.distance > this.settings.offRouteThreshold;

    // Calculate distance along track and remaining distance
    this.currentState.distanceAlongTrack = this.calculateDistanceAlongTrack(
      route.trackPoints,
      closestResult.index
    );
    this.currentState.remainingDistance =
      route.totalDistance - this.currentState.distanceAlongTrack;

    // Calculate progress (0-1)
    this.currentState.progress =
      route.totalDistance > 0
        ? this.currentState.distanceAlongTrack / route.totalDistance
        : 0;

    // Find next waypoint
    this.updateNextWaypoint(currentPosition, route.waypoints);
  }

  private calculateDistanceAlongTrack(
    trackPoints: NavigationPoint[],
    currentIndex: number
  ): number {
    let distance = 0;
    for (let i = 0; i < Math.min(currentIndex, trackPoints.length - 1); i++) {
      distance += NavigationService.calculateDistance(
        trackPoints[i],
        trackPoints[i + 1]
      );
    }
    return distance;
  }

  private updateNextWaypoint(
    currentPosition: NavigationPoint,
    waypoints: NavigationPoint[]
  ): void {
    if (waypoints.length === 0) {
      this.currentState.nextWaypoint = null;
      this.currentState.distanceToNextWaypoint = 0;
      this.currentState.bearingToNextWaypoint = 0;
      return;
    }

    // Find the closest unvisited waypoint
    let nextWaypoint = waypoints[0];
    let minDistance = NavigationService.calculateDistance(
      currentPosition,
      nextWaypoint
    );

    for (const waypoint of waypoints) {
      const distance = NavigationService.calculateDistance(
        currentPosition,
        waypoint
      );
      if (distance < minDistance) {
        minDistance = distance;
        nextWaypoint = waypoint;
      }
    }

    this.currentState.nextWaypoint = nextWaypoint;
    this.currentState.distanceToNextWaypoint = minDistance;
    this.currentState.bearingToNextWaypoint =
      NavigationService.calculateBearing(currentPosition, nextWaypoint);
  }

  private updateNavigationStats(location: LocationCoordinate): void {
    const now = new Date();
    this.stats.elapsedTime = now.getTime() - this.stats.startTime.getTime();

    if (location.speed !== undefined) {
      this.stats.maxSpeed = Math.max(this.stats.maxSpeed, location.speed);

      // Update average speed (simple moving average)
      const timeInHours = this.stats.elapsedTime / (1000 * 60 * 60);
      if (timeInHours > 0) {
        this.stats.averageSpeed = this.stats.totalDistance / 1000 / timeInHours;
      }
    }

    // Update elevation stats if available
    if (
      location.altitude !== undefined &&
      this.currentState.closestPoint?.elevation !== undefined
    ) {
      const elevationDiff =
        location.altitude - this.currentState.closestPoint.elevation;
      if (elevationDiff > 0) {
        this.stats.elevationGain += elevationDiff;
      } else {
        this.stats.elevationLoss += Math.abs(elevationDiff);
      }
    }
  }

  private checkForAlerts(currentPosition: NavigationPoint): void {
    // Check for off-route alert
    if (this.settings.offRouteAlertEnabled && this.currentState.isOffRoute) {
      this.createAlert(
        'off_route',
        `You are ${Math.round(this.currentState.distanceToTrack)}m off the route`,
        'medium'
      );
    }

    // Check for waypoint approach alert
    if (
      this.settings.waypointAlertEnabled &&
      this.currentState.nextWaypoint &&
      this.currentState.distanceToNextWaypoint <=
        this.settings.waypointAlertDistance
    ) {
      const waypointName = this.currentState.nextWaypoint.name || 'waypoint';
      this.createAlert(
        'waypoint_approach',
        `Approaching ${waypointName} in ${Math.round(this.currentState.distanceToNextWaypoint)}m`,
        'high'
      );
    }

    // Check for speed alert
    if (
      this.settings.speedAlertEnabled &&
      this.currentState.currentSpeed > this.settings.speedAlertThreshold / 3.6 // Convert km/h to m/s
    ) {
      this.createAlert(
        'speed_alert',
        `Speed limit exceeded: ${Math.round(this.currentState.currentSpeed * 3.6)} km/h`,
        'medium'
      );
    }
  }

  private createAlert(
    type: NavigationAlert['type'],
    message: string,
    priority: NavigationAlert['priority']
  ): void {
    // Don't create duplicate alerts
    const existingAlert = this.alerts.find(
      (alert) => alert.type === type && !alert.acknowledged
    );
    if (existingAlert) {
      return;
    }

    const alert: NavigationAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      message,
      timestamp: new Date(),
      acknowledged: false,
      priority,
    };

    this.alerts.push(alert);
    this.notifyAlertCallbacks(alert);

    // Auto-acknowledge low priority alerts after 5 seconds
    if (priority === 'low') {
      setTimeout(() => {
        this.acknowledgeAlert(alert.id);
      }, 5000);
    }
  }

  private getClosestPointOnSegment(
    point: NavigationPoint,
    segmentStart: NavigationPoint,
    segmentEnd: NavigationPoint
  ): NavigationPoint {
    // Convert to Cartesian coordinates for easier calculation
    const A = { x: segmentStart.latitude, y: segmentStart.longitude };
    const B = { x: segmentEnd.latitude, y: segmentEnd.longitude };
    const P = { x: point.latitude, y: point.longitude };

    const AP = { x: P.x - A.x, y: P.y - A.y };
    const AB = { x: B.x - A.x, y: B.y - A.y };

    const ab2 = AB.x * AB.x + AB.y * AB.y;
    const ap_ab = AP.x * AB.x + AP.y * AB.y;

    let t = ap_ab / ab2;
    t = Math.max(0, Math.min(1, t)); // Clamp to segment

    return {
      latitude: A.x + AB.x * t,
      longitude: A.y + AB.y * t,
      elevation:
        segmentStart.elevation && segmentEnd.elevation
          ? segmentStart.elevation +
            (segmentEnd.elevation - segmentStart.elevation) * t
          : undefined,
    };
  }

  private getLocationAccuracy(): LocationAccuracy {
    switch (this.settings.navigationAccuracy) {
      case 'high':
        return LocationAccuracy.HIGH;
      case 'medium':
        return LocationAccuracy.MEDIUM;
      case 'low':
        return LocationAccuracy.LOW;
      default:
        return LocationAccuracy.HIGH;
    }
  }

  private startUpdateLoop(): void {
    this.updateInterval = setInterval(() => {
      if (this.isNavigating) {
        this.notifyStateUpdate();
      }
    }, this.settings.updateInterval);
  }

  private notifyStateUpdate(): void {
    this.updateCallbacks.forEach((callback) => {
      try {
        callback(this.currentState);
      } catch (error) {
        console.error('Error in navigation update callback:', error);
      }
    });
  }

  private notifyAlertCallbacks(alert: NavigationAlert): void {
    this.alertCallbacks.forEach((callback) => {
      try {
        callback(alert);
      } catch (error) {
        console.error('Error in navigation alert callback:', error);
      }
    });
  }
}
