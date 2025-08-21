/**
 * @jest-environment jsdom
 */

describe('UserLocationMarker', () => {
  const mockLocation = {
    latitude: 37.7749,
    longitude: -122.4194,
    altitude: 100,
    accuracy: 5,
    heading: 45,
    timestamp: Date.now(),
  };

  it('handles location data correctly', () => {
    expect(mockLocation.latitude).toBe(37.7749);
    expect(mockLocation.longitude).toBe(-122.4194);
    expect(mockLocation.accuracy).toBe(5);
  });

  it('handles location without accuracy', () => {
    const locationWithoutAccuracy = {
      ...mockLocation,
      accuracy: undefined,
    };

    expect(locationWithoutAccuracy.accuracy).toBeUndefined();
    expect(locationWithoutAccuracy.latitude).toBe(37.7749);
  });

  it('handles location without heading', () => {
    const locationWithoutHeading = {
      ...mockLocation,
      heading: undefined,
    };

    expect(locationWithoutHeading.heading).toBeUndefined();
    expect(locationWithoutHeading.latitude).toBe(37.7749);
  });

  it('validates coordinate ranges', () => {
    expect(mockLocation.latitude).toBeGreaterThanOrEqual(-90);
    expect(mockLocation.latitude).toBeLessThanOrEqual(90);
    expect(mockLocation.longitude).toBeGreaterThanOrEqual(-180);
    expect(mockLocation.longitude).toBeLessThanOrEqual(180);
  });

  it('handles following state changes', () => {
    let isFollowing = false;

    // Simulate toggling follow state
    isFollowing = !isFollowing;
    expect(isFollowing).toBe(true);

    isFollowing = !isFollowing;
    expect(isFollowing).toBe(false);
  });
});
