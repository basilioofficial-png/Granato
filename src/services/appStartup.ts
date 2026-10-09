import { openExpoSqliteDatabase } from '@/db/expoSqliteDatabase';
import type { SqlDatabase } from '@/db/types';
import { now } from '@/lib/clock';
import { newId } from '@/lib/id';
import { deviceTimeZone } from '@/lib/timezone';
import { initializeStorage, type StorageStatus } from '@/services/storage';
import { createTrackingService, type TrackingService } from '@/services/trackingService';

const DATABASE_NAME = 'granato.db';

export interface AppServices {
  readonly db: SqlDatabase;
  readonly status: StorageStatus;
  readonly tracking: TrackingService;
}

let started: AppServices | null = null;

/** Opens and prepares the on-device database once per app process. */
export function startApp(): AppServices {
  if (started === null) {
    const db = openExpoSqliteDatabase(DATABASE_NAME);
    const status = initializeStorage(db, { now: now(), newId });
    started = {
      db,
      status,
      tracking: createTrackingService({ db, now, newId, timeZone: deviceTimeZone }),
    };
  }
  return started;
}
