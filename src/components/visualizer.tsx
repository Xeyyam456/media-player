import type { AudioPlayer } from 'expo-audio';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

const FREQS = [60, 150, 400, 1000, 2400, 6000, 12000];
const SAMPLE_RATE = 44100;
const MIN = 0.1;
const MAX_FRAMES = 512;

/** Goertzel: tək tezliyin gücü (tam FFT-dən xeyli ucuzdur) */
function goertzel(frames: number[], n: number, freq: number) {
  const k = (2 * Math.PI * freq) / SAMPLE_RATE;
  const coeff = 2 * Math.cos(k);
  let s1 = 0;
  let s2 = 0;
  for (let i = 0; i < n; i++) {
    const s = (frames[i] ?? 0) + coeff * s1 - s2;
    s2 = s1;
    s1 = s;
  }
  const power = s1 * s1 + s2 * s2 - coeff * s1 * s2;
  return Math.sqrt(Math.max(0, power)) / n;
}

type Props = { player: AudioPlayer | null; active: boolean };

/** Real audio nümunələri (expo-audio audioSampleUpdate) əsasında tezlik zolaqları */
export function Visualizer({ player, active }: Props) {
  const vals = useRef(FREQS.map(() => new Animated.Value(MIN))).current;
  const level = useRef(FREQS.map(() => MIN));

  useEffect(() => {
    if (!player || !active) {
      vals.forEach((v) => Animated.timing(v, { toValue: MIN, duration: 250, useNativeDriver: true }).start());
      level.current = FREQS.map(() => MIN);
      return;
    }
    player.setAudioSamplingEnabled(true);
    let last = 0;
    const sub = player.addListener('audioSampleUpdate', (sample) => {
      const now = Date.now();
      if (now - last < 55) return;
      last = now;
      const frames = sample.channels[0]?.frames;
      if (!frames || frames.length < 32) return;
      const n = Math.min(frames.length, MAX_FRAMES);
      FREQS.forEach((f, i) => {
        const mag = goertzel(frames, n, f) * 2;
        const db = 20 * Math.log10(mag + 1e-6);
        const target = Math.min(1, Math.max(MIN, (db + 55) / 55));
        const prev = level.current[i] ?? MIN;
        const next = target > prev ? target : prev * 0.82 + target * 0.18; // sürətli qalxma, yumşaq düşmə
        level.current[i] = next;
        vals[i]?.setValue(next);
      });
    });
    return () => {
      sub.remove();
      player.setAudioSamplingEnabled(false);
    };
  }, [player, active, vals]);

  return (
    <View style={styles.wrap} pointerEvents="none">
      {vals.map((v, i) => (
        <Animated.View key={i} style={[styles.bar, { transform: [{ scaleY: v }] }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 18,
    height: 44,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 7,
  },
  bar: { width: 7, height: 44, borderRadius: 3.5, backgroundColor: 'rgba(255,255,255,0.88)', transformOrigin: 'bottom' },
});
