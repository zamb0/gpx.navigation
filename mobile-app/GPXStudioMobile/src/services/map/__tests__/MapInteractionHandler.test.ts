import { MapInteractionHandler } from '../MapInteractionHandler';
import { MapInteractionEvent } from '../../../types/map';

describe('MapInteractionHandler', () => {
  let handler: MapInteractionHandler;
  let mockOnInteraction: jest.Mock<void, [MapInteractionEvent]>;

  beforeEach(() => {
    handler = new MapInteractionHandler({
      enableTapToAddWaypoint: true,
      enableLongPressActions: true,
      enablePanAndZoom: true,
      doubleTapZoomLevel: 1,
      longPressDelay: 100, // Shorter delay for testing
    });
    mockOnInteraction = jest.fn();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('Tap Handling', () => {
    it('should handle single tap', () => {
      const coordinate = { latitude: 45.5, longitude: -122.6 };
      const screenPosition = { x: 100, y: 200 };

      handler.handleTouchStart(coordinate, screenPosition, mockOnInteraction);
      handler.handleTouchEnd(coordinate, mockOnInteraction);

      // Fast forward past single tap delay
      jest.advanceTimersByTime(350);

      expect(mockOnInteraction).toHaveBeenCalledWith({
        type: 'tap',
        coordinate,
        timestamp: expect.any(Date),
      });
    });

    it('should handle double tap', () => {
      const coordinate = { latitude: 45.5, longitude: -122.6 };
      const screenPosition = { x: 100, y: 200 };

      // First tap
      handler.handleTouchStart(coordinate, screenPosition, mockOnInteraction);
      handler.handleTouchEnd(coordinate, mockOnInteraction);

      // Second tap within double tap window
      jest.advanceTimersByTime(200);
      handler.handleTouchStart(coordinate, screenPosition, mockOnInteraction);
      handler.handleTouchEnd(coordinate, mockOnInteraction);

      expect(mockOnInteraction).toHaveBeenCalledWith({
        type: 'tap',
        coordinate,
        timestamp: expect.any(Date),
      });
    });

    it('should handle long press', () => {
      const coordinate = { latitude: 45.5, longitude: -122.6 };
      const screenPosition = { x: 100, y: 200 };

      handler.handleTouchStart(coordinate, screenPosition, mockOnInteraction);

      // Fast forward past long press delay
      jest.advanceTimersByTime(150);

      expect(mockOnInteraction).toHaveBeenCalledWith({
        type: 'longPress',
        coordinate,
        timestamp: expect.any(Date),
      });
    });

    it('should cancel long press on touch end before delay', () => {
      const coordinate = { latitude: 45.5, longitude: -122.6 };
      const screenPosition = { x: 100, y: 200 };

      handler.handleTouchStart(coordinate, screenPosition, mockOnInteraction);

      // End touch before long press delay
      jest.advanceTimersByTime(50);
      handler.handleTouchEnd(coordinate, mockOnInteraction);

      // Fast forward past long press delay
      jest.advanceTimersByTime(100);

      // Should not have triggered long press
      expect(mockOnInteraction).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'longPress' })
      );
    });
  });

  describe('Pan Handling', () => {
    it('should detect pan gesture', () => {
      const startCoordinate = { latitude: 45.5, longitude: -122.6 };
      const endCoordinate = { latitude: 45.51, longitude: -122.61 };
      const startPosition = { x: 100, y: 200 };
      const endPosition = { x: 120, y: 220 };

      handler.handleTouchStart(
        startCoordinate,
        startPosition,
        mockOnInteraction
      );
      handler.handleTouchMove(endCoordinate, endPosition, mockOnInteraction);

      expect(mockOnInteraction).toHaveBeenCalledWith({
        type: 'pan',
        coordinate: endCoordinate,
        timestamp: expect.any(Date),
      });
    });

    it('should cancel long press on pan', () => {
      const coordinate = { latitude: 45.5, longitude: -122.6 };
      const startPosition = { x: 100, y: 200 };
      const endPosition = { x: 120, y: 220 };

      handler.handleTouchStart(coordinate, startPosition, mockOnInteraction);

      // Move before long press delay
      jest.advanceTimersByTime(50);
      handler.handleTouchMove(coordinate, endPosition, mockOnInteraction);

      // Fast forward past long press delay
      jest.advanceTimersByTime(100);

      // Should not have triggered long press
      expect(mockOnInteraction).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'longPress' })
      );
    });

    it('should not detect pan for small movements', () => {
      const coordinate = { latitude: 45.5, longitude: -122.6 };
      const startPosition = { x: 100, y: 200 };
      const endPosition = { x: 105, y: 205 }; // Small movement

      handler.handleTouchStart(coordinate, startPosition, mockOnInteraction);
      handler.handleTouchMove(coordinate, endPosition, mockOnInteraction);

      expect(mockOnInteraction).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'pan' })
      );
    });
  });

  describe('Zoom Handling', () => {
    it('should handle zoom events', () => {
      const coordinate = { latitude: 45.5, longitude: -122.6 };
      const zoomLevel = 12;

      handler.handleZoom(zoomLevel, coordinate, mockOnInteraction);

      expect(mockOnInteraction).toHaveBeenCalledWith({
        type: 'zoom',
        coordinate,
        timestamp: expect.any(Date),
      });
    });
  });

  describe('Configuration', () => {
    it('should update configuration', () => {
      const newConfig = {
        enableTapToAddWaypoint: false,
        longPressDelay: 1000,
      };

      handler.updateConfig(newConfig);
      const config = handler.getConfig();

      expect(config.enableTapToAddWaypoint).toBe(false);
      expect(config.longPressDelay).toBe(1000);
      expect(config.enableLongPressActions).toBe(true); // Should keep existing values
    });

    it('should disable interactions based on configuration', () => {
      handler.updateConfig({
        enableTapToAddWaypoint: false,
        enableLongPressActions: false,
      });

      const coordinate = { latitude: 45.5, longitude: -122.6 };
      const screenPosition = { x: 100, y: 200 };

      handler.handleTouchStart(coordinate, screenPosition, mockOnInteraction);
      handler.handleTouchEnd(coordinate, mockOnInteraction);

      jest.advanceTimersByTime(350);

      expect(mockOnInteraction).not.toHaveBeenCalled();
    });
  });

  describe('Utility Methods', () => {
    it('should detect double tap timing', () => {
      expect(handler.isDoubleTapZoom(200)).toBe(true);
      expect(handler.isDoubleTapZoom(400)).toBe(false);
    });

    it('should detect pan gesture distance', () => {
      const start = { x: 100, y: 200 };
      const endNear = { x: 105, y: 205 };
      const endFar = { x: 120, y: 220 };

      expect(handler.isPanGesture(start, endNear)).toBe(false);
      expect(handler.isPanGesture(start, endFar)).toBe(true);
    });

    it('should detect long press duration', () => {
      expect(handler.isLongPressGesture(150)).toBe(true); // Greater than 100ms delay
      expect(handler.isLongPressGesture(50)).toBe(false); // Less than 100ms delay
    });
  });

  describe('State Reset', () => {
    it('should reset all state', () => {
      const coordinate = { latitude: 45.5, longitude: -122.6 };
      const screenPosition = { x: 100, y: 200 };

      handler.handleTouchStart(coordinate, screenPosition, mockOnInteraction);
      handler.reset();

      // Fast forward past delays
      jest.advanceTimersByTime(500);

      // Should not trigger any events after reset
      expect(mockOnInteraction).not.toHaveBeenCalled();
    });
  });
});
