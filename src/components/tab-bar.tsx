import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from 'expo-router/build/layouts/Tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, TAB_BAR_HEIGHT } from '@/constants/theme';

import { MiniPlayer } from './mini-player';

const ICONS: Record<string, { on: keyof typeof Ionicons.glyphMap; off: keyof typeof Ionicons.glyphMap }> = {
  index: { on: 'library', off: 'library-outline' },
  favorites: { on: 'heart', off: 'heart-outline' },
  playlists: { on: 'albums', off: 'albums-outline' },
};

export function TabBar({ state, descriptors, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingBottom: insets.bottom }]}>
      <MiniPlayer />
      <View style={styles.bar}>
        {state.routes.map((route, i) => {
          const focused = state.index === i;
          const icon = ICONS[route.name] ?? ICONS.index;
          const label = descriptors[route.key].options.title ?? route.name;
          return (
            <Pressable
              key={route.key}
              style={styles.tab}
              onPress={() => navigateToTab(route.key)}>
              <Ionicons
                name={focused ? icon.on : icon.off}
                size={22}
                color={focused ? Colors.accent : Colors.textMuted}
              />
              <Text style={[styles.label, { color: focused ? Colors.accent : Colors.textMuted }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: Colors.bg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border },
  bar: { flexDirection: 'row', height: TAB_BAR_HEIGHT },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  label: { fontSize: 11, fontWeight: '600' },
});
