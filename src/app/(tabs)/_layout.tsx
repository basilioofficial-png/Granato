import { Tabs } from 'expo-router/tabs';

import { Icon, type IconName } from '@/ui/components/Icon';
import { fonts } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

const TABS: readonly { name: string; title: string; icon: IconName }[] = [
  { name: 'index', title: 'Трекер', icon: 'timer' },
  { name: 'history', title: 'История', icon: 'list' },
  { name: 'analytics', title: 'Аналитика', icon: 'chart' },
  { name: 'profile', title: 'Профиль', icon: 'user' },
];

export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accentText,
        tabBarInactiveTintColor: colors.tabIdle,
        tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.border },
        tabBarLabelStyle: { fontFamily: fonts.semiBold, fontSize: 12, lineHeight: 16 },
        sceneStyle: { backgroundColor: colors.bg },
      }}>
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color }) => <Icon name={tab.icon} color={color} />,
          }}
        />
      ))}
    </Tabs>
  );
}
