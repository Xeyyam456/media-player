import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { useFavorites } from '@/data/favorites';
import { usePlayer } from '@/data/player';
import { addToPlaylist, createPlaylist, removeFromPlaylist, usePlaylists } from '@/data/playlists';
import { closeSheet, useSheet } from '@/data/sheet';

type Mode = 'menu' | 'pick' | 'new';

export function ActionSheet() {
  const { item, playlistId } = useSheet();
  const insets = useSafeAreaInsets();
  const { isFav, toggleFav } = useFavorites();
  const { playNext, addToQueue } = usePlayer();
  const lists = usePlaylists();
  const [mode, setMode] = useState<Mode>('menu');
  const [name, setName] = useState('');

  useEffect(() => {
    if (item) {
      setMode('menu');
      setName('');
    }
  }, [item]);

  if (!item) return null;
  const audio = item.type === 'audio';

  const Row = ({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) => (
    <Pressable style={({ pressed }) => [styles.row, pressed && styles.pressed]} onPress={onPress}>
      <Ionicons name={icon} size={22} color={Colors.text} />
      <Text style={styles.rowText}>{label}</Text>
    </Pressable>
  );

  return (
    <Modal transparent animationType="slide" visible onRequestClose={closeSheet} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={closeSheet} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.md }]}>
        <View style={styles.grab} />
        <Text numberOfLines={1} style={styles.title}>
          {item.title}
        </Text>

        {mode === 'menu' && (
          <>
            {audio && (
              <Row
                icon="play-forward-outline"
                label="Növbəti çal"
                onPress={() => {
                  playNext(item);
                  closeSheet();
                }}
              />
            )}
            {audio && (
              <Row
                icon="list-outline"
                label="Növbəyə əlavə et"
                onPress={() => {
                  addToQueue(item);
                  closeSheet();
                }}
              />
            )}
            <Row
              icon={isFav(item.id) ? 'heart-dislike-outline' : 'heart-outline'}
              label={isFav(item.id) ? 'Sevimlilərdən çıxar' : 'Sevimlilərə əlavə et'}
              onPress={() => {
                toggleFav(item.id);
                closeSheet();
              }}
            />
            <Row icon="albums-outline" label="Siyahıya əlavə et" onPress={() => setMode('pick')} />
            {playlistId && (
              <Row
                icon="remove-circle-outline"
                label="Bu siyahıdan çıxar"
                onPress={() => {
                  removeFromPlaylist(playlistId, item.id);
                  closeSheet();
                }}
              />
            )}
          </>
        )}

        {mode === 'pick' && (
          <ScrollView style={{ maxHeight: 320 }}>
            <Row icon="add-circle-outline" label="Yeni siyahı yarat" onPress={() => setMode('new')} />
            {lists.map((l) => (
              <Row
                key={l.id}
                icon={l.ids.includes(item.id) ? 'checkmark-circle' : 'musical-notes-outline'}
                label={`${l.name} (${l.ids.length})`}
                onPress={() => {
                  addToPlaylist(l.id, item.id);
                  closeSheet();
                }}
              />
            ))}
          </ScrollView>
        )}

        {mode === 'new' && (
          <View style={styles.newBox}>
            <TextInput
              autoFocus
              value={name}
              onChangeText={setName}
              placeholder="Siyahının adı"
              placeholderTextColor={Colors.textMuted}
              style={styles.input}
              onSubmitEditing={() => {
                createPlaylist(name, item.id);
                closeSheet();
              }}
            />
            <Pressable
              style={styles.create}
              onPress={() => {
                createPlaylist(name, item.id);
                closeSheet();
              }}>
              <Text style={styles.createText}>Yarat</Text>
            </Pressable>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.lg + 4,
    borderTopRightRadius: Radius.lg + 4,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  grab: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, marginBottom: Spacing.md },
  title: { color: Colors.text, fontSize: 17, fontWeight: '700', marginBottom: Spacing.sm, paddingHorizontal: Spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: 14, paddingHorizontal: Spacing.xs, borderRadius: Radius.md },
  pressed: { backgroundColor: Colors.surfaceHigh },
  rowText: { color: Colors.text, fontSize: 16 },
  newBox: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center', paddingVertical: Spacing.sm },
  input: { flex: 1, height: 46, borderRadius: Radius.md, paddingHorizontal: Spacing.md, backgroundColor: Colors.surfaceHigh, color: Colors.text, fontSize: 16 },
  create: { height: 46, paddingHorizontal: 20, borderRadius: Radius.md, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center' },
  createText: { color: '#fff', fontWeight: '700' },
});
