import { getCategoryById } from '@/db/repositories/categoriesRepo';
import {
  closeTimeEntry,
  getRunningTimeEntry,
  insertTimeEntry,
  listTimeEntriesOverlapping,
} from '@/db/repositories/timeEntriesRepo';
import type { SqlDatabase } from '@/db/types';
import { getLocalDate, localDayInterval } from '@/domain/time';
import { planStart, planStop, type TrackingPlan } from '@/domain/tracking';
import type { EpochMs, TimeEntry, TimeZoneId } from '@/domain/types';

export interface TrackingDeps {
  readonly db: SqlDatabase;
  readonly now: () => EpochMs;
  readonly newId: () => string;
  readonly timeZone: () => TimeZoneId;
}

export type TrackingError = 'clock_behind' | 'unknown_category';

export type TrackingResult =
  | { readonly ok: true; readonly running: TimeEntry | null; readonly changed: boolean }
  | { readonly ok: false; readonly error: TrackingError };

export interface TrackingService {
  /** Running entry from the database — this is how the timer survives app restarts. */
  getRunning(): TimeEntry | null;
  /** Starts `categoryId`; if something else is running, switches to it. */
  start(categoryId: string): TrackingResult;
  stop(): TrackingResult;
  /** Entries overlapping the current local day, oldest first. */
  listToday(): TimeEntry[];
}

export function createTrackingService(deps: TrackingDeps): TrackingService {
  const { db } = deps;

  /** Writes a plan atomically: both the close and the open happen, or neither. */
  function apply(plan: TrackingPlan, running: TimeEntry | null, at: EpochMs): TrackingResult {
    if (plan.kind === 'noop') return { ok: true, running, changed: false };
    if (plan.kind === 'error') return { ok: false, error: plan.reason };

    if (plan.close && !closeTimeEntry(db, plan.close.entryId, plan.close.endedAt, at)) {
      // Throwing rolls back the transaction: never open a new entry over a stale one.
      throw new Error(`Running entry ${plan.close.entryId} could not be closed`);
    }
    let opened: TimeEntry | null = null;
    if (plan.open) {
      opened = {
        id: deps.newId(),
        userId: null,
        categoryId: plan.open.categoryId,
        startedAt: plan.open.startedAt,
        endedAt: null,
        timezone: plan.open.timezone,
        source: plan.open.source,
        isEdited: false,
        note: null,
        createdAt: at,
        updatedAt: at,
        deletedAt: null,
      };
      insertTimeEntry(db, opened);
    }
    return { ok: true, running: opened, changed: true };
  }

  return {
    getRunning: () => getRunningTimeEntry(db),

    start(categoryId) {
      return db.transaction(() => {
        const category = getCategoryById(db, categoryId);
        if (!category || category.deletedAt !== null || category.archivedAt !== null) {
          return { ok: false, error: 'unknown_category' } as const;
        }
        // One timestamp for the whole action: the old entry ends exactly when the new one starts.
        const at = deps.now();
        const running = getRunningTimeEntry(db);
        return apply(planStart(running, categoryId, at, deps.timeZone()), running, at);
      });
    },

    stop() {
      return db.transaction(() => {
        const at = deps.now();
        const running = getRunningTimeEntry(db);
        return apply(planStop(running, at), running, at);
      });
    },

    listToday() {
      const timeZone = deps.timeZone();
      const today = localDayInterval(getLocalDate(deps.now(), timeZone), timeZone);
      return listTimeEntriesOverlapping(db, today);
    },
  };
}
