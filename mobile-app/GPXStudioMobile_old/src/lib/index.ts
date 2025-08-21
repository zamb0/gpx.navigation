/**
 * Main barrel export for GPX library
 * Combines read-only core GPX library with adapters
 */

// Core GPX library (read-only) - using proxy files
export * from './gpx/gpx';
export * from './gpx/types';
export * from './gpx/io';
export * from './gpx/simplify';

// GPX adapters and extensions (modifiable)
export * from './gpx-adapters/types';
export * from './gpx-adapters/mappers';

// Re-export specific functions for backward compatibility
export { convertGPXToMapData } from './gpx-adapters/mappers';
