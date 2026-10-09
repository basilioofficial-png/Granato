import type { SqlDatabase } from '@/db/types';
import type { EpochMs, Interval, TimeEntry } from '@/domain/types';

interface TimeEntryRow {
  id: string;
  user_id: string | null;
  category_id: string;
  started_at: number;
  ended_at: number | null;
  timezone: string;
  source: string;
  is_edited: number;
  note: string | null;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}

function toTimeEntry(row: TimeEntryRow): TimeEntry {
  if (row.source !== 'live' && row.source !== 'manual') {
    throw new Error(`Unknown time entry source "${row.source}" in entry ${row.id}`);
  }
  return {
    id: row.id,
    userId: row.user_id,
    categoryId: row.category_id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    timezone: row.timezone,
    source: row.source,
    isEdited: row.is_edited === 1,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export function insertTimeEntry(db: SqlDatabase, entry: TimeEntry): void {
  db.run(
    `INSERT INTO time_entries (id, user_id, category_id, started_at, ended_at, timezone,
       source, is_edited, note, created_at, updated_at, deleted_at, sync_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [
      entry.id,
      entry.userId,
      entry.categoryId,
      entry.startedAt,
      entry.endedAt,
      entry.timezone,
      entry.source,
      entry.isEdited ? 1 : 0,
      entry.note,
      entry.createdAt,
      entry.updatedAt,
      entry.deletedAt,
    ],
  );
}

export function getTimeEntryById(db: SqlDatabase, id: string): TimeEntry | null {
  const row = db.get<TimeEntryRow>('SELECT * FROM time_entries WHERE id = ?', [id]);
  return row ? toTimeEntry(row) : null;
}

export function getRunningTimeEntry(db: SqlDatabase): TimeEntry | null {
  const row = db.get<TimeEntryRow>(
    'SELECT * FROM time_entries WHERE ended_at IS NULL AND deleted_at IS NULL',
  );
  return row ? toTimeEntry(row) : null;
}

/**
 * Ends a running entry. Returns false if the entry does not exist, is deleted
 * or has already ended — the caller decides whether that is an error.
 */
export function closeTimeEntry(
  db: SqlDatabase,
  entryId: string,
  endedAt: EpochMs,
  now: EpochMs,
): boolean {
  const { changes } = db.run(
    `UPDATE time_entries
     SET ended_at = ?, updated_at = ?, sync_status = 'pending'
     WHERE id = ? AND ended_at IS NULL AND deleted_at IS NULL`,
    [endedAt, now, entryId],
  );
  return changes === 1;
}

/** Non-deleted entries that overlap `range` (running entries included), oldest first. */
export function listTimeEntriesOverlapping(db: SqlDatabase, range: Interval): TimeEntry[] {
  return db
    .all<TimeEntryRow>(
      `SELECT * FROM time_entries
       WHERE deleted_at IS NULL
         AND started_at < ?
         AND (ended_at IS NULL OR ended_at > ?)
       ORDER BY started_at`,
      [range.end, range.start],
    )
    .map(toTimeEntry);
}

/** Most recent non-deleted entries, newest first. */
export function listRecentTimeEntries(db: SqlDatabase, limit: number): TimeEntry[] {
  return db
    .all<TimeEntryRow>(
      `SELECT * FROM time_entries
       WHERE deleted_at IS NULL
       ORDER BY started_at DESC
       LIMIT ?`,
      [limit],
    )
    .map(toTimeEntry);
}

/** Soft delete. Returns false if the entry does not exist or is already deleted. */
export function softDeleteTimeEntry(db: SqlDatabase, entryId: string, now: EpochMs): boolean {
  const { changes } = db.run(
    `UPDATE time_entries
     SET deleted_at = ?, updated_at = ?, sync_status = 'pending'
     WHERE id = ? AND deleted_at IS NULL`,
    [now, now, entryId],
  );
  return changes === 1;
}

/** Makes a finished entry running again (used by "undo"). */
export function reopenTimeEntry(db: SqlDatabase, entryId: string, now: EpochMs): boolean {
  const { changes } = db.run(
    `UPDATE time_entries
     SET ended_at = NULL, updated_at = ?, sync_status = 'pending'
     WHERE id = ? AND ended_at IS NOT NULL AND deleted_at IS NULL`,
    [now, entryId],
  );
  return changes === 1;
}

/** Start of the earliest non-deleted entry: the moment the user began tracking. */
export function getEarliestStart(db: SqlDatabase): EpochMs | null {
  return (
    db.get<{ first: number | null }>(
      'SELECT MIN(started_at) AS first FROM time_entries WHERE deleted_at IS NULL',
    )?.first ?? null
  );
}
