import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Image } from 'expo-image';
import { SeekBar } from '@/components/seek-bar';
import { Visualizer } from '@/components/visualizer';
import { VerticalVolume } from '@/components/volume-slider';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useFavorites } from '@/data/favorites';
import { usePlayer, usePlayerProgress, type SleepTimer } from '@/data/player';

const DIM = 'rgba(255,255,255,0.45)';
const PANEL_W = 64;
const SPEEDS = [0.75, 1, 1.25, 1.5, 2];
const SLEEP_OPTIONS: { label: string; value: SleepTimer }[] = [
  { label: 'Söndür', value: null },
  { label: '15 dəqiqə', value: 15 * 60_000 },
  { label: '30 dəqiqə', value: 30 * 60_000 },
  { label: '45 dəqiqə', value: 45 * 60_000 },
  { label: '1 saat', value: 60 * 60_000 },
  { label: 'Mahnı bitəndə', value: 'track' },
];

const tap = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});


function sleepLabel(s: SleepTimer, now: number) {
  if (s === null) return null;
  if (s === 'track') return 'Mahnı';
  const left = Math.max(0, Math.ceil((s - now) / 60_000));
  return `${left} dəq`;
}

export default function PlayerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const p = usePlayer();
  const { position, duration } = usePlayerProgress();
  const { isFav, toggleFav } = useFavorites();
  const accent = p.current?.color ?? Colors.accent;
  const [volOpen, setVolOpen] = useState(false);
  // Albom həmişə eyni ölçüdə və ortada qalır; səs paneli onun sağındakı boş yerdə açılır.
  const gutter = PANEL_W + Spacing.sm - Spacing.md;
  const cover = Math.min(width - Spacing.lg * 2 - gutter * 2, 340);
  const contentW = width - Spacing.lg * 2;
  const panelLeft = (contentW + cover) / 2 + Spacing.sm;
  const [sleepOpen, setSleepOpen] = useState(false);
  const [now, setNow] = useState(Date.now());

  const scale = useRef(new Animated.Value(p.playing ? 1 : 0.88)).current;
  useEffect(() => {
    Animated.spring(scale, { toValue: p.playing ? 1 : 0.88, useNativeDriver: true, friction: 7 }).start();
  }, [p.playing, scale]);

  // Səs paneli 3 san işlənməyəndə özü bağlanır
  useEffect(() => {
    if (!volOpen) return;
    const t = setTimeout(() => setVolOpen(false), 3000);
    return () => clearTimeout(t);
  }, [volOpen, p.volume]);

  // Sleep timer qalan vaxt
  useEffect(() => {
    if (typeof p.sleep !== 'number') return;
    const t = setInterval(() => setNow(Date.now()), 15_000);
    setNow(Date.now());
    return () => clearInterval(t);
  }, [p.sleep]);

  const nextSpeed = () => {
    const i = SPEEDS.indexOf(p.speed);
    p.setSpeed(SPEEDS[(i + 1) % SPEEDS.length] ?? 1);
    tap();
  };

  const sl = sleepLabel(p.sleep, now);

  return (
    <View style={styles.root}>
      <LinearGradient colors={[accent, Colors.bg]} locations={[0, 0.75]} style={StyleSheet.absoluteFill} />
      <View style={[styles.content, { paddingTop: insets.top + Spacing.sm, paddingBottom: insets.bottom + Spacing.lg }]}>
        <View style={styles.header}>
          <Pressable hitSlop={12} onPress={() => router.back()}>
            <Ionicons name="chevron-down" size={30} color="#fff" />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>İndi oxunur</Text>
            {p.index >= 0 && p.queue.length > 0 && (
              <Text style={styles.headerCount}>
                {p.index + 1} / {p.queue.length}
              </Text>
            )}
          </View>
          <View style={styles.headerRight}>
            <Pressable hitSlop={12} onPress={() => setVolOpen((o) => !o)}>
              <Ionicons name={p.volume <= 0 ? 'volume-mute' : 'volume-high'} size={26} color={volOpen ? '#fff' : DIM} />
            </Pressable>
            {p.current && (
              <Pressable
                hitSlop={12}
                onPress={() => {
                  toggleFav(p.current!.id);
                  tap();
                }}>
                <Ionicons
                  name={isFav(p.current.id) ? 'heart' : 'heart-outline'}
                  size={28}
                  color={isFav(p.current.id) ? '#fff' : DIM}
                />
              </Pressable>
            )}
          </View>
        </View>


        <View style={[styles.coverWrap, { height: cover }]}>
          <Animated.View
            style={[styles.cover, { width: cover, height: cover, backgroundColor: accent, transform: [{ scale }] }]}>
            <View style={styles.coverShade} />
            {p.art ? (
              <Image source={{ uri: p.art }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
            ) : (
              <Ionicons name="musical-notes" size={cover * 0.38} color="rgba(255,255,255,0.9)" />
            )}
            <Visualizer player={p.audioPlayer} active={p.playing} />
          </Animated.View>
          {volOpen && (
            <View style={[styles.volPanel, { left: panelLeft }]}>
              <VerticalVolume value={p.volume} onChange={p.setVolume} />
            </View>
          )}
        </View>

        <View style={styles.info}>
          <Text numberOfLines={2} style={styles.title}>
            {p.current?.title ?? 'Heç nə oxunmur'}
          </Text>
          <Text numberOfLines={1} style={styles.artist}>
            {p.current?.artist ?? ''}
          </Text>
        </View>

        <SeekBar position={position} duration={duration} onSeek={p.seek} />

        <View style={styles.controls}>
          <Pressable
            hitSlop={12}
            onPress={() => {
              p.toggleShuffle();
              tap();
            }}>
            <Ionicons name="shuffle" size={26} color={p.shuffle ? '#fff' : DIM} />
          </Pressable>
          <Pressable
            hitSlop={12}
            onPress={() => {
              p.prev();
              tap();
            }}>
            <Ionicons name="play-skip-back" size={34} color="#fff" />
          </Pressable>
          <Pressable
            onPress={() => {
              p.toggle();
              tap();
            }}
            style={styles.playBtn}>
            <Ionicons
              name={p.playing ? 'pause' : 'play'}
              size={38}
              color={Colors.bg}
              style={{ marginLeft: p.playing ? 0 : 4 }}
            />
          </Pressable>
          <Pressable
            hitSlop={12}
            onPress={() => {
              p.next();
              tap();
            }}>
            <Ionicons name="play-skip-forward" size={34} color="#fff" />
          </Pressable>
          <Pressable
            hitSlop={12}
            onPress={() => {
              p.cycleRepeat();
              tap();
            }}>
            <Ionicons name="repeat" size={26} color={p.repeat === 'off' ? DIM : '#fff'} />
            {p.repeat === 'one' && <Text style={styles.one}>1</Text>}
          </Pressable>
        </View>

        <View style={styles.toolbar}>
          <Pressable style={styles.pill} onPress={nextSpeed}>
            <Ionicons name="speedometer-outline" size={16} color="#fff" />
            <Text style={styles.pillText}>{p.speed}x</Text>
          </Pressable>
          <Pressable style={[styles.pill, sl != null && styles.pillOn]} onPress={() => setSleepOpen(true)}>
            <Ionicons name="moon-outline" size={16} color="#fff" />
            <Text style={styles.pillText}>{sl ?? 'Yuxu'}</Text>
          </Pressable>
          <Pressable style={styles.pill} onPress={() => router.push('/queue')}>
            <Ionicons name="list" size={16} color="#fff" />
            <Text style={styles.pillText}>Növbə</Text>
          </Pressable>
        </View>
      </View>

      <Modal transparent animationType="fade" visible={sleepOpen} onRequestClose={() => setSleepOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setSleepOpen(false)}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.md }]}>
            <Text style={styles.sheetTitle}>Yuxu taymeri</Text>
            {SLEEP_OPTIONS.map((o) => {
              const active =
                o.value === null ? p.sleep === null : o.value === 'track' ? p.sleep === 'track' : false;
              return (
                <Pressable
                  key={o.label}
                  style={styles.sheetRow}
                  onPress={() => {
                    p.setSleep(typeof o.value === 'number' ? Date.now() + o.value : o.value);
                    setSleepOpen(false);
                    tap();
                  }}>
                  <Text style={styles.sheetText}>{o.label}</Text>
                  {active && <Ionicons name="checkmark" size={20} color={Colors.accent} />}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  content: { flex: 1, paddingHorizontal: Spacing.lg, justifyContent: 'space-between' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  headerCenter: { alignItems: 'center' },
  headerCount: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'], marginTop: 1 },
  headerTitle: { color: '#fff', fontSize: 15, fontWeight: '600', opacity: 0.9 },
  volPanel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: PANEL_W,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  cover: {
    borderRadius: Radius.lg + 4,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
  },
  coverShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.12)' },
  bars: { position: 'absolute', left: 0, right: 0, bottom: 18, height: 34, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 6 },
  bar: { width: 6, height: 34, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.85)', transformOrigin: 'bottom' },
  // Sabit hündürlük (2 sətir ad + ifaçı): ad 1 və ya 2 sətir olanda seek bar yerindən tərpənmir
  info: { gap: 4, height: 30 * 2 + 4 + 22, justifyContent: 'flex-end' },
  title: { color: '#fff', fontSize: 24, lineHeight: 30, fontWeight: '800' },
  artist: { color: 'rgba(255,255,255,0.7)', fontSize: 16, lineHeight: 22 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  playBtn: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  one: { position: 'absolute', alignSelf: 'center', top: 6, color: '#fff', fontSize: 9, fontWeight: '800' },
  toolbar: { flexDirection: 'row', justifyContent: 'space-between' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 9, paddingHorizontal: 16, borderRadius: Radius.full, backgroundColor: 'rgba(255,255,255,0.16)' },
  pillOn: { backgroundColor: Colors.accent },
  pillText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.surface, borderTopLeftRadius: Radius.lg + 4, borderTopRightRadius: Radius.lg + 4, padding: Spacing.md },
  sheetTitle: { color: Colors.text, fontSize: 17, fontWeight: '700', marginBottom: Spacing.sm },
  sheetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  sheetText: { color: Colors.text, fontSize: 16 },
});
