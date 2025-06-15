import { useBrowserStore } from '@/store/browserStore';
import React from 'react';
import { FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface DownloadsManagerProps {
  visible: boolean;
  onClose: () => void;
}

const DownloadsManager: React.FC<DownloadsManagerProps> = ({ visible, onClose }) => {
  const downloads = useBrowserStore((state) => state.downloads);
  const openDownload = useBrowserStore((state) => state.openDownload);
  const removeDownload = useBrowserStore((state) => state.removeDownload);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Downloads</Text>
          <FlatList
            data={downloads}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <View style={styles.item}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.status}>{item.status}</Text>
                <View style={styles.actions}>
                  <TouchableOpacity onPress={() => openDownload(item)}>
                    <Text style={styles.action}>Open</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeDownload(item.id)}>
                    <Text style={[styles.action, { color: 'red' }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            ListEmptyComponent={<Text style={styles.empty}>No downloads yet.</Text>}
          />
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  container: { backgroundColor: '#fff', borderRadius: 12, padding: 24, width: 320, maxHeight: '80%' },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  item: { marginBottom: 12 },
  name: { fontSize: 16, fontWeight: 'bold' },
  status: { fontSize: 12, color: '#888' },
  actions: { flexDirection: 'row', marginTop: 4 },
  action: { marginRight: 16, color: '#007aff', fontWeight: 'bold' },
  empty: { textAlign: 'center', color: '#888', marginTop: 32 },
  closeButton: { marginTop: 16, alignItems: 'center' },
  closeText: { color: '#007aff', fontWeight: 'bold', fontSize: 16 },
});

export default DownloadsManager;