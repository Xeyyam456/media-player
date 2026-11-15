import { createStore } from './store';

export type Playlist = { id: string; name: string; ids: string[] };
type State = { lists: Playlist[] };

const store = createStore<State>('playlists.v1', { lists: [] });

export const usePlaylists = () => store.use().lists;

export function createPlaylist(name: string, firstId?: string) {
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  store.set((s) => ({ lists: [...s.lists, { id, name: name.trim() || 'Yeni siyahı', ids: firstId ? [firstId] : [] }] }));
  return id;
}

export function renamePlaylist(id: string, name: string) {
  store.set((s) => ({ lists: s.lists.map((l) => (l.id === id ? { ...l, name: name.trim() || l.name } : l)) }));
}

export function deletePlaylist(id: string) {
  store.set((s) => ({ lists: s.lists.filter((l) => l.id !== id) }));
}

export function addToPlaylist(id: string, itemId: string) {
  store.set((s) => ({
    lists: s.lists.map((l) => (l.id === id && !l.ids.includes(itemId) ? { ...l, ids: [...l.ids, itemId] } : l)),
  }));
}

export function removeFromPlaylist(id: string, itemId: string) {
  store.set((s) => ({ lists: s.lists.map((l) => (l.id === id ? { ...l, ids: l.ids.filter((x) => x !== itemId) } : l)) }));
}
