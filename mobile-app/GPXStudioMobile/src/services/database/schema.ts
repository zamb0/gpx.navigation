/**
 * Database schema definitions and migration system
 */

export interface DatabaseSchema {
  version: number;
  tables: TableDefinition[];
}

export interface TableDefinition {
  name: string;
  sql: string;
}

export interface Migration {
  version: number;
  up: string[];
  down: string[];
}

// Current database version
export const CURRENT_DB_VERSION = 1;

// Database schema for version 1
export const SCHEMA_V1: DatabaseSchema = {
  version: 1,
  tables: [
    {
      name: 'files',
      sql: `
        CREATE TABLE IF NOT EXISTS files (
          id TEXT PRIMARY KEY,
          filename TEXT NOT NULL,
          name TEXT,
          description TEXT,
          created_at INTEGER NOT NULL,
          modified_at INTEGER NOT NULL,
          file_size INTEGER NOT NULL,
          track_count INTEGER NOT NULL,
          waypoint_count INTEGER NOT NULL,
          total_distance REAL NOT NULL,
          elevation_gain REAL NOT NULL,
          elevation_loss REAL NOT NULL,
          bounds_north REAL NOT NULL,
          bounds_south REAL NOT NULL,
          bounds_east REAL NOT NULL,
          bounds_west REAL NOT NULL,
          thumbnail TEXT,
          file_path TEXT NOT NULL
        )
      `,
    },
    {
      name: 'tracking_sessions',
      sql: `
        CREATE TABLE IF NOT EXISTS tracking_sessions (
          id TEXT PRIMARY KEY,
          start_time INTEGER NOT NULL,
          end_time INTEGER,
          is_active INTEGER NOT NULL DEFAULT 0,
          total_distance REAL NOT NULL DEFAULT 0,
          total_time INTEGER NOT NULL DEFAULT 0,
          average_speed REAL NOT NULL DEFAULT 0,
          max_speed REAL NOT NULL DEFAULT 0,
          elevation_gain REAL NOT NULL DEFAULT 0,
          elevation_loss REAL NOT NULL DEFAULT 0
        )
      `,
    },
    {
      name: 'track_points',
      sql: `
        CREATE TABLE IF NOT EXISTS track_points (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id TEXT NOT NULL,
          latitude REAL NOT NULL,
          longitude REAL NOT NULL,
          elevation REAL,
          timestamp INTEGER NOT NULL,
          accuracy REAL,
          speed REAL,
          bearing REAL,
          FOREIGN KEY (session_id) REFERENCES tracking_sessions (id) ON DELETE CASCADE
        )
      `,
    },
    {
      name: 'app_settings',
      sql: `
        CREATE TABLE IF NOT EXISTS app_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        )
      `,
    },
    {
      name: 'db_version',
      sql: `
        CREATE TABLE IF NOT EXISTS db_version (
          version INTEGER PRIMARY KEY
        )
      `,
    },
  ],
};

// Migration definitions
export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    up: SCHEMA_V1.tables.map((table) => table.sql),
    down: [
      'DROP TABLE IF EXISTS track_points',
      'DROP TABLE IF EXISTS tracking_sessions',
      'DROP TABLE IF EXISTS files',
      'DROP TABLE IF EXISTS app_settings',
      'DROP TABLE IF EXISTS db_version',
    ],
  },
];

// Indexes for performance optimization
export const INDEXES = [
  'CREATE INDEX IF NOT EXISTS idx_files_created_at ON files(created_at)',
  'CREATE INDEX IF NOT EXISTS idx_files_modified_at ON files(modified_at)',
  'CREATE INDEX IF NOT EXISTS idx_tracking_sessions_start_time ON tracking_sessions(start_time)',
  'CREATE INDEX IF NOT EXISTS idx_tracking_sessions_is_active ON tracking_sessions(is_active)',
  'CREATE INDEX IF NOT EXISTS idx_track_points_session_id ON track_points(session_id)',
  'CREATE INDEX IF NOT EXISTS idx_track_points_timestamp ON track_points(timestamp)',
];
