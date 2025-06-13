import { useBrowserStore } from '@/store/browserStore';
import { useColorScheme as useNativeColorScheme } from 'react-native';

export function useColorScheme() {
  const settings = useBrowserStore((state) => state.settings);
  const updateSettings = useBrowserStore((state) => state.updateSettings);
  const systemColorScheme = useNativeColorScheme();

  const colorScheme = settings.darkMode ? 'dark' : 'light';

  const setColorScheme = (scheme: 'light' | 'dark') => {
    updateSettings({ darkMode: scheme === 'dark' });
  };

  return {
    colorScheme,
    setColorScheme,
    systemColorScheme,
  };
}
