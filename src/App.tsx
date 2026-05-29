import React, { useState, useEffect } from 'react';
import {
  Search,
  BookOpen,
  Smartphone,
  Star,
  Github,
  HelpCircle,
  ToggleLeft,
  ToggleRight,
  TrendingUp,
  Award,
  Sparkles,
  RefreshCw,
  Trash2,
  Bookmark,
  Layers,
  ChevronRight,
  Info,
  Clock,
  Heart,
  BadgeAlert,
  ArrowRight
} from 'lucide-react';
import TopicDetails from './components/TopicDetails';
import InstallGuide from './components/InstallGuide';

// Import our modular components
import DailyFocus from './components/DailyFocus';
import ThemesOverview from './components/ThemesOverview';
import CompanyDatabase from './components/CompanyDatabase';
import PodcastBeta from './components/PodcastBeta';
import PodcastThemeTracker from './components/PodcastThemeTracker';
import MarketHeatmap from './components/MarketHeatmap';
import AIAnalysis from './components/AIAnalysis';
import CloudflareCenter from './components/CloudflareCenter';

import { TopicResearchResult, SavedTopic } from './types';

const SLUG_TO_TOPIC: Record<string, string> = {
  'asic-ip-design': 'ASIC IP 設計',
  'cpo-silicon-photonics': '矽光子',
  'liquid-cooling': '液冷散熱',
  'gb200': 'GB200 伺服器',
  'cowos': 'CoWoS 先進封裝',
  'leo-satellite': '低軌衛星',
  'humanoid-robot': '人形機器人'
};

const TOPIC_TO_SLUG: Record<string, string> = {
  'ASIC IP 設計': 'asic-ip-design',
  '矽光子': 'cpo-silicon-photonics',
  '矽光子 CPO': 'cpo-silicon-photonics',
  '液冷散熱': 'liquid-cooling',
  'GB200 伺服器': 'gb200',
  'GB200': 'gb200',
  'CoWoS 先進封裝': 'cowos',
  '低軌衛星': 'leo-satellite',
  '人形機器人': 'humanoid-robot'
};

