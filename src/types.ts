export interface StockHistoryData {
  date: string;
  price: number;
}

export interface StockInfo {
  id: string; // Ticker symbol or index
  name: string; // e.g. 台積電
  code: string; // e.g. 2330.TW
  role: string; // e.g. 晶圓代工 (Upstream / Midstream / Downstream)
  roleCategory: 'upstream' | 'midstream' | 'downstream' | 'other';
  description: string; // Main business description
  advantage: string; // Dynamic competitive advantage
  recentReturn5D: number; // e.g. 1.5 (%)
  recentReturn1M: number; // e.g. 5.2 (%)
  recentReturn3M: number; // e.g. 15.4 (%)
  trendAnalysis: string; // Brief visual text description of recent trend
  whyBuy: string; // Major catalyst / investment thesis
  risk: string; // Potential investment risks
  historyData?: StockHistoryData[]; // Generated trend history array
}

export interface ChainStage {
  title: string;
  description: string;
  examples: string[];
}

export interface TopicResearchResult {
  title: string;
  query: string;
  description: string;
  marketDrivers: string[];
  keyFactors: string[];
  chainMap: {
    upstream: string;
    midstream: string;
    downstream: string;
  };
  stocks: StockInfo[];
  outlook: string;
  isFallback?: boolean;
  fallbackWarning?: string;
}

export interface SavedTopic {
  id: string;
  title: string;
  query: string;
  createdAt: string;
}

export interface PodcastEpisode {
  ep: string;
  date: string;
  title: string;
  summary: string;
  themes: string[]; // e.g. ["被動元件", "AI籌碼輪動", "台積電投信"]
  sentiment: 'positive' | 'observation' | 'neutral' | 'negative';
  industryTopic: string;
  individualStocks: string[];
  investmentAdvice: {
    title: string;
    action: string;
    details: string;
  };
}

export interface FocusNews {
  id: string;
  source: string;
  date: string;
  title: string;
  content: string;
  tags: string[];
  isPremium?: boolean;
}
