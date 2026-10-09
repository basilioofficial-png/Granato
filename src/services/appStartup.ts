import { openExpoSqliteDatabase } from '@/db/expoSqliteDatabase';
import type { SqlDatabase } from '@/db/types';
import { now } from '@/lib/clock';
import { newId } from '@/lib/id';
import { initializeStorage, type StorageStatus } from '@/services/storage';

const DATABASE_NAME = 'granato.db';

let started: { db: SqlDatabase; status: StorageStatus } | null = null;

/** Opens and prepares the on-device database once per app process. */
export function startApp(): { db: SqlDatabase; status: StorageStatus } {
  if (started === null) {
    const db = openExpoSqliteDatabase(DATABASE_NAME);
    started = { db, status: initializeStorage(db, { now: now(), newId }) };
  }
  return started;
}
