import type { Migration } from '@/db/migrations/types';

// Committed migrations are never edited: schema changes go into a new migration.
export const migration001Init: Migration = {
  version: 1,
  name: 'init',
  sql: `
    CREATE TABLE categories (
      id            TEXT PRIMARY KEY NOT NULL,
      user_id       TEXT,
      parent_id     TEXT REFERENCES categories(id),
      name          TEXT NOT NULL,
      color         TEXT NOT NULL,
      icon          TEXT,
      sort_order    INTEGER NOT NULL DEFAULT 0,
      favorite_rank INTEGER,
      archived_at   INTEGER,
      created_at    INTEGER NOT NULL,
      updated_at    INTEGER NOT NULL,
      deleted_at    INTEGER,
      sync_status   TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced'))
    );

    CREATE INDEX categories_parent ON categories (parent_id);

    CREATE TABLE time_entries (
      id          TEXT PRIMARY KEY NOT NULL,
      user_id     TEXT,
      category_id TEXT NOT NULL REFERENCES categories(id),
      started_at  INTEGER NOT NULL,
      ended_at    INTEGER,
      timezone    TEXT NOT NULL,
      source      TEXT NOT NULL CHECK (source IN ('live', 'manual')),
      is_edited   INTEGER NOT NULL DEFAULT 0 CHECK (is_edited IN (0, 1)),
      note        TEXT,
      created_at  INTEGER NOT NULL,
      updated_at  INTEGER NOT NULL,
      deleted_at  INTEGER,
      sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced')),
      CHECK (ended_at IS NULL OR ended_at >= started_at)
    );

    -- At most one running entry, guaranteed by the database itself.
    CREATE UNIQUE INDEX time_entries_one_running
      ON time_entries ((1)) WHERE ended_at IS NULL AND deleted_at IS NULL;

    CREATE INDEX time_entries_started ON time_entries (started_at);

    CREATE TABLE experiments (
      id            TEXT PRIMARY KEY NOT NULL,
      user_id       TEXT,
      duration_days INTEGER NOT NULL CHECK (duration_days IN (7, 14, 30)),
      started_at    INTEGER NOT NULL,
      ends_at       INTEGER NOT NULL,
      timezone      TEXT NOT NULL,
      status        TEXT NOT NULL CHECK (status IN ('active', 'completed', 'cancelled')),
      created_at    INTEGER NOT NULL,
      updated_at    INTEGER NOT NULL,
      deleted_at    INTEGER,
      sync_status   TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced'))
    );

    CREATE TABLE app_meta (
      key   TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `,
};
