import { Ionicons } from '@expo/vector-icons';
import { useDeferredValue, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MediaList } from '@/components/media-list';
import { matches, SearchField } from '@/components/search-field';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { SortSheet } from '@/components/sort-sheet';
import { useLibrary } from '@/data/library';
import { useSort } from '@/data/sort';
import { useStats } from '@/data/stats';

const collator = new Intl.Collator('az');

const FILTERS = [
  { key: 'all', label: 'Hamısı' },
  { key: 'audio', label: 'Musiqi' },
  { key: 'video', label: 'Video' },
] as const;

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const { items, status, reload } = useLibrary();
  const { counts } = useStats();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('all');
  const [sortOpen, setSortOpen] = useState(false);
  const [q, setQ] = useState('');
  const dq = useDeferredValue(q);
  const sort = useSort();

  const data = useMemo(() => {
    const s = items.filter((m) => (filter === 'all' || m.type === filter) && matches(dq, m.title, m.artist));
    const sign = sort.dir === 'asc' ? 1 : -1;
    if (sort.key === 'name') s.sort((a, b) => sign * collator.compare(a.title, b.title));
    else if (sort.key === 'new') s.sort((a, b) => sign * (a.added - b.added));
    else if (sort.key === 'dur') s.sort((a, b) => sign * (a.durationSec - b.durationSec));
    else s.sort((a, b) => sign * ((counts[a.id] ?? 0) - (counts[b.id] ?? 0)));
    return s;
  }, [items, filter, dq, sort.key, sort.dir, counts]);

  // Standart olmayan sıralama aktivdirsə ikonda nöqtə göstərilir
  const customSort = !(sort.key === 'name' && sort.dir === 'asc');

  return (
    <View style={[styles.root, { paddingTop: insets.top + Spacing.md }]}>
      <View style={styles.headRow}>
        <Text style={styles.heading}>Kitabxana</Text>
        {status === 'ready' && <Text style={styles.count}>{data.length} fayl</Text>}
      </View>
      <SearchField value={q} onChange={setQ} />
      <View style={styles.chips}>
        {FILTERS.map((f) => {
          const on = filter === f.key;
          return (
            <Pressable key={f.key} onPress={() => setFilter(f.key)} style={[styles.chip, on && styles.chipOn]}>
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{f.label}</Text>
            </Pressable>
          );
        })}
        <View style={{ flex: 1 }} />
        <Pressable style={[styles.sortBtn, customSort && styles.sortBtnOn]} onPress={() => setSortOpen(true)}>
          <Ionicons name="swap-vertical" size={20} color={customSort ? '#fff' : Colors.text} />
        </Pressable>
      </View>
      <SortSheet visible={sortOpen} onClose={() => setSortOpen(false)} />
      {status === 'loading' && <ActivityIndicator color={Colors.accent} size="large" style={styles.center} />}
      {status === 'denied' && (
        <View style={styles.center}>
          <Text style={styles.msg}>Fayllara icazə verilməyib</Text>
          <Pressable style={styles.btn} onPress={reload}>
            <Text style={styles.btnText}>İcazə ver</Text>
          </Pressable>
        </View>
      )}
      {status === 'ready' && <MediaList data={data} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  headRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: Spacing.md },
  heading: { color: Colors.text, fontSize: 32, fontWeight: '800' },
  count: { color: Colors.textMuted, fontSize: 14 },
  chips: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: Radius.full, backgroundColor: Colors.surface },
  chipOn: { backgroundColor: Colors.accent },
  chipText: { color: Colors.textMuted, fontWeight: '600', fontSize: 14 },
  chipTextOn: { color: '#fff' },
  sortBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface },
  sortBtnOn: { backgroundColor: Colors.accent },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  msg: { color: Colors.textMuted, textAlign: 'center', fontSize: 16 },
  btn: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: Radius.full, backgroundColor: Colors.accent },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
