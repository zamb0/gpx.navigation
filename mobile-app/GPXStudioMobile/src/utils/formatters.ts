/**
 * Utility functions for formatting data display
 */

/**
 * Format distance in meters to human-readable string
 */
export function formatDistance(
  meters: number,
  type: 'distance' | 'elevation' = 'distance'
): string {
  if (meters === 0) return '0 m';

  if (type === 'elevation') {
    // For elevation, always show in meters for precision
    if (Math.abs(meters) < 1000) {
      return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(1)} km`;
  }

  // For distance, use appropriate units
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  } else if (meters < 10000) {
    return `${(meters / 1000).toFixed(1)} km`;
  } else {
    return `${Math.round(meters / 1000)} km`;
  }
}

/**
 * Format file size in bytes to human-readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  if (i === 0) {
    return `${bytes} ${units[i]}`;
  }

  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${units[i]}`;
}

/**
 * Format date to human-readable string
 */
export function formatDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return months === 1 ? '1 month ago' : `${months} months ago`;
  } else {
    return date.toLocaleDateString();
  }
}

/**
 * Format duration in seconds to human-readable string
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    if (remainingSeconds === 0) {
      return `${minutes}m`;
    }
    return `${minutes}m ${Math.round(remainingSeconds)}s`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours < 24) {
    if (remainingMinutes === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${remainingMinutes}m`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  if (remainingHours === 0) {
    return `${days}d`;
  }
  return `${days}d ${remainingHours}h`;
}

/**
 * Format speed in m/s to human-readable string
 */
export function formatSpeed(metersPerSecond: number): string {
  const kmh = metersPerSecond * 3.6;

  if (kmh < 1) {
    return `${Math.round(metersPerSecond * 10) / 10} m/s`;
  }

  return `${Math.round(kmh * 10) / 10} km/h`;
}

/**
 * Format coordinates to human-readable string
 */
export function formatCoordinates(
  latitude: number,
  longitude: number,
  precision: number = 5
): string {
  const lat = latitude.toFixed(precision);
  const lng = longitude.toFixed(precision);
  const latDir = latitude >= 0 ? 'N' : 'S';
  const lngDir = longitude >= 0 ? 'E' : 'W';

  return `${Math.abs(parseFloat(lat))}°${latDir}, ${Math.abs(parseFloat(lng))}°${lngDir}`;
}

/**
 * Format elevation gain/loss with appropriate sign
 */
export function formatElevationChange(meters: number): string {
  const sign = meters >= 0 ? '+' : '';
  return `${sign}${formatDistance(meters, 'elevation')}`;
}

/**
 * Format elevation in meters to human-readable string
 */
export function formatElevation(meters: number): string {
  return formatDistance(meters, 'elevation');
}

/**
 * Format slope percentage
 */
export function formatSlope(percentage: number): string {
  return `${Math.round(percentage * 10) / 10}%`;
}
