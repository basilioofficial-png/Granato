import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import type { EpochMs } from '@/domain/types';
import { now } from '@/lib/clock';

/**
 * Current time for display, ticking every `intervalMs` while `key` is not null
 * (pass the running entry id), and refreshed when the app returns to the foreground.
 *
 * When `key` changes the value is refreshed during the same render: otherwise a
 * just-started entry would briefly look like it starts in the future.
 * Only drives rendering — durations are always computed from saved timestamps.
 */
export function useNow(key: string | null, intervalMs = 1000): EpochMs {
  const [state, setState] = useState(() => ({ key, at: now() }));
  if (state.key !== key) {
    setState({ key, at: now() });
  }

  useEffect(() => {
    if (key === null) return;
    const tick = () => setState({ key, at: now() });
    const timer = setInterval(tick, intervalMs);
    const subscription = AppState.addEventListener('change', (appState) => {
      if (appState === 'active') tick();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [key, intervalMs]);

  return state.at;
}
