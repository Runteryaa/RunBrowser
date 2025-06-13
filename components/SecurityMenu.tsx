import { useThemeColor } from '@/hooks/useThemeColor';
import { useBrowserStore } from '@/store/browserStore';
import { AlertTriangle, Cookie, Database, Edit2, Lock, Shield, ShieldAlert, Trash2, X } from 'lucide-react-native';
import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { WebViewContainerRef } from './WebView';

export interface SecurityMenuRef {
  open: () => void;
  close: () => void;
}

interface SecurityMenuProps {
  url: string;
  onClose: () => void;
  webViewRef: React.RefObject<WebViewContainerRef | null>;
  localStorageItems?: StorageItem[];
  cookies?: CookieItem[];
}

interface StorageItem {
  key: string;
  value: string;
}

interface CookieItem {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  expires?: string;
  secure?: boolean;
  httpOnly?: boolean;
}

const SecurityMenu = forwardRef<SecurityMenuRef, SecurityMenuProps>(
  ({ url, onClose, webViewRef, localStorageItems = [], cookies = [] }, ref) => {
    const [visible, setVisible] = useState(false);
    const [showLocalStorage, setShowLocalStorage] = useState(false);
    const [showCookies, setShowCookies] = useState(false);
    const [editingItem, setEditingItem] = useState<{ type: 'localStorage' | 'cookie'; key: string; value: string } | null>(null);
    const slideAnim = useRef(new Animated.Value(Dimensions.get('window').height)).current;
    const settings = useBrowserStore((state) => state.settings);

    // Theme colors
    const surface = useThemeColor({}, 'surface');
    const border = useThemeColor({}, 'border');
    const text = useThemeColor({}, 'text');
    const textSecondary = useThemeColor({}, 'textSecondary');
    const background = useThemeColor({}, 'background');
    const primary = useThemeColor({}, 'primary');
    const secondary = useThemeColor({}, 'secondary');

    const loadLocalStorage = async () => {
      if (!webViewRef?.current) return;

      try {
        const script = `
          (function() {
            const items = {};
            // Force a complete localStorage check
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key) {
                items[key] = localStorage.getItem(key);
              }
            }
            // Also try getting all keys directly
            const allKeys = Object.keys(localStorage);
            for (const key of allKeys) {
              items[key] = localStorage.getItem(key);
            }
            console.log('All localStorage items:', items);
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'localStorageData',
              data: items
            }));
            true;
          })();
        `;

        await webViewRef.current.injectJavaScript(script);
      } catch (error) {
        console.error('Error loading localStorage:', error);
      }
    };

    const loadCookies = async () => {
      if (!webViewRef?.current) return;

      try {
        const script = `
          (function() {
            const cookies = document.cookie.split(';').map(cookie => {
              const [name, value] = cookie.trim().split('=');
              return { name, value };
            });
            console.log('Collected cookies:', cookies);
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'cookies',
              data: cookies
            }));
            true;
          })();
        `;

        await webViewRef.current.injectJavaScript(script);
      } catch (error) {
        console.error('Error loading cookies:', error);
      }
    };

    const open = () => {
      setVisible(true);
      setTimeout(() => {
        loadLocalStorage();
        loadCookies();
      }, 100);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    };

    const handleEditItem = (type: 'localStorage' | 'cookie', key: string, value: string) => {
      setEditingItem({ type, key, value });
    };

    const handleDeleteItem = async (type: 'localStorage' | 'cookie', key: string) => {
      if (!webViewRef?.current) return;

      try {
        if (type === 'localStorage') {
          const script = `
            localStorage.removeItem('${key}');
            true;
          `;
          await webViewRef.current.injectJavaScript(script);
        } else {
          const script = `document.cookie = '${key}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;'; true;`;
          await webViewRef.current.injectJavaScript(script);
        }
      } catch (error) {
        console.error('Error deleting item:', error);
      }
    };

    const handleClearAll = async (type: 'localStorage' | 'cookie') => {
      Alert.alert(
        'Clear All',
        `Are you sure you want to clear all ${type === 'localStorage' ? 'local storage items' : 'cookies'} for this website?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Clear',
            style: 'destructive',
            onPress: async () => {
              if (!webViewRef?.current) return;

              try {
                if (type === 'localStorage') {
                  const script = `
                    localStorage.clear();
                    true;
                  `;
                  await webViewRef.current.injectJavaScript(script);
                } else {
                  const script = `
                    (function() {
                      const cookies = document.cookie.split(';');
                      for (let i = 0; i < cookies.length; i++) {
                        const cookie = cookies[i];
                        const eqPos = cookie.indexOf('=');
                        const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
                        document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;';
                      }
                      true;
                    })();
                  `;
                  await webViewRef.current.injectJavaScript(script);
                }
              } catch (error) {
                console.error('Error clearing items:', error);
              }
            },
          },
        ]
      );
    };

    const handleSaveEdit = async () => {
      if (!editingItem || !webViewRef?.current) return;

      try {
        if (editingItem.type === 'localStorage') {
          const script = `
            localStorage.setItem('${editingItem.key}', '${editingItem.value}');
            true;
          `;
          await webViewRef.current.injectJavaScript(script);
        } else {
          const script = `document.cookie = '${editingItem.key}=${editingItem.value}; path=/;'; true;`;
          await webViewRef.current.injectJavaScript(script);
        }
        
        setEditingItem(null);
      } catch (error) {
        console.error('Error saving edit:', error);
      }
    };

    const close = () => {
      Animated.timing(slideAnim, {
        toValue: Dimensions.get('window').height,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        setVisible(false);
        if (webViewRef?.current) {
          const script = `
            localStorage.clear();
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'localStorageData',
              data: {}
            }));
            true;
          `;
          webViewRef.current.injectJavaScript(script);
        }
        onClose();
      });
    };

    useImperativeHandle(ref, () => ({
      open,
      close,
    }));

    const getSecurityInfo = () => {
      try {
        const urlObj = new URL(url);
        const isSecure = urlObj.protocol === 'https:';
        const hasValidCertificate = true;
        const isPrivate = urlObj.hostname.includes('localhost') || urlObj.hostname.includes('127.0.0.1');
        const isGoogleSafeBrowsing = true;

        return {
          isSecure,
          hasValidCertificate,
          isPrivate,
          isGoogleSafeBrowsing,
          hostname: urlObj.hostname,
          protocol: urlObj.protocol,
        };
      } catch {
        return {
          isSecure: false,
          hasValidCertificate: false,
          isPrivate: false,
          isGoogleSafeBrowsing: false,
          hostname: url,
          protocol: 'unknown',
        };
      }
    };

    const securityInfo = getSecurityInfo();

    const renderSecurityItem = (
      icon: React.ReactNode,
      title: string,
      value: string | React.ReactNode,
      color?: string,
      description?: string
    ) => (
      <View style={[styles.securityItem, { borderBottomColor: border }]}>
        <View style={styles.securityItemHeader}>
          {icon}
          <Text style={[styles.securityItemTitle, { color: text }]}>{title}</Text>
        </View>
        <Text style={[styles.securityItemValue, { color: color || textSecondary }]}>
          {value}
        </Text>
        {description && (
          <Text style={[styles.securityItemDescription, { color: textSecondary }]}>
            {description}
          </Text>
        )}
      </View>
    );

    const renderStorageItem = (
      type: 'localStorage' | 'cookie',
      items: StorageItem[] | CookieItem[],
      onEdit: (key: string, value: string) => void,
      onDelete: (key: string) => void
    ) => (
      <View style={styles.storageContainer}>
        <View style={styles.storageHeader}>
          <Text style={[styles.storageTitle, { color: text }]}>
            {type === 'localStorage' ? 'Local Storage Items' : 'Cookies'}
          </Text>
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => handleClearAll(type)}
          >
            <Text style={[styles.clearButtonText, { color: secondary }]}>Clear All</Text>
          </TouchableOpacity>
        </View>
        
        {items.length === 0 ? (
          <Text style={[styles.emptyText, { color: textSecondary }]}>
            No {type === 'localStorage' ? 'local storage items' : 'cookies'} found
          </Text>
        ) : (
          items.map((item) => {
            const key = 'key' in item ? item.key : item.name;
            const value = 'value' in item ? item.value : (item as CookieItem).value;
            return (
              <View key={key} style={styles.storageItem}>
                <View style={styles.storageItemContent}>
                  <Text style={[styles.storageItemKey, { color: text }]} numberOfLines={1}>
                    {key}
                  </Text>
                  <Text style={[styles.storageItemValue, { color: textSecondary }]} numberOfLines={2}>
                    {value}
                  </Text>
                  {'domain' in item && item.domain && (
                    <Text style={[styles.storageItemMeta, { color: textSecondary }]}>
                      Domain: {item.domain}
                    </Text>
                  )}
                  {'expires' in item && item.expires && (
                    <Text style={[styles.storageItemMeta, { color: textSecondary }]}>
                      Expires: {new Date(item.expires).toLocaleString()}
                    </Text>
                  )}
                </View>
                <View style={styles.storageItemActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => onEdit(key, value)}
                  >
                    <Edit2 size={16} color={textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => onDelete(key)}
                  >
                    <Trash2 size={16} color={textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
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
            <View style={[styles.header, { borderBottomColor: border }]}>
              <View style={styles.headerTitle}>
                <Shield size={24} color={primary} />
                <Text style={[styles.title, { color: text }]}>Security Info</Text>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={close}>
                <X size={24} color={text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.content}>
              
              {renderSecurityItem(
                <Lock size={20} color={securityInfo.isSecure ? primary : secondary} />,
                'Connection',
                `${securityInfo.isSecure ? 'Secure (HTTPS)' : 'Not Secure (HTTP)'} • ${securityInfo.isPrivate ? 'Private Network' : 'Public Network'}`,
                securityInfo.isSecure ? primary : secondary,
                `${securityInfo.isSecure 
                  ? 'Your connection to this site is encrypted and secure.'
                  : 'Your connection to this site is not secure.'}\n` +
                `${securityInfo.isPrivate
                  ? 'You are accessing a private network.'
                  : 'You are accessing a public network.'}`
              )}

              {renderSecurityItem(
                <AlertTriangle size={20} color={settings.blockAds ? primary : textSecondary} />,
                'Ad Blocking',
                settings.blockAds ? 'Enabled' : 'Disabled',
                settings.blockAds ? primary : textSecondary,
                settings.blockAds
                  ? 'Ads and trackers are being blocked'
                  : 'Ads and trackers are not being blocked'
              )}

              <TouchableOpacity
                style={[styles.securityItem, { borderBottomColor: border }]}
                onPress={() => setShowLocalStorage(!showLocalStorage)}
              >
                <View style={styles.securityItemHeader}>
                  <Database size={20} color={textSecondary} />
                  <Text style={[styles.securityItemTitle, { color: text }]}>Local Storage</Text>
                </View>
                <Text style={[styles.securityItemValue, { color: textSecondary }]}>
                  {localStorageItems.length} items
                </Text>
              </TouchableOpacity>
              
              {showLocalStorage && renderStorageItem(
                'localStorage',
                localStorageItems,
                (key, value) => handleEditItem('localStorage', key, value),
                (key) => handleDeleteItem('localStorage', key)
              )}

              <TouchableOpacity
                style={[styles.securityItem, { borderBottomColor: border }]}
                onPress={() => setShowCookies(!showCookies)}
              >
                <View style={styles.securityItemHeader}>
                  <Cookie size={20} color={textSecondary} />
                  <Text style={[styles.securityItemTitle, { color: text }]}>Cookies</Text>
                </View>
                <Text style={[styles.securityItemValue, { color: textSecondary }]}>
                  {cookies.length} items
                </Text>
              </TouchableOpacity>
              
              {showCookies && renderStorageItem(
                'cookie',
                cookies,
                (key, value) => handleEditItem('cookie', key, value),
                (key) => handleDeleteItem('cookie', key)
              )}

            </ScrollView>
          </Animated.View>
        </View>

        {editingItem && (
          <Modal
            visible={true}
            transparent
            animationType="fade"
            onRequestClose={() => setEditingItem(null)}
          >
            <View style={styles.editModalOverlay}>
              <View style={[styles.editModal, { backgroundColor: surface }]}>
                <Text style={[styles.editModalTitle, { color: text }]}>
                  Edit {editingItem.type === 'localStorage' ? 'Local Storage Item' : 'Cookie'}
                </Text>
                <Text style={[styles.editModalLabel, { color: text }]}>Key</Text>
                <Text style={[styles.editModalValue, { color: textSecondary }]}>
                  {editingItem.key}
                </Text>
                <Text style={[styles.editModalLabel, { color: text }]}>Value</Text>
                <TextInput
                  style={[styles.editModalInput, { color: text, borderColor: border }]}
                  value={editingItem.value}
                  onChangeText={(value) => setEditingItem({ ...editingItem, value })}
                  multiline
                />
                <View style={styles.editModalActions}>
                  <TouchableOpacity
                    style={[styles.editModalButton, { backgroundColor: secondary }]}
                    onPress={() => setEditingItem(null)}
                  >
                    <Text style={styles.editModalButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.editModalButton, { backgroundColor: primary }]}
                    onPress={handleSaveEdit}
                  >
                    <Text style={styles.editModalButtonText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}
      </Modal>
    );
  }
);

SecurityMenu.displayName = 'SecurityMenu';

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
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 16,
  },
  securityItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  securityItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  securityItemTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  securityItemValue: {
    fontSize: 14,
    marginLeft: 28,
  },
  securityItemDescription: {
    fontSize: 12,
    marginLeft: 28,
    marginTop: 2,
  },
  storageContainer: {
    marginTop: 8,
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  storageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  storageTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  clearButton: {
    padding: 4,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  storageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  storageItemContent: {
    flex: 1,
    marginRight: 8,
  },
  storageItemKey: {
    fontSize: 14,
    fontWeight: '500',
  },
  storageItemValue: {
    fontSize: 12,
    marginTop: 2,
  },
  storageItemMeta: {
    fontSize: 10,
    marginTop: 2,
    fontStyle: 'italic',
  },
  storageItemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 4,
  },
  editModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editModal: {
    width: '80%',
    padding: 16,
    borderRadius: 12,
  },
  editModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  editModalLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  editModalValue: {
    fontSize: 14,
    marginBottom: 12,
  },
  editModalInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  editModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 16,
  },
  editModalButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editModalButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    padding: 16,
    fontStyle: 'italic',
  },
});

export default SecurityMenu;