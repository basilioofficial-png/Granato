import { create } from 'zustand';

import type { Category, TimeEntry } from '@/domain/types';
import { now } from '@/lib/clock';
import { newId } from '@/lib/id';
import { startApp } from '@/services/appStartup';
import { listActiveCategories } from '@/services/categoriesService';
import { resetLocalData } from '@/services/devReset';
import type { TrackingAction, TrackingError, TrackingResult } from '@/services/trackingService';

const ERROR_MESSAGES: Record<TrackingError, string> = {
  clock_behind:
    'Часы телефона показывают время раньше начала текущей записи. Проверьте дату и время в настройках iPhone.',
  unknown_category: 'Эта категория недоступна.',
  undo_unavailable: 'Отменить уже нельзя: после этого были другие изменения.',
};

const RECENT_ENTRIES_LIMIT = 50;

/** A change the user can undo from the toast; `id` restarts the auto-hide timer. */
export interface UndoToast {
  readonly id: number;
  readonly action: TrackingAction;
}

interface TrackingState {
  readonly status: 'idle' | 'ready' | 'failed';
  readonly fatalError: string | null;
  readonly actionError: string | null;
  readonly categories: readonly Category[];
  readonly running: TimeEntry | null;
  readonly todayEntries: readonly TimeEntry[];
  readonly recentEntries: readonly TimeEntry[];
  readonly toast: UndoToast | null;
  /** Opens the database and restores the running entry. Safe to call more than once. */
  init(): void;
  /** Re-reads lists from the database (e.g. when the app returns to the foreground). */
  refresh(): void;
  start(categoryId: string): void;
  stop(): void;
  undo(): void;
  dismissToast(): void;
  /** Development only: erases all local data. */
  resetLocalData(): void;
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

let toastCounter = 0;

// The store mirrors the database: it changes only after a successful write.
export const useTrackingStore = create<TrackingState>()((set, get) => {
  function reload(): Pick<TrackingState, 'categories' | 'running' | 'todayEntries' | 'recentEntries'> {
    const { db, tracking } = startApp();
    return {
      categories: listActiveCategories(db),
      running: tracking.getRunning(),
      todayEntries: tracking.listToday(),
      recentEntries: tracking.listRecent(RECENT_ENTRIES_LIMIT),
    };
  }

  function runAction(action: () => TrackingResult, showToast: boolean): void {
    try {
      const result = action();
      if (!result.ok) {
        set({ actionError: ERROR_MESSAGES[result.error] });
        return;
      }
      const change = result.action;
      // No change (double tap): keep the current toast. A change replaces it, and a new
      // toast appears only when something was recorded, i.e. an entry was closed.
      let toast = get().toast;
      if (change) toast = showToast && change.closed ? { id: ++toastCounter, action: change } : null;
      set({ actionError: null, toast, ...reload() });
    } catch (error) {
      set({ actionError: `Не удалось сохранить: ${describe(error)}` });
    }
  }

  return {
    status: 'idle',
    fatalError: null,
    actionError: null,
    categories: [],
    running: null,
    todayEntries: [],
    recentEntries: [],
    toast: null,

    init() {
      if (get().status === 'ready') return;
      try {
        set({ status: 'ready', fatalError: null, ...reload() });
      } catch (error) {
        set({ status: 'failed', fatalError: describe(error) });
      }
    },

    refresh() {
      if (get().status !== 'ready') return;
      try {
        set(reload());
      } catch (error) {
        set({ actionError: `Не удалось обновить данные: ${describe(error)}` });
      }
    },

    start(categoryId) {
      runAction(() => startApp().tracking.start(categoryId), true);
    },

    stop() {
      runAction(() => startApp().tracking.stop(), true);
    },

    undo() {
      const toast = get().toast;
      if (!toast) return;
      set({ toast: null });
      runAction(() => startApp().tracking.undo(toast.action), false);
    },

    dismissToast() {
      set({ toast: null });
    },

    resetLocalData() {
      try {
        resetLocalData(startApp().db, { now: now(), newId });
        set({ actionError: null, toast: null, ...reload() });
      } catch (error) {
        set({ actionError: `Не удалось сбросить данные: ${describe(error)}` });
      }
    },
  };
});
