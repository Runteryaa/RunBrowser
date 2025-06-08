import { useThemeColor } from '@/hooks/useThemeColor';
import { useBrowserStore } from '@/store/browserStore';
import { shareUrl } from '@/utils/share';
import { useRouter } from 'expo-router';
import {
  BookOpen,
  Download,
  History,
  Moon,
  Settings,
  Share2,
  Sun,
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

export interface MenuSheetRef {
  open: () => void;
  close: () => void;
}

interface MenuSheetProps {
  onBookmarksPress: () => void;
  onHistoryPress: () => void;
  onSettingsPress: () => void;
  onDownloadsPress: () => void;
  onSharePress: () => void;
}

const MenuSheet = forwardRef<MenuSheetRef, MenuSheetProps>(
  ({ onBookmarksPress, onHistoryPress, onSettingsPress, onDownloadsPress, onSharePress }, ref) => {
    const router = useRouter();
    const [visible, setVisible] = useState(false);
    const slideAnim = React.useRef(new Animated.Value(Dimensions.get('window').height)).current;
    const settings = useBrowserStore((state) => state.settings);
    const updateSettings = useBrowserStore((state) => state.updateSettings);

    const surfaceColor = useThemeColor({}, 'surface');
    const borderColor = useThemeColor({}, 'border');
    const textColor = useThemeColor({}, 'text');

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

    const handleSettingsPress = () => {
      handleMenuItemPress(() => router.push('/settings'));
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
              { backgroundColor: surfaceColor, transform: [{ translateY: slideAnim }] }
            ]}
          >
            <View style={[styles.header, { borderBottomColor: borderColor }]}>
              <Text style={[styles.title, { color: textColor }]}>Menu</Text>
              <TouchableOpacity style={styles.closeButton} onPress={close}>
                <X size={24} color={textColor} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.content}>
              <MenuItem 
                icon={<BookOpen size={24} color={textColor} />}
                title="Bookmarks"
                onPress={() => handleMenuItemPress(onBookmarksPress)}
                textColor={textColor}
              />
              
              <MenuItem 
                icon={<History size={24} color={textColor} />}
                title="History"
                onPress={() => handleMenuItemPress(onHistoryPress)}
                textColor={textColor}
              />
              
              <MenuItem 
                icon={<Download size={24} color={textColor} />}
                title="Downloads"
                onPress={() => handleMenuItemPress(onDownloadsPress)}
                textColor={textColor}
              />
              
              <MenuItem 
                icon={<Share2 size={24} color={textColor} />}
                title="Share"
                onPress={() => {
                  const activeTab = useBrowserStore.getState().tabs.find(tab => tab.id === useBrowserStore.getState().activeTabId);
                  if (activeTab?.url) {
                    shareUrl(activeTab.url, activeTab.title);
                  }
                }}
                textColor={textColor}
              />
              
              <MenuItem 
                icon={
                  settings.darkMode 
                    ? <Sun size={24} color={textColor} /> 
                    : <Moon size={24} color={textColor} />
                }
                title={settings.darkMode ? "Light Mode" : "Dark Mode"}
                onPress={toggleDarkMode}
                textColor={textColor}
              />
              
              <MenuItem 
                icon={<Settings size={24} color={textColor} />}
                title="Settings"
                onPress={handleSettingsPress}
                textColor={textColor}
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
  textColor: string;
}

function MenuItem({ icon, title, onPress, textColor }: MenuItemProps) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuItemIcon}>{icon}</View>
      <Text style={[styles.menuItemTitle, { color: textColor }]}>{title}</Text>
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

export default MenuSheet;