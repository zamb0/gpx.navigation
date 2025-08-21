import { MapInteractionEvent, MapViewState } from '../../types/map';

export interface MapInteractionConfig {
  enableTapToAddWaypoint?: boolean;
  enableLongPressActions?: boolean;
  enablePanAndZoom?: boolean;
  doubleTapZoomLevel?: number;
  longPressDelay?: number;
}

export class MapInteractionHandler {
  private config: MapInteractionConfig;
  private lastTapTime: number = 0;
  private tapTimeout: NodeJS.Timeout | null = null;
  private longPressTimeout: NodeJS.Timeout | null = null;
  private isLongPressing: boolean = false;
  private panStartTime: number = 0;
  private lastPanPosition: { x: number; y: number } | null = null;

  constructor(config?: MapInteractionConfig) {
    this.config = {
      enableTapToAddWaypoint: true,
      enableLongPressActions: true,
      enablePanAndZoom: true,
      doubleTapZoomLevel: 1,
      longPressDelay: 500,
      ...config,
    };
  }

  handleTouchStart(
    coordinate: { latitude: number; longitude: number },
    screenPosition: { x: number; y: number },
    onInteraction: (event: MapInteractionEvent) => void
  ): void {
    if (
      !this.config.enableTapToAddWaypoint &&
      !this.config.enableLongPressActions
    ) {
      return;
    }

    this.isLongPressing = false;
    this.lastPanPosition = screenPosition;
    this.panStartTime = Date.now();

    // Clear any existing timeouts
    if (this.tapTimeout) {
      clearTimeout(this.tapTimeout);
      this.tapTimeout = null;
    }

    if (this.longPressTimeout) {
      clearTimeout(this.longPressTimeout);
    }

    // Start long press detection
    if (this.config.enableLongPressActions) {
      this.longPressTimeout = setTimeout(() => {
        this.isLongPressing = true;
        onInteraction({
          type: 'longPress',
          coordinate,
          timestamp: new Date(),
        });
      }, this.config.longPressDelay);
    }
  }

  handleTouchMove(
    coordinate: { latitude: number; longitude: number },
    screenPosition: { x: number; y: number },
    onInteraction: (event: MapInteractionEvent) => void
  ): void {
    if (!this.config.enablePanAndZoom) {
      return;
    }

    // Cancel long press if user moves finger
    if (this.longPressTimeout) {
      clearTimeout(this.longPressTimeout);
      this.longPressTimeout = null;
    }

    // Detect pan gesture
    if (this.lastPanPosition) {
      const deltaX = screenPosition.x - this.lastPanPosition.x;
      const deltaY = screenPosition.y - this.lastPanPosition.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // If moved more than 10 pixels, consider it a pan
      if (distance > 10) {
        onInteraction({
          type: 'pan',
          coordinate,
          timestamp: new Date(),
        });
        this.lastPanPosition = screenPosition;
      }
    }
  }

  handleTouchEnd(
    coordinate: { latitude: number; longitude: number },
    onInteraction: (event: MapInteractionEvent) => void
  ): void {
    // Clear long press timeout
    if (this.longPressTimeout) {
      clearTimeout(this.longPressTimeout);
      this.longPressTimeout = null;
    }

    // If it was a long press, don't process as tap
    if (this.isLongPressing) {
      this.isLongPressing = false;
      return;
    }

    // Check for double tap
    const currentTime = Date.now();
    const timeSinceLastTap = currentTime - this.lastTapTime;

    if (timeSinceLastTap < 300) {
      // Double tap detected
      if (this.tapTimeout) {
        clearTimeout(this.tapTimeout);
        this.tapTimeout = null;
      }

      onInteraction({
        type: 'tap',
        coordinate,
        timestamp: new Date(),
      });

      this.lastTapTime = 0; // Reset to prevent triple tap
    } else {
      // Single tap - wait to see if there's a second tap
      this.tapTimeout = setTimeout(() => {
        if (this.config.enableTapToAddWaypoint) {
          onInteraction({
            type: 'tap',
            coordinate,
            timestamp: new Date(),
          });
        }
        this.tapTimeout = null;
      }, 300);

      this.lastTapTime = currentTime;
    }

    this.lastPanPosition = null;
  }

  handleZoom(
    zoomLevel: number,
    coordinate: { latitude: number; longitude: number },
    onInteraction: (event: MapInteractionEvent) => void
  ): void {
    if (!this.config.enablePanAndZoom) {
      return;
    }

    onInteraction({
      type: 'zoom',
      coordinate,
      timestamp: new Date(),
    });
  }

  // Utility methods for gesture recognition
  isDoubleTapZoom(timeBetweenTaps: number): boolean {
    return timeBetweenTaps < 300;
  }

  isPanGesture(
    startPosition: { x: number; y: number },
    endPosition: { x: number; y: number }
  ): boolean {
    const deltaX = endPosition.x - startPosition.x;
    const deltaY = endPosition.y - startPosition.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    return distance > 10; // Minimum distance for pan
  }

  isLongPressGesture(duration: number): boolean {
    return duration >= (this.config.longPressDelay || 500);
  }

  // Configuration methods
  updateConfig(newConfig: Partial<MapInteractionConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): MapInteractionConfig {
    return { ...this.config };
  }

  // Reset state
  reset(): void {
    if (this.tapTimeout) {
      clearTimeout(this.tapTimeout);
      this.tapTimeout = null;
    }
    if (this.longPressTimeout) {
      clearTimeout(this.longPressTimeout);
      this.longPressTimeout = null;
    }
    this.isLongPressing = false;
    this.lastTapTime = 0;
    this.lastPanPosition = null;
  }
}
