import AddressBar from '@/components/Browser/AddressBar';
import BookmarksSheet, { BookmarksSheetRef } from '@/components/Browser/BookmarksSheet';
import DownloadsSheet, { DownloadsSheetRef } from '@/components/Browser/DownloadsSheet';
import HistorySheet, { HistorySheetRef } from '@/components/Browser/HistorySheet';
import MenuSheet, { MenuSheetRef } from '@/components/Browser/MenuSheet';
import NavigationBar from '@/components/Browser/NavigationBar';
import TabsSheet, { TabsSheetRef } from '@/components/Browser/TabsSheet';
import WebViewContainer, { WebViewContainerRef } from '@/components/Browser/WebViewContainer';
import { colors } from '@/constants/colors';
import { useBrowserStore } from '@/store/browserStore';
import { Ionicons } from '@expo/vector-icons'; // For icons, or use lucide-react-native if you prefer
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, BackHandler, Button, FlatList, Image, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function BrowserScreen() {
  const insets = useSafeAreaInsets();
  const menuRef = useRef<MenuSheetRef>(null);
  const bookmarksRef = useRef<BookmarksSheetRef>(null);
  const historyRef = useRef<HistorySheetRef>(null);
  const webViewRef = useRef<WebViewContainerRef>(null);
  const tabsSheetRef = useRef<TabsSheetRef>(null);
  const downloadsRef = useRef<DownloadsSheetRef>(null);
  
  const [webViewState, setWebViewState] = useState({
    canGoBack: false,
    canGoForward: false,
  });
  
  const [progress, setProgress] = useState(0);
  const progressAnim = useRef(new Animated.Value(0)).current;
  
  const [tabMenuVisible, setTabMenuVisible] = useState(false);
  
  const tabs = useBrowserStore((state) => state.tabs);
  const activeTabId = useBrowserStore((state) => state.activeTabId);
  const bookmarks = useBrowserStore((state) => state.bookmarks);
  const settings = useBrowserStore((state) => state.settings);
  const downloads = useBrowserStore((state) => state.downloads);
  const addTab = useBrowserStore((state) => state.addTab);
  const closeTab = useBrowserStore((state) => state.closeTab);
  const setActiveTab = useBrowserStore((state) => state.setActiveTab);
  const navigateTo = useBrowserStore((state) => state.navigateTo);
  const updateTab = useBrowserStore((state) => state.updateTab);
  const addBookmark = useBrowserStore((state) => state.addBookmark);
  const removeBookmark = useBrowserStore((state) => state.removeBookmark);
  const clearDownloads = useBrowserStore((state) => state.clearDownloads);
  const openDownload = useBrowserStore((state) => state.openDownload);
  const removeDownload = useBrowserStore((state) => state.removeDownload);
  
  const activeTab = tabs.find((tab) => tab.id === activeTabId);
  
  useEffect(() => {
    if (tabs.length === 0) {
      addTab(settings.homePage);
    }
  }, [tabs.length, addTab, settings.homePage]);
  
  const handleBackPress = useCallback(() => {
    if (activeTab && webViewState.canGoBack) {
      webViewRef.current?.goBack();
      return true;
    } else if (tabs.length > 1) {
      closeTab(activeTabId!);
      return true;
    }
    return false;
  }, [activeTab, webViewState.canGoBack, tabs.length, closeTab, activeTabId]);

  useEffect(() => {
    if (Platform.OS === 'android') {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
      return () => backHandler.remove();
    }
  }, [handleBackPress]);
  
  const handleAddTab = () => {
    addTab(settings.homePage);
  };
  
  const handleReloadActiveTab = () => {
    if (activeTabId) {
      updateTab(activeTabId, { reloadRequested: true });
    }
  };
  
  const handleNavigationStateChange = (state: any) => {
    setWebViewState({
      canGoBack: state.canGoBack,
      canGoForward: state.canGoForward,
    });
  };
  
  const handleGoHome = () => {
    if (activeTabId) {
      navigateTo(activeTabId, settings.homePage || 'https://www.google.com');
    }
  };
  
  const handleBookmark = () => {
    if (activeTab) {
      const isBookmarked = bookmarks.some((bookmark) => bookmark.url === activeTab.url);
      
      if (isBookmarked) {
        const bookmarkToRemove = bookmarks.find((bookmark) => bookmark.url === activeTab.url);
        if (bookmarkToRemove) {
          removeBookmark(bookmarkToRemove.id);
        }
      } else {
        addBookmark(activeTab.url, activeTab.title, activeTab.favicon);
      }
    }
  };
  
  const isCurrentUrlBookmarked = activeTab 
    ? bookmarks.some((bookmark) => bookmark.url === activeTab.url)
    : false;
  
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 150,
      useNativeDriver: false,
    }).start();
  }, [progress]);
  
  const openTabMenu = () => setTabMenuVisible(true);
  const closeTabMenu = () => setTabMenuVisible(false);
  
  const getFavicon = (tab:any) =>
    tab.favicon
      ? { uri: tab.favicon }
      : require('@/assets/images/favicon.png');
  
  if (!activeTab) {
    return <View style={{ flex: 1, backgroundColor: colors.dark.background }} />;
  }
  
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />
      
      <AddressBar
        tabId={activeTab.id}
        url={activeTab.url}
        isLoading={!!activeTab.isLoading}
        onReload={handleReloadActiveTab}
      />
      
      <View style={styles.webViewContainer}>
        <WebViewContainer
          ref={webViewRef}
          tabId={activeTab.id}
          url={activeTab.url}
          onNavigationStateChange={handleNavigationStateChange}
          onLoadProgress={setProgress}
        />
        
        {activeTab.isLoading && (
          <Animated.View
            style={{
              height: 3,
              backgroundColor: colors.dark.primary,
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
              position: 'absolute',
              top: 0,
              left: 0,
              zIndex: 10,
            }}
          />
        )}
      </View>
      
      <NavigationBar
        canGoBack={webViewState.canGoBack}
        canGoForward={webViewState.canGoForward}
        isBookmarked={isCurrentUrlBookmarked}
        onGoBack={() => webViewRef.current?.goBack()}
        onGoForward={() => webViewRef.current?.goForward()}
        onHome={handleGoHome}
        onMenu={() => menuRef.current?.open()}
        onTabs={() => tabsSheetRef.current?.open()}
      />
      
      <MenuSheet
        ref={menuRef}
        onBookmarksPress={() => bookmarksRef.current?.open()}
        onHistoryPress={() => historyRef.current?.open()}
        onSettingsPress={() => {}}
        onDownloadsPress={() => downloadsRef.current?.open()}
        onSharePress={() => {}}
      />
      
      <BookmarksSheet
        ref={bookmarksRef}
        onBookmarkPress={(url) => {
          if (activeTabId) {
            navigateTo(activeTabId, url);
          }
        }}
      />
      
      <HistorySheet
        ref={historyRef}
        onHistoryItemPress={(url) => {
          if (activeTabId) {
            navigateTo(activeTabId, url);
          }
        }}
      />
      
      <DownloadsSheet
        ref={downloadsRef}
        downloads={downloads}
        onClearDownloads={clearDownloads}
        onOpenDownload={openDownload}
        onRemoveDownload={removeDownload}
      />
      
      {/* Modern Tab Menu */}
      <Modal
        visible={tabMenuVisible}
        animationType="slide"
        onRequestClose={closeTabMenu}
        transparent
      >
        <View style={styles.tabMenuOverlay}>
          <View style={styles.tabMenuSheet}>
            <View style={styles.tabMenuHeader}>
              <Text style={styles.tabMenuTitle}>Tabs ({tabs.length})</Text>
              <Button title="Done" onPress={closeTabMenu} />
            </View>
            <FlatList
              data={tabs}
              keyExtractor={tab => tab.id}
              horizontal={false}
              contentContainerStyle={{ paddingBottom: 80 }}
              renderItem={({ item }) => (
                <View style={styles.tabCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <View style={styles.faviconBox}>
                      <Image
                        source={getFavicon(item)}
                        style={styles.favicon}
                        resizeMode="contain"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        numberOfLines={1}
                        style={styles.tabCardTitle}
                      >
                        {item.title || item.url}
                      </Text>
                      <Text
                        numberOfLines={1}
                        style={styles.tabCardUrl}
                      >
                        {item.url}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.tabCloseButton}
                    onPress={() => closeTab(item.id)}
                  >
                    <Ionicons name="close" size={20} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    onPress={() => {
                      setActiveTab(item.id);
                      closeTabMenu();
                    }}
                  />
                </View>
              )}
            />
            <TouchableOpacity
              style={styles.fab}
              onPress={() => {
                handleAddTab();
                // closeTabMenu();
              }}
            >
              <Ionicons name="add" size={32} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      <TabsSheet
        ref={tabsSheetRef}
        tabs={tabs}
        activeTabId={activeTabId ?? ''}
        onTabPress={(id) => setActiveTab(id)}
        onTabClose={closeTab}
        onAddTab={handleAddTab}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  webViewContainer: {
    flex: 1,
  },
  tabMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  tabMenuSheet: {
    backgroundColor: '#23272f',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 16,
    paddingHorizontal: 16,
    maxHeight: '85%',
    minHeight: 300,
  },
  tabMenuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  tabMenuTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  tabCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2d313a',
    borderRadius: 12,
    marginBottom: 12,
    padding: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  faviconBox: {
    width: 32,
    height: 32,
    marginRight: 12,
    borderRadius: 6,
    backgroundColor: '#444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  favicon: {
    width: 24,
    height: 24,
    borderRadius: 4,
  },
  tabCardTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  tabCardUrl: {
    color: '#aaa',
    fontSize: 12,
  },
  tabCloseButton: {
    marginLeft: 8,
    padding: 4,
    zIndex: 2,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#4f8cff',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
});