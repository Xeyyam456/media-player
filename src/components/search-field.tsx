import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';

type Props = { value: string; onChange: (v: string) => void; placeholder?: string };

export function SearchField({ value, onChange, placeholder = 'Mahnı, video və ya qovluq axtar' }: Props) {
  return (
    <View style={styles.box}>
      <Ionicons name="search" size={18} color={Colors.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        style={styles.input}
        returnKeyType="search"
        autoCorrect={false}
      />
      {value.length > 0 && (
        <Pressable hitSlop={10} onPress={() => onChange('')}>
          <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
        </Pressable>
      )}
    </View>
  );
}

export const matches = (q: string, ...fields: string[]) => {
  const s = q.trim().toLowerCase();
  return s === '' || fields.join(' ').toLowerCase().includes(s);
};

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    height: 46,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
  },
  input: { flex: 1, color: Colors.text, fontSize: 16, paddingVertical: 0 },
});
