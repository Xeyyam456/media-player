import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { memo, useMemo, useRef, useState } from 'react';
import { FlatList, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { usePlayer } from '@/data/player';
import type { MediaItem } from '@/data/types';

const ROW = 64;

type Drag = { from: number; to: number; dy: number } | null;

type RowProps = {
  item: MediaItem;
  i: number;
  active: boolean;
  offset: number; // digər sətirlərin sürüşməsi (sürükləmə zamanı)
  dragging: boolean; // bu sətir sürüklənir
  dy: number;
  onJump: (i: number) => void;
  onRemove: (i: number) => void;
  onDragStart: (i: number) => void;
  onDragMove: (i: number, dy: number) => void;
  onDragEnd: (i: number, dy: number) => void;
};

const Row = memo(function Row(p: RowProps) {
  const cbs = useRef(p);
  cbs.current = p;

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => cbs.current.onDragStart(cbs.current.i),
        onPanResponderMove: (_, g) => cbs.current.onDragMove(cbs.current.i, g.dy),
        onPanResponderRelease: (_, g) => cbs.current.onDragEnd(cbs.current.i, g.dy),
        onPanResponderTerminate: (_, g) => cbs.current.onDragEnd(cbs.current.i, g.dy),
      }),
    [],
  );

  return (
    <View
      style={[
        styles.row,
        { transform: [{ translateY: p.dragging ? p.dy : p.offset }] },
        p.dragging && styles.rowDragging,
      ]}>
      <Pressable style={styles.main} onPress={() => p.onJump(p.i)}>
        <Text style={[styles.num, p.active && { color: Colors.accent }]}>{p.i + 1}</Text>
        <View style={[styles.cover, { backgroundColor: p.item.color }]}>
          <Ionicons name={p.active ? 'volume-high' : 'musical-notes'} size={18} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={[styles.name, p.active && { color: Colors.accent }]}>
            {p.item.title}
          </Text>
          <Text numberOfLines={1} style={styles.sub}>
            {p.item.artist} · {p.item.duration}
          </Text>
        </View>
      </Pressable>
      {!p.active && (
        <Pressable hitSlop={8} onPress={() => p.onRemove(p.i)} style={styles.iconBtn}>
          <Ionicons name="close" size={20} color={Colors.textMuted} />
        </Pressable>
      )}
      <View style={styles.handle} {...pan.panHandlers}>
        <Ionicons name="reorder-three" size={26} color={Colors.textMuted} />
      </View>
    </View>
  );
});

export default function QueueScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { queue, index, jumpTo, removeFromQueue, moveInQueue } = usePlayer();
  const [drag, setDrag] = useState<Drag>(null);

  const target = (from: number, dy: number) =>
    Math.min(queue.length - 1, Math.max(0, from + Math.round(dy / ROW)));

  const offsetFor = (i: number) => {
    if (!drag) return 0;
    const { from, to } = drag;
    if (from < to && i > from && i <= to) return -ROW;
    if (from > to && i >= to && i < from) return ROW;
    return 0;
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + Spacing.sm, paddingBottom: insets.bottom }]}>
      <View style={styles.top}>
        <Pressable hitSlop={12} onPress={() => router.back()}>
          <Ionicons name="chevron-down" size={30} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>Növbə</Text>
        <Text style={styles.count}>{queue.length} mahnı</Text>
      </View>
      <Text style={styles.hint}>Sıranı dəyişmək üçün ≡ ikonunu sürüşdür</Text>
      <FlatList
        data={queue}
        extraData={drag}
        scrollEnabled={!drag}
        keyExtractor={(m, i) => `${m.id}-${i}`}
        initialScrollIndex={index > 2 && index < queue.length ? index - 2 : 0}
        getItemLayout={(_, i) => ({ length: ROW, offset: ROW * i, index: i })}
        ListEmptyComponent={<Text style={styles.empty}>Növbə boşdur</Text>}
        renderItem={({ item, index: i }) => (
          <Row
            item={item}
            i={i}
            active={i === index}
            offset={offsetFor(i)}
            dragging={drag?.from === i}
            dy={drag?.from === i ? drag.dy : 0}
            onJump={jumpTo}
            onRemove={removeFromQueue}
            onDragStart={(k) => {
              Haptics.selectionAsync().catch(() => {});
              setDrag({ from: k, to: k, dy: 0 });
            }}
            onDragMove={(k, dy) => setDrag({ from: k, to: target(k, dy), dy })}
            onDragEnd={(k, dy) => {
              moveInQueue(k, target(k, dy));
              setDrag(null);
            }}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  top: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.md, paddingBottom: Spacing.xs },
  title: { flex: 1, color: Colors.text, fontSize: 24, fontWeight: '800' },
  count: { color: Colors.textMuted, fontSize: 13 },
  hint: { color: Colors.textMuted, fontSize: 12, paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm },
  empty: { color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.xl },
  row: { height: ROW, flexDirection: 'row', alignItems: 'center', paddingLeft: Spacing.md, backgroundColor: Colors.bg },
  rowDragging: { zIndex: 10, backgroundColor: Colors.surfaceHigh, borderRadius: Radius.md, elevation: 8 },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  num: { width: 28, textAlign: 'center', color: Colors.textMuted, fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
  cover: { width: 44, height: 44, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  name: { color: Colors.text, fontSize: 15, fontWeight: '600' },
  sub: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  iconBtn: { paddingHorizontal: Spacing.sm },
  handle: { width: 52, height: ROW, alignItems: 'center', justifyContent: 'center' },
});
