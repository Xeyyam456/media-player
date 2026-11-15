import AsyncStorage from '@react-native-async-storage/async-storage';
import * as MediaLibrary from 'expo-media-library/legacy';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { Colors } from '@/constants/theme';

import { enrichTags, useTags } from './meta';
import type { MediaItem } from './types';

type Status = 'loading' | 'denied' | 'ready';
type Ctx = { items: MediaItem[]; status: Status; reload: () => Promise<void> };

const PALETTE = ['#8B5CF6', '#6366F1', '#A855F7', '#EC4899', '#7C3AED', '#0EA5E9', '#14B8A6', '#F97316'];

function fmt(sec: number) {
  const s = Math.round(sec);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m % 60).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

function toItem(a: MediaLibrary.Asset): MediaItem {
  let path = a.uri;
  try {
    path = decodeURIComponent(a.uri);
  } catch {}
  const parts = path.split('/');
  const folder = parts.length > 1 ? parts[parts.length - 2] : '';
  let hash = 0;
  for (let i = 0; i < a.id.length; i++) hash = (hash * 31 + a.id.charCodeAt(i)) | 0;
  return {
    id: a.id,
    title: a.filename.replace(/\.[^.]+$/, ''),
    artist: folder || 'Naməlum',
    duration: fmt(a.duration),
    type: a.mediaType === 'video' ? 'video' : 'audio',
    color: PALETTE[Math.abs(hash) % PALETTE.length] ?? Colors.accent,
    uri: a.uri,
    durationSec: a.duration,
    added: a.creationTime ?? 0,
  };
}

const CACHE_KEY = 'library.cache.v2';
const collator = new Intl.Collator('az');

async function fetchAll(mediaType: 'audio' | 'video', pageSize = 1000) {
  const out: MediaLibrary.Asset[] = [];
  let after: string | undefined;
  for (;;) {
    const page = await MediaLibrary.getAssetsAsync({ mediaType, first: pageSize, after });
    out.push(...page.assets);
    if (!page.hasNextPage) break;
    after = page.endCursor;
  }
  return out;
}

// Yalnız .mp3 audiolar və .mp4 videolar göstərilir (opus, m4a, ogg, mkv, 3gp və s. gizlənir).
// Müddəti 0 olan fayl boşdur (0 bayt), məs. WhatsApp Business silinmiş səsləri yer tutucu kimi saxlayır.
const playable = (a: MediaLibrary.Asset) => {
  const ext = a.mediaType === 'audio' ? /\.mp3$/i : /\.mp4$/i;
  return ext.test(a.filename) && a.duration > 0;
};

const build = (assets: MediaLibrary.Asset[]) =>
  assets
    .filter(playable)
    .map(toItem)
    .sort((a, b) => collator.compare(a.title, b.title));

const LibraryContext = createContext<Ctx>({ items: [], status: 'loading', reload: async () => {} });

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [base, setItems] = useState<MediaItem[]>([]);
  const tags = useTags();
  const applied = useRef(new Map<string, { src: MediaItem; t?: string; a?: string; out: MediaItem }>());
  const [status, setStatus] = useState<Status>('loading');
  const hasData = useRef(false);

  const reload = useCallback(async () => {
    if (!hasData.current) setStatus('loading');
    try {
      let perm = await MediaLibrary.getPermissionsAsync(false, ['audio', 'video']);
      if (!perm.granted) perm = await MediaLibrary.requestPermissionsAsync(false, ['audio', 'video']);
      if (!perm.granted) {
        setStatus('denied');
        return;
      }

      // Keş yoxdursa: əvvəl kiçik ilk səhifə — siyahı dərhal görünsün
      if (!hasData.current) {
        const [a, v] = await Promise.all([
          MediaLibrary.getAssetsAsync({ mediaType: 'audio', first: 200 }),
          MediaLibrary.getAssetsAsync({ mediaType: 'video', first: 100 }),
        ]);
        setItems(build([...a.assets, ...v.assets]));
        hasData.current = true;
        setStatus('ready');
      }

      // Tam siyahı fonda yüklənir
      const [audio, video] = await Promise.all([fetchAll('audio'), fetchAll('video')]);
      const all = build([...audio, ...video]);
      hasData.current = true;
      setItems(all);
      setStatus('ready');
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify(all)).catch(() => {});
      enrichTags(all);
    } catch {
      if (!hasData.current) setStatus('denied');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    // 1) Keşdən dərhal göstər  2) fonda yenilə
    AsyncStorage.getItem(CACHE_KEY)
      .then((raw) => {
        if (cancelled || !raw) return;
        const cached = JSON.parse(raw) as MediaItem[];
        if (cached.length > 0 && !hasData.current) {
          hasData.current = true;
          setItems(cached);
          setStatus('ready');
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) reload();
      });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  // Tag-lərdən gələn ad/ifaçı üstünə yazılır; dəyişməyən elementlərin referansı saxlanır (siyahı lazımsız render olmasın)
  const items = useMemo(() => {
    const out = base.map((it) => {
      const m = tags.map[it.id];
      if (!m || (!m.t && !m.a)) return it;
      const c = applied.current.get(it.id);
      if (c && c.src === it && c.t === m.t && c.a === m.a) return c.out;
      const o = { ...it, title: m.t ?? it.title, artist: m.a ?? it.artist };
      applied.current.set(it.id, { src: it, t: m.t, a: m.a, out: o });
      return o;
    });
    return tags.done ? [...out].sort((x, y) => collator.compare(x.title, y.title)) : out;
  }, [base, tags]);

  const value = useMemo(() => ({ items, status, reload }), [items, status, reload]);
  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export const useLibrary = () => useContext(LibraryContext);
