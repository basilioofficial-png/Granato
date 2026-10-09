import { create } from 'zustand';

import type { Category, TimeEntry } from '@/domain/types';
import { startApp } from '@/services/appStartup';
import { listActiveCategories } from '@/services/categoriesService';
import type { TrackingError, TrackingResult } from '@/services/trackingService';

const ERROR_MESSAGES: Record<TrackingError, string> = {
  clock_behind:
    'Часы телефона показывают время раньше начала текущей записи. Проверьте дату и время в настройках iPhone.',
  unknown_category: 'Эта категория недоступна.',
};

interface TrackingState {
  readonly status: 'idle' | 'ready' | 'failed';
  readonly fatalError: string | null;
  readonly actionError: string | null;
  readonly categories: readonly Category[];
  readonly running: TimeEntry | null;
  readonly todayEntries: readonly TimeEntry[];
  /** Opens the database and restores the running entry. Safe to call more than once. */
  init(): void;
  start(categoryId: string): void;
  stop(): void;
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// The store mirrors the database: it changes only after a successful write.
export const useTrackingStore = create<TrackingState>()((set, get) => {
  function afterAction(result: TrackingResult): void {
    const { tracking } = startApp();
    if (!result.ok) {
      set({ actionError: ERROR_MESSAGES[result.error] });
      return;
    }
    set({ actionError: null, running: result.running, todayEntries: tracking.listToday() });
  }

  function runAction(action: () => TrackingResult): void {
    try {
      afterAction(action());
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

    init() {
      if (get().status === 'ready') return;
      try {
        const { db, tracking } = startApp();
        set({
          status: 'ready',
          fatalError: null,
          categories: listActiveCategories(db),
          running: tracking.getRunning(),
          todayEntries: tracking.listToday(),
        });
      } catch (error) {
        set({ status: 'failed', fatalError: describe(error) });
      }
    },

    start(categoryId) {
      runAction(() => startApp().tracking.start(categoryId));
    },

    stop() {
      runAction(() => startApp().tracking.stop());
    },
  };
});
