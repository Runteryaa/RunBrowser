import { useThemeColor } from '@/hooks/useThemeColor';
import { useBrowserStore } from '@/store/browserStore';
import { shareUrl } from '@/utils/share';
import * as Clipboard from 'expo-clipboard';
import { Copy, ExternalLink, Eye, Share2, X } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  Image,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import SecurityMenu, { SecurityMenuRef } from './SecurityMenu';
import { WebViewContainerRef } from './WebView';

interface AddressBarProps {
  tabId: string;
  url: string;
  isLoading: boolean;
  favicon?: string;
  isPrivate?: boolean;
  onReload?: () => void;
  onStopLoading?: () => void;
  webViewRef: React.RefObject<WebViewContainerRef | null>;
  onFaviconPress?: () => void;
  localStorageItems?: any[];
  cookies?: any[];
}

export default function AddressBar({ 
  tabId, 
  url, 
  isLoading, 
  favicon, 
  isPrivate,
  webViewRef,
  localStorageItems = [],
  cookies = []
}: AddressBarProps) {
  const [inputValue, setInputValue] = useState(url);
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const inputRef = useRef<TextInput>(null);
  const securityMenuRef = useRef<SecurityMenuRef>(null);
  const navigateTo = useBrowserStore((state) => state.navigateTo);
  const settings = useBrowserStore((state) => state.settings);
  const history = useBrowserStore((state) => state.history);
  const favicons = useBrowserStore((state) => state.favicons);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const background = useThemeColor({}, 'background');
  const addressBar = useThemeColor({}, 'addressBar');
  const text = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');

  const getCachedFavicon = useCallback((url: string) => {
    try {
      const { hostname } = new URL(url);
      return favicons[hostname];
    } catch {
      return undefined;
    }
  }, [favicons]);

  const currentFavicon = useMemo(() => {
    if (favicon) return favicon;
    return getCachedFavicon(url);
  }, [favicon, url, getCachedFavicon]);

  useEffect(() => {
    if (!isFocused) {
      setInputValue(url);
      setSuggestions([]);
    }
  }, [url, isFocused]);

  useEffect(() => {
    if (inputValue && isFocused) {
      let inputDomain = '';
      try {
        const inputUrl = new URL(inputValue.startsWith('http') ? inputValue : `https://${inputValue}`);
        inputDomain = inputUrl.hostname;
      } catch {
        inputDomain = inputValue;
      }

      const filteredHistory = history
        .filter(item => {
          try {
            const itemUrl = new URL(item.url);
            const itemDomain = itemUrl.hostname;
            
            const matchesInput = 
              item.url.toLowerCase().includes(inputValue.toLowerCase()) ||
              item.title.toLowerCase().includes(inputValue.toLowerCase());

            if (itemDomain === inputDomain) {
              return true;
            }

            return matchesInput;
          } catch {
            return item.url.toLowerCase().includes(inputValue.toLowerCase()) ||
                   item.title.toLowerCase().includes(inputValue.toLowerCase());
          }
        })
        .slice(0, 5);

      const uniqueSuggestions = filteredHistory.reduce((acc, current) => {
        const exists = acc.find(item => item.url === current.url);
        if (!exists) {
          acc.push(current);
        }
        return acc;
      }, [] as any[]);

      setSuggestions(uniqueSuggestions);
    } else {
      setSuggestions([]);
    }
  }, [inputValue, history, isFocused]);

  const getSearchUrl = (query: string) => {
    const searchEngines = {
      google: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
      bing: `https://www.bing.com/search?q=${encodeURIComponent(query)}`,
      duckduckgo: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
      yahoo: `https://search.yahoo.com/search?p=${encodeURIComponent(query)}`,
    };
    return searchEngines[settings.searchEngine as keyof typeof searchEngines] || searchEngines.google;
  };

  const handleSubmit = () => {
    Keyboard.dismiss();
    setIsFocused(false);
    setSuggestions([]);
    
    const isUrl = inputValue.includes('.') && !inputValue.includes(' ');
    
    if (isUrl) {
      const url = inputValue.startsWith('http') ? inputValue : `https://${inputValue}`;
      if (url !== url) {
        navigateTo(tabId, url);
      }
    } else {
      const searchUrl = getSearchUrl(inputValue);
      if (searchUrl !== url) {
        navigateTo(tabId, searchUrl);
      }
    }
  };

  const handleSuggestionPress = (suggestion: any) => {
    setInputValue(suggestion.url);
    navigateTo(tabId, suggestion.url);
    setIsFocused(false);
    setSuggestions([]);
  };

  const handleFocus = () => {
    setIsFocused(true);
    Animated.timing(scaleAnim, {
      toValue: 0.97,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const handleClear = () => {
    setInputValue('');
    setSuggestions([]);
    inputRef.current?.focus();
  };

  const handleFaviconPress = () => {
    securityMenuRef.current?.open();
  };

  const handleCopyUrl = async () => {
    await Clipboard.setStringAsync(url);
    Alert.alert('Success', 'URL copied to clipboard');
  };

  const handleShare = () => {
    shareUrl(url, url);
  };

  const handleOpenInProxy = () => {
    const proxyUrl = `https://www.croxyproxy.com/?url=${encodeURIComponent(url)}`;
    navigateTo(tabId, proxyUrl);
  };

  const renderSuggestion = ({ item, index }: { item: any; index: number }) => (
    <TouchableOpacity
      style={[
        styles.suggestionItem, 
        { borderBottomColor: border },
        index === suggestions.length - 1 && styles.lastSuggestionItem
      ]}
      onPress={() => handleSuggestionPress(item)}
    >
      <View style={styles.suggestionContent}>
        {item.favicon ? (
          <Image source={{ uri: item.favicon }} style={styles.suggestionFavicon} />
        ) : (
          <View style={[styles.faviconPlaceholder, { backgroundColor: textSecondary }]} />
        )}
        <View style={styles.suggestionTextContainer}>
          <Text style={[styles.suggestionTitle, { color: text }]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={[styles.suggestionUrl, { color: textSecondary }]} numberOfLines={1}>
            {item.url}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.outerContainer}>
      <Animated.View 
        style={[
          styles.container,
          { backgroundColor: background, transform: [{ scale: scaleAnim }] }
        ]}
      >
        <View style={[styles.addressBarContainer, { backgroundColor: addressBar } ]}>
          {!isFocused && (
            <TouchableOpacity onPress={handleFaviconPress}>
              {isPrivate ? (
                <Eye size={18} color={textSecondary} style={styles.favicon} />
              ) : currentFavicon ? (
                <Image
                  source={{ uri: currentFavicon }}
                  style={styles.favicon}
                  resizeMode="contain"
                />
              ) : (
                <Image
                  source={require('../assets/images/icon.png')}
                  style={styles.favicon}
                  resizeMode="contain"
                />
              )}
            </TouchableOpacity>
          )}
          
          <TextInput
            ref={inputRef}
            style={[styles.input, { color: text }]}
            value={inputValue}
            onChangeText={setInputValue}
            onSubmitEditing={handleSubmit}
            onFocus={handleFocus}
            onBlur={handleBlur}
            selectTextOnFocus
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            returnKeyType="go"
            placeholder="Search or enter website name"
            placeholderTextColor={textSecondary}
          />
          
          {isFocused && (
            <TouchableOpacity style={styles.iconButton} onPress={handleClear}>
              <X size={18} color={textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      {isFocused && suggestions.length > 0 && (
        <View style={[styles.buttonRow, { backgroundColor: addressBar }]}>
          <TouchableOpacity 
            style={[styles.actionButton, { borderColor: border }]} 
            onPress={handleCopyUrl}
          >
            <Copy size={16} color={text} />
            <Text style={[styles.buttonText, { color: text }]}>Copy URL</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, { borderColor: border }]} 
            onPress={handleShare}
          >
            <Share2 size={16} color={text} />
            <Text style={[styles.buttonText, { color: text }]}>Share</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, { borderColor: border }]} 
            onPress={handleOpenInProxy}
          >
            <ExternalLink size={16} color={text} />
            <Text style={[styles.buttonText, { color: text }]}>Open in Proxy</Text>
          </TouchableOpacity>
        </View>
      )}

      {isFocused && suggestions.length > 0 && (
        <View style={[styles.suggestionsContainer, { backgroundColor: surface }]}>
          <FlatList
            data={suggestions}
            renderItem={renderSuggestion}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      )}

      <SecurityMenu
        ref={securityMenuRef}
        url={url}
        onClose={() => {}}
        webViewRef={webViewRef}
        localStorageItems={localStorageItems}
        cookies={cookies}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    position: 'relative',
    zIndex: 1000,
  },
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  addressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  faviconContainer: {
    marginRight: 8,
  },
  favicon: {
    width: 18,
    height: 18,
    marginRight: 8,
    borderRadius: 3,
    backgroundColor: '#eee',
  },
  faviconPlaceholder: {
    width: 18,
    height: 18,
    marginRight: 8,
    borderRadius: 3,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
  },
  iconButton: {
    padding: 4,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 16,
    right: 16,
    maxHeight: 300,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  suggestionItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  lastSuggestionItem: {
    borderBottomWidth: 0,
  },
  suggestionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  suggestionFavicon: {
    width: 18,
    height: 18,
    borderRadius: 3,
    marginRight: 8,
  },
  suggestionTextContainer: {
    flex: 1,
  },
  suggestionTitle: {
    fontSize: 14,
    marginBottom: 2,
  },
  suggestionUrl: {
    fontSize: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
    marginHorizontal: 16,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    marginHorizontal: 4,
    justifyContent: 'center',
  },
  buttonText: {
    marginLeft: 6,
    fontSize: 14,
  },
});