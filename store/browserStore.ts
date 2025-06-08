import { Bookmark, HistoryItem, Tab } from '@/types/browser'; // <-- remove BrowserSettings from here
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

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

interface BrowserState {
  tabs: Tab[];
  activeTabId: string | null;
  bookmarks: Bookmark[];
  history: HistoryItem[];
  settings: BrowserSettings;
  downloads: DownloadItem[];
  
  // Tab actions
  addTab: (url: string) => void;
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
  
  // History actions
  addToHistory: (url: string, title: string, favicon?: string) => void;
  clearHistory: () => void;
  
  // Settings actions
  updateSettings: (updates: Partial<BrowserSettings>) => void;

  // Download actions
  addDownload: (item: DownloadItem) => void;
  updateDownload: (id: string, updates: Partial<DownloadItem>) => void;
  removeDownload: (id: string) => void;
  clearDownloads: () => void;
  openDownload: (item: DownloadItem) => void; // You can implement this as needed
}

export const useBrowserStore = create<BrowserState>()(
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
        darkMode: false,
        clearOnExit: false,
      },
      downloads: [],
      
      addTab: (url) => {
        const newTab: Tab = {
          id: Date.now().toString(),
          url,
          title: 'New Tab',
          isLoading: true,
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
      
      goBack: (id) => {
      },
      
      goForward: (id) => {
      },
      
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
      
      openDownload: (item) => {
      },
    }),
    {
      name: 'browser-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        bookmarks: state.bookmarks,
        history: state.history,
        settings: state.settings,
        downloads: state.downloads,
      }),
    }
  )
);

const downloads = useBrowserStore((state) => state.downloads);