import { useThemeColor } from '@/hooks/useThemeColor';
import { Eye, PlusSquare, Trash2, X } from 'lucide-react-native';
import React, { forwardRef, useImperativeHandle, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export interface TabsSheetRef {
  open: () => void;
  close: () => void;
}

interface TabsSheetProps {
  tabs: any[];
  activeTabId: string;
  onTabPress: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onAddTab: (options?: { private?: boolean }) => void;
}

const TabsSheet = forwardRef<TabsSheetRef, TabsSheetProps>(
  ({ tabs, activeTabId, onTabPress, onTabClose, onAddTab }, ref) => {
    const [visible, setVisible] = useState(false);
    const slideAnim = React.useRef(new Animated.Value(Dimensions.get('window').height)).current;
    const surfaceColor = useThemeColor({}, 'surface');
    const borderColor = useThemeColor({}, 'border');
    const textColor = useThemeColor({}, 'text');
    const textSecondaryColor = useThemeColor({}, 'textSecondary');
    const primaryColor = useThemeColor({}, 'primary');

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

    const getFavicon = (tab: any) =>
      tab.favicon
        ? { uri: tab.favicon }
        : require('@/assets/images/favicon.png');

    const renderItem = ({ item }: { item: any }) => (
      <TouchableOpacity
        style={[
          styles.tabItem,
          { borderBottomColor: borderColor, backgroundColor: item.id === activeTabId ? primaryColor + '22' : surfaceColor },
        ]}
        onPress={() => {
          onTabPress(item.id);
          close();
        }}
      >
        <View style={styles.tabContent}>
          {item.private ? (
            <Eye size={24} color={textSecondaryColor} style={styles.favicon} />
          ) : (
            <Image source={getFavicon(item)} style={styles.favicon} />
          )}
          <View style={styles.tabTextContainer}>
            <Text
              style={[styles.tabTitle, { color: textColor }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {item.title || item.url}
            </Text>
            <Text
              style={[styles.tabUrl, { color: textSecondaryColor }]}
              numberOfLines={1}
              ellipsizeMode="middle"
            >
              {item.url}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => onTabClose(item.id)}
        >
          <Trash2 size={20} color={textSecondaryColor} />
        </TouchableOpacity>
      </TouchableOpacity>
    );

    const handleAddPrivateTab = () => {
      onAddTab && onAddTab({ private: true });
    };

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
              { backgroundColor: surfaceColor, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <View style={[styles.header, { borderBottomColor: borderColor }]}>
              <Text style={[styles.title, { color: textColor }]}>Tabs ({tabs.length})</Text>
              <TouchableOpacity style={styles.closeButton} onPress={close}>
                <X size={24} color={textColor} />
              </TouchableOpacity>
            </View>
            {tabs.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: textSecondaryColor }]}>No open tabs</Text>
              </View>
            ) : (
              <FlatList
                data={tabs}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
              />
            )}
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity
                style={[styles.addButton, { borderTopColor: borderColor, flex: 1 }]}
                onPress={() => { onAddTab(); }}
              >
                <PlusSquare size={24} color={primaryColor} />
                <Text style={[styles.addButtonText, { color: primaryColor }]}>New Tab</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addButton, { borderTopColor: borderColor, flex: 1 }]}
                onPress={handleAddPrivateTab}
              >
                <Eye size={24} color={primaryColor} />
                <Text style={[styles.addButtonText, { color: primaryColor }]}>New Private Tab</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    );
  }
);

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
    minHeight: 300,
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
  listContent: {
    paddingBottom: 16,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderRadius: 8,
    marginVertical: 2,
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  favicon: {
    width: 24,
    height: 24,
    borderRadius: 4,
    marginRight: 12,
  },
  tabTextContainer: {
    flex: 1,
  },
  tabTitle: {
    fontSize: 16,
    marginBottom: 2,
  },
  tabUrl: {
    fontSize: 12,
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    marginTop: 8,
  },
  addButtonText: {
    fontSize: 16,
    marginLeft: 8,
    fontWeight: 'bold',
  },
});

export default TabsSheet;