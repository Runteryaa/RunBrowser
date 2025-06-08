import { useThemeColor } from '@/hooks/useThemeColor';
import { Ionicons } from '@expo/vector-icons';
import { ChevronLeft, ChevronRight, Home, Menu } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

interface NavigationBarProps {
  canGoBack: boolean;
  canGoForward: boolean;
  isBookmarked: boolean;
  onGoBack: () => void;
  onGoForward: () => void;
  onHome: () => void;
  onTabs: () => void;
  onMenu: () => void;
}

export default function NavigationBar({
  canGoBack,
  canGoForward,
  onGoBack,
  onGoForward,
  onHome,
  onTabs,
  onMenu,
}: NavigationBarProps) {
  const tabBarColor = useThemeColor({}, 'tabBar');
  const borderColor = useThemeColor({}, 'border');
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');

  return (
    <View style={[styles.container, { backgroundColor: tabBarColor, borderTopColor: borderColor }]}>
      <TouchableOpacity 
        style={[styles.navButton, !canGoBack && styles.disabledButton]} 
        onPress={onGoBack}
        disabled={!canGoBack}
      >
        <ChevronLeft size={24} color={canGoBack ? textColor : textSecondaryColor} />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.navButton, !canGoForward && styles.disabledButton]} 
        onPress={onGoForward}
        disabled={!canGoForward}
      >
        <ChevronRight 
          size={24} 
          color={canGoForward ? textColor : textSecondaryColor} 
        />
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.navButton} onPress={onHome}>
        <Home size={24} color={textColor} />
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.navButton} onPress={onTabs}>
        <Ionicons name="albums-outline" size={24} color={textColor} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.navButton} onPress={onMenu}>
        <Menu size={24} color={textColor} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  navButton: {
    padding: 8,
    borderRadius: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
});