import { listCategories } from '@/db/repositories/categoriesRepo';
import {
  closeTimeEntry,
  getEarliestStart,
  getRunningTimeEntry,
  getTimeEntryById,
  insertTimeEntry,
  listRecentTimeEntries,
  listTimeEntriesOverlapping,
  reopenTimeEntry,
  softDeleteTimeEntry,
} from '@/db/repositories/timeEntriesRepo';
import type { SqlDatabase } from '@/db/types';
import { isActiveCategory } from '@/domain/categories';
import { getLocalDate, localDayInterval } from '@/domain/time';
import { planStart, planStop, type TrackingPlan } from '@/domain/tracking';
import type { EpochMs, LocalDate, TimeEntry, TimeZoneId } from '@/domain/types';

export interface TrackingDeps {
  readonly db: SqlDatabase;
  readonly now: () => EpochMs;
  readonly newId: () => string;
  readonly timeZone: () => TimeZoneId;
}

export type TrackingError = 'clock_behind' | 'unknown_category' | 'undo_unavailable';

/** What a start/switch/stop changed — enough to undo it. */
export interface TrackingAction {
  readonly at: EpochMs;
  /** Entry that was running and got closed, as it is after closing. */
  readonly closed: TimeEntry | null;
  readonly openedId: string | null;
}

export type TrackingResult =
  | {
      readonly ok: true;
      readonly running: TimeEntry | null;
      /** `null` when nothing changed (e.g. a double tap). */
      readonly action: TrackingAction | null;
    }
  | { readonly ok: false; readonly error: TrackingError };

export interface TrackingService {
  /** Running entry from the database — this is how the timer survives app restarts. */
  getRunning(): TimeEntry | null;
  /** Starts `categoryId`; if something else is running, switches to it. */
  start(categoryId: string): TrackingResult;
  stop(): TrackingResult;
  /**
   * Reverts `action` if nothing happened since: the opened entry is removed and the
   * closed one runs again, as if the tap never happened.
   */
  undo(action: TrackingAction): TrackingResult;
  /** Entries overlapping the current local day, oldest first. */
  listToday(): TimeEntry[];
  /** Entries overlapping the given local day (device time zone), oldest first. */
  listDay(date: LocalDate): TimeEntry[];
  /** First tracked moment ever; unknown time is counted only after it. */
  trackingSince(): EpochMs | null;
  /** Latest entries for "recent" lists, newest first. */
  listRecent(limit: number): TimeEntry[];
}

export function createTrackingService(deps: TrackingDeps): TrackingService {
  const { db } = deps;

  /** Writes a plan atomically: both the close and the open happen, or neither. */
  function apply(plan: TrackingPlan, running: TimeEntry | null, at: EpochMs): TrackingResult {
    if (plan.kind === 'noop') return { ok: true, running, action: null };
    if (plan.kind === 'error') return { ok: false, error: plan.reason };

    let closed: TimeEntry | null = null;
    if (plan.close) {
      if (!closeTimeEntry(db, plan.close.entryId, plan.close.endedAt, at)) {
        // Throwing rolls back the transaction: never open a new entry over a stale one.
        throw new Error(`Running entry ${plan.close.entryId} could not be closed`);
      }
      closed = getTimeEntryById(db, plan.close.entryId);
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
    return { ok: true, running: opened, action: { at, closed, openedId: opened?.id ?? null } };
  }

  function listDay(date: LocalDate): TimeEntry[] {
    return listTimeEntriesOverlapping(db, localDayInterval(date, deps.timeZone()));
  }

  return {
    getRunning: () => getRunningTimeEntry(db),

    start(categoryId) {
      return db.transaction(() => {
        // Archiving a category hides its whole branch, so ancestors are checked too.
        if (!isActiveCategory(listCategories(db, { includeArchived: true }), categoryId)) {
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

    undo(action) {
      return db.transaction(() => {
        const running = getRunningTimeEntry(db);
        // Only undo the very last change: the opened entry must still be the running one.
        if ((running?.id ?? null) !== action.openedId) {
          return { ok: false, error: 'undo_unavailable' } as const;
        }
        const closed = action.closed ? getTimeEntryById(db, action.closed.id) : null;
        if (action.closed && (closed?.endedAt !== action.at || closed.deletedAt !== null)) {
          return { ok: false, error: 'undo_unavailable' } as const;
        }
        const at = deps.now();
        if (action.openedId !== null && !softDeleteTimeEntry(db, action.openedId, at)) {
          throw new Error(`Entry ${action.openedId} could not be removed`);
        }
        if (closed && !reopenTimeEntry(db, closed.id, at)) {
          throw new Error(`Entry ${closed.id} could not be reopened`);
        }
        return { ok: true, running: getRunningTimeEntry(db), action: null };
      });
    },

    listRecent(limit) {
      return listRecentTimeEntries(db, limit);
    },

    listToday() {
      return listDay(getLocalDate(deps.now(), deps.timeZone()));
    },

    listDay,

    trackingSince() {
      return getEarliestStart(db);
    },
  };
}
