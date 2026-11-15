import { getMeta, hasMediaMeta } from '../../modules/media-meta';

import { createStore } from './store';
import type { MediaItem } from './types';

export type TagInfo = { t?: string; a?: string };

type State = { map: Record<string, TagInfo>; done: boolean };

const store = createStore<State>('meta.v1', { map: {}, done: false });

export const useTags = store.use;

let running = false;

/** Audio fayl tag-lərini (ad, ifaçı) fonda oxuyur. Nəticə yaddaşda saxlanır, hər fayl yalnız bir dəfə oxunur. */
export async function enrichTags(items: MediaItem[]) {
  if (!hasMediaMeta || running) return;
  running = true;
  try {
    const known = store.get().map;
    const todo = items.filter((i) => i.type === 'audio' && !(i.id in known));
    if (todo.length === 0) {
      if (!store.get().done) store.set((s) => ({ ...s, done: true }));
      return;
    }
    store.set((s) => ({ ...s, done: false }));

    let buffer: Record<string, TagInfo> = {};
    let n = 0;
    const flush = () => {
      if (n === 0) return;
      const add = buffer;
      buffer = {};
      n = 0;
      store.set((s) => ({ ...s, map: { ...s.map, ...add } }));
    };

    let cursor = 0;
    const worker = async () => {
      while (cursor < todo.length) {
        const it = todo[cursor++];
        if (!it) break;
        try {
          const m = await getMeta(it.uri, false);
          buffer[it.id] = { t: m.title?.trim() || undefined, a: m.artist?.trim() || undefined };
        } catch {
          buffer[it.id] = {};
        }
        n++;
        if (n >= 80) flush();
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    flush();
    store.set((s) => ({ ...s, done: true }));
  } finally {
    running = false;
  }
}
