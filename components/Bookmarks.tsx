import { useThemeColor } from '@/hooks/useThemeColor';
import { useBrowserStore } from '@/store/browserStore';
import { Bookmark } from '@/types/browser';
import { Bookmark as BookmarkIcon, Trash2, X } from 'lucide-react-native';
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
  View
} from 'react-native';

export interface BookmarksRef {
  open: () => void;
  close: () => void;
}

interface BookmarksProps {
  onBookmarkPress: (url: string) => void;
}

const Bookmarks = forwardRef<BookmarksRef, BookmarksProps>(
  ({ onBookmarkPress }, ref) => {
    const [visible, setVisible] = useState(false);
    const slideAnim = React.useRef(new Animated.Value(Dimensions.get('window').height)).current;
    const bookmarks = useBrowserStore((state) => state.bookmarks);
    const removeBookmark = useBrowserStore((state) => state.removeBookmark);
    const addBookmark = useBrowserStore((state) => state.addBookmark);
    const tabs = useBrowserStore((state) => state.tabs);
    const activeTabId = useBrowserStore((state) => state.activeTabId);
    const activeTab = tabs.find((tab) => tab.id === activeTabId);

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

    const handleBookmarkPress = (url: string) => {
      close();
      setTimeout(() => onBookmarkPress(url), 300);
    };

    const currentBookmark = activeTab && bookmarks.find((b) => b.url === activeTab.url);
    const isCurrentBookmarked = !!currentBookmark;

    const handleToggleCurrentBookmark = () => {
      if (!activeTab) return;
      if (isCurrentBookmarked) {
        removeBookmark(currentBookmark.id);
      } else {
        addBookmark(activeTab.url, activeTab.title, activeTab.favicon);
      }
    };

    const renderItem = ({ item }: { item: Bookmark }) => (
      <TouchableOpacity 
        style={[styles.bookmarkItem, { borderBottomColor: border }]} 
        onPress={() => handleBookmarkPress(item.url)}
      >
        <View style={styles.bookmarkContent}>
          {item.favicon ? (
            <Image source={{ uri: item.favicon }} style={styles.favicon} />
          ) : (
            <View style={[styles.faviconPlaceholder, { backgroundColor: textSecondary }]} />
          )}
          <View style={styles.bookmarkTextContainer}>
            <Text 
              style={[styles.bookmarkTitle, { color: text }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {item.title}
            </Text>
            <Text 
              style={[styles.bookmarkUrl, { color: textSecondary }]}
              numberOfLines={1}
              ellipsizeMode="middle"
            >
              {item.url}
            </Text>
          </View>
        </View>
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={() => removeBookmark(item.id)}
        >
          <Trash2 size={20} color={textSecondary} />
        </TouchableOpacity>
      </TouchableOpacity>
    );

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
              <Text style={[styles.title, { color: text }]}>Bookmarks</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity style={styles.addButton} onPress={handleToggleCurrentBookmark}>
                  <BookmarkIcon 
                    size={22} 
                    color={primary} 
                    fill={isCurrentBookmarked ? primary : 'transparent'}
                  />
                </TouchableOpacity>
                <TouchableOpacity style={styles.closeButton} onPress={close}>
                  <X size={24} color={text} />
                </TouchableOpacity>
              </View>
            </View>
            {bookmarks.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: textSecondary }]}>No bookmarks yet</Text>
              </View>
            ) : (
              <FlatList
                data={bookmarks}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
              />
            )}
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
  addButton: {
    padding: 4,
    marginRight: 8,
  },
  listContent: {
    paddingVertical: 8,
  },
  bookmarkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  bookmarkContent: {
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
  faviconPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 4,
    marginRight: 12,
  },
  bookmarkTextContainer: {
    flex: 1,
  },
  bookmarkTitle: {
    fontSize: 16,
    marginBottom: 2,
  },
  bookmarkUrl: {
    fontSize: 12,
  },
  deleteButton: {
    padding: 8,
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
});

export default Bookmarks;