const MAIN_TABS = [
  { id: 'podcast-tracker', label: '股癌題材追蹤', icon: '🎯' },
  { id: 'daily', label: '每日焦點', icon: '🔥' },
  { id: 'themes', label: '題材總覽', icon: '🗂️' },
  { id: 'topic-details', label: '題材細節', icon: '📊' },
  { id: 'chain-map', label: '產業地圖', icon: '🗺️' },
  { id: 'company-db', label: '公司資料庫', icon: '🏢' },
  { id: 'podcast', label: '財經節目(Beta)', icon: '🎙️' },
  { id: 'heatmap', label: '市場熱力圖', icon: '🌡️' },
  { id: 'ai-lab', label: 'AI 分析', icon: '🔬' },
  { id: 'cloudflare', label: '雲端部署中心', icon: '☁️' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('podcast-tracker');
  const [searchQuery, setSearchQuery] = useState('');
  const [isResearching, setIsResearching] = useState(false);
  const [researchStep, setResearchStep] = useState(0);
  const [researchedData, setResearchedData] = useState<TopicResearchResult | null>(null);
  const [isTaiwanStyle, setIsTaiwanStyle] = useState(true); // true = Red is up / Green is down (taiwanese)
  const [savedTopics, setSavedTopics] = useState<SavedTopic[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [topicDetailsSubTab, setTopicDetailsSubTab] = useState<'overview' | 'chain' | 'stocks' | 'chart'>('overview');
  const [showAndroidInstall, setShowAndroidInstall] = useState(false);
  const [showWatchlistDropdown, setShowWatchlistDropdown] = useState(false);

  // Simulation steps for search loading states
  const loadingSteps = [
    '正在解析股市核心議題關鍵熱度...',
    '正在透過 Google Search 網頁搜尋，抓取最新產業情報及相關個股...',
    '正在過濾、關連其上下游供應鏈結構與公司代號...',
    '正在比算最新營收驅動與模擬股價累積走勢數據...',
    '智能整合分析中，即將呈現完美研究圖表...'
  ];

  // Load bookmarks and search history
  useEffect(() => {
    try {
      const saved = localStorage.getItem('stock_saved_topics');
      if (saved) setSavedTopics(JSON.parse(saved));

      const history = localStorage.getItem('stock_search_history');
      if (history) setSearchHistory(JSON.parse(history));
    } catch (e) {
      console.error('Failed to load storage values', e);
    }
  }, []);

  // Preset default research on mount if no topic is in query parameter, ensuring rich initial data
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rawTopic = params.get('topic');
    if (!rawTopic && !researchedData) {
      executeResearch('ASIC IP 設計', 'overview', false);
    }
  }, []);

  // Handle step increments during loading stimulation
  useEffect(() => {
    let interval: any;
    if (isResearching) {
      setResearchStep(0);
      interval = setInterval(() => {
        setResearchStep((prev) => {
          if (prev < loadingSteps.length - 1) return prev + 1;
          return prev;
        });
      }, 1500);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isResearching]);

  const executeResearch = async (queryText: string, targetSubTab?: 'overview' | 'chain' | 'stocks' | 'chart', autoSwitchTab = true) => {
    if (!queryText || queryText.trim() === '') return;
    setIsResearching(true);
    setSearchQuery(queryText);

    try {
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryText })
      });

      if (!response.ok) {
        throw new Error('伺服器連線或研究 API 執行失敗');
      }

      const result: TopicResearchResult = await response.json();
      setResearchedData(result);

      // Save to recent search history
      setSearchHistory((prev) => {
        const filtered = prev.filter(h => h !== queryText);
        const updated = [queryText, ...filtered].slice(0, 5);
        localStorage.setItem('stock_search_history', JSON.stringify(updated));
        return updated;
      });

      if (autoSwitchTab) {
        setActiveTab('topic-details');
      }

      const subTab = targetSubTab || topicDetailsSubTab || 'overview';
      setTopicDetailsSubTab(subTab);

      // Update URL with pushState for new research query
      const params = new URLSearchParams();
      const slug = TOPIC_TO_SLUG[result.title] ?? TOPIC_TO_SLUG[result.query] ?? encodeURIComponent(queryText);
      params.set('topic', slug);
      params.set('activeTab', subTab);
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.pushState({ topic: result.title, activeTab: subTab }, '', newUrl);

    } catch (error) {
      console.error('Research query failed:', error);
      alert('研究請求時發生錯誤，請確認網路或稍後再試。');
    } finally {
      setIsResearching(false);
    }
  };

  // Sync URL on mount & popstate
  useEffect(() => {
    const handleUrlSync = () => {
      const params = new URLSearchParams(window.location.search);
      const rawTopic = params.get('topic');
      const rawTab = params.get('activeTab') as any;

      let targetSubTab: 'overview' | 'chain' | 'stocks' | 'chart' = 'overview';
      if (rawTab && ['overview', 'chain', 'stocks', 'chart'].includes(rawTab)) {
        targetSubTab = rawTab;
        setTopicDetailsSubTab(rawTab);
      }

      if (rawTopic) {
        let decodedTopic = rawTopic;
        if (SLUG_TO_TOPIC[rawTopic]) {
          decodedTopic = SLUG_TO_TOPIC[rawTopic];
        } else {
          try {
            decodedTopic = decodeURIComponent(rawTopic);
          } catch (e) {
            // ignore
          }
        }
        setSearchQuery(decodedTopic);
        
        // Prevent double loading
        if (!researchedData || (researchedData.title !== decodedTopic && researchedData.query !== decodedTopic)) {
          executeResearch(decodedTopic, targetSubTab, true);
        }
      }
    };

    window.addEventListener('popstate', handleUrlSync);
    return () => window.removeEventListener('popstate', handleUrlSync);
  }, [researchedData]);

  const handleSaveTopic = () => {
    if (!researchedData) return;

    const exists = savedTopics.find(t => t.title === researchedData.title);
    if (exists) {
      // Remove bookmark
      const updated = savedTopics.filter(t => t.title !== researchedData.title);
      setSavedTopics(updated);
      localStorage.setItem('stock_saved_topics', JSON.stringify(updated));
    } else {
      // Add bookmark
      const newTopic: SavedTopic = {
        id: Date.now().toString(),
        title: researchedData.title,
        query: researchedData.query,
        createdAt: new Date().toLocaleDateString('zh-TW')
      };
      const updated = [...savedTopics, newTopic];
      setSavedTopics(updated);
      localStorage.setItem('stock_saved_topics', JSON.stringify(updated));
    }
  };

  const isCurrentTopicSaved = researchedData
    ? savedTopics.some(t => t.title === researchedData.title)
    : false;

  const handleSelectThemeFromOverview = (query: string) => {
    executeResearch(query, 'overview', true);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1F26] font-sans antialiased pb-12 flex flex-col">
      {/* Premium Desktop-style Header structure with Search in upper right */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-100 px-6 py-4 shadow-3xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 text-white p-2.5 rounded-2xl flex items-center justify-center shadow-sm">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-sans font-extrabold text-lg text-slate-900 tracking-tight">aistockmap</span>
                <span className="text-[10px] bg-indigo-50 text-indigo-700 font-extrabold px-1.5 py-0.5 rounded uppercase tracking-widest leading-none">PRO</span>
              </div>
              <p className="text-[10.5px] text-slate-400 font-sans tracking-wide">台股/美股 AI 智慧時代產業地圖與極速研究決策平台</p>
            </div>
          </div>

          {/* Symmetrical Search and Utility box */}
          <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
            {/* Real Search bar */}
            <div className="relative flex-1 md:w-80 md:flex-initial">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜尋任意概念主題... 如：矽光子"
                disabled={isResearching}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') executeResearch(searchQuery);
                }}
                className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 outline-hidden bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-100 rounded-xl transition duration-150"
              />
            </div>

            {/* Bookmark button widget dropdown */}
            <div className="relative">
              <button 
                onClick={() => setShowWatchlistDropdown(!showWatchlistDropdown)}
                className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 relative flex items-center gap-1.5 transition text-slate-600 text-xs font-bold shrink-0"
              >
                <BookOpen className="w-4 h-4 text-indigo-500" />
                <span>已存 ({savedTopics.length})</span>
              </button>

              {showWatchlistDropdown && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-100 p-3 z-50 space-y-2 animate-fade-in text-xs">
                  <h4 className="font-extrabold text-slate-800 border-b border-slate-50 pb-1.5">已儲存的主題別名</h4>
                  {savedTopics.length === 0 ? (
                    <p className="text-slate-400 italic py-3 text-center">暫無收藏，可至題材細節頁面點選收藏</p>
                  ) : (
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {savedTopics.map(st => (
                        <div 
                          key={st.id} 
                          onClick={() => {
                            executeResearch(st.query);
                            setShowWatchlistDropdown(false);
                          }}
                          className="p-2 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg cursor-pointer transition flex justify-between items-center"
                        >
                          <strong className="truncate font-semibold text-slate-700">{st.title}</strong>
                          <span className="text-[9px] text-slate-400 shrink-0 font-mono">{st.createdAt}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Switch color system styling */}
            <button
              onClick={() => setIsTaiwanStyle(!isTaiwanStyle)}
              className="text-xs flex items-center gap-1 text-slate-500 hover:text-slate-800 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 transition font-bold"
            >
              <RefreshCw className="w-3.5 h-3.5 text-indigo-500" />
              <span>{isTaiwanStyle ? '台股紅漲綠跌' : '國際綠漲紅跌'}</span>
            </button>

            {/* Android/Mobile launcher */}
            <button
              onClick={() => setShowAndroidInstall(!showAndroidInstall)}
              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 p-2 border border-indigo-100 rounded-xl flex items-center gap-1 transition text-xs font-bold"
            >
              <Smartphone className="w-4 h-4 animate-pulse" />
              <span className="hidden sm:inline">下載 App</span>
            </button>
          </div>
        </div>
      </header>

      {/* Symmetrical Android Install Modal */}
      {showAndroidInstall && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative animate-fade-in border border-slate-100">
            <button 
              onClick={() => setShowAndroidInstall(false)}
              className="absolute top-4 right-4 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 w-8 h-8 rounded-full flex items-center justify-center transition text-sm font-bold"
            >
              ✕
            </button>
            <InstallGuide />
          </div>
        </div>
      )}

      {/* Main Container - Desktop-first layout */}
      <main className="max-w-7xl mx-auto px-6 lg:px-8 mt-6 space-y-6 flex-1 w-full">
        {/* Navigation horizontal scroll tabs matching visual images */}
        <div className="bg-white border border-slate-200/60 p-1.5 rounded-2xl shadow-3xs overflow-x-auto flex gap-1 scrollbar-none sticky top-18 z-20">
          {MAIN_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id === 'chain-map') {
                    setTopicDetailsSubTab('chain');
                  } else if (tab.id === 'topic-details') {
                    setTopicDetailsSubTab('overview');
                  }
                }}
                className={`py-2 px-3.5 font-sans font-bold text-xs rounded-xl shrink-0 transition duration-150 flex items-center gap-1.5 ${
                  isActive 
                    ? 'bg-indigo-600 text-white shadow-2xs shadow-indigo-600/10' 
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <span className="text-sm scale-110">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Loading simulation logic */}
        {isResearching && (
          <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm text-center space-y-4 py-16">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <div className="space-y-1">
              <p className="font-extrabold text-slate-800 text-sm">AI 智慧股市產業地圖精算中...</p>
              <p className="text-xs text-slate-500 font-mono animate-pulse min-h-[1.5rem]">
                {loadingSteps[researchStep]}
              </p>
            </div>
            {/* Loader track bar */}
            <div className="w-48 bg-slate-100 h-1 rounded-full mx-auto overflow-hidden">
              <div
                className="bg-indigo-600 h-full transition-all duration-1000 ease-out"
                style={{ width: `${((researchStep + 1) / loadingSteps.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* 8-Tab Routers */}
        {!isResearching && (
          <div className="animate-fade-in">
            {activeTab === 'podcast-tracker' && (
              <PodcastThemeTracker />
            )}

            {activeTab === 'daily' && (
              <DailyFocus isTaiwanStyle={isTaiwanStyle} />
            )}

            {activeTab === 'themes' && (
              <ThemesOverview onSelectTheme={handleSelectThemeFromOverview} />
            )}

            {activeTab === 'topic-details' && (
              researchedData ? (
                <TopicDetails
                  data={researchedData}
                  isTaiwanStyle={isTaiwanStyle}
                  onSaveTopic={handleSaveTopic}
                  isSaved={isCurrentTopicSaved}
                  activeTab={topicDetailsSubTab}
                  onTabChange={setTopicDetailsSubTab}
                />
              ) : (
                <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
                  <span className="text-4xl block mb-2">📊</span>
                  <p className="text-xs text-slate-500">請先在上方搜尋欄輸入或點按「題材總覽」之主題，即可在此查閱深度結構和個股列表！</p>
                </div>
              )
            )}

            {activeTab === 'chain-map' && (
              researchedData ? (
                <TopicDetails
                  data={researchedData}
                  isTaiwanStyle={isTaiwanStyle}
                  onSaveTopic={handleSaveTopic}
                  isSaved={isCurrentTopicSaved}
                  activeTab="chain"
                  onTabChange={() => {}}
                />
              ) : (
                <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
                  <span className="text-4xl block mb-2">🗺️</span>
                  <p className="text-xs text-slate-500">請先在上方搜尋欄輸入或點按「題材總覽」之主題，即可在此查閱產業上下游關聯地圖！</p>
                </div>
              )
            )}

            {activeTab === 'company-db' && (
              <CompanyDatabase />
            )}

            {activeTab === 'podcast' && (
              <PodcastBeta />
            )}

            {activeTab === 'heatmap' && (
              <MarketHeatmap isTaiwanStyle={isTaiwanStyle} />
            )}

            {activeTab === 'ai-lab' && (
              <AIAnalysis isTaiwanStyle={isTaiwanStyle} />
            )}

            {activeTab === 'cloudflare' && (
              <CloudflareCenter />
            )}

          </div>
        )}
      </main>
    </div>
  );
}
