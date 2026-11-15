import { createStore } from './store';

type Stats = { recent: string[]; counts: Record<string, number> };

const store = createStore<Stats>('stats.v1', { recent: [], counts: {} });

export const useStats = store.use;

export function recordPlay(id: string) {
  store.set((s) => ({
    recent: [id, ...s.recent.filter((x) => x !== id)].slice(0, 40),
    counts: { ...s.counts, [id]: (s.counts[id] ?? 0) + 1 },
  }));
}
