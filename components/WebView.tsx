import { useThemeColor } from '@/hooks/useThemeColor';
import { useBrowserStore } from '@/store/browserStore';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Alert, BackHandler, Image, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import VideoPlayer from '../app/(tabs)/VideoPlayer';

interface WebViewContainerProps {
  tabId: string;
  url: string;
  onNavigationStateChange: (state: any) => void;
  onLoadProgress?: (progress: number) => void;
  onMessage?: (event: any) => void;
  onContextMenu?: (payload: { type: string; href?: string; text?: string; src?: string }) => void;
  isPrivate?: boolean;
  onOpenVideoPlayer?: (video: { url: string; title?: string }) => void;
}


export interface WebViewContainerRef {
  goBack: () => void;
  goForward: () => void;
  stopLoading: () => void;
  injectJavaScript: (script: string) => Promise<void>;
}

interface ContextMenuData {
  type: string;
  href?: string;
  text?: string;
  src?: string;
  videoUrl?: string;
  title?: string;
  x?: number;
  y?: number;
}

function getFaviconUrl(pageUrl: string) {
  try {
    const { hostname } = new URL(pageUrl);
    return `https://www.google.com/s2/favicons?domain=${hostname}`;
  } catch {
    return undefined;
  }
}

const injectedFaviconScript = `
  (function() {
    function getFavicon() {
      var links = document.getElementsByTagName('link');
      for (var i = 0; i < links.length; i++) {
        var rel = links[i].getAttribute('rel');
        if (rel && rel.toLowerCase().includes('icon')) {
          return links[i].href;
        }
      }
      
      var metas = document.getElementsByTagName('meta');
      for (var i = 0; i < metas.length; i++) {
        var property = metas[i].getAttribute('property');
        if (property === 'og:image') {
          return metas[i].getAttribute('content');
        }
      }

      return window.location.origin + '/favicon.ico';
    }
    
    var favicon = getFavicon();
    if (window.ReactNativeWebView && favicon) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'favicon', favicon: favicon }));
    }
    
    var observer = new MutationObserver(function(mutations) {
      var newFavicon = getFavicon();
      if (window.ReactNativeWebView && newFavicon) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'favicon', favicon: newFavicon }));
      }
    });
    
    observer.observe(document.head, { childList: true, subtree: true });
  })();
  true;
`;

const longPressScript = `
  (function() {
    let timer;
    let startX, startY;
    
    function findVideoParent(element, maxDepth = 3) {
      let current = element;
      let depth = 0;
      while (current && depth < maxDepth) {
        if (current.tagName === 'VIDEO') return current;
        if (current.querySelector('video')) return current.querySelector('video');
        current = current.parentElement;
        depth++;
      }
      return null;
    }

    function sendContextMenu(type, href, text, src, videoUrl, title, x, y) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'contextMenu',
        payload: { type, href, text, src, videoUrl, title, x, y }
      }));
    }

    function getElementInfo(element, clientX, clientY) {
      const rect = element.getBoundingClientRect();
      const info = {
        x: clientX,
        y: clientY,
        tagName: element.tagName.toLowerCase(),
        className: element.className || '',
        id: element.id || ''
      };
      
      // Check if target is video or has video parent
      const video = element.tagName === 'VIDEO' ? element : findVideoParent(element);
      
      if (video) {
        return {
          ...info,
          type: 'video',
          videoUrl: video.currentSrc || video.src,
          title: document.title
        };
      } else if (element.tagName === 'A') {
        return {
          ...info,
          type: 'link',
          href: element.href,
          text: element.innerText || element.textContent
        };
      } else if (element.tagName === 'IMG') {
        const src = element.getAttribute('src');
        const absoluteSrc = new URL(src, window.location.href).href;
        return {
          ...info,
          type: 'image',
          src: absoluteSrc,
          alt: element.alt || ''
        };
      } else {
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();
        return {
          ...info,
          type: selectedText ? 'text' : 'other',
          text: selectedText
        };
      }
    }

    function handleTouchStart(e) {
      const target = e.target;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      
      timer = setTimeout(function() {
        const elementInfo = getElementInfo(target, startX, startY);
        sendContextMenu(
          elementInfo.type,
          elementInfo.href,
          elementInfo.text,
          elementInfo.src,
          elementInfo.videoUrl,
          elementInfo.title,
          elementInfo.x,
          elementInfo.y
        );
      }, 500);
    }

    function handleTouchEnd() {
      clearTimeout(timer);
    }

    function handleTouchMove(e) {
      if (Math.abs(e.touches[0].clientX - startX) > 10 || Math.abs(e.touches[0].clientY - startY) > 10) {
        clearTimeout(timer);
      }
    }

    // Handle elements in the main document
    document.addEventListener('touchstart', handleTouchStart, true);
    document.addEventListener('touchend', handleTouchEnd, true);
    document.addEventListener('touchmove', handleTouchMove, true);

    // Handle elements in iframes
    function addIframeListeners(iframe) {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        iframeDoc.addEventListener('touchstart', handleTouchStart, true);
        iframeDoc.addEventListener('touchend', handleTouchEnd, true);
        iframeDoc.addEventListener('touchmove', handleTouchMove, true);
      } catch (e) {
        // Handle cross-origin iframe errors silently
      }
    }

    // Observe for new iframes being added
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.tagName === 'IFRAME') {
            addIframeListeners(node);
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Add listeners to existing iframes
    document.querySelectorAll('iframe').forEach(addIframeListeners);
  })();
  true;
`;

