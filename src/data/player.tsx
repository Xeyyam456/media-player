import { createAudioPlayer, setAudioModeAsync, useAudioPlayerStatus, type AudioPlayer } from 'expo-audio';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { getMeta } from '../../modules/media-meta';
import { coverUriFor } from './covers';
import { recordPlay } from './stats';
import type { MediaItem } from './types';

const dbg = (m: string) => { fetch('http://192.168.100.9:9999/?m=' + encodeURIComponent(m)).catch(() => {}); };

export type RepeatMode = 'off' | 'all' | 'one';

// Bildiriş / kilid ekranı: növbəti / əvvəlki mahnı düymələri (native düzəliş: patches/expo-audio+*.patch)
const LOCK_OPTIONS = { showNextTrack: true, showPreviousTrack: true };

type RemoteEmitter = { addListener: (event: string, cb: () => void) => { remove: () => void } };

/** İfaçı adı mahnı adı ilə eynidirsə (tag-lərdə tez-tez belə olur) və ya boşdursa, ehtiyat ad seçilir. */
function pickArtist(title: string, tagArtist: string | null | undefined, fallback: string) {
  const norm = (s: string) => s.trim().toLowerCase();
  const a = tagArtist?.trim();
  if (a && norm(a) !== norm(title)) return a;
  if (fallback && norm(fallback) !== norm(title)) return fallback;
  return 'Naməlum ifaçı';
}
/** null = söndürülüb, 'track' = cari mahnı bitəndə, number = bitmə vaxtı (ms) */
export type SleepTimer = null | 'track' | number;

