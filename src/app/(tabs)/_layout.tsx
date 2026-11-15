import { Tabs } from 'expo-router';

import { TabBar } from '@/components/tab-bar';
import { Colors } from '@/constants/theme';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, freezeOnBlur: true, sceneStyle: { backgroundColor: Colors.bg } }}>
      <Tabs.Screen name="index" options={{ title: 'Kitabxana' }} />
      <Tabs.Screen name="favorites" options={{ title: 'Sevimlilər' }} />
      <Tabs.Screen name="playlists" options={{ title: 'Siyahılar' }} />
    </Tabs>
  );
}
