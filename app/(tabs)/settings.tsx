import { useColorScheme } from '@/hooks/useColorScheme';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useBrowserStore } from '@/store/browserStore';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import {
  ChevronRight,
  Home,
  Info,
  Moon,
  Search,
  Shield,
  Trash2,
  Zap
} from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import {
  BackHandler, Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const settings = useBrowserStore((state) => state.settings);
  const updateSettings = useBrowserStore((state) => state.updateSettings);
  const clearHistory = useBrowserStore((state) => state.clearHistory);
  const version = Constants.expoConfig?.version || 'pre-alpha.0.2';
  const { setColorScheme } = useColorScheme();

  const [modalVisible, setModalVisible] = useState(false);
  const [homePageInput, setHomePageInput] = useState(settings.homePage || '');

  const searchEngines = [
    { id: 'google', name: 'Google', url: 'https://www.google.com' },
    { id: 'bing', name: 'Bing', url: 'https://www.bing.com' },
    { id: 'duckduckgo', name: 'DuckDuckGo', url: 'https://duckduckgo.com' },
    { id: 'yahoo', name: 'Yahoo', url: 'https://www.yahoo.com' },
  ];

  const currentSearchEngine = searchEngines.find(
    (engine) => engine.id === settings.searchEngine
  );

  const handleSelectEngine = useCallback((engine: any) => {
    let newHomePage = settings.homePage;
    const prevEngine = searchEngines.find(e => e.id === settings.searchEngine);
    if (!settings.homePage || settings.homePage === prevEngine?.url) {
      newHomePage = engine.url;
      setHomePageInput(engine.url);
    }
    updateSettings({ searchEngine: engine.id, homePage: newHomePage });
    setModalVisible(false);
  }, [settings.homePage, settings.searchEngine, updateSettings]);

  const handleHomePageChange = useCallback((text: string) => {
    setHomePageInput(text);
    updateSettings({ homePage: text });
  }, [updateSettings]);

  const handleDarkModeToggle = useCallback((value: boolean) => {
    updateSettings({ darkMode: value });
    setColorScheme(value ? 'dark' : 'light');
  }, [updateSettings, setColorScheme]);

  const handleModalClose = useCallback(() => {
    setModalVisible(false);
  }, []);

  const handleModalOpen = useCallback(() => {
    setModalVisible(true);
  }, []);

  React.useEffect(() => {
    const onBackPress = () => {
      router.back();
      return true;    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [router]);

  const backgroundColor = useThemeColor({}, 'background');
  const surfaceColor = useThemeColor({}, 'surface');
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const primaryColor = useThemeColor({}, 'primary');
  const borderColor = useThemeColor({}, 'border');

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor }]}
        contentContainerStyle={styles.contentContainer}
      >
        <SettingsSection title="General" primaryColor={primaryColor}>
          <SettingsItem
            icon={<Search size={22} color={primaryColor} />}
            title="Search Engine"
            value={currentSearchEngine?.name}
            showArrow
            onPress={handleModalOpen}
            textColor={textColor}
            textSecondaryColor={textSecondaryColor}
            borderColor={borderColor}
          />

          <View style={styles.homePageContainer}>
            <View style={styles.iconContainer}>
              <Home size={22} color={primaryColor} />
            </View>
            <Text style={[styles.settingsItemTitle, { color: textColor }]}>Home Page</Text>
          </View>
          <TextInput
            style={[
              styles.homePageInput,
              { backgroundColor: surfaceColor, color: textColor }
            ]}
            value={homePageInput}
            onChangeText={setHomePageInput}
            onBlur={() => handleHomePageChange(homePageInput)}
            onSubmitEditing={() => handleHomePageChange(homePageInput)}
            placeholder="Enter home page URL"
            placeholderTextColor={textSecondaryColor}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            returnKeyType="done"
          />

          <SettingsItem
            icon={<Shield size={22} color={primaryColor} />}
            title="Block Ads"
            right={
              <Switch
                value={settings.blockAds}
                onValueChange={(value) => updateSettings({ blockAds: value })}
                trackColor={{ false: borderColor, true: primaryColor }}
                thumbColor="#fff"
              />
            }
            textColor={textColor}
            textSecondaryColor={textSecondaryColor}
            borderColor={borderColor}
          />

          <SettingsItem
            icon={<Moon size={22} color={primaryColor} />}
            title="Dark Mode"
            right={
              <Switch
                value={settings.darkMode}
                onValueChange={handleDarkModeToggle}
                trackColor={{ false: borderColor, true: primaryColor }}
                thumbColor="#fff"
              />
            }
            textColor={textColor}
            textSecondaryColor={textSecondaryColor}
            borderColor={borderColor}
          />
        </SettingsSection>

        <SettingsSection title="Privacy" primaryColor={primaryColor}>
          <SettingsItem
            icon={<Trash2 size={22} color={primaryColor} />}
            title="Clear Browsing Data"
            showArrow
            onPress={clearHistory}
            textColor={textColor}
            textSecondaryColor={textSecondaryColor}
            borderColor={borderColor}
          />

          <SettingsItem
            icon={<Zap size={22} color={primaryColor} />}
            title="Clear on Exit"
            right={
              <Switch
                value={settings.clearOnExit}
                onValueChange={(value) => updateSettings({ clearOnExit: value })}
                trackColor={{ false: borderColor, true: primaryColor }}
                thumbColor="#fff"
              />
            }
            textColor={textColor}
            textSecondaryColor={textSecondaryColor}
            borderColor={borderColor}
          />
        </SettingsSection>

        <SettingsSection title="About" primaryColor={primaryColor}>
          <SettingsItem
            icon={<Info size={22} color={primaryColor} />}
            title="Version"
            value={version}
            textColor={textColor}
            textSecondaryColor={textSecondaryColor}
            borderColor={borderColor}
          />
        </SettingsSection>
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleModalClose}
      >
        <Pressable style={styles.modalOverlay} onPress={handleModalClose}>
          <View style={[styles.modalContent, { backgroundColor: surfaceColor }]}>
            <Text style={[styles.modalTitle, { color: primaryColor }]}>Select Search Engine</Text>
            {searchEngines.map((engine) => (
              <TouchableOpacity
                key={engine.id}
                style={[
                  styles.engineOption,
                  settings.searchEngine === engine.id && { backgroundColor: primaryColor + '22' },
                ]}
                onPress={() => handleSelectEngine(engine)}
              >
                <Text
                  style={[
                    styles.engineOptionText,
                    { color: textColor },
                    settings.searchEngine === engine.id && { color: primaryColor, fontWeight: 'bold' },
                  ]}
                >
                  {engine.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
  primaryColor: string;
}

function SettingsSection({ title, children, primaryColor }: SettingsSectionProps) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: primaryColor }]}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

