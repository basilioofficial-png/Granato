import { create } from 'zustand';

import type { Category, EpochMs, LocalDate, TimeEntry } from '@/domain/types';
import { now } from '@/lib/clock';
import { newId } from '@/lib/id';
import { startApp } from '@/services/appStartup';
import {
  listAllCategories,
  type CategoryEdit,
  type CategoryResult,
  type NewCategory,
} from '@/services/categoriesService';
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
  /** First tracked moment ever (see buildDayTimeline). */
  readonly trackingSince: EpochMs | null;
  /** Day open in the History tab and its entries; `null` until the tab is opened. */
  readonly historyDay: LocalDate | null;
  readonly historyEntries: readonly TimeEntry[];
  /** Opens the database and restores the running entry. Safe to call more than once. */
  init(): void;
  /** Re-reads lists from the database (e.g. when the app returns to the foreground). */
  refresh(): void;
  start(categoryId: string): void;
  stop(): void;
  undo(): void;
  showHistoryDay(date: LocalDate): void;
  dismissToast(): void;
  /** Development only: erases all local data. */
  resetLocalData(): void;
  /** Category management; the result carries validation errors for the form. */
  createCategory(input: NewCategory): CategoryResult;
  updateCategory(id: string, edit: CategoryEdit): CategoryResult;
  archiveCategory(id: string): CategoryResult;
  restoreCategory(id: string): CategoryResult;
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

let toastCounter = 0;

// The store mirrors the database: it changes only after a successful write.
export const useTrackingStore = create<TrackingState>()((set, get) => {
  function reload(): Pick<
    TrackingState,
    'categories' | 'running' | 'todayEntries' | 'recentEntries' | 'trackingSince' | 'historyEntries'
  > {
    const { db, tracking } = startApp();
    const historyDay = get().historyDay;
    return {
      categories: listAllCategories(db),
      running: tracking.getRunning(),
      todayEntries: tracking.listToday(),
      recentEntries: tracking.listRecent(RECENT_ENTRIES_LIMIT),
      trackingSince: tracking.trackingSince(),
      historyEntries: historyDay ? tracking.listDay(historyDay) : [],
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

  function runCategoryAction(action: () => CategoryResult): CategoryResult {
    try {
      const result = action();
      if (result.ok) set(reload());
      return result;
    } catch (error) {
      set({ actionError: `Не удалось сохранить: ${describe(error)}` });
      return { ok: false, error: 'not_found' };
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
    trackingSince: null,
    historyDay: null,
    historyEntries: [],

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

    showHistoryDay(date) {
      try {
        set({ historyDay: date, historyEntries: startApp().tracking.listDay(date) });
      } catch (error) {
        set({ actionError: `Не удалось загрузить день: ${describe(error)}` });
      }
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

    createCategory(input) {
      return runCategoryAction(() => startApp().categories.create(input));
    },

    updateCategory(id, edit) {
      return runCategoryAction(() => startApp().categories.update(id, edit));
    },

    archiveCategory(id) {
      return runCategoryAction(() => startApp().categories.archive(id));
    },

    restoreCategory(id) {
      return runCategoryAction(() => startApp().categories.restore(id));
    },
  };
});
