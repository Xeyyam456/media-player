import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';
import type { MediaItem } from '@/data/types';

export const ROW_HEIGHT = 72;

type Props = {
  item: MediaItem;
  active: boolean;
  /** Aktiv sətir üçün növbədəki sıra, məsələn "3/644" */
  badge?: string;
  fav: boolean;
  onPress: (item: MediaItem) => void;
  onLongPress: (item: MediaItem) => void;
  onToggleFav: (id: string) => void;
};

function MediaRowBase({ item, active, badge, fav, onPress, onLongPress, onToggleFav }: Props) {
  return (
    <Pressable
      onPress={() => onPress(item)}
      onLongPress={() => onLongPress(item)}
      delayLongPress={350}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={[styles.cover, { backgroundColor: item.color }]}>
        <Ionicons
          name={active ? 'volume-high' : item.type === 'video' ? 'videocam' : 'musical-notes'}
          size={22}
          color="#fff"
        />
        {active && badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.info}>
        <Text numberOfLines={1} style={[styles.title, active && { color: Colors.accent }]}>
          {item.title}
        </Text>
        <Text numberOfLines={1} style={styles.sub}>
          {item.artist} · {item.duration}
        </Text>
      </View>
      <Pressable hitSlop={10} onPress={() => onToggleFav(item.id)} style={styles.heart}>
        <Ionicons name={fav ? 'heart' : 'heart-outline'} size={22} color={fav ? Colors.accent : Colors.textMuted} />
      </Pressable>
    </Pressable>
  );
}

export const MediaRow = memo(MediaRowBase);

const styles = StyleSheet.create({
  row: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
  },
  pressed: { backgroundColor: Colors.surface },
  cover: { width: 52, height: 52, borderRadius: Radius.sm + 2, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    right: -5,
    bottom: -5,
    minWidth: 24,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
    borderWidth: 2,
    borderColor: Colors.bg,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800', fontVariant: ['tabular-nums'] },
  info: { flex: 1, gap: 2 },
  title: { color: Colors.text, fontSize: 16, fontWeight: '600' },
  sub: { color: Colors.textMuted, fontSize: 13 },
  heart: { padding: Spacing.xs },
});