interface SettingsItemProps {
  icon: React.ReactNode;
  title: string;
  value?: string;
  right?: React.ReactNode;
  showArrow?: boolean;
  onPress?: () => void;
  textColor: string;
  textSecondaryColor: string;
  borderColor: string;
}

function SettingsItem({
  icon,
  title,
  value,
  right,
  showArrow = false,
  onPress,
  textColor,
  textSecondaryColor,
  borderColor,
}: SettingsItemProps) {
  const content = (
    <View style={[styles.settingsItem, { borderBottomColor: borderColor }]}>
      <View style={styles.settingsItemLeft}>
        <View style={styles.iconContainer}>{icon}</View>
        <Text style={[styles.settingsItemTitle, { color: textColor }]}>{title}</Text>
      </View>

      <View style={styles.settingsItemRight}>
        {value && <Text style={[styles.settingsItemValue, { color: textSecondaryColor }]}>{value}</Text>}
        {right}
        {showArrow && <ChevronRight size={20} color={textSecondaryColor} />}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 24,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  sectionContent: {
    borderRadius: 12,
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingsItemTitle: {
    fontSize: 16,
  },
  settingsItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsItemValue: {
    fontSize: 16,
    marginRight: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 16,
    padding: 24,
    width: 300,
    alignItems: 'stretch',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  engineOption: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  engineOptionText: {
    fontSize: 16,
    textAlign: 'center',
  },
  homePageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 4,
  },
  homePageInput: {
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 8,
    fontSize: 16,
  },
});