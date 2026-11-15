import { useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/theme';

export function fmtTime(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

type Props = { position: number; duration: number; onSeek: (s: number) => void };

export function SeekBar({ position, duration, onSeek }: Props) {
  const [width, setWidth] = useState(1);
  const [dragRatio, setDragRatio] = useState<number | null>(null);
  const w = useRef(1);
  const dur = useRef(0);
  const cb = useRef(onSeek);
  w.current = width;
  dur.current = duration;
  cb.current = onSeek;

  const pan = useMemo(() => {
    const clamp = (r: number) => Math.min(1, Math.max(0, r));
    // Başlanğıc nöqtəsi locationX, sonrakı hərəkət dx ilə (locationX başqa elementin üstündən keçəndə sıçrayır)
    let startR = 0;
    let last = 0;
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        startR = clamp(e.nativeEvent.locationX / w.current);
        last = startR;
        setDragRatio(last);
      },
      onPanResponderMove: (_, g) => {
        last = clamp(startR + g.dx / w.current);
        setDragRatio(last);
      },
      onPanResponderRelease: (_, g) => {
        last = clamp(startR + g.dx / w.current);
        cb.current(last * dur.current);
        setDragRatio(null);
      },
      onPanResponderTerminate: () => setDragRatio(null),
    });
  }, []);

  const ratio = dragRatio ?? (duration > 0 ? Math.min(1, position / duration) : 0);
  const shown = dragRatio != null ? dragRatio * duration : position;

  return (
    <View>
      <View style={styles.touch} onLayout={(e) => setWidth(e.nativeEvent.layout.width)} {...pan.panHandlers}>
        <View style={styles.track} pointerEvents="none">
          <View style={[styles.fill, { width: `${ratio * 100}%` }]} />
        </View>
        <View pointerEvents="none" style={[styles.thumb, { left: ratio * width - 8 }]} />
      </View>
      <View style={styles.times}>
        <Text style={styles.time}>{fmtTime(shown)}</Text>
        <Text style={styles.time}>{fmtTime(duration)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  touch: { height: 32, justifyContent: 'center' },
  track: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', overflow: 'hidden' },
  fill: { height: 4, backgroundColor: '#fff' },
  thumb: { position: 'absolute', top: 8, width: 16, height: 16, borderRadius: 8, backgroundColor: '#fff' },
  times: { flexDirection: 'row', justifyContent: 'space-between' },
  time: { color: Colors.textMuted, fontSize: 12, fontVariant: ['tabular-nums'] },
});
