import { useThemeColor } from '@/hooks/useThemeColor';
import { useBrowserStore } from '@/store/browserStore';
import { shareUrl } from '@/utils/share';
import {
  BookOpen,
  Download,
  History,
  Play,
  Settings,
  Share2,
  X
} from 'lucide-react-native';
import React, { forwardRef, useImperativeHandle, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

export interface MenuRef {
  open: () => void;
  close: () => void;
}

interface MenuProps {
  onBookmarksPress: () => void;
  onHistoryPress: () => void;
  onSettingsPress: () => void;
  onVideoPlayerPress?: () => void; // Add this
  hasVideo?: boolean; // Add this
}

const Menu = forwardRef<MenuRef, MenuProps>(
  ({ onBookmarksPress, onHistoryPress, onSettingsPress, onVideoPlayerPress, hasVideo }, ref) => {
    const [visible, setVisible] = useState(false);
    const slideAnim = React.useRef(new Animated.Value(Dimensions.get('window').height)).current;
    const settings = useBrowserStore((state) => state.settings);
    const updateSettings = useBrowserStore((state) => state.updateSettings);

    const surface = useThemeColor({}, 'surface');
    const border = useThemeColor({}, 'border');
    const text = useThemeColor({}, 'text');
    const textSecondary = useThemeColor({}, 'textSecondary');
    const primary = useThemeColor({}, 'primary');

    const open = () => {
      setVisible(true);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    };

    const close = () => {
      Animated.timing(slideAnim, {
        toValue: Dimensions.get('window').height,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        setVisible(false);
      });
    };

    useImperativeHandle(ref, () => ({
      open,
      close,
    }));

    const toggleDarkMode = () => {
      updateSettings({ darkMode: !settings.darkMode });
    };

    const handleMenuItemPress = (callback: () => void) => {
      close();
      setTimeout(callback, 300);
    };

    if (Platform.OS === 'web' && !visible) {
      return null;
    }

    return (
      <Modal
        visible={visible}
        transparent
        animationType="none"
        onRequestClose={close}
      >
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.backdrop} onPress={close} />
          
          <Animated.View 
            style={[
              styles.container,
              { backgroundColor: surface, transform: [{ translateY: slideAnim }] }
            ]}
          >
            <View style={[styles.header, { borderBottomColor: border }] }>
              <Text style={[styles.title, { color: text }]}>Menu</Text>
              <TouchableOpacity style={styles.closeButton} onPress={close}>
                <X size={24} color={text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.content}>
              {hasVideo && onVideoPlayerPress && (
                <MenuItem 
                  icon={<Play size={24} color={text} />}
                  title="Open Video Player"
                  onPress={() => handleMenuItemPress(onVideoPlayerPress)}
                />
              )}
              
              <MenuItem 
                icon={<BookOpen size={24} color={text} />}
                title="Bookmarks"
                onPress={() => handleMenuItemPress(onBookmarksPress)}
              />
              
              <MenuItem 
                icon={<History size={24} color={text} />}
                title="History"
                onPress={() => handleMenuItemPress(onHistoryPress)}
              />
              
              <MenuItem 
                icon={<Download size={24} color={text} />}
                title="Downloads"
                onPress={() => {}}
              />
              
              <MenuItem 
                icon={<Share2 size={24} color={text} />}
                title="Share"
                onPress={() => {
                  const activeTab = useBrowserStore.getState().tabs.find(tab => tab.id === useBrowserStore.getState().activeTabId);
                  if (activeTab?.url) {
                    shareUrl(activeTab.url, activeTab.title);
                  }
                }}
              />
              
              <MenuItem 
                icon={<Settings size={24} color={text} />}
                title="Settings"
                onPress={() => handleMenuItemPress(onSettingsPress)}
              />
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    );
  }
);

interface MenuItemProps {
  icon: React.ReactNode;
  title: string;
  onPress: () => void;
}

function MenuItem({ icon, title, onPress }: MenuItemProps) {
  const text = useThemeColor({}, 'text');
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuItemIcon}>{icon}</View>
      <Text style={[styles.menuItemTitle, { color: text }]}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  menuItemIcon: {
    marginRight: 16,
  },
  menuItemTitle: {
    fontSize: 16,
  },
});

export default Menu;