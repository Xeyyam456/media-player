import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';

import { fmtTime } from '@/components/seek-bar';
import { Colors, MINI_PLAYER_HEIGHT, Radius, Spacing } from '@/constants/theme';
import { usePlayer, usePlayerProgress } from '@/data/player';

const SWIPE_X = 70;
const SWIPE_UP = 45;
const SEEK_ZONE = 24; // alt hissədə tutulan sürüşdürmə zonasının hündürlüyü

type MiniSeekProps = {
  ratio: number;
  duration: number;
  onScrub: (seconds: number | null) => void;
  onSeek: (seconds: number) => void;
};

/** Mini player-in alt xətti: üstündən tutub sürüşdürəndə mahnı irəli-geri çəkilir. */
function MiniSeek({ ratio, duration, onScrub, onSeek }: MiniSeekProps) {
  const [width, setWidth] = useState(1);
  const [dragR, setDragR] = useState<number | null>(null);
  const w = useRef(1);
  const dur = useRef(0);
  const cbs = useRef({ onScrub, onSeek });
  w.current = width;
  dur.current = duration;
  cbs.current = { onScrub, onSeek };

  const pan = useMemo(() => {
    const clamp = (r: number) => Math.min(1, Math.max(0, r));
    // Başlanğıc nöqtəsi locationX, sonrakı hərəkət dx ilə (locationX sıçraya bilər)
    let startR = 0;
    let last = 0;
    const update = (r: number) => {
      last = clamp(r);
      setDragR(last);
      cbs.current.onScrub(last * dur.current);
    };
    const finish = (commit: boolean) => {
      if (commit) cbs.current.onSeek(last * dur.current);
      setDragR(null);
      cbs.current.onScrub(null);
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        startR = clamp(e.nativeEvent.locationX / w.current);
        update(startR);
      },
      onPanResponderMove: (_, g) => update(startR + g.dx / w.current),
      onPanResponderRelease: () => finish(true),
      onPanResponderTerminate: () => finish(false),
    });
  }, []);

  const r = dragR ?? ratio;
  const active = dragR != null;

  return (
    <View style={styles.seekZone} onLayout={(e) => setWidth(e.nativeEvent.layout.width)} {...pan.panHandlers}>
      <View pointerEvents="none" style={[styles.seekTrack, active && styles.seekTrackActive]}>
        <View style={[styles.seekFill, { width: `${r * 100}%` }]} />
      </View>
      {active && <View pointerEvents="none" style={[styles.seekThumb, { left: r * width - 7 }]} />}
    </View>
  );
}

export function MiniPlayer() {
  const router = useRouter();
  const player = usePlayer();
  const { current, playing, toggle, art } = player;
  const { position, duration } = usePlayerProgress();
  const x = useRef(new Animated.Value(0)).current;
  const [scrub, setScrub] = useState<number | null>(null); // sürüşdürmə zamanı hədəf saniyə

  // Jestlərin həmişə ən son funksiyaları çağırması üçün
  const live = useRef({ next: player.next, prev: player.prev, open: () => router.push('/player') });
  live.current = { next: player.next, prev: player.prev, open: () => router.push('/player') };

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
          (Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy)) || g.dy < -12,
        onPanResponderMove: (_, g) => {
          if (Math.abs(g.dx) > Math.abs(g.dy)) x.setValue(g.dx * 0.6);
        },
        onPanResponderRelease: (_, g) => {
          const reset = () => Animated.spring(x, { toValue: 0, useNativeDriver: true, friction: 8 }).start();
          if (g.dy < -SWIPE_UP && Math.abs(g.dy) > Math.abs(g.dx)) {
            reset();
            live.current.open();
          } else if (g.dx >= SWIPE_X) {
            // sağa sürüşdür → növbəti mahnı
            Haptics.selectionAsync().catch(() => {});
            live.current.next();
            reset();
          } else if (g.dx <= -SWIPE_X) {
            // sola sürüşdür → əvvəlki mahnı
            Haptics.selectionAsync().catch(() => {});
            live.current.prev();
            reset();
          } else {
            reset();
          }
        },
        onPanResponderTerminate: () => Animated.spring(x, { toValue: 0, useNativeDriver: true }).start(),
      }),
    [x],
  );

  if (!current) return null;
  const ratio = duration > 0 ? Math.min(1, position / duration) : 0;

  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.card, { transform: [{ translateX: x }] }]} {...pan.panHandlers}>
        <Pressable style={styles.tapArea} onPress={() => router.push('/player')}>
          <View>
            <View style={[styles.cover, { backgroundColor: current.color }]}>
              {art ? (
                <Image source={{ uri: art }} style={StyleSheet.absoluteFill} contentFit="cover" />
              ) : (
                <Ionicons name="musical-notes" size={20} color="#fff" />
              )}
            </View>
            {player.index >= 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{player.index + 1}</Text>
              </View>
            )}
          </View>
          <View style={styles.info}>
            <Text numberOfLines={1} style={styles.title}>
              {current.title}
            </Text>
            <Text numberOfLines={1} style={[styles.sub, scrub != null && styles.subScrub]}>
              {scrub != null ? `${fmtTime(scrub)} / ${fmtTime(duration)}` : current.artist}
            </Text>
          </View>
        </Pressable>
        <Pressable hitSlop={8} onPress={toggle} style={styles.btn}>
          <Ionicons name={playing ? 'pause' : 'play'} size={22} color={Colors.text} />
        </Pressable>
        <Pressable hitSlop={8} onPress={player.next} style={styles.btn}>
          <Ionicons name="play-skip-forward" size={22} color={Colors.text} />
        </Pressable>
        <MiniSeek ratio={ratio} duration={duration} onScrub={setScrub} onSeek={player.seek} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: Spacing.sm, paddingBottom: Spacing.xs, paddingTop: Spacing.xs },
  card: {
    height: MINI_PLAYER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 4,
    paddingHorizontal: Spacing.sm + 4,
    backgroundColor: Colors.surfaceHigh,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  tapArea: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm + 4, height: '100%' },
  cover: { width: 44, height: 44, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  badge: {
    position: 'absolute',
    right: -6,
    bottom: -5,
    minWidth: 22,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
    borderWidth: 2,
    borderColor: Colors.surfaceHigh,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800', fontVariant: ['tabular-nums'] },
  info: { flex: 1, gap: 2 },
  title: { color: Colors.text, fontSize: 15, fontWeight: '600' },
  sub: { color: Colors.textMuted, fontSize: 12 },
  btn: { padding: Spacing.xs },
  subScrub: { color: Colors.accent, fontWeight: '700', fontVariant: ['tabular-nums'] },
  seekZone: { position: 'absolute', left: 0, right: 0, bottom: 0, height: SEEK_ZONE, justifyContent: 'flex-end' },
  seekTrack: { height: 3, backgroundColor: Colors.border },
  seekTrackActive: { height: 7 },
  seekFill: { height: '100%', backgroundColor: Colors.accent },
  seekThumb: { position: 'absolute', bottom: -2, width: 14, height: 14, borderRadius: 7, backgroundColor: '#fff' },
});