type Ctx = {
  current: MediaItem | null;
  playing: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  volume: number;
  speed: number;
  queue: MediaItem[];
  index: number;
  sleep: SleepTimer;
  setVolume: (v: number) => void;
  setSpeed: (s: number) => void;
  setSleep: (s: SleepTimer) => void;
  pause: () => void;
  playItem: (item: MediaItem, queue: MediaItem[]) => void;
  playNext: (item: MediaItem) => void;
  addToQueue: (item: MediaItem) => void;
  removeFromQueue: (i: number) => void;
  moveInQueue: (from: number, to: number) => void;
  art: string | null;
  audioPlayer: AudioPlayer | null;
  jumpTo: (i: number) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seek: (seconds: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
};

type Progress = { position: number; duration: number };

const noop = () => {};
const PlayerContext = createContext<Ctx>({
  current: null,
  playing: false,
  shuffle: false,
  repeat: 'off',
  volume: 1,
  speed: 1,
  queue: [],
  index: -1,
  sleep: null,
  setVolume: noop,
  setSpeed: noop,
  setSleep: noop,
  pause: noop,
  playItem: noop,
  playNext: noop,
  addToQueue: noop,
  removeFromQueue: noop,
  moveInQueue: noop,
  art: null,
  audioPlayer: null,
  jumpTo: noop,
  toggle: noop,
  next: noop,
  prev: noop,
  seek: noop,
  toggleShuffle: noop,
  cycleRepeat: noop,
});
const ProgressContext = createContext<Progress>({ position: 0, duration: 0 });

export function PlayerProvider({ children }: { children: ReactNode }) {
  const playerRef = useRef<AudioPlayer | null>(null);
  if (!playerRef.current) playerRef.current = createAudioPlayer(null, { updateInterval: 250 });
  const player = playerRef.current;
  const status = useAudioPlayerStatus(player);

  const [queue, setQueue] = useState<MediaItem[]>([]);
  const [index, setIndex] = useState(-1);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>('off');
  const [volume, setVolumeState] = useState(1);
  const [speed, setSpeedState] = useState(1);
  const [sleep, setSleepState] = useState<SleepTimer>(null);
  const [art, setArt] = useState<string | null>(null);
  const loadToken = useRef(0);
  // Lock screen sessiyası yalnız bir dəfə qurulur. Hər setActiveForLockScreen çağırışı native tərəfdə
  // MediaSession-ı bağlayıb yenidən yaradır və bildiriş bağlanmış sessiyaya düşəndə düymələr itir.
  const lockActive = useRef(false);
  const setLockMeta = useCallback(
    (meta: Parameters<AudioPlayer['updateLockScreenMetadata']>[0]) => {
      if (lockActive.current) {
        player.updateLockScreenMetadata(meta);
      } else {
        player.setActiveForLockScreen(true, meta, LOCK_OPTIONS);
        lockActive.current = true;
      }
    },
    [player],
  );
  const current = index >= 0 ? (queue[index] ?? null) : null;

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'doNotMix' }).catch(() => {});
  }, []);

  const load = useCallback(
    (q: MediaItem[], i: number) => {
      const item = q[i];
      if (!item) return;
      setQueue(q);
      setIndex(i);
      dbg('LOAD i=' + i + ' ' + item.title);
      player.replace({ uri: item.uri });
      setLockMeta({ title: item.title, artist: item.artist });
      player.play();
      if (player.playbackRate !== 1) player.setPlaybackRate(player.playbackRate);
      recordPlay(item.id);

      // Albom şəkli və tag-lər (native modul): əvvəlki şəkli təmizlə, yenisini fonda yüklə
      const token = ++loadToken.current;
      setArt(null);
      Promise.all([getMeta(item.uri, true), coverUriFor(item.color)])
        .then(([m, fallback]) => {
          if (token !== loadToken.current) return;
          setArt(m.art);
          const title = m.title?.trim() || item.title;
          setLockMeta({
            title,
            artist: pickArtist(title, m.artist, item.artist),
            albumTitle: m.album ?? undefined,
            // Faylda şəkil yoxdursa rəngli örtük (ümumi qara ikon əvəzinə)
            artworkUrl: m.art ?? fallback,
          });
        })
        .catch(() => {});
    },
    [player, setLockMeta],
  );

  const playItem = useCallback(
    (item: MediaItem, list: MediaItem[]) => {
      const q = list.filter((m) => m.type === 'audio');
      const i = q.findIndex((m) => m.id === item.id);
      if (i >= 0) load(q, i);
    },
    [load],
  );

  const playNext = useCallback(
    (item: MediaItem) => {
      if (index < 0) return load([item], 0);
      setQueue((q) => {
        const copy = q.filter((m, i) => i <= index || m.id !== item.id);
        copy.splice(index + 1, 0, item);
        return copy;
      });
    },
    [index, load],
  );

  const addToQueue = useCallback(
    (item: MediaItem) => {
      if (index < 0) return load([item], 0);
      setQueue((q) => (q.some((m) => m.id === item.id) ? q : [...q, item]));
    },
    [index, load],
  );

  const removeFromQueue = useCallback(
    (i: number) => {
      if (i === index) return;
      setQueue((q) => q.filter((_, k) => k !== i));
      if (i < index) setIndex((x) => x - 1);
    },
    [index],
  );

  const moveInQueue = useCallback(
    (from: number, to: number) => {
      if (from === to || from < 0 || to < 0 || from >= queue.length || to >= queue.length) return;
      const copy = [...queue];
      const [moved] = copy.splice(from, 1);
      if (!moved) return;
      copy.splice(to, 0, moved);
      setQueue(copy);
      // Cari mahnının yeni mövqeyini izlə
      if (index === from) setIndex(to);
      else if (from < index && to >= index) setIndex(index - 1);
      else if (from > index && to <= index) setIndex(index + 1);
    },
    [queue, index],
  );

  const jumpTo = useCallback((i: number) => load(queue, i), [load, queue]);

  const next = useCallback(() => {
    dbg('NEXT called index=' + index);
    if (queue.length === 0) return;
    if (shuffle && queue.length > 1) {
      let r = index;
      while (r === index) r = Math.floor(Math.random() * queue.length);
      load(queue, r);
      return;
    }
    const n = index + 1;
    if (n < queue.length) load(queue, n);
    else if (repeat === 'all') load(queue, 0);
  }, [queue, index, shuffle, repeat, load]);

  const prev = useCallback(() => {
    if (queue.length === 0) return;
    if (player.currentTime > 3 || index <= 0) {
      player.seekTo(0);
      return;
    }
    load(queue, index - 1);
  }, [queue, index, player, load]);

  const toggle = useCallback(() => {
    if (player.playing) player.pause();
    else player.play();
  }, [player]);

  const seek = useCallback((s: number) => void player.seekTo(s), [player]);
  const pause = useCallback(() => player.pause(), [player]);

  const setVolume = useCallback(
    (v: number) => {
      const c = Math.min(1, Math.max(0, Math.round(v * 100) / 100));
      player.volume = c;
      setVolumeState(c);
    },
    [player],
  );

  const setSpeed = useCallback(
    (s: number) => {
      player.setPlaybackRate(s);
      setSpeedState(s);
    },
    [player],
  );

  const setSleep = useCallback((s: SleepTimer) => setSleepState(s), []);

  // Sleep timer (vaxt)
  useEffect(() => {
    if (typeof sleep !== 'number') return;
    const ms = Math.max(0, sleep - Date.now());
    const t = setTimeout(() => {
      player.pause();
      setSleepState(null);
    }, ms);
    return () => clearTimeout(t);
  }, [sleep, player]);

  // Bildirişdəki növbəti/əvvəlki düymələri (native düzəlişin göndərdiyi hadisələr)
  const remote = useRef({ next, prev });
  remote.current = { next, prev };
  // Təsadüfi ikiqat basılmadan qoruma. Lock screen sessiyası artıq hər mahnıda yenidən qurulmadığı üçün
  // native tərəf hadisəni təkrarlamır; uzun pəncərə ardıcıl basılmaları udurdu.
  const lastRemote = useRef(0);
  const once = (fn: () => void) => () => {
    const now = Date.now();
    dbg('REMOTE event dt=' + (now - lastRemote.current));
    if (now - lastRemote.current < 300) return;
    lastRemote.current = now;
    fn();
  };
  useEffect(() => {
    const emitter = player as unknown as RemoteEmitter;
    const a = emitter.addListener('remoteNextTrack', once(() => remote.current.next()));
    const b = emitter.addListener('remotePreviousTrack', once(() => remote.current.prev()));
    return () => {
      a.remove();
      b.remove();
    };
  }, [player]);

  // Mahnı bitəndə
  const handled = useRef(false);
  useEffect(() => {
    if (!status.didJustFinish) {
      handled.current = false;
      return;
    }
    if (handled.current) return;
    handled.current = true;
    dbg('FINISHED -> next, cur=' + index);
    if (sleep === 'track') {
      setSleepState(null);
      return;
    }
    if (repeat === 'one') {
      player.seekTo(0);
      player.play();
    } else {
      next();
    }
  }, [status.didJustFinish, repeat, sleep, next, player]);

  const toggleShuffle = useCallback(() => setShuffle((s) => !s), []);
  const cycleRepeat = useCallback(() => setRepeat((r) => (r === 'off' ? 'all' : r === 'all' ? 'one' : 'off')), []);

  const value = useMemo<Ctx>(
    () => ({
      current,
      playing: status.playing,
      shuffle,
      repeat,
      volume,
      speed,
      queue,
      index,
      sleep,
      setVolume,
      setSpeed,
      setSleep,
      pause,
      playItem,
      playNext,
      addToQueue,
      removeFromQueue,
      moveInQueue,
      art,
      audioPlayer: player,
      jumpTo,
      toggle,
      next,
      prev,
      seek,
      toggleShuffle,
      cycleRepeat,
    }),
    [
      current, status.playing, shuffle, repeat, volume, speed, queue, index, sleep, setVolume, setSpeed, setSleep,
      pause, playItem, playNext, addToQueue, removeFromQueue, moveInQueue, art, player, jumpTo, toggle, next, prev, seek, toggleShuffle, cycleRepeat,
    ],
  );

  const progress = useMemo<Progress>(
    () => ({ position: status.currentTime, duration: status.duration || 0 }),
    [status.currentTime, status.duration],
  );

  return (
    <PlayerContext.Provider value={value}>
      <ProgressContext.Provider value={progress}>{children}</ProgressContext.Provider>
    </PlayerContext.Provider>
  );
}

export const usePlayer = () => useContext(PlayerContext);
/** Yalnız mini player / pleyer ekranı üçün: hər 250 ms yenilənir */
export const usePlayerProgress = () => useContext(ProgressContext);
