import { useThemeColor } from '@/hooks/useThemeColor';
import { useBrowserStore } from '@/store/browserStore';
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

interface WebViewContainerProps {
  tabId: string;
  url: string;
  onNavigationStateChange: (state: any) => void;
  onLoadProgress?: (progress: number) => void;
}

export interface WebViewContainerRef {
  goBack: () => void;
  goForward: () => void;
  reload: () => void;
}

const WebViewContainer = forwardRef<WebViewContainerRef, WebViewContainerProps>(
  ({ tabId, url, onNavigationStateChange, onLoadProgress }, ref) => {
    const webViewRef = useRef<WebView>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [iframeKey, setIframeKey] = useState(0);
    const updateTab = useBrowserStore((state) => state.updateTab);
    const addToHistory = useBrowserStore((state) => state.addToHistory);
    const backgroundColor = useThemeColor({}, 'background');
    const primaryColor = useThemeColor({}, 'primary');

    // Expose navigation methods to parent
    useImperativeHandle(ref, () => ({
      goBack: () => webViewRef.current?.goBack(),
      goForward: () => webViewRef.current?.goForward(),
      reload: () => webViewRef.current?.reload(),
    }));

    const handleStoreChange = useCallback((state: any) => {
      const tab = state.tabs.find((t: any) => t.id === tabId);
      if (!tab) return;
      if (tab.reloadRequested) {
        webViewRef.current?.reload?.();
        updateTab(tabId, { reloadRequested: false });
      }
    }, [tabId, updateTab]);

    useEffect(() => {
      const unsubscribe = useBrowserStore.subscribe(handleStoreChange);
      return () => unsubscribe();
    }, [handleStoreChange]);

    const handleLoadStart = () => {
      setIsLoading(true);
      updateTab(tabId, { isLoading: true, error: false });
    };

    const handleLoadEnd = (event: any) => {
      setIsLoading(false);

      const title = event.nativeEvent.title || url;
      const currentUrl = event.nativeEvent.url;

      updateTab(tabId, { 
        title, 
        url: currentUrl, 
        isLoading: false,
        favicon: event.nativeEvent.favicon,
        error: false,
      });

      addToHistory(currentUrl, title, event.nativeEvent.favicon);
    };

    const handleLoadError = () => {
      setIsLoading(false);
      updateTab(tabId, { isLoading: false, error: true });
    };

    return (
      <View style={[styles.container, { backgroundColor }]}>
        <WebView
          ref={webViewRef}
          source={{ uri: url }}
          onLoadStart={handleLoadStart}
          onLoadEnd={handleLoadEnd}
          onError={handleLoadError}
          onNavigationStateChange={onNavigationStateChange}
          onLoadProgress={event => {
            if (typeof onLoadProgress === 'function') {
              onLoadProgress(event.nativeEvent.progress);
            }
          }}
          style={styles.webView}
        />
      </View>
    );
  }
);

export default WebViewContainer;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: colors.dark.background,
  },
  webView: {
    flex: 1,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
});