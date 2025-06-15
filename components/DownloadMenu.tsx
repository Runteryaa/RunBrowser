import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface DownloadMenuProps {
  visible: boolean;
  url: string;
  defaultFileName: string;
  onDownload: (fileName: string) => void;
  onCancel: () => void;
}

const DownloadMenu: React.FC<DownloadMenuProps> = ({
  visible, url, defaultFileName, onDownload, onCancel
}) => {
  const [fileName, setFileName] = useState(defaultFileName);

  useEffect(() => {
    setFileName(defaultFileName);
  }, [defaultFileName, visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Download File</Text>
          <Text style={styles.label}>File Name:</Text>
          <TextInput
            style={styles.input}
            value={fileName}
            onChangeText={setFileName}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <View style={styles.buttons}>
            <TouchableOpacity style={styles.button} onPress={() => onDownload(fileName)}>
              <Text style={styles.buttonText}>Download</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.cancel]} onPress={onCancel}>
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  container: { backgroundColor: '#fff', borderRadius: 12, padding: 24, width: 300 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  label: { fontSize: 14, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 8, marginBottom: 16 },
  buttons: { flexDirection: 'row', justifyContent: 'space-between' },
  button: { flex: 1, alignItems: 'center', padding: 12, borderRadius: 6, backgroundColor: '#007aff', marginHorizontal: 4 },
  cancel: { backgroundColor: '#aaa' },
  buttonText: { color: '#fff', fontWeight: 'bold' },
});

export default DownloadMenu;