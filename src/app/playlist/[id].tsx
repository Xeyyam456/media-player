import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MediaList } from '@/components/media-list';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useLibrary } from '@/data/library';
import { useOpenItem } from '@/data/open-item';
import { deletePlaylist, renamePlaylist, usePlaylists } from '@/data/playlists';

export default function PlaylistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { items } = useLibrary();
  const lists = usePlaylists();
  const open = useOpenItem();
  const list = lists.find((l) => l.id === id);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');

  const data = useMemo(() => {
    if (!list) return [];
    const byId = new Map(items.map((m) => [m.id, m]));
    return list.ids.map((i) => byId.get(i)).filter((m) => !!m) as typeof items;
  }, [items, list]);

  if (!list) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + Spacing.md }]}>
        <Pressable hitSlop={12} onPress={() => router.back()} style={{ paddingHorizontal: Spacing.md }}>
          <Ionicons name="chevron-back" size={28} color={Colors.text} />
        </Pressable>
        <Text style={styles.msg}>Siyahı tapılmadı</Text>
      </View>
    );
  }

  const confirmDelete = () =>
    Alert.alert('Siyahını sil', `"${list.name}" silinsin?`, [
      { text: 'Ləğv et', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => {
          deletePlaylist(list.id);
          router.back();
        },
      },
    ]);

  return (
    <View style={[styles.root, { paddingTop: insets.top + Spacing.sm }]}>
      <View style={styles.top}>
        <Pressable hitSlop={12} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={Colors.text} />
        </Pressable>
        {editing ? (
          <TextInput
            autoFocus
            value={name}
            onChangeText={setName}
            style={styles.titleInput}
            onSubmitEditing={() => {
              renamePlaylist(list.id, name);
              setEditing(false);
            }}
            onBlur={() => setEditing(false)}
          />
        ) : (
          <Text numberOfLines={1} style={styles.title}>
            {list.name}
          </Text>
        )}
        <Pressable
          hitSlop={10}
          onPress={() => {
            setName(list.name);
            setEditing(true);
          }}>
          <Ionicons name="create-outline" size={22} color={Colors.text} />
        </Pressable>
        <Pressable hitSlop={10} onPress={confirmDelete}>
          <Ionicons name="trash-outline" size={22} color="#F87171" />
        </Pressable>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={[styles.pill, { backgroundColor: Colors.accent }]}
          disabled={data.length === 0}
          onPress={() => data[0] && open(data[0], data)}>
          <Ionicons name="play" size={18} color="#fff" />
          <Text style={styles.pillText}>Oxut</Text>
        </Pressable>
        <Text style={styles.count}>{data.length} fayl · uzun basaraq əməliyyatlar</Text>
      </View>

      <MediaList
        data={data}
        playlistId={list.id}
        empty="Siyahı boşdur. Kitabxanada mahnıya uzun basıb əlavə et."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  top: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.md },
  title: { flex: 1, color: Colors.text, fontSize: 26, fontWeight: '800' },
  titleInput: { flex: 1, color: Colors.text, fontSize: 24, fontWeight: '800', padding: 0 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 18, borderRadius: Radius.full },
  pillText: { color: '#fff', fontWeight: '700' },
  count: { color: Colors.textMuted, fontSize: 13 },
  msg: { color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.xl },
});
