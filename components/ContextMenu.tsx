import { useThemeColor } from '@/hooks/useThemeColor';
import { Copy, Download, Eye, Link2, PlusSquare, Share2 } from 'lucide-react-native';
import React from 'react';
import { Image, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ContextMenuProps {
  visible: boolean;
  payload: {
    type: string;
    src?: string;
    alt?: string;
    href?: string;
    text?: string;
    favicon?: string;
    title?: string;
    videoUrl?: string;
  } | null;
  onClose: () => void;
  onAction: (action: string, payload: any) => void;
}

const iconMap: Record<string, React.ElementType> = {
  'plus-box-outline': PlusSquare,
  'download': Download,
  'share-variant': Share2,
  'link-variant': Link2,
  'copy': Copy,
  'eye': Eye,
};

const ContextMenu: React.FC<ContextMenuProps> = ({ visible, payload, onClose, onAction }) => {
  const surface = useThemeColor({}, 'surface');
  const text = useThemeColor({}, 'text');
  const border = useThemeColor({}, 'border');
  const secondary = useThemeColor({}, 'textSecondary');
  const danger = '#ff3b30';

  if (!payload) return null;

  let actions: { label: string; action: string; icon: string }[] = [];
  let preview = null;

  if (payload.type === 'image') {
    actions = [
      { label: 'Open image in new tab', action: 'openInNewTab', icon: 'plus-box-outline' },
      { label: 'Open image in private tab', action: 'openInPrivateTab', icon: 'eye' },
      { label: 'Save image', action: 'downloadImage', icon: 'download' },
      { label: 'Share image', action: 'share', icon: 'share-variant' },
      { label: 'Copy image link', action: 'copyLink', icon: 'link-variant' },
    ];
    preview = (
      <View style={styles.previewSection}>
        {payload.src ? (
          <Image source={{ uri: payload.src }} style={styles.imagePreview} />
        ) : (
          <View style={[styles.imagePreview, { backgroundColor: border }]} />
        )}
        <Text style={[styles.urlText, { color: secondary }]} numberOfLines={2}>
          {payload.src}
        </Text>
      </View>
    );
  } else if (payload.type === 'link') {
    actions = [
      { label: 'Open link in new tab', action: 'openInNewTab', icon: 'plus-box-outline' },
      { label: 'Open link in private tab', action: 'openInPrivateTab', icon: 'eye' },
      { label: 'Share link', action: 'share', icon: 'share-variant' },
      { label: 'Copy link address', action: 'copyLink', icon: 'link-variant' },
      { label: 'Copy link text', action: 'copyText', icon: 'copy' },
      { label: 'Download link', action: 'downloadLink', icon: 'download' },
    ];
    preview = (
      <View style={styles.previewSection}>
        {payload.favicon ? (
          <Image source={{ uri: payload.favicon }} style={styles.imagePreview} />
        ) : (
          <View style={[styles.imagePreview, { backgroundColor: border }]} />
        )}
        <View style={{ flex: 1 }}>
          <Text style={[styles.linkTitle, { color: text }]} numberOfLines={1}>
            {payload.title || payload.text || payload.href}
          </Text>
          <Text style={[styles.urlText, { color: secondary }]} numberOfLines={1}>
            {payload.href}
          </Text>
        </View>
      </View>
    );
  } else if (payload.type === 'video') {
    actions = [
      { label: 'Open in Video Player', action: 'openInVideoPlayer', icon: 'play' },
      { label: 'Share video', action: 'share', icon: 'share-variant' },
      { label: 'Copy video link', action: 'copyLink', icon: 'link-variant' },
      { label: 'Download video', action: 'downloadVideo', icon: 'download' },
    ];
    preview = (
      <View style={styles.previewSection}>
        <View style={[styles.imagePreview, { backgroundColor: border }]} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.linkTitle, { color: text }]} numberOfLines={1}>
            {payload.title || 'Video'}
          </Text>
          <Text style={[styles.urlText, { color: secondary }]} numberOfLines={1}>
            {payload.videoUrl}
          </Text>
        </View>
      </View>
    );
  } else {
    return null;
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <View style={[styles.menu, { backgroundColor: surface, borderColor: border }]}>
          {preview}
          <View style={styles.divider} />
          {actions.map(({ label, action, icon }, idx) => {
            const IconComponent = iconMap[icon];
            return (
              <TouchableOpacity
                key={action}
                style={styles.menuItem}
                onPress={() => {
                  onAction(action, payload);
                  onClose();
                }}
              >
                {IconComponent && (
                  <IconComponent size={22} color={secondary} style={{ marginRight: 16 }} />
                )}
                <Text style={[styles.menuText, { color: text }]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
          <View style={styles.divider} />
          <TouchableOpacity style={styles.menuItem} onPress={onClose}>
            <Text style={[styles.menuText, { color: danger }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  menu: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    paddingBottom: 12,
    overflow: 'hidden',
  },
  previewSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  imagePreview: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#ccc',
  },
  linkTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  urlText: {
    flex: 1,
    fontSize: 13,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#2224',
    marginHorizontal: 8,
    marginVertical: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  menuText: {
    fontSize: 16,
  },
});

export default ContextMenu;