import { useThemeColor } from '@/hooks/useThemeColor';
import { useBrowserStore } from '@/store/browserStore';
import { Lock, RefreshCw, X } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Keyboard,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

interface AddressBarProps {
  tabId: string;
  url: string;
  isLoading: boolean;
  onReload: () => void;
}

export default function AddressBar({ tabId, url, isLoading, onReload }: AddressBarProps) {
  const backgroundColor = useThemeColor({}, 'background');
  const addressBarColor = useThemeColor({}, 'addressBar');
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const primaryColor = useThemeColor({}, 'primary');

  const [inputValue, setInputValue] = useState(url);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const navigateTo = useBrowserStore((state) => state.navigateTo);
  const settings = useBrowserStore((state) => state.settings);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isFocused) {
      setInputValue(url);
    }
  }, [url, isFocused]);

  const handleSubmit = () => {
    Keyboard.dismiss();
    setIsFocused(false);

    const isUrl = inputValue.includes('.') && !inputValue.includes(' ');

    if (isUrl) {
      navigateTo(tabId, inputValue);
    } else {
      const searchQuery = encodeURIComponent(inputValue);
      let searchUrl = '';
      switch (settings.searchEngine) {
        case 'bing':
          searchUrl = `https://www.bing.com/search?q=${searchQuery}`;
          break;
        case 'duckduckgo':
          searchUrl = `https://duckduckgo.com/?q=${searchQuery}`;
          break;
        case 'yahoo':
          searchUrl = `https://search.yahoo.com/search?p=${searchQuery}`;
          break;
        case 'google':
        default:
          searchUrl = `https://www.google.com/search?q=${searchQuery}`;
      }
      navigateTo(tabId, searchUrl);
    }
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
    inputRef.current?.focus();
  };

  return (
    <Animated.View 
      style={[
        styles.container,
        { backgroundColor, transform: [{ scale: scaleAnim }] }
      ]}
    >
      <View style={[styles.addressBarContainer, { backgroundColor: addressBarColor }]}>
        {!isFocused && (
          <View style={styles.secureIconContainer}>
            <Lock size={16} color={textSecondaryColor} />
          </View>
        )}
        
        <TextInput
          ref={inputRef}
          style={[styles.input, { color: textColor }]}
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
          placeholderTextColor={textSecondaryColor}
        />
        
        {isFocused ? (
          <TouchableOpacity style={styles.iconButton} onPress={handleClear}>
            <X size={18} color={textSecondaryColor} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.iconButton} onPress={onReload}>
            {isLoading ? (
              <X size={18} color={textSecondaryColor} />
            ) : (
              <RefreshCw size={18} color={textSecondaryColor} />
            )}
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
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
  secureIconContainer: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
    ...Platform.select({
      web: {
        outlineWidth: 0,
      },
    }),
  },
  iconButton: {
    padding: 4,
  },
});