const WebViewContainer = forwardRef<WebViewContainerRef, WebViewContainerProps>(
  ({
    tabId,
    url,
    onNavigationStateChange,
    onLoadProgress,
    onMessage,
    onContextMenu,
    isPrivate,
    onOpenVideoPlayer,
  }, ref) => {
    const webViewRef = useRef<WebView>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [canGoBack, setCanGoBack] = useState(false);
    const [canGoForward, setCanGoForward] = useState(false);
    const [previewUri, setPreviewUri] = useState<string | null>(null);
    const [contextMenuData, setContextMenuData] = useState<ContextMenuData | null>(null);
    const updateTab = useBrowserStore((state) => state.updateTab);
    const addToHistory = useBrowserStore((state) => state.addToHistory);
    const backgroundColor = useThemeColor({}, 'background');
    const primaryColor = useThemeColor({}, 'primary');
    const [siteFavicon, setSiteFavicon] = useState<string | undefined>(undefined);
    const updateHistoryFavicon = useBrowserStore((state) => state.updateHistoryFavicon);
    const updateBookmarkFavicon = useBrowserStore((state) => state.updateBookmarkFavicon);
    const favicons = useBrowserStore((state) => state.favicons);
    const updateFavicon = useBrowserStore((state) => state.updateFavicon);
    
    const [videoPlayerVisible, setVideoPlayerVisible] = useState(false);
    const [videoData, setVideoData] = useState<{
      url: string;
      title: string;
      duration: number;
      currentTime: number;
    } | null>(null);

    const getCachedFavicon = useCallback((url: string) => {
      try {
        const { hostname } = new URL(url);
        return favicons[hostname];
      } catch {
        return undefined;
      }
    }, [favicons]);

    useEffect(() => {
      const cachedFavicon = getCachedFavicon(url);
      if (cachedFavicon) {
        updateTab(tabId, { favicon: cachedFavicon });
      } else {
        const tempFavicon = getFaviconUrl(url);
        if (tempFavicon) {
          updateTab(tabId, { favicon: tempFavicon });
        }
      }
    }, [url, tabId, updateTab, getCachedFavicon]);

    useImperativeHandle(ref, () => ({
      goBack: () => {
        if (canGoBack) {
          webViewRef.current?.goBack();
        }
      },
      goForward: () => {
        if (canGoForward) {
          webViewRef.current?.goForward();
        }
      },
      stopLoading: () => webViewRef.current?.stopLoading(),
      injectJavaScript: async (script: string) => {
        if (webViewRef.current) {
          await webViewRef.current.injectJavaScript(script);
        }
      },
    }));

    useEffect(() => {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        if (canGoBack) {
          webViewRef.current?.goBack();
          return true;
        }
        return false;
      });

      return () => backHandler.remove();
    }, [canGoBack]);

    const handleContextMenuAction = useCallback((action: string) => {
      if (!contextMenuData) return;
      
      const { type, src, href, text, videoUrl } = contextMenuData;
      
      switch (action) {
        case 'copy':
          if (type === 'image') {
            Alert.alert('Copy Image', `Image URL: ${src}`);
          } else if (type === 'link') {
            Alert.alert('Copy Link', href);
          } else if (type === 'text') {
            Alert.alert('Copy Text', text);
          } else if (type === 'video') {
            Alert.alert('Copy Video', `Video URL: ${videoUrl}`);
          }
          break;
        case 'share':
          Alert.alert('Share', `Sharing ${type}`);
          break;
        case 'open':
          if (type === 'link' && href) {
            webViewRef.current?.injectJavaScript(`window.open('${href}', '_blank'); true;`);
          }
          break;
        case 'openNewTab':
          if (type === 'link' && href) {
            // You can implement opening in new tab here
            Alert.alert('Open in New Tab', href);
          }
          break;
        case 'saveImage':
          if (type === 'image') {
            Alert.alert('Save Image', `Saving image: ${src}`);
          }
          break;
        case 'playVideo':
          if (type === 'video' && videoUrl) {
            setVideoData({
              url: videoUrl,
              title: contextMenuData.title || 'Video',
              duration: 0,
              currentTime: 0
            });
            setVideoPlayerVisible(true);
          }
          break;
      }
      
      setContextMenuData(null);
    }, [contextMenuData]);

    
    const handleLoadStart = useCallback(() => {
      setIsLoading(true);
      setSiteFavicon(undefined);
      
      const cachedFavicon = getCachedFavicon(url);
      updateTab(tabId, { 
        isLoading: true, 
        error: false,
        favicon: cachedFavicon
      });
    }, [tabId, url, updateTab, getCachedFavicon]);

    const handleNavigationStateChange = useCallback((navState: any) => {
      setCanGoBack(navState.canGoBack);
      setCanGoForward(navState.canGoForward);
      
      if (navState.url) {
        const cachedFavicon = getCachedFavicon(navState.url);
        if (cachedFavicon) {
          updateTab(tabId, { favicon: cachedFavicon });
        }
      }
      
      onNavigationStateChange(navState);
    }, [onNavigationStateChange, tabId, updateTab, getCachedFavicon]);

    const handleLoadEnd = useCallback((event: any) => {
      setIsLoading(false);
      setPreviewUri(null);

      const title = event.nativeEvent.title || url;
      const currentUrl = event.nativeEvent.url;
      
      const newFavicon = siteFavicon || getFaviconUrl(currentUrl);
      const cachedFavicon = getCachedFavicon(currentUrl);

      if (newFavicon && newFavicon !== cachedFavicon) {
        try {
          const { hostname } = new URL(currentUrl);
          if (!isPrivate) {
            updateFavicon(hostname, newFavicon);
          }
        } catch {}
      }

      const favicon = newFavicon || cachedFavicon;

      updateTab(tabId, { 
        title, 
        url: currentUrl, 
        isLoading: false,
        favicon,
        error: false,
      });

      if (!isPrivate) {
        addToHistory(currentUrl, title, favicon);
      }
      setSiteFavicon(undefined);
    }, [tabId, url, updateTab, addToHistory, siteFavicon, getCachedFavicon, updateFavicon, isPrivate]);

    const handleLoadError = useCallback(() => {
      setIsLoading(false);
      updateTab(tabId, { isLoading: false, error: true });
    }, [tabId, updateTab]);

    const addTab = useBrowserStore((state) => state.addTab);

    const handleShouldStartLoadWithRequest = useCallback(
      (request: any) => {
        if (
          request.navigationType === 'click' &&
          request.target !== '_self' &&
          request.url !== url
        ) {
          // Open in new tab in-app
          if (addTab) {
            addTab(request.url, { private: !!isPrivate });
          }
          return false; // Prevent default navigation
        }
        // Allow all other navigations
        return true;
      },
      [addTab, isPrivate, url]
    );

    return (
      <View style={[styles.container, { backgroundColor }]}>
        <WebView
          ref={webViewRef}
          source={{ uri: url }}
          originWhitelist={['*']}
          setSupportMultipleWindows={false}
          onLoadStart={handleLoadStart}
          onLoadEnd={handleLoadEnd}
          onError={handleLoadError}
          onNavigationStateChange={handleNavigationStateChange}
          onLoadProgress={event => {
            if (typeof onLoadProgress === 'function') {
              onLoadProgress(event.nativeEvent.progress);
            }
          }}
          onMessage={event => {
            try {
              const data = JSON.parse(event.nativeEvent.data);
              if (data.type === 'newTab' && data.url) {
                addTab(data.url, { private: !!isPrivate });
                return;
              }
              if (data.type === 'videoPlay') {
                setVideoData(data.data);
                setVideoPlayerVisible(true);
                if (onMessage) {
                  onMessage(event);
                }
              }
              else if (data.type === 'favicon' && data.favicon && !isPrivate) {
                setSiteFavicon(data.favicon);
                updateTab(tabId, { favicon: data.favicon });
                updateHistoryFavicon(url, data.favicon);
                updateBookmarkFavicon(url, data.favicon);
                
                try {
                  const { hostname } = new URL(url);
                  updateFavicon(hostname, data.favicon);
                } catch {}
              }
              else if (data.type === 'contextMenu') {
                setContextMenuData(data.payload);
                if (onContextMenu) {
                  onContextMenu(data.payload);
                }
              }
              else if (data.type === 'videoPause') {
                if (videoData && videoData.url === data.data.url) {
                  setVideoData(prev => prev ? { ...prev, currentTime: data.data.currentTime } : null);
                }
              }
              else if (data.type === 'videoTimeUpdate') {
                if (videoData && videoData.url === data.data.url) {
                  setVideoData(prev => prev ? { ...prev, currentTime: data.data.currentTime } : null);
                }
              }
              else if (data.type === 'videoEnded') {
                if (videoData && videoData.url === data.data.url) {
                  setVideoPlayerVisible(false);
                  setVideoData(null);
                }
              }
              else if (data.type === 'videoPlay' && onOpenVideoPlayer) {
                onOpenVideoPlayer({
                  url: data.data.url,
                  title: data.data.title,
                });
              }
              
              if (onMessage && !isPrivate) {
                onMessage(event);
              }
            } catch (error) {
              console.error('Error handling WebView message:', error);
            }
          }}
          style={[styles.webView]}
          cacheEnabled={!isPrivate}
          cacheMode={isPrivate ? "LOAD_NO_CACHE" : "LOAD_CACHE_ELSE_NETWORK"}
          incognito={isPrivate}
          thirdPartyCookiesEnabled={!isPrivate}
          startInLoadingState={false}
          injectedJavaScript={`
            window.open = function(url, target, features) {
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'newTab', url }));
              }
              return null;
            };
            ${injectedFaviconScript}
            ${longPressScript}
            true;
          `}
          onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
        />
        {previewUri && isLoading && (
          <Image
            source={{ uri: previewUri }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        )}
        
        
        {videoPlayerVisible && videoData && (
          <VideoPlayer
            visible={videoPlayerVisible}
            videoUrl={videoData.url}
            title={videoData.title}
            onClose={() => {
              setVideoPlayerVisible(false);
              if (webViewRef.current) {
                webViewRef.current.injectJavaScript(`
                  document.querySelector('video[src="${videoData.url}"]')?.pause();
                  true;
                `);
              }
            }}
            webViewRef={webViewRef}
          />
        )}
      </View>
    );
  }
);

WebViewContainer.displayName = 'WebViewContainer';

export default WebViewContainer;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webView: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contextMenu: {
    borderRadius: 12,
    padding: 0,
    minWidth: 250,
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  contextMenuTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    textAlign: 'center',
  },
  menuItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#333',
  },
  cancelItem: {
    borderBottomWidth: 0,
  },
  cancelText: {
    color: '#ff4444',
    fontWeight: 'bold',
  },
});