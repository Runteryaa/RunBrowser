import { useThemeColor } from '@/hooks/useThemeColor';
import { Tabs, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { TouchableOpacity } from 'react-native';

export default function TabLayout() {
  const tabBarActive = useThemeColor({}, 'tabBarActive');
  const tabBarInactive = useThemeColor({}, 'tabBarInactive');
  const tabBar = useThemeColor({}, 'tabBar');
  const border = useThemeColor({}, 'border');
  const background = useThemeColor({}, 'background');
  const text = useThemeColor({}, 'text');

  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: useThemeColor({}, 'tabBarActive'),
        tabBarInactiveTintColor: useThemeColor({}, 'tabBarInactive'),
        tabBarStyle: {
          backgroundColor: useThemeColor({}, 'tabBar'),
          borderTopColor: useThemeColor({}, 'border'),
          display: 'none'
        },
        headerStyle: {
          backgroundColor: useThemeColor({}, 'background'),
        },
        headerTintColor: useThemeColor({}, 'text'),
        tabBarLabelStyle: {
          fontSize: 12,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          headerShown: false,
          tabBarButton: () => null,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          headerShown: true,
          tabBarButton: () => null,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ paddingHorizontal: 16 }}>
              <ChevronLeft size={24} color={text} />
            </TouchableOpacity>
          ),
        }}
      />
      
    </Tabs>
  );
}