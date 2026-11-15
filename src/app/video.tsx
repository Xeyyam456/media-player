import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEvent, useEventListener } from 'expo';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Brightness from 'expo-brightness';
import * as DocumentPicker from 'expo-document-picker';
import { readAsStringAsync } from 'expo-file-system/legacy';
import * as ScreenOrientation from 'expo-screen-orientation';
import { Animated, AppState, PanResponder, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SeekBar } from '@/components/seek-bar';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useFavorites } from '@/data/favorites';
import { useLibrary } from '@/data/library';
import { cueAt, parseSubtitles, type Cue } from '@/data/subtitles';

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const FITS = [
  { key: 'contain', icon: 'contract-outline', label: 'Sığdır' },
  { key: 'cover', icon: 'expand-outline', label: 'Doldur' },
  { key: 'fill', icon: 'resize-outline', label: 'Uzat' },
] as const;
const HIDE_MS = 3500;
const DOUBLE_TAP_MS = 280;
const posKey = (id: string) => `video.pos.${id}`;

export default function VideoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { items } = useLibrary();
  const { isFav, toggleFav } = useFavorites();

  const videos = useMemo(() => items.filter((m) => m.type === 'video'), [items]);
  const [currentId, setCurrentId] = useState(id);
  const index = videos.findIndex((v) => v.id === currentId);
  const item = index >= 0 ? videos[index] : undefined;

  const player = useVideoPlayer(null, (p) => {
    p.timeUpdateEventInterval = 0.25;
    p.keepScreenOnWhilePlaying = true;
  });
  const videoRef = useRef<VideoView>(null);

  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
  const { currentTime } = useEvent(player, 'timeUpdate', {
    currentTime: 0,
    currentLiveTimestamp: null,
    currentOffsetFromLive: null,
    bufferedPosition: 0,
  });
  const [duration, setDuration] = useState(0);
  const [ended, setEnded] = useState(false);

  const [controlsOn, setControlsOn] = useState(true);
  const [locked, setLocked] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [fitIdx, setFitIdx] = useState(0);
  const [loop, setLoop] = useState(false);
  const [muted, setMuted] = useState(false);
  const [holdFast, setHoldFast] = useState(false);
  const [flash, setFlash] = useState<{ side: 'left' | 'right'; text: string } | null>(null);

  const fade = useRef(new Animated.Value(1)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTap = useRef({ t: 0, side: '' });
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resumeAt = useRef(0);
  const lastSaved = useRef(0);

  // Mənbəni yüklə (video dəyişəndə də)
  useEffect(() => {
    if (!item) return;
    setEnded(false);
    setDuration(0);
    resumeAt.current = 0;
    AsyncStorage.getItem(posKey(item.id))
      .then((v) => {
        resumeAt.current = v ? Number(v) : 0;
      })
      .catch(() => {})
      .finally(() => {
        player.replace({ uri: item.uri });
        player.play();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id]);

  useEventListener(player, 'sourceLoad', ({ duration: d }) => {
    setDuration(d);
    const r = resumeAt.current;
    if (r > 5 && r < d - 5) player.currentTime = r;
    resumeAt.current = 0;
  });
  useEventListener(player, 'playToEnd', () => {
    setEnded(true);
    if (item) AsyncStorage.removeItem(posKey(item.id)).catch(() => {});
  });

  // Tətbiq fona keçəndə video dayansın (PiP istisna), musiqi isə davam edir
  const inPip = useRef(false);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active' && !inPip.current) player.pause();
    });
    return () => sub.remove();
  }, [player]);

  // Oynamağa başlayanda "bitdi" vəziyyətini sıfırla
  useEffect(() => {
    if (isPlaying) setEnded(false);
  }, [isPlaying]);

  // Mövqeyi saxla (hər ~5 san)
  useEffect(() => {
    if (!item || !isPlaying) return;
    if (Math.abs(currentTime - lastSaved.current) >= 5 && currentTime > 5) {
      lastSaved.current = currentTime;
      AsyncStorage.setItem(posKey(item.id), String(Math.floor(currentTime))).catch(() => {});
    }
  }, [currentTime, isPlaying, item]);

  // Çıxanda saxla
  const posRef = useRef(0);
  posRef.current = currentTime;
  useEffect(
    () => () => {
      if (item && posRef.current > 5) AsyncStorage.setItem(posKey(item.id), String(Math.floor(posRef.current))).catch(() => {});
    },
    [item],
  );

  // Nəzarət panelinin görünməsi
  const showControls = useCallback(() => {
    setControlsOn(true);
    Animated.timing(fade, { toValue: 1, duration: 150, useNativeDriver: true }).start();
  }, [fade]);
  const hideControls = useCallback(() => {
    Animated.timing(fade, { toValue: 0, duration: 250, useNativeDriver: true }).start(({ finished }) => {
      if (finished) setControlsOn(false);
    });
  }, [fade]);
  const armHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(hideControls, HIDE_MS);
  }, [hideControls]);

  useEffect(() => {
    if (controlsOn && isPlaying) armHide();
    else if (hideTimer.current) clearTimeout(hideTimer.current);
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [controlsOn, isPlaying, armHide]);

  const touchUi = () => {
    showControls();
    if (isPlaying) armHide();
  };

  const seekBy = (s: number, side: 'left' | 'right') => {
    const target = Math.min(Math.max(player.currentTime + s, 0), duration || Infinity);
    player.currentTime = target;
    setEnded(false);
    setFlash({ side, text: `${s > 0 ? '+' : ''}${s}s` });
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), 600);
  };

  const onZoneTap = (side: 'left' | 'right') => {
    if (locked) {
      controlsOn ? hideControls() : showControls();
      return;
    }
    const now = Date.now();
    if (now - lastTap.current.t < DOUBLE_TAP_MS && lastTap.current.side === side) {
      lastTap.current = { t: 0, side: '' };
      seekBy(side === 'left' ? -10 : 10, side);
      return;
    }
    lastTap.current = { t: now, side };
    setTimeout(() => {
      if (lastTap.current.t === now) {
        lastTap.current = { t: 0, side: '' };
        controlsOn ? hideControls() : showControls();
      }
    }, DOUBLE_TAP_MS + 20);
  };

  const togglePlay = () => {
    if (ended) {
      player.currentTime = 0;
      setEnded(false);
      player.play();
    } else if (player.playing) player.pause();
    else player.play();
    touchUi();
  };

  const cycleSpeed = () => {
    const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length] ?? 1;
    setSpeed(next);
    player.playbackRate = next;
    touchUi();
  };
  const toggleLoop = () => {
    player.loop = !loop;
    setLoop(!loop);
    touchUi();
  };
  const toggleMute = () => {
    player.muted = !muted;
    setMuted(!muted);
    touchUi();
  };
  const goTo = (delta: number) => {
    const n = videos[index + delta];
    if (n) setCurrentId(n.id);
    touchUi();
  };

  // ---- Landscape ----
  const { height: screenH } = useWindowDimensions();
  const [landscape, setLandscape] = useState(false);
  const toggleLandscape = () => {
    const next = !landscape;
    setLandscape(next);
    ScreenOrientation.lockAsync(
      next ? ScreenOrientation.OrientationLock.LANDSCAPE : ScreenOrientation.OrientationLock.PORTRAIT_UP,
    ).catch(() => {});
    touchUi();
  };
  // Ekrandan çıxanda portrait-ə qayıt
  useEffect(
    () => () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    },
    [],
  );

  // ---- Parlaqlıq (sol) / səs (sağ) jesti ----
  const [gesture, setGesture] = useState<{ kind: 'bright' | 'vol'; value: number } | null>(null);
  const gestureTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gh = useRef({ screenH, locked });
  gh.current = { screenH, locked };

  const makePan = useCallback(
    (kind: 'bright' | 'vol') => {
      let start = 0;
      const show = (value: number) => {
        setGesture({ kind, value });
        if (gestureTimer.current) clearTimeout(gestureTimer.current);
        gestureTimer.current = setTimeout(() => setGesture(null), 700);
      };
      return PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
          !gh.current.locked && Math.abs(g.dy) > 14 && Math.abs(g.dy) > Math.abs(g.dx) * 1.5,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: async () => {
          start = kind === 'vol' ? player.volume : await Brightness.getBrightnessAsync().catch(() => 0.5);
        },
        onPanResponderMove: (_, g) => {
          const v = Math.min(1, Math.max(0, start - g.dy / (gh.current.screenH * 0.55)));
          if (kind === 'vol') {
            const q = Math.round(v * 10) / 10; // 10 səviyyə
            player.volume = q;
            show(q);
          } else {
            Brightness.setBrightnessAsync(v).catch(() => {});
            show(v);
          }
        },
      });
    },
    [player],
  );
  const panLeft = useMemo(() => makePan('bright'), [makePan]);
  const panRight = useMemo(() => makePan('vol'), [makePan]);

  // ---- Alt yazı (.srt / .vtt) ----
  const [cues, setCues] = useState<Cue[]>([]);
  const [subsOn, setSubsOn] = useState(true);
  const subKey = (vid: string) => `video.sub.${vid}`;

  useEffect(() => {
    setCues([]);
    if (!item) return;
    AsyncStorage.getItem(subKey(item.id))
      .then((raw) => {
        if (raw) setCues(parseSubtitles(raw));
      })
      .catch(() => {});
  }, [item?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const pickSubtitles = async () => {
    if (!item) return;
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (res.canceled || !res.assets[0]) return;
      const raw = await readAsStringAsync(res.assets[0].uri);
      const parsed = parseSubtitles(raw);
      if (parsed.length === 0) return;
      setCues(parsed);
      setSubsOn(true);
      AsyncStorage.setItem(subKey(item.id), raw).catch(() => {});
    } catch {
      // seçim ləğv edildi və ya fayl oxunmadı
    }
  };

  const onSubsPress = () => {
    if (cues.length === 0) pickSubtitles();
    else setSubsOn((s) => !s);
    touchUi();
  };
  const activeCue = subsOn && cues.length > 0 ? cueAt(cues, currentTime) : null;

  const fit = FITS[fitIdx] ?? FITS[0];
  const ui = controlsOn;

  return (
    <View style={styles.root}>
      <VideoView
        ref={videoRef}
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit={fit.key}
        nativeControls={false}
        fullscreenOptions={{ enable: true }}
        allowsPictureInPicture
        onPictureInPictureStart={() => {
          inPip.current = true;
        }}
        onPictureInPictureStop={() => {
          inPip.current = false;
        }}
      />

      {/* Jest zonaları */}
      <View style={StyleSheet.absoluteFill}>
        <View style={styles.zones}>
          <View style={styles.zone} {...panLeft.panHandlers}>
          <Pressable
            style={styles.zone}
            onPress={() => onZoneTap('left')}
            onLongPress={() => {
              if (locked) return;
              player.playbackRate = 2;
              setHoldFast(true);
            }}
            onPressOut={() => {
              if (holdFast) {
                player.playbackRate = speed;
                setHoldFast(false);
              }
            }}
            delayLongPress={350}
          />
          </View>
          <View style={styles.zone} {...panRight.panHandlers}>
          <Pressable
            style={styles.zone}
            onPress={() => onZoneTap('right')}
            onLongPress={() => {
              if (locked) return;
              player.playbackRate = 2;
              setHoldFast(true);
            }}
            onPressOut={() => {
              if (holdFast) {
                player.playbackRate = speed;
                setHoldFast(false);
              }
            }}
            delayLongPress={350}
          />
          </View>
        </View>
      </View>

      {/* Alt yazı */}
      {activeCue && (
        <View pointerEvents="none" style={[styles.subWrap, { bottom: ui && !locked ? 150 + insets.bottom : 40 + insets.bottom }]}>
          <Text style={styles.subText}>{activeCue.text}</Text>
        </View>
      )}

      {/* Parlaqlıq / səs göstəricisi */}
      {gesture && (
        <View pointerEvents="none" style={[styles.gesture, gesture.kind === 'bright' ? { left: 28 } : { right: 28 }]}>
          <Ionicons
            name={gesture.kind === 'bright' ? 'sunny' : gesture.value <= 0 ? 'volume-mute' : 'volume-high'}
            size={22}
            color="#fff"
          />
          <View style={styles.gTrack}>
            <View style={[styles.gFill, { height: `${gesture.value * 100}%` }]} />
          </View>
          <Text style={styles.gText}>
            {gesture.kind === 'vol' ? `${Math.round(gesture.value * 10)}/10` : Math.round(gesture.value * 100)}
          </Text>
        </View>
      )}

      {/* ±10s göstəricisi */}
      {flash && (
        <View pointerEvents="none" style={[styles.flash, flash.side === 'left' ? { left: '14%' } : { right: '14%' }]}>
          <Ionicons name={flash.side === 'left' ? 'play-back' : 'play-forward'} size={28} color="#fff" />
          <Text style={styles.flashText}>{flash.text}</Text>
        </View>
      )}
      {holdFast && (
        <View pointerEvents="none" style={styles.fast}>
          <Ionicons name="play-forward" size={16} color="#fff" />
          <Text style={styles.fastText}>2x</Text>
        </View>
      )}

      {/* Qıfıl rejimi */}
      {locked && ui && (
        <Animated.View style={[styles.lockOnly, { opacity: fade, top: insets.top + Spacing.md }]}>
          <Pressable
            style={styles.pill}
            onPress={() => {
              setLocked(false);
              touchUi();
            }}>
            <Ionicons name="lock-closed" size={18} color="#fff" />
            <Text style={styles.pillText}>Aç</Text>
          </Pressable>
        </Animated.View>
      )}

      {/* Əsas idarəetmə */}
      {ui && !locked && (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]} pointerEvents="box-none">
          <LinearGradient colors={['rgba(0,0,0,0.7)', 'transparent']} style={styles.topShade} pointerEvents="none" />
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={styles.bottomShade} pointerEvents="none" />

          {/* Üst */}
          <View style={[styles.top, { paddingTop: insets.top + Spacing.sm }]} pointerEvents="box-none">
            <Pressable hitSlop={12} onPress={() => router.back()}>
              <Ionicons name="chevron-down" size={30} color="#fff" />
            </Pressable>
            <Text numberOfLines={1} style={styles.title}>
              {item?.title ?? 'Video'}
            </Text>
            {item && (
              <Pressable hitSlop={12} onPress={() => toggleFav(item.id)}>
                <Ionicons
                  name={isFav(item.id) ? 'heart' : 'heart-outline'}
                  size={26}
                  color={isFav(item.id) ? Colors.accent : '#fff'}
                />
              </Pressable>
            )}
            <Pressable hitSlop={12} onPress={() => videoRef.current?.startPictureInPicture().catch(() => {})}>
              <MaterialCommunityIcons name="picture-in-picture-bottom-right" size={26} color="#fff" />
            </Pressable>
          </View>

          {/* Mərkəz */}
          <View style={styles.center} pointerEvents="box-none">
            <Pressable hitSlop={12} disabled={index <= 0} onPress={() => goTo(-1)} style={index <= 0 && styles.dim}>
              <Ionicons name="play-skip-back" size={32} color="#fff" />
            </Pressable>
            <Pressable hitSlop={12} onPress={() => seekBy(-10, 'left')}>
              <Ionicons name="play-back-circle-outline" size={44} color="#fff" />
            </Pressable>
            <Pressable onPress={togglePlay} style={styles.playBtn}>
              <Ionicons
                name={ended ? 'refresh' : isPlaying ? 'pause' : 'play'}
                size={38}
                color="#000"
                style={{ marginLeft: ended || isPlaying ? 0 : 4 }}
              />
            </Pressable>
            <Pressable hitSlop={12} onPress={() => seekBy(10, 'right')}>
              <Ionicons name="play-forward-circle-outline" size={44} color="#fff" />
            </Pressable>
            <Pressable
              hitSlop={12}
              disabled={index < 0 || index >= videos.length - 1}
              onPress={() => goTo(1)}
              style={(index < 0 || index >= videos.length - 1) && styles.dim}>
              <Ionicons name="play-skip-forward" size={32} color="#fff" />
            </Pressable>
          </View>

          {/* Alt */}
          <View style={[styles.bottom, { paddingBottom: insets.bottom + Spacing.md }]} pointerEvents="box-none">
            <SeekBar
              position={currentTime}
              duration={duration}
              onSeek={(s) => {
                player.currentTime = s;
                setEnded(false);
                touchUi();
              }}
            />
            <View style={styles.toolbar}>
              <Pressable style={styles.pill} onPress={cycleSpeed}>
                <Ionicons name="speedometer-outline" size={16} color="#fff" />
                <Text style={styles.pillText}>{speed}x</Text>
              </Pressable>
              <Pressable
                style={styles.pill}
                onPress={() => {
                  setFitIdx((i) => (i + 1) % FITS.length);
                  touchUi();
                }}>
                <Ionicons name={fit.icon} size={16} color="#fff" />
                <Text style={styles.pillText}>{fit.label}</Text>
              </Pressable>
              <Pressable style={[styles.iconBtn, loop && styles.iconOn]} onPress={toggleLoop}>
                <Ionicons name="repeat" size={20} color="#fff" />
              </Pressable>
              <Pressable style={[styles.iconBtn, muted && styles.iconOn]} onPress={toggleMute}>
                <Ionicons name={muted ? 'volume-mute' : 'volume-high'} size={20} color="#fff" />
              </Pressable>
              <Pressable
                style={styles.iconBtn}
                onPress={() => {
                  setLocked(true);
                  hideControls();
                }}>
                <Ionicons name="lock-open-outline" size={20} color="#fff" />
              </Pressable>
              <Pressable
                style={[styles.iconBtn, cues.length > 0 && subsOn && styles.iconOn]}
                onPress={onSubsPress}
                onLongPress={pickSubtitles}
                delayLongPress={400}>
                <MaterialCommunityIcons name="subtitles-outline" size={20} color="#fff" />
              </Pressable>
              <Pressable style={[styles.iconBtn, landscape && styles.iconOn]} onPress={toggleLandscape}>
                <Ionicons name={landscape ? 'phone-portrait-outline' : 'phone-landscape-outline'} size={20} color="#fff" />
              </Pressable>
            </View>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  zones: { flex: 1, flexDirection: 'row' },
  zone: { flex: 1 },
  subWrap: { position: 'absolute', left: 24, right: 24, alignItems: 'center' },
  subText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
  },
  gesture: {
    position: 'absolute',
    top: '30%',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: Radius.lg,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  gTrack: { width: 5, height: 120, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'flex-end', overflow: 'hidden' },
  gFill: { width: 5, backgroundColor: '#fff' },
  gText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  topShade: { position: 'absolute', top: 0, left: 0, right: 0, height: 140 },
  bottomShade: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 220 },
  top: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.md },
  title: { flex: 1, color: '#fff', fontSize: 16, fontWeight: '700' },
  center: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: Spacing.md,
  },
  playBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  dim: { opacity: 0.3 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: Spacing.md, gap: Spacing.xs },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.xs },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  pillText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  iconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.16)' },
  iconOn: { backgroundColor: Colors.accent },
  lockOnly: { position: 'absolute', alignSelf: 'center' },
  flash: { position: 'absolute', top: '42%', alignItems: 'center', gap: 2, padding: Spacing.md, borderRadius: Radius.lg, backgroundColor: 'rgba(0,0,0,0.45)' },
  flashText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  fast: {
    position: 'absolute',
    top: '12%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  fastText: { color: '#fff', fontWeight: '800' },
});
