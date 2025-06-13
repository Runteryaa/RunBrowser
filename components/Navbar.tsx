import { useThemeColor } from '@/hooks/useThemeColor';
import { useBrowserStore } from '@/store/browserStore';
import { ChevronLeft, ChevronRight, Home, Layout, Menu } from 'lucide-react-native';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

interface NavigationBarProps {
  canGoBack: boolean;
  canGoForward: boolean;
  onGoBack: () => void;
  onGoForward: () => void;
  onHome: () => void;
  onMenu: () => void;
  onTabs: () => void;
}

export default function NavigationBar({
  canGoBack,
  canGoForward,
  onGoBack,
  onGoForward,
  onHome,
  onMenu,
  onTabs,
}: NavigationBarProps) {
  const text = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const tabBar = useThemeColor({}, 'tabBar');
  const border = useThemeColor({}, 'border');
  const settings = useBrowserStore((state) => state.settings);

  const handleHomePress = () => {
    onHome();
  };

  return (
    <View style={[styles.container, { backgroundColor: tabBar, borderTopColor: border }] }>
      <TouchableOpacity 
        style={[styles.navButton, !canGoBack && styles.disabledButton]} 
        onPress={onGoBack}
        disabled={!canGoBack}
      >
        <ChevronLeft 
          size={24} 
          color={canGoBack ? text : textSecondary} 
        />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.navButton, !canGoForward && styles.disabledButton]} 
        onPress={onGoForward}
        disabled={!canGoForward}
      >
        <ChevronRight 
          size={24} 
          color={canGoForward ? text : textSecondary} 
        />
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.navButton} onPress={handleHomePress}>
        <Home size={24} color={text} />
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.navButton} onPress={onTabs}>
        <Layout size={24} color={text} />
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.navButton} onPress={onMenu}>
        <Menu size={24} color={text} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  navButton: {
    padding: 8,
    borderRadius: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
});