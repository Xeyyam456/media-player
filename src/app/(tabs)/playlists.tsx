import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { createPlaylist, usePlaylists } from '@/data/playlists';

export default function PlaylistsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const lists = usePlaylists();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');

  const submit = () => {
    if (name.trim()) createPlaylist(name);
    setName('');
    setAdding(false);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + Spacing.md }]}>
      <View style={styles.headRow}>
        <Text style={styles.heading}>Siyahılar</Text>
        <Pressable hitSlop={10} onPress={() => setAdding((a) => !a)} style={styles.addBtn}>
          <Ionicons name={adding ? 'close' : 'add'} size={22} color="#fff" />
        </Pressable>
      </View>

      {adding && (
        <View style={styles.newRow}>
          <TextInput
            autoFocus
            value={name}
            onChangeText={setName}
            placeholder="Siyahının adı"
            placeholderTextColor={Colors.textMuted}
            style={styles.input}
            onSubmitEditing={submit}
          />
          <Pressable style={styles.create} onPress={submit}>
            <Text style={styles.createText}>Yarat</Text>
          </Pressable>
        </View>
      )}

      <FlatList
        data={lists}
        keyExtractor={(l) => l.id}
        contentContainerStyle={{ paddingTop: Spacing.md, flexGrow: 1 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="albums-outline" size={56} color={Colors.textMuted} />
            <Text style={styles.emptyText}>Hələ siyahı yoxdur</Text>
            <Text style={styles.hint}>+ düyməsi və ya mahnıya uzun basaraq yarat</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.row, pressed && { backgroundColor: Colors.surface }]}
            onPress={() => router.push({ pathname: '/playlist/[id]', params: { id: item.id } })}>
            <View style={styles.cover}>
              <Ionicons name="albums" size={24} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={styles.name}>
                {item.name}
              </Text>
              <Text style={styles.sub}>{item.ids.length} fayl</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md },
  heading: { color: Colors.text, fontSize: 32, fontWeight: '800' },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center' },
  newRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.md, marginTop: Spacing.md },
  input: { flex: 1, height: 46, borderRadius: Radius.md, paddingHorizontal: Spacing.md, backgroundColor: Colors.surface, color: Colors.text, fontSize: 16 },
  create: { height: 46, paddingHorizontal: 20, borderRadius: Radius.md, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center' },
  createText: { color: '#fff', fontWeight: '700' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingTop: 80 },
  emptyText: { color: Colors.text, fontSize: 16, fontWeight: '600' },
  hint: { color: Colors.textMuted, fontSize: 14, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: 10, paddingHorizontal: Spacing.md },
  cover: { width: 52, height: 52, borderRadius: Radius.md, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center' },
  name: { color: Colors.text, fontSize: 16, fontWeight: '600' },
  sub: { color: Colors.textMuted, fontSize: 13, marginTop: 2 },
});
