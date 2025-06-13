import { useThemeColor } from '@/hooks/useThemeColor';
import { useBrowserStore } from '@/store/browserStore';
import { HistoryItem } from '@/types/browser';
import { Trash2, X } from 'lucide-react-native';
import React, { forwardRef, useImperativeHandle, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

export interface HistoryRef {
  open: () => void;
  close: () => void;
}

interface HistoryProps {
  onHistoryItemPress: (url: string) => void;
}

interface Section {
  title: string;
  data: HistoryItem[];
}

const History = forwardRef<HistoryRef, HistoryProps>(
  ({ onHistoryItemPress }, ref) => {
    const [visible, setVisible] = useState(false);
    const slideAnim = React.useRef(new Animated.Value(Dimensions.get('window').height)).current;
    const history = useBrowserStore((state) => state.history);
    const clearHistory = useBrowserStore((state) => state.clearHistory);
    const removeHistoryItem = useBrowserStore((state) => state.removeHistoryItem);

    const surface = useThemeColor({}, 'surface');
    const border = useThemeColor({}, 'border');
    const text = useThemeColor({}, 'text');
    const textSecondary = useThemeColor({}, 'textSecondary');
    const background = useThemeColor({}, 'background');
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

    const handleHistoryItemPress = (url: string) => {
      close();
      setTimeout(() => onHistoryItemPress(url), 300);
    };

    const handleDeleteItem = (id: string) => {
      removeHistoryItem(id);
    };

    const sections = React.useMemo(() => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const lastWeek = new Date(today);
      lastWeek.setDate(lastWeek.getDate() - 7);
      
      const groupedHistory: Record<string, HistoryItem[]> = {
        "Today": [],
        "Yesterday": [],
        "Last 7 Days": [],
        "Older": [],
      };
      
      history.forEach(item => {
        const itemDate = new Date(item.visitedAt);
        itemDate.setHours(0, 0, 0, 0);
        
        if (itemDate.getTime() === today.getTime()) {
          groupedHistory["Today"].push(item);
        } else if (itemDate.getTime() === yesterday.getTime()) {
          groupedHistory["Yesterday"].push(item);
        } else if (itemDate >= lastWeek) {
          groupedHistory["Last 7 Days"].push(item);
        } else {
          groupedHistory["Older"].push(item);
        }
      });
      
      return Object.entries(groupedHistory)
        .filter(([_, items]) => items.length > 0)
        .map(([title, data]) => ({ title, data }));
    }, [history]);

    const renderItem = ({ item }: { item: HistoryItem }) => (
      <View style={[styles.historyItem, { borderBottomColor: border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
        <TouchableOpacity 
          style={{ flex: 1 }}
          onPress={() => handleHistoryItemPress(item.url)}
        >
          <View style={styles.historyContent}>
            {item.favicon ? (
              <Image source={{ uri: item.favicon }} style={styles.favicon} />
            ) : (
              <View style={[styles.faviconPlaceholder, { backgroundColor: textSecondary }]} />
            )}
            <View style={styles.historyTextContainer}>
              <Text 
                style={[styles.historyTitle, { color: text }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {item.title}
              </Text>
              <Text 
                style={[styles.historyUrl, { color: textSecondary }]}
                numberOfLines={1}
                ellipsizeMode="middle"
              >
                {item.url}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteItem(item.id)}
        >
          <Trash2 size={18} color={textSecondary} />
        </TouchableOpacity>
      </View>
    );

    const renderSectionHeader = ({ section }: { section: Section }) => (
      <View style={[styles.sectionHeader, { backgroundColor: background }] }>
        <Text style={[styles.sectionTitle, { color: primary }]}>{section.title}</Text>
      </View>
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
              <Text style={[styles.title, { color: text }]}>History</Text>
              <View style={styles.headerButtons}>
                {history.length > 0 && (
                  <TouchableOpacity 
                    style={styles.clearButton} 
                    onPress={clearHistory}
                  >
                    <Trash2 size={20} color={text} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.closeButton} onPress={close}>
                  <X size={24} color={text} />
                </TouchableOpacity>
              </View>
            </View>
            
            {history.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: textSecondary }]}>No browsing history</Text>
              </View>
            ) : (
              <SectionList
                sections={sections}
                renderItem={renderItem}
                renderSectionHeader={renderSectionHeader}
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
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeButton: {
    padding: 4,
  },
  clearButton: {
    padding: 8,
    marginRight: 8,
  },
  listContent: {
    paddingBottom: 16,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  historyContent: {
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
  historyTextContainer: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 16,
    marginBottom: 2,
  },
  historyUrl: {
    fontSize: 12,
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
});

export default History;