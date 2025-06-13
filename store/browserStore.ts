import { Bookmark, HistoryItem, Tab } from '@/types/browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist, subscribeWithSelector } from 'zustand/middleware';

export interface BrowserSettings {
  searchEngine: string;
  homePage: string;
  blockAds: boolean;
  darkMode: boolean;
  clearOnExit: boolean;
}

interface DownloadItem {
  id: string;
  name: string;
  url: string;
  status: 'downloading' | 'completed' | 'failed';
  progress: number; // 0-1
}

interface BrowserActions {
  addTab: (url: string, options?: { private?: boolean }) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTab: (id: string, updates: Partial<Tab>) => void;
  navigateTo: (id: string, url: string) => void;
  goBack: (id: string) => void;
  goForward: (id: string) => void;
  reload: (id: string) => void;
  addBookmark: (url: string, title: string, favicon?: string) => void;
  removeBookmark: (id: string) => void;
  updateBookmarkFavicon: (url: string, favicon: string) => void;
  addToHistory: (url: string, title: string, favicon?: string) => void;
  clearHistory: () => void;
  updateHistoryFavicon: (url: string, favicon: string) => void;
  updateSettings: (updates: Partial<BrowserSettings>) => void;
  addDownload: (item: DownloadItem) => void;
  updateDownload: (id: string, updates: Partial<DownloadItem>) => void;
  removeDownload: (id: string) => void;
  clearDownloads: () => void;
  openDownload: (item: DownloadItem) => void;
  updateFavicon: (hostname: string, favicon: string) => void;
  removeHistoryItem: (id: string) => void; // <-- Add this line
}

interface BrowserState {
  tabs: Tab[];
  activeTabId: string | null;
  bookmarks: Bookmark[];
  history: HistoryItem[];
  settings: BrowserSettings;
  downloads: DownloadItem[];
  favicons: Record<string, string>;

  // Tab actions
  addTab: (url: string, options?: { private?: boolean }) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTab: (id: string, updates: Partial<Tab>) => void;

  // Navigation actions
  navigateTo: (id: string, url: string) => void;
  goBack: (id: string) => void;
  goForward: (id: string) => void;
  reload: (id: string) => void;

  // Bookmark actions
  addBookmark: (url: string, title: string, favicon?: string) => void;
  removeBookmark: (id: string) => void;
  updateBookmarkFavicon: (url: string, favicon: string) => void;

  // History actions
  addToHistory: (url: string, title: string, favicon?: string) => void;
  clearHistory: () => void;
  updateHistoryFavicon: (url: string, favicon: string) => void;

  // Settings actions
  updateSettings: (updates: Partial<BrowserSettings>) => void;

  // Download actions
  addDownload: (item: DownloadItem) => void;
  updateDownload: (id: string, updates: Partial<DownloadItem>) => void;
  removeDownload: (id: string) => void;
  clearDownloads: () => void;
  openDownload: (item: DownloadItem) => void;

  // Favicon actions
  updateFavicon: (hostname: string, favicon: string) => void;
}

