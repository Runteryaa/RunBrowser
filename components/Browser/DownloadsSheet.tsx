import { useThemeColor } from '@/hooks/useThemeColor';
import { Trash2, X } from 'lucide-react-native';
import React, { forwardRef, useImperativeHandle, useState } from 'react';
import {
    Animated,
    Dimensions,
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export interface DownloadsSheetRef {
  open: () => void;
  close: () => void;
}

interface DownloadItem {
  id: string;
  name: string;
  url: string;
  status: 'downloading' | 'completed' | 'failed';
  progress: number; // 0-1
}

interface DownloadsSheetProps {
  downloads: DownloadItem[];
  onClearDownloads: () => void;
  onOpenDownload: (item: DownloadItem) => void;
  onRemoveDownload: (id: string) => void;
}

const DownloadsSheet = forwardRef<DownloadsSheetRef, DownloadsSheetProps>(
  ({ downloads, onClearDownloads, onOpenDownload, onRemoveDownload }, ref) => {
    const [visible, setVisible] = useState(false);
    const slideAnim = React.useRef(new Animated.Value(Dimensions.get('window').height)).current;

    // THEME COLORS
    const surfaceColor = useThemeColor({}, 'surface');
    const borderColor = useThemeColor({}, 'border');
    const backgroundColor = useThemeColor({}, 'background');
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

    const renderItem = ({ item }: { item: DownloadItem }) => (
      <TouchableOpacity
        style={[styles.downloadItem, { borderBottomColor: borderColor }]}
        onPress={() => onOpenDownload(item)}
        disabled={item.status !== 'completed'}
      >
        <View style={styles.downloadContent}>
          <View style={styles.downloadTextContainer}>
            <Text
              style={[styles.downloadName, { color: textColor }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {item.name}
            </Text>
            <Text
              style={[styles.downloadUrl, { color: textSecondaryColor }]}
              numberOfLines={1}
              ellipsizeMode="middle"
            >
              {item.url}
            </Text>
            <Text
              style={[
                styles.downloadStatus,
                { color: item.status === 'completed' ? primaryColor : textSecondaryColor },
              ]}
            >
              {item.status === 'downloading'
                ? `Downloading... ${Math.round(item.progress * 100)}%`
                : item.status === 'completed'
                ? 'Completed'
                : 'Failed'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => onRemoveDownload(item.id)}
          >
            <Trash2 size={20} color={textSecondaryColor} />
          </TouchableOpacity>
        </View>
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
              { backgroundColor: surfaceColor, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <View style={[styles.header, { borderBottomColor: borderColor }]}>
              <Text style={[styles.title, { color: textColor }]}>Downloads</Text>
              <View style={styles.headerButtons}>
                {downloads.length > 0 && (
                  <TouchableOpacity
                    style={styles.clearButton}
                    onPress={onClearDownloads}
                  >
                    <Trash2 size={20} color={textColor} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.closeButton} onPress={close}>
                  <X size={24} color={textColor} />
                </TouchableOpacity>
              </View>
            </View>
            {downloads.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: textSecondaryColor }]}>
                  No downloads
                </Text>
              </View>
            ) : (
              <FlatList
                data={downloads}
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
  downloadItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  downloadContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  downloadTextContainer: {
    flex: 1,
  },
  downloadName: {
    fontSize: 16,
    marginBottom: 2,
  },
  downloadUrl: {
    fontSize: 12,
  },
  downloadStatus: {
    fontSize: 12,
    marginTop: 2,
  },
  removeButton: {
    padding: 8,
    marginLeft: 8,
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
});

export default DownloadsSheet;