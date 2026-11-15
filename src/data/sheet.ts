import { createStore } from './store';
import type { MediaItem } from './types';

type SheetState = { item: MediaItem | null; playlistId: string | null };

// Davamsız store — əməliyyat menyusunun açıq vəziyyəti (yaddaşa yazılmır)
const store = createStore<SheetState>('sheet', { item: null, playlistId: null }, false);

export const useSheet = () => store.use();
export const openSheet = (item: MediaItem, playlistId: string | null = null) => store.set(() => ({ item, playlistId }));
export const closeSheet = () => store.set(() => ({ item: null, playlistId: null }));
