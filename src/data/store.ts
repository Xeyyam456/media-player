import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

/** Kiçik davamlı store: AsyncStorage + useSyncExternalStore (əlavə kitabxana yoxdur). */
export function createStore<T>(key: string, initial: T, persistent = true) {
  let state = initial;
  const listeners = new Set<() => void>();
  let saveTimer: ReturnType<typeof setTimeout> | null = null;

  if (persistent) {
    AsyncStorage.getItem(key)
      .then((raw) => {
        if (raw) {
          state = { ...(initial as object), ...(JSON.parse(raw) as object) } as T;
          listeners.forEach((l) => l());
        }
      })
      .catch(() => {});
  }

  const persist = () => {
    if (!persistent) return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => AsyncStorage.setItem(key, JSON.stringify(state)).catch(() => {}), 400);
  };

  return {
    get: () => state,
    set: (updater: (s: T) => T) => {
      state = updater(state);
      persist();
      listeners.forEach((l) => l());
    },
    use: () =>
      useSyncExternalStore(
        (cb) => {
          listeners.add(cb);
          return () => listeners.delete(cb);
        },
        () => state,
      ),
  };
}