export const useBrowserStore = create<BrowserState & BrowserActions>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        tabs: [],
        activeTabId: null,
        bookmarks: [],
        history: [],
        settings: {
          searchEngine: 'google',
          homePage: 'https://www.google.com',
          blockAds: false,
          darkMode: true,
          clearOnExit: false,
        },
        downloads: [],
        favicons: {},

        addTab: (url, options = {}) => {
          const newTab: Tab = {
            id: Date.now().toString(),
            url,
            title: 'New Tab',
            isLoading: true,
            private: options.private || false,
          };

          set((state) => ({
            tabs: [...state.tabs, newTab],
            activeTabId: newTab.id,
          }));
        },

        closeTab: (id) => {
          set((state) => {
            const newTabs = state.tabs.filter((tab) => tab.id !== id);
            let newActiveTabId = state.activeTabId;

            if (state.activeTabId === id) {
              newActiveTabId = newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null;
            }

            return {
              tabs: newTabs,
              activeTabId: newActiveTabId,
            };
          });
        },

        setActiveTab: (id) => {
          set({ activeTabId: id });
        },

        updateTab: (id, updates) => {
          set((state) => ({
            tabs: state.tabs.map((tab) =>
              tab.id === id ? { ...tab, ...updates } : tab
            ),
          }));
        },

        navigateTo: (id, url) => {
          let formattedUrl = url;
          if (!url.startsWith('http://') && !url.startsWith('https://')) {
            formattedUrl = `https://${url}`;
          }

          set((state) => ({
            tabs: state.tabs.map((tab) =>
              tab.id === id ? { ...tab, url: formattedUrl, isLoading: true } : tab
            ),
          }));
        },

        goBack: (id) => {},

        goForward: (id) => {},

        reload: (id) => {
          set((state) => ({
            tabs: state.tabs.map((tab) =>
              tab.id === id ? { ...tab, isLoading: true } : tab
            ),
          }));
        },

        addBookmark: (url, title, favicon) => {
          const newBookmark: Bookmark = {
            id: Date.now().toString(),
            url,
            title,
            favicon,
            createdAt: Date.now(),
          };

          set((state) => ({
            bookmarks: [...state.bookmarks, newBookmark],
          }));
        },

        removeBookmark: (id) => {
          set((state) => ({
            bookmarks: state.bookmarks.filter((bookmark) => bookmark.id !== id),
          }));
        },

        updateBookmarkFavicon: (url, favicon) => {
          set((state) => ({
            bookmarks: state.bookmarks.map((item, idx) => {
              if (item.url === url && idx === state.bookmarks.findIndex(b => b.url === url)) {
                return { ...item, favicon };
              }
              return item;
            }),
          }));
        },

        addToHistory: (url, title, favicon) => {
          const newHistoryItem: HistoryItem = {
            id: Date.now().toString(),
            url,
            title,
            favicon,
            visitedAt: Date.now(),
          };

          set((state) => ({
            history: [newHistoryItem, ...state.history],
          }));
        },

        clearHistory: () => {
          set({ history: [] });
        },

        updateHistoryFavicon: (url, favicon) => {
          set((state) => ({
            history: state.history.map((item) =>
              item.url === url ? { ...item, favicon } : item
            ),
          }));
        },

        updateSettings: (updates) => {
          set((state) => ({
            settings: { ...state.settings, ...updates },
          }));
        },

        addDownload: (item) => {
          set((state) => ({
            downloads: [item, ...state.downloads],
          }));
        },

        updateDownload: (id, updates) => {
          set((state) => ({
            downloads: state.downloads.map((d) =>
              d.id === id ? { ...d, ...updates } : d
            ),
          }));
        },

        removeDownload: (id) => {
          set((state) => ({
            downloads: state.downloads.filter((d) => d.id !== id),
          }));
        },

        clearDownloads: () => {
          set({ downloads: [] });
        },

        openDownload: (item) => {},

        updateFavicon: (hostname, favicon) => set((state) => ({
          favicons: {
            ...state.favicons,
            [hostname]: favicon,
          },
        })),

        removeHistoryItem: (id: string) => set((state) => ({
          history: state.history.filter((item) => item.id !== id),
        })),
      }),
      {
        name: 'browser-storage',
        storage: createJSONStorage(() => AsyncStorage),
        partialize: (state) => {
          // Check if clearOnExit is enabled
          if (state.settings.clearOnExit) {
            // If clearOnExit is enabled, don't persist any tabs
            return {
              bookmarks: state.bookmarks,
              history: state.history,
              settings: state.settings,
              downloads: state.downloads,
              favicons: state.favicons,
              tabs: [],
              activeTabId: null,
            };
          }
          
          // Filter out private tabs when persisting
          const nonPrivateTabs = state.tabs.filter(tab => !tab.private);
          
          // If the active tab is private, we need to set activeTabId to null or the first non-private tab
          let persistedActiveTabId = state.activeTabId;
          if (persistedActiveTabId) {
            const activeTab = state.tabs.find(tab => tab.id === persistedActiveTabId);
            if (activeTab?.private) {
              persistedActiveTabId = nonPrivateTabs.length > 0 ? nonPrivateTabs[0].id : null;
            }
          }
          
          return {
            bookmarks: state.bookmarks,
            history: state.history,
            settings: state.settings,
            downloads: state.downloads,
            favicons: state.favicons,
            tabs: nonPrivateTabs,
            activeTabId: persistedActiveTabId,
          };
        },
      }
    )
  )
);
