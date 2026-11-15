import { Ionicons } from '@expo/vector-icons';
import { useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/theme';

type Props = { value: number; onChange: (v: number) => void };

const LEVELS = 10;
const TRACK_H = 200;
const THUMB = 22;

const clampLevel = (n: number) => Math.min(LEVELS, Math.max(0, Math.round(n)));
const yOf = (level: number) => (1 - level / LEVELS) * TRACK_H;

/** Nazik şaquli səs slayderi: 0–10 səviyyə, rəqəm tutacağın yanında onunla birlikdə hərəkət edir. */
export function VerticalVolume({ value, onChange }: Props) {
  const [drag, setDrag] = useState<number | null>(null); // 0..10
  const cb = useRef(onChange);
  const lastLevel = useRef(-1);
  const prev = useRef(5);
  cb.current = onChange;

  const pan = useMemo(() => {
    // Başlanğıc nöqtəsi locationY ilə, sonrakı hərəkət dy ilə (locationY barmaq slayderdən çıxanda sıçrayır)
    let startR = 0;
    const apply = (raw: number) => {
      const level = clampLevel(Math.min(1, Math.max(0, raw)) * LEVELS);
      setDrag(level);
      if (level !== lastLevel.current) {
        lastLevel.current = level;
        cb.current(level / LEVELS);
      }
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        startR = Math.min(1, Math.max(0, 1 - e.nativeEvent.locationY / TRACK_H));
        lastLevel.current = -1;
        apply(startR);
      },
      onPanResponderMove: (_, g) => apply(startR - g.dy / TRACK_H),
      onPanResponderRelease: () => setDrag(null),
      onPanResponderTerminate: () => setDrag(null),
    });
  }, []);

  const level = drag ?? clampLevel(value * LEVELS);
  const y = yOf(level);
  const icon = level <= 0 ? 'volume-mute' : level <= 3 ? 'volume-low' : level <= 7 ? 'volume-medium' : 'volume-high';

  const toggleMute = () => {
    if (level > 0) {
      prev.current = level;
      onChange(0);
    } else {
      onChange((prev.current || 5) / LEVELS);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.touch} {...pan.panHandlers}>
        {/* Bölgü xətləri 0…10 */}
        {Array.from({ length: LEVELS + 1 }, (_, i) => (
          <View
            key={i}
            pointerEvents="none"
            style={[styles.tick, { top: yOf(i) - 0.5 }, i === 0 || i === LEVELS ? styles.tickEnd : null]}
          />
        ))}

        {/* İz və dolğu */}
        <View pointerEvents="none" style={styles.track} />
        <View pointerEvents="none" style={[styles.fill, { top: y, height: TRACK_H - y }]} />

        {/* Tutacaq və rəqəm */}
        <View pointerEvents="none" style={[styles.thumb, { top: y - THUMB / 2 }, drag != null && styles.thumbActive]} />
        <View pointerEvents="none" style={[styles.bubble, { top: y - 12 }]}>
          <Text style={styles.bubbleText}>{level}</Text>
        </View>
      </View>

      <Pressable hitSlop={10} onPress={toggleMute} style={styles.icon}>
        <Ionicons name={icon} size={20} color="rgba(255,255,255,0.85)" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: Spacing.sm, paddingTop: Spacing.md, paddingBottom: Spacing.sm, paddingHorizontal: Spacing.xs },
  touch: { width: 56, height: TRACK_H },
  // iz sağda, rəqəm solda
  track: { position: 'absolute', right: 12, top: 0, width: 4, height: TRACK_H, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.22)' },
  fill: { position: 'absolute', right: 12, width: 4, borderRadius: 2, backgroundColor: '#fff' },
  tick: { position: 'absolute', right: 24, width: 4, height: 1, backgroundColor: 'rgba(255,255,255,0.28)' },
  tickEnd: { width: 6, backgroundColor: 'rgba(255,255,255,0.5)' },
  thumb: {
    position: 'absolute',
    right: 14 - THUMB / 2,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: '#fff',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 1 },
  },
  thumbActive: { transform: [{ scale: 1.2 }] },
  bubble: {
    position: 'absolute',
    left: 0,
    width: 26,
    height: 24,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  bubbleText: { color: '#fff', fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'] },
  icon: { padding: 2 },
});
