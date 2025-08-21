import { router } from 'expo-router';
import { DeepLinkParams } from '../types/navigation';

// Deep link URL schemes
export const DEEP_LINK_SCHEMES = {
  gpxstudio: 'gpxstudio://',
  https: 'https://gpxstudio.app/',
} as const;

// Parse deep link URL and extract parameters
export function parseDeepLink(
  url: string
): { route: string; params: DeepLinkParams } | null {
  try {
    const urlObj = new URL(url);

    // Handle different URL schemes
    let pathname = '';
    let searchParams = new URLSearchParams();

    if (url.startsWith(DEEP_LINK_SCHEMES.gpxstudio)) {
      // Custom scheme: gpxstudio://map?fileId=123&lat=40.7128&lng=-74.0060
      pathname = urlObj.pathname || urlObj.hostname;
      searchParams = urlObj.searchParams;
    } else if (url.startsWith(DEEP_LINK_SCHEMES.https)) {
      // HTTPS scheme: https://gpxstudio.app/map?fileId=123&lat=40.7128&lng=-74.0060
      pathname = urlObj.pathname.replace('/', '');
      searchParams = urlObj.searchParams;
    }

    // Determine the target route
    let route = 'map'; // Default route
    if (['map', 'files', 'record', 'settings'].includes(pathname)) {
      route = pathname;
    }

    // Extract parameters
    const params: DeepLinkParams = {};

    // Common parameters
    if (searchParams.has('fileId')) {
      params.fileId = searchParams.get('fileId')!;
    }
    if (searchParams.has('importUrl')) {
      params.importUrl = searchParams.get('importUrl')!;
    }
    if (searchParams.has('lat')) {
      params.lat = parseFloat(searchParams.get('lat')!);
    }
    if (searchParams.has('lng')) {
      params.lng = parseFloat(searchParams.get('lng')!);
    }
    if (searchParams.has('zoom')) {
      params.zoom = parseFloat(searchParams.get('zoom')!);
    }
    if (searchParams.has('autoStart')) {
      params.autoStart = searchParams.get('autoStart') === 'true';
    }
    if (searchParams.has('filter')) {
      params.filter = searchParams.get('filter')!;
    }
    if (searchParams.has('section')) {
      params.section = searchParams.get('section')!;
    }

    return { route, params };
  } catch (error) {
    console.error('Failed to parse deep link:', error);
    return null;
  }
}

// Navigate to a route with parameters
export function navigateToRoute(route: string, params: DeepLinkParams = {}) {
  try {
    // Build the route path
    let routePath = `/(tabs)/${route}`;

    // Add query parameters if any
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });

    if (queryParams.toString()) {
      routePath += `?${queryParams.toString()}`;
    }

    router.push(routePath);
  } catch (error) {
    console.error('Failed to navigate to route:', error);
    // Fallback to basic navigation
    router.push(`/(tabs)/${route}`);
  }
}

// Handle incoming deep link
export function handleDeepLink(url: string) {
  const parsed = parseDeepLink(url);
  if (parsed) {
    navigateToRoute(parsed.route, parsed.params);
    return true;
  }
  return false;
}

// Generate deep link URL
export function generateDeepLink(
  route: string,
  params: DeepLinkParams = {}
): string {
  const baseUrl = DEEP_LINK_SCHEMES.gpxstudio;
  const queryParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      queryParams.append(key, String(value));
    }
  });

  const queryString = queryParams.toString();
  return `${baseUrl}${route}${queryString ? `?${queryString}` : ''}`;
}

// Share deep link
export function shareDeepLink(route: string, params: DeepLinkParams = {}) {
  const url = generateDeepLink(route, params);

  // For now, just copy to clipboard or return the URL
  // In a real implementation, you'd use the Share API
  return url;
}
