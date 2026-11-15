import { createStore } from './store';

export type SortKey = 'name' | 'new' | 'dur' | 'plays';
export type SortDir = 'asc' | 'desc';
export type SortState = { key: SortKey; dir: SortDir };

export const SORT_OPTIONS: { key: SortKey; title: string; icon: string; asc: string; desc: string }[] = [
  { key: 'name', title: 'Ad', icon: 'text-outline', asc: 'A → Z (artan)', desc: 'Z → A (azalan)' },
  { key: 'new', title: 'Əlavə tarixi', icon: 'time-outline', asc: 'Əvvəl köhnələr', desc: 'Əvvəl yenilər' },
  { key: 'dur', title: 'Müddət', icon: 'hourglass-outline', asc: 'Qısadan uzuna', desc: 'Uzundan qısaya' },
  { key: 'plays', title: 'Dinlənmə sayı', icon: 'flame-outline', asc: 'Azdan çoxa', desc: 'Çoxdan aza' },
];

const store = createStore<SortState>('sort.v1', { key: 'name', dir: 'asc' });

export const useSort = store.use;
export const setSort = (key: SortKey, dir: SortDir) => store.set(() => ({ key, dir }));
