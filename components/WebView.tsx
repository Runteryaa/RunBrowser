import { useThemeColor } from '@/hooks/useThemeColor';
import { useBrowserStore } from '@/store/browserStore';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { BackHandler, Image, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import VideoPlayer from './VideoPlayer';

interface WebViewContainerProps {
  tabId: string;
  url: string;
  onNavigationStateChange: (state: any) => void;
  onLoadProgress?: (progress: number) => void;
  onMessage?: (event: any) => void;
  onContextMenu?: (payload: { type: string; href?: string; text?: string; src?: string }) => void;
  isPrivate?: boolean; // <-- Add isPrivate prop
}

export interface WebViewContainerRef {
  goBack: () => void;
  goForward: () => void;
  stopLoading: () => void;
  injectJavaScript: (script: string) => Promise<void>;
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

    function sendContextMenu(type, href, text, src, videoUrl, title) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'contextMenu',
        payload: { type, href, text, src, videoUrl, title }
      }));
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

    function handleTouchStart(e) {
      const target = e.target;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      
      timer = setTimeout(function() {
        // Check if target is video or has video parent
        const video = target.tagName === 'VIDEO' ? target : findVideoParent(target);
        
        if (video) {
          sendContextMenu(
            'video',
            null,
            document.title,
            null,
            video.currentSrc || video.src,
            document.title
          );
        } else if (target.tagName === 'A') {
          sendContextMenu('link', target.href, target.innerText, null);
        } else if (target.tagName === 'IMG') {
          const src = target.getAttribute('src');
          // Handle relative URLs
          const absoluteSrc = new URL(src, window.location.href).href;
          sendContextMenu('image', null, null, absoluteSrc);
        }
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
  })();
  true;
`;

const WebViewContainer = forwardRef<WebViewContainerRef, WebViewContainerProps>(
  ({ tabId, url, onNavigationStateChange, onLoadProgress, onMessage, onContextMenu, isPrivate }, ref) => {
    const webViewRef = useRef<WebView>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [canGoBack, setCanGoBack] = useState(false);
    const [canGoForward, setCanGoForward] = useState(false);
    const [previewUri, setPreviewUri] = useState<string | null>(null);
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
  const [isInjectionSuccessful, setIsInjectionSuccessful] = useState(false);
  const injectionRetryCount = useRef(0);
  const MAX_RETRY_ATTEMPTS = 3;

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

    const verifyInjection = useCallback(() => {
      if (webViewRef.current) {
        webViewRef.current.injectJavaScript(`
          (function() {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'injectionVerification',
              success: true
            }));
            return true;
          })();
        `);
      }
    }, []);

    const retryInjection = useCallback(() => {
      if (injectionRetryCount.current < MAX_RETRY_ATTEMPTS) {
        injectionRetryCount.current += 1;
        console.log(`Retrying injection attempt ${injectionRetryCount.current}`);
        
        if (webViewRef.current) {
          webViewRef.current.injectJavaScript(`
            ${injectedFaviconScript}
            ${longPressScript}
            true;
          `);
          
          setTimeout(verifyInjection, 500);
        }
      } else {
        console.warn('Max injection retry attempts reached');
      }
    }, [verifyInjection]);

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

      // Only add to history if not private
      if (!isPrivate) {
        addToHistory(currentUrl, title, favicon);
      }
      setSiteFavicon(undefined);

      // Reset injection state for new page loads
      setIsInjectionSuccessful(false);
      injectionRetryCount.current = 0;
      
      // Verify injection after a short delay
      setTimeout(verifyInjection, 500);
    }, [tabId, url, updateTab, addToHistory, siteFavicon, getCachedFavicon, updateFavicon, isPrivate, verifyInjection]);

    const handleLoadError = useCallback(() => {
      setIsLoading(false);
      updateTab(tabId, { isLoading: false, error: true });
    }, [tabId, updateTab]);

    // Modify the onMessage handler
    const handleMessage = useCallback((event: any) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        
        if (data.type === 'injectionVerification') {
          setIsInjectionSuccessful(true);
          injectionRetryCount.current = 0;
          return;
        }

        // Only process other messages if injection was successful
        if (!isInjectionSuccessful && data.type !== 'injectionVerification') {
          retryInjection();
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
        else if (data.type === 'contextMenu' && onContextMenu) {
          onContextMenu(data.payload);
        }
        else if (data.type === 'videoPlay') {
          setVideoData(data.data);
          setVideoPlayerVisible(true);
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
        
        if (onMessage && !isPrivate) {
          onMessage(event);
        }
      } catch (error) {
        console.error('Error handling WebView message:', error);
      }
    }, [onMessage, tabId, url, updateTab, getCachedFavicon, updateFavicon, isPrivate, retryInjection, videoData, onContextMenu]);

    return (
      <View style={[styles.container, { backgroundColor }]}>
        <WebView
          ref={webViewRef}
          source={{ uri: url }}
          onLoadStart={handleLoadStart}
          onLoadEnd={handleLoadEnd}
          onError={handleLoadError}
          onNavigationStateChange={handleNavigationStateChange}
          onLoadProgress={event => {
            if (typeof onLoadProgress === 'function') {
              onLoadProgress(event.nativeEvent.progress);
            }
          }}
          onMessage={handleMessage}
          style={[styles.webView]}
          cacheEnabled={!isPrivate}
          cacheMode={isPrivate ? "LOAD_NO_CACHE" : "LOAD_CACHE_ELSE_NETWORK"}
          incognito={isPrivate}
          thirdPartyCookiesEnabled={!isPrivate}
          startInLoadingState={false}
          injectedJavaScript={`
            console.log('RunBrowser Script Injection');
            ${injectedFaviconScript}
            ${longPressScript}
            true;
          `}
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
              // Inject script to pause the video when closing the player
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
        
        {!isInjectionSuccessful && injectionRetryCount.current >= MAX_RETRY_ATTEMPTS && (
          <View style={styles.injectionFailureOverlay}>
            <Text style={styles.injectionFailureText}>
              Some features might be limited
            </Text>
          </View>
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
  injectionFailureOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 8,
    alignItems: 'center',
  },
  injectionFailureText: {
    color: '#fff',
    fontSize: 12,
  },
});
