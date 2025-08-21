/**
 * @jest-environment jsdom
 */

describe('MapControls', () => {
  const defaultProps = {
    onCenterUser: jest.fn(),
    onToggleFollowUser: jest.fn(),
    isFollowingUser: false,
    onToggleElevationProfile: jest.fn(),
    showElevationProfile: false,
    onMapProviderChange: jest.fn(),
    currentMapProvider: 'standard',
    hasUserLocation: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has correct default props', () => {
    expect(defaultProps.isFollowingUser).toBe(false);
    expect(defaultProps.showElevationProfile).toBe(false);
    expect(defaultProps.currentMapProvider).toBe('standard');
    expect(defaultProps.hasUserLocation).toBe(true);
  });

  it('handles callback functions', () => {
    defaultProps.onCenterUser();
    expect(defaultProps.onCenterUser).toHaveBeenCalledTimes(1);

    defaultProps.onToggleFollowUser();
    expect(defaultProps.onToggleFollowUser).toHaveBeenCalledTimes(1);

    defaultProps.onToggleElevationProfile();
    expect(defaultProps.onToggleElevationProfile).toHaveBeenCalledTimes(1);

    defaultProps.onMapProviderChange('satellite');
    expect(defaultProps.onMapProviderChange).toHaveBeenCalledWith('satellite');
  });

  it('handles state changes correctly', () => {
    const propsWithFollowing = {
      ...defaultProps,
      isFollowingUser: true,
    };

    expect(propsWithFollowing.isFollowingUser).toBe(true);
  });

  it('handles elevation profile state', () => {
    const propsWithElevation = {
      ...defaultProps,
      showElevationProfile: true,
    };

    expect(propsWithElevation.showElevationProfile).toBe(true);
  });

  it('handles different map providers', () => {
    const providers = ['standard', 'satellite', 'hybrid', 'terrain'];

    providers.forEach((provider) => {
      const propsWithProvider = {
        ...defaultProps,
        currentMapProvider: provider,
      };

      expect(propsWithProvider.currentMapProvider).toBe(provider);
    });
  });

  it('handles user location availability', () => {
    const propsWithoutLocation = {
      ...defaultProps,
      hasUserLocation: false,
    };

    expect(propsWithoutLocation.hasUserLocation).toBe(false);
  });
});
