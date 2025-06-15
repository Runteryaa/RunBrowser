import VideoPlayer from '@/app/(tabs)/VideoPlayer';
import AddressBar from '@/components/AddressBar';
import Bookmarks, { BookmarksRef } from '@/components/Bookmarks';
import ContextMenu from '@/components/ContextMenu';
import History, { HistoryRef } from '@/components/History';
import Menu, { MenuRef } from '@/components/Menu';
import Navbar from '@/components/Navbar';
import SecurityMenu, { SecurityMenuRef } from '@/components/SecurityMenu';
import TabMenu, { TabsSheetRef } from '@/components/TabMenu';
import WebView, { WebViewContainerRef } from '@/components/WebView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useBrowserStore } from '@/store/browserStore';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Animated, BackHandler, Platform, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function BrowserScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const menuRef = useRef<MenuRef>(null);
  const bookmarksRef = useRef<BookmarksRef>(null);
  const historyRef = useRef<HistoryRef>(null);
  const webViewRef = useRef<WebViewContainerRef>(null);
  const tabsSheetRef = useRef<TabsSheetRef>(null);
  const securityMenuRef = useRef<SecurityMenuRef>(null);
  
  const [webViewState, setWebViewState] = useState({
    canGoBack: false,
    canGoForward: false,
  });
  
  const [localStorageItems, setLocalStorageItems] = useState<any[]>([]);
  const [cookies, setCookies] = useState<any[]>([]);
  const [contextMenu, setContextMenu] = useState<{type: string, href?: string, text?: string, src?: string} | null>(null);
  const [videoAvailable, setVideoAvailable] = useState(false);

  const tabs = useBrowserStore((state: any) => state.tabs);
  const activeTabId = useBrowserStore((state: any) => state.activeTabId);
  const bookmarks = useBrowserStore((state: any) => state.bookmarks);
  const addTab = useBrowserStore((state: any) => state.addTab);
  const closeTab = useBrowserStore((state: any) => state.closeTab);
  const setActiveTab = useBrowserStore((state: any) => state.setActiveTab);
  const navigateTo = useBrowserStore((state: any) => state.navigateTo);
  const updateTab = useBrowserStore((state: any) => state.updateTab);
  const addBookmark = useBrowserStore((state: any) => state.addBookmark);
  const removeBookmark = useBrowserStore((state: any) => state.removeBookmark);
  
  const activeTab = tabs.find((tab: any) => tab.id === activeTabId);
  
  const background = useThemeColor({}, 'background');
  const border = useThemeColor({}, 'border');
  const text = useThemeColor({}, 'text');
  
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const settings = useBrowserStore((state: any) => state.settings);
  useEffect(() => {
    if (tabs.length === 0) {
      addTab(settings.homePage || 'https://www.google.com');
    }
  }, [tabs.length, addTab]);
  
  useEffect(() => {
    if (Platform.OS === 'android') {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        if (activeTab && webViewState.canGoBack) {
          return false;
        } else if (tabs.length > 1) {
            closeTab(activeTabId!);
          return true;
        }
        return false;
      });
      
      return () => backHandler.remove();
    }
  }, [activeTabId, webViewState.canGoBack, tabs.length]);
  
  const handleAddTab = (options?: { private?: boolean }) => {
    const settings = useBrowserStore.getState().settings;
    addTab(settings.homePage || 'https://www.google.com', options);
  };
  
  const handleNavigationStateChange = (state: any) => {
    setWebViewState({
      canGoBack: state.canGoBack,
      canGoForward: state.canGoForward,
    });
  };
  
  const handleHomePress = () => {
    if (activeTabId) {
      const settings = useBrowserStore.getState().settings;
      navigateTo(activeTabId, settings.homePage || 'https://www.google.com');
    }
  };
  
  const handleAddressBarSubmit = (url: string) => {
    if (activeTabId) {
      navigateTo(activeTabId, url);
    }
  };
  
  const handleBookmark = () => {
    if (activeTab) {
      const isBookmarked = bookmarks.some((bookmark: any) => bookmark.url === activeTab.url);
      
      if (isBookmarked) {
        const bookmarkToRemove = bookmarks.find((bookmark: any) => bookmark.url === activeTab.url);
        if (bookmarkToRemove) {
          removeBookmark(bookmarkToRemove.id);
        }
      } else {
        addBookmark(activeTab.url, activeTab.title, activeTab.favicon);
      }
    }
  };
  
  const isCurrentUrlBookmarked = activeTab 
    ? bookmarks.some((bookmark: any) => bookmark.url === activeTab.url)
    : false;
  
  const handleSettingsPress = () => {
    menuRef.current?.close();
    router.push('/settings');
  };


  const handleLoadProgress = (p:any) => {
    setProgress(p);
    Animated.timing(progressAnim, {
      toValue: p,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };
  
  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'videoPlay') {
        setVideoAvailable(true);
        setCurrentVideo(data.data);
      } else if (data.type === 'videoEnded') {
        setVideoAvailable(false);
        setCurrentVideo(null);
      } else if (data.type === 'cookies') {
        setCookies(data.data);
      } else if (data.type === 'localStorageData') {
        const items = Object.entries(data.data).map(([key, value]) => ({
          key,
          value: typeof value === 'string' ? value : JSON.stringify(value)
        }));
        setLocalStorageItems(items);
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  };
  
  const handleContextMenu = (payload: any) => {
    setContextMenu(payload);
    // Show your own modal or use a library for Android
    // Example: setContextMenu(payload) and render a custom modal below
  };
  
  const handleContextMenuAction = (action: string, payload: any) => {
    switch (action) {
      case 'openInVideoPlayer':
        if (payload.videoUrl) {
          setVideoPlayerVisible(true);
          setVideoData({
            url: payload.videoUrl,
            title: payload.title,
            duration: 0,
            currentTime: 0
          });
        }
        break;
      case 'openInNewTab':
        addTab(payload.src || payload.href);
        break;
      case 'openInPrivateTab':
        addTab(payload.src || payload.href, { private: true });
        break;
      case 'share':
        Share.share({ message: payload.href || payload.src || payload.videoUrl || '' });
        break;
      case 'copyLink':
        Clipboard.setString(payload.href || payload.src || payload.videoUrl || '');
        break;
      case 'copyText':
        Clipboard.setString(payload.text || '');
        break;
      case 'downloadLink':
        // TODO: implement download logic
        break;
      case 'downloadImage':
        // TODO: implement download logic
        break;
      default:
        break;
    }
  };
  
  if (!activeTab) {
    return null;
  }
  
  const [videoPlayerVisible, setVideoPlayerVisible] = useState(false);
  const [currentVideo, setCurrentVideo] = useState<any>(null);

  function setVideoData(video: any) {
    setCurrentVideo(video);
  }
  return (
    <View style={[styles.container, { backgroundColor: background, paddingTop: insets.top }]}>
      <StatusBar style="light" />
      
      <TabMenu
        ref={tabsSheetRef}
        tabs={tabs}
        activeTabId={activeTabId}
        onTabPress={setActiveTab}
        onTabClose={closeTab}
        onAddTab={handleAddTab}
      />
      
      <View style={{ position: 'relative' }}>
        <AddressBar
          tabId={activeTab.id}
          url={activeTab.url}
          isLoading={activeTab.isLoading}
          favicon={activeTab.favicon}
          onFaviconPress={() => securityMenuRef.current?.open()}
          webViewRef={webViewRef}
          localStorageItems={localStorageItems}
          cookies={cookies}
          isPrivate={activeTab.private}
        />
        {progress > 0 && progress < 1 && (
          <View style={styles.progressBarContainer}>
            <Animated.View
              style={[
                styles.progressBar,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
        )}
      </View>
      
      <View style={styles.webView}>
        <WebView
          ref={webViewRef}
          tabId={activeTab.id}
          url={activeTab.url}
          onNavigationStateChange={handleNavigationStateChange}
          onLoadProgress={handleLoadProgress}
          onMessage={handleWebViewMessage}
          onContextMenu={handleContextMenu}
          onOpenVideoPlayer={video => {
            setCurrentVideo(video);
            setVideoPlayerVisible(true);
          }}
        />
      </View>
      
      <Navbar
        canGoBack={webViewState.canGoBack}
        canGoForward={webViewState.canGoForward}
        onGoBack={() => {
          if (webViewState.canGoBack) {
            webViewRef.current?.goBack();
          }
        }}
        onGoForward={() => {
          if (webViewState.canGoForward) {
            webViewRef.current?.goForward();
          }
        }}
        onHome={handleHomePress}
        onTabs={() => tabsSheetRef.current?.open()}
        onMenu={() => menuRef.current?.open()}
      />
      
      <Menu
        ref={menuRef}
        onBookmarksPress={() => bookmarksRef.current?.open()}
        onHistoryPress={() => historyRef.current?.open()}
        onSettingsPress={handleSettingsPress}
        hasVideo={videoAvailable}
        onVideoPlayerPress={() => {
          if (currentVideo) {
            setVideoPlayerVisible(true);
            setVideoData(currentVideo);
          }
        }}
      />
      
      <Bookmarks
        ref={bookmarksRef}
        onBookmarkPress={(url: string) => {
          if (activeTabId) {
            navigateTo(activeTabId, url);
          }
        }}
      />
      
      <History
        ref={historyRef}
        onHistoryItemPress={(url: string) => {
          if (activeTabId) {
            navigateTo(activeTabId, url);
          }
        }}
      />

      <SecurityMenu
        ref={securityMenuRef}
        url={activeTab.url}
        onClose={() => {}}
        webViewRef={webViewRef}
        localStorageItems={localStorageItems}
        cookies={cookies}
      />

      <ContextMenu
        visible={!!contextMenu}
        payload={contextMenu}
        onClose={() => setContextMenu(null)}
        onAction={handleContextMenuAction}
      />

      {videoPlayerVisible && currentVideo && (
        <VideoPlayer
          visible={videoPlayerVisible}
          videoUrl={currentVideo.url}
          title={currentVideo.title}
          onClose={() => {
            setVideoPlayerVisible(false);
            setCurrentVideo(null);
          }}
          webViewRef={webViewRef}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webView: {
    flex: 1,
  },
  settingsContainer: {
    flex: 1,
    marginTop: 50,
  },
  settingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  settingsContent: {
    flex: 1,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsItemText: {
    fontSize: 16,
    marginLeft: 16,
  },
  progressBarContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
    backgroundColor: 'transparent',
    zIndex: 10,
    overflow: 'hidden',
  },
  progressBar: {
    height: 3,
    backgroundColor: '#007aff',
    borderRadius: 2,
  },
});