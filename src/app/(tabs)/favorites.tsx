import { Ionicons } from '@expo/vector-icons';
import { useDeferredValue, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MediaList } from '@/components/media-list';
import { matches, SearchField } from '@/components/search-field';
import { Colors, Spacing } from '@/constants/theme';
import { useFavorites } from '@/data/favorites';
import { useLibrary } from '@/data/library';

export default function FavoritesScreen() {
  const insets = useSafeAreaInsets();
  const { items } = useLibrary();
  const { ids } = useFavorites();
  const [q, setQ] = useState('');
  const dq = useDeferredValue(q);
  const data = useMemo(() => items.filter((m) => ids.has(m.id) && matches(dq, m.title, m.artist)), [items, ids, dq]);

  return (
    <View style={[styles.root, { paddingTop: insets.top + Spacing.md }]}>
      <View style={styles.headRow}>
        <Text style={styles.heading}>Sevimlilər</Text>
        <Text style={styles.count}>{data.length} fayl</Text>
      </View>
      <SearchField value={q} onChange={setQ} placeholder="Sevimlilərdə axtar" />
      <View style={{ height: Spacing.md }} />
      <MediaList
        data={data}
        emptyComponent={
          <View style={styles.empty}>
            <Ionicons name="heart-outline" size={56} color={Colors.textMuted} />
            <Text style={styles.emptyText}>Hələ sevimli yoxdur</Text>
            <Text style={styles.hint}>Siyahıda ürək ikonuna toxun</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  headRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: Spacing.md },
  heading: { color: Colors.text, fontSize: 32, fontWeight: '800' },
  count: { color: Colors.textMuted, fontSize: 14 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingTop: 80 },
  emptyText: { color: Colors.text, fontSize: 16, fontWeight: '600' },
  hint: { color: Colors.textMuted, fontSize: 14 },
});
