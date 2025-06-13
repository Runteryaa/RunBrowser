export interface Tab {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  isLoading?: boolean;
  error?: boolean;
  reloadRequested?: boolean;
  private: boolean;
}

export interface Bookmark {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  createdAt: number;
}

export interface HistoryItem {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  visitedAt: number;
}

export interface BrowserSettings {
  searchEngine: 'google' | 'bing' | 'duckduckgo' | 'yahoo';
  blockAds: boolean;
  darkMode: boolean;
  defaultZoom: number;
  clearOnExit: boolean;
}