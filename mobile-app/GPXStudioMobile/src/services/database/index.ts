/**
 * Database service exports
 */

export { DatabaseManager } from './DatabaseManager';
export { DatabaseService, databaseService } from './DatabaseService';
export { GPXFilesRepository } from './GPXFilesRepository';
export { TrackingSessionsRepository } from './TrackingSessionsRepository';
export { AppSettingsRepository } from './AppSettingsRepository';
export type { AppSettings } from './AppSettingsRepository';
export { CURRENT_DB_VERSION, SCHEMA_V1, MIGRATIONS } from './schema';
