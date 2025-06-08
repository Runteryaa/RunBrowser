import { colors } from '@/constants/colors';
import { useThemeColor } from '@/hooks/useThemeColor';
import { Tab } from '@/types/browser';
import { Plus, X } from 'lucide-react-native';
import React, { useRef } from 'react';
import {
  Animated,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

interface TabBarProps {
  tabs: Tab[];
  activeTabId: string | null;
  onTabPress: (id: string) => void;
  onTabClose: (id: string) => void;
  onAddTab: () => void;
}

export default function TabBar({ 
  tabs, 
  activeTabId, 
  onTabPress, 
  onTabClose, 
  onAddTab 
}: TabBarProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  const { width } = Dimensions.get('window');
  const tabWidth = Math.min(width * 0.35, 150);

  const tabBarColor = useThemeColor({}, 'tabBar');
  const borderColor = useThemeColor({}, 'border');
  const surfaceColor = useThemeColor({}, 'surface');
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const primaryColor = useThemeColor({}, 'primary');

  React.useEffect(() => {
    if (activeTabId && scrollViewRef.current) {
      const activeIndex = tabs.findIndex(tab => tab.id === activeTabId);
      if (activeIndex !== -1) {
        scrollViewRef.current.scrollTo({ 
          x: activeIndex * tabWidth, 
          animated: true 
        });
      }
    }
  }, [activeTabId, tabs, tabWidth]);

  return (
    <View style={[styles.container, { backgroundColor: tabBarColor, borderBottomColor: borderColor }]}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {tabs.map((tab) => (
          <TabItem
            key={tab.id}
            tab={tab}
            isActive={tab.id === activeTabId}
            onPress={() => onTabPress(tab.id)}
            onClose={() => onTabClose(tab.id)}
            width={tabWidth}
            textColor={textColor}
            textSecondaryColor={textSecondaryColor}
            primaryColor={primaryColor}
            surfaceColor={surfaceColor}
          />
        ))}
      </ScrollView>
      
      <TouchableOpacity style={styles.addButton} onPress={onAddTab}>
        <Plus size={20} color={colors.dark.text} />
      </TouchableOpacity>
    </View>
  );
}

interface TabItemProps {
  tab: Tab;
  isActive: boolean;
  onPress: () => void;
  onClose: () => void;
  width: number;
  textColor: string;
  textSecondaryColor: string;
  primaryColor: string;
  surfaceColor: string;
}

function TabItem({ 
  tab, 
  isActive, 
  onPress, 
  onClose, 
  width, 
  textColor, 
  textSecondaryColor, 
  primaryColor, 
  surfaceColor 
}: TabItemProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };
  
  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View 
      style={[
        styles.tabItem,
        isActive && styles.activeTab,
        { width, transform: [{ scale: scaleAnim }] }
      ]}
    >
      <TouchableOpacity
        style={styles.tabButton}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.7}
      >
        <Text 
          style={[
            styles.tabTitle, 
            isActive ? { color: textColor } : { color: textSecondaryColor }
          ]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {tab.title || 'New Tab'}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <X size={16} color={isActive ? colors.dark.text : colors.dark.textSecondary} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  scrollContent: {
    paddingLeft: 8,
    paddingRight: 50, // Space for add button
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 8,
    marginHorizontal: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.dark.surface,
  },
  activeTab: {
    backgroundColor: colors.dark.primary,
  },
  tabButton: {
    flex: 1,
  },
  tabTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  closeButton: {
    padding: 4,
    marginLeft: 4,
  },
  addButton: {
    position: 'absolute',
    right: 8,
    top: 8,
    bottom: 8,
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
    backgroundColor: colors.dark.surface,
    borderRadius: 8,
  },
});