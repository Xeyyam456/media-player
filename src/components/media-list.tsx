import { useCallback, type ReactElement } from 'react';
import { FlatList, StyleSheet, Text } from 'react-native';

import { Colors, Spacing } from '@/constants/theme';
import { useFavorites } from '@/data/favorites';
import { useOpenItem } from '@/data/open-item';
import { usePlayer } from '@/data/player';
import { openSheet } from '@/data/sheet';
import type { MediaItem } from '@/data/types';

import { MediaRow, ROW_HEIGHT } from './media-row';

type Props = {
  data: MediaItem[];
  empty?: string;
  header?: ReactElement;
  emptyComponent?: ReactElement;
  playlistId?: string;
};

const keyExtractor = (i: MediaItem) => i.id;
const getItemLayout = (_: unknown, index: number) => ({ length: ROW_HEIGHT, offset: ROW_HEIGHT * index, index });

export function MediaList({ data, empty = 'Fayl tapılmadı', header, emptyComponent, playlistId }: Props) {
  const { current, index, queue } = usePlayer();
  const { ids, toggleFav } = useFavorites();
  const open = useOpenItem();
  const currentId = current?.id;
  const badge = current && index >= 0 ? String(index + 1) : undefined;

  const onLongPress = useCallback((item: MediaItem) => openSheet(item, playlistId ?? null), [playlistId]);

  const onPress = useCallback((item: MediaItem) => open(item, data), [open, data]);

  const renderItem = useCallback(
    ({ item }: { item: MediaItem }) => (
      <MediaRow
        item={item}
        active={item.id === currentId}
        badge={item.id === currentId ? badge : undefined}
        fav={ids.has(item.id)}
        onPress={onPress}
        onLongPress={onLongPress}
        onToggleFav={toggleFav}
      />
    ),
    [currentId, badge, ids, onPress, onLongPress, toggleFav],
  );

  return (
    <FlatList
      data={data}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      getItemLayout={getItemLayout}
      ListHeaderComponent={header}
      ListEmptyComponent={emptyComponent ?? <Text style={styles.msg}>{empty}</Text>}
      initialNumToRender={14}
      maxToRenderPerBatch={12}
      updateCellsBatchingPeriod={40}
      windowSize={7}
      removeClippedSubviews
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: Spacing.lg, flexGrow: 1 }}
    />
  );
}

const styles = StyleSheet.create({
  msg: { color: Colors.textMuted, textAlign: 'center', fontSize: 16, marginTop: Spacing.xl },
});
