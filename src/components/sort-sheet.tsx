import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { SORT_OPTIONS, setSort, useSort, type SortDir, type SortKey } from '@/data/sort';

type Props = { visible: boolean; onClose: () => void };

export function SortSheet({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const sort = useSort();

  const pick = (key: SortKey, dir: SortDir) => {
    setSort(key, dir);
    onClose();
  };

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.md }]}>
        <View style={styles.grab} />
        <Text style={styles.title}>Sıralama</Text>
        {SORT_OPTIONS.map((o) => (
          <View key={o.key} style={styles.group}>
            <View style={styles.groupHead}>
              <Ionicons name={o.icon as never} size={16} color={Colors.textMuted} />
              <Text style={styles.groupTitle}>{o.title}</Text>
            </View>
            <View style={styles.pair}>
              {(['asc', 'desc'] as const).map((dir) => {
                const on = sort.key === o.key && sort.dir === dir;
                return (
                  <Pressable key={dir} style={[styles.opt, on && styles.optOn]} onPress={() => pick(o.key, dir)}>
                    <Ionicons
                      name={dir === 'asc' ? 'arrow-up' : 'arrow-down'}
                      size={15}
                      color={on ? '#fff' : Colors.textMuted}
                    />
                    <Text style={[styles.optText, on && styles.optTextOn]}>{dir === 'asc' ? o.asc : o.desc}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
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
  title: { color: Colors.text, fontSize: 18, fontWeight: '800', marginBottom: Spacing.sm },
  group: { marginBottom: Spacing.md },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  groupTitle: { color: Colors.textMuted, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  pair: { flexDirection: 'row', gap: Spacing.sm },
  opt: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceHigh,
  },
  optOn: { backgroundColor: Colors.accent },
  optText: { color: Colors.textMuted, fontSize: 13, fontWeight: '600', flexShrink: 1 },
  optTextOn: { color: '#fff' },
});
