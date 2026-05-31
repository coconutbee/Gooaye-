import React, { useState, useEffect } from 'react';
import {
  Search,
  Target,
  Flame,
  LayoutGrid,
  BarChart3,
  Building2,
  Mic,
  Activity,
  Sparkles,
  Bookmark,
  Smartphone,
  RefreshCw,
  Menu,
  X,
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
import MeteorShower from './components/MeteorShower';

import logoMark from '@/brand_assets/logos/logo_with_short_name.png';

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

type TabId =
  | 'podcast-tracker' | 'daily' | 'themes' | 'topic-details'
  | 'company-db' | 'podcast' | 'heatmap' | 'ai-lab';

const MAIN_TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }>; group: string }[] = [
  { id: 'podcast-tracker', label: '股癌題材追蹤', icon: Target, group: '洞察' },
  { id: 'daily', label: '每日焦點', icon: Flame, group: '洞察' },
  { id: 'themes', label: '題材總覽', icon: LayoutGrid, group: '研究' },
  { id: 'topic-details', label: '題材細節', icon: BarChart3, group: '研究' },
  { id: 'company-db', label: '公司資料庫', icon: Building2, group: '研究' },
  { id: 'podcast', label: '財經節目 Beta', icon: Mic, group: '市場' },
  { id: 'heatmap', label: '市場熱力圖', icon: Activity, group: '市場' },
  { id: 'ai-lab', label: 'AI 分析', icon: Sparkles, group: '市場' },
];

const NAV_GROUPS = ['洞察', '研究', '市場'];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('podcast-tracker');
  const [searchQuery, setSearchQuery] = useState('');
  const [isResearching, setIsResearching] = useState(false);
  const [researchStep, setResearchStep] = useState(0);
  const [researchedData, setResearchedData] = useState<TopicResearchResult | null>(null);
  const [isTaiwanStyle, setIsTaiwanStyle] = useState(true); // true = 紅漲綠跌（台股）
  const [savedTopics, setSavedTopics] = useState<SavedTopic[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [topicDetailsSubTab, setTopicDetailsSubTab] = useState<'overview' | 'chain' | 'stocks' | 'chart'>('overview');
  const [showAndroidInstall, setShowAndroidInstall] = useState(false);
  const [showWatchlistDropdown, setShowWatchlistDropdown] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const loadingSteps = [
    '正在解析股市核心議題關鍵熱度...',
    '正在透過網頁搜尋抓取最新產業情報及相關個股...',
    '正在過濾、關連其上下游供應鏈結構與公司代號...',
    '正在比算最新營收驅動與模擬股價累積走勢數據...',
    '智能整合分析中，即將呈現完美研究圖表...'
  ];

  // 載入收藏 / 搜尋紀錄
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

  // 初次進站若無 topic 參數，預設研究
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rawTopic = params.get('topic');
    if (!rawTopic && !researchedData) {
      executeResearch('ASIC IP 設計', 'overview', false);
    }
  }, []);

  // 載入步驟動畫
  useEffect(() => {
    let interval: any;
    if (isResearching) {
      setResearchStep(0);
      interval = setInterval(() => {
        setResearchStep((prev) => (prev < loadingSteps.length - 1 ? prev + 1 : prev));
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

      if (!response.ok) throw new Error('伺服器連線或研究 API 執行失敗');

      const result: TopicResearchResult = await response.json();
      setResearchedData(result);

      setSearchHistory((prev) => {
        const filtered = prev.filter(h => h !== queryText);
        const updated = [queryText, ...filtered].slice(0, 5);
        localStorage.setItem('stock_search_history', JSON.stringify(updated));
        return updated;
      });

      if (autoSwitchTab) setActiveTab('topic-details');

      const subTab = targetSubTab || topicDetailsSubTab || 'overview';
      setTopicDetailsSubTab(subTab);

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

  // URL 同步
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
          try { decodedTopic = decodeURIComponent(rawTopic); } catch (e) { /* ignore */ }
        }
        setSearchQuery(decodedTopic);
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
      const updated = savedTopics.filter(t => t.title !== researchedData.title);
      setSavedTopics(updated);
      localStorage.setItem('stock_saved_topics', JSON.stringify(updated));
    } else {
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

  const goToTab = (id: TabId) => {
    setActiveTab(id);
    if (id === 'topic-details') setTopicDetailsSubTab('overview');
    setMobileNavOpen(false);
  };

  const activeMeta = MAIN_TABS.find(t => t.id === activeTab)!;

  return (
    <div className="min-h-screen snow-ambient text-snow font-sans flex">
      {/* ===== pixel-art 流星雨背景 ===== */}
      <MeteorShower />

      {/* ===== 行動版抽屜遮罩 ===== */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* ===== 左側欄 ===== */}
      <aside
        className={`glass-bar fixed top-0 left-0 z-50 h-full w-[248px] flex flex-col border-r border-white/10
          transition-transform duration-300 lg:translate-x-0
          ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 h-[68px] shrink-0 border-b border-white/[0.06]">
          <img src={logoMark} alt="SnowCap Insights" className="logo-invert h-7 w-auto select-none" draggable={false} />
          <button
            className="lg:hidden text-snow-muted hover:text-snow p-1"
            onClick={() => setMobileNavOpen(false)}
            aria-label="關閉選單"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 導覽 */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5 scrollbar-none">
          {NAV_GROUPS.map((group) => (
            <div key={group} className="space-y-1">
              <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-snow-muted/70">
                {group}
              </p>
              {MAIN_TABS.filter(t => t.group === group).map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button key={tab.id} data-active={isActive} onClick={() => goToTab(tab.id)} className="nav-item">
                    <Icon className={`w-[18px] h-[18px] shrink-0 ${isActive ? 'text-gold' : 'text-snow-muted'}`} />
                    <span className="truncate">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* 側欄底部工具 */}
        <div className="px-3 py-3 border-t border-white/[0.06] space-y-1.5">
          <button
            onClick={() => setIsTaiwanStyle(!isTaiwanStyle)}
            className="nav-item"
          >
            <RefreshCw className="w-[18px] h-[18px] shrink-0 text-snow-muted" />
            <span>{isTaiwanStyle ? '台股 紅漲綠跌' : '國際 綠漲紅跌'}</span>
            <span className={`ml-auto h-2 w-2 rounded-full ${isTaiwanStyle ? 'bg-down' : 'bg-up'}`} />
          </button>
          <button onClick={() => setShowAndroidInstall(true)} className="nav-item">
            <Smartphone className="w-[18px] h-[18px] shrink-0 text-gold" />
            <span>下載 App</span>
          </button>
        </div>
      </aside>

      {/* ===== 主內容區 ===== */}
      <div className="relative z-10 flex-1 flex flex-col min-w-0 lg:pl-[248px]">
        {/* 頂列 */}
        <header className="glass-bar sticky top-0 z-30 border-b border-white/[0.06]">
          <div className="flex items-center gap-3 px-4 sm:px-6 h-[68px]">
            {/* 行動版漢堡 */}
            <button
              className="lg:hidden text-snow-2 hover:text-snow p-1.5 -ml-1.5"
              onClick={() => setMobileNavOpen(true)}
              aria-label="開啟選單"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* 頁面標題 */}
            <div className="hidden sm:flex items-center gap-2.5 min-w-0">
              <activeMeta.icon className="w-[18px] h-[18px] text-gold shrink-0" />
              <div className="min-w-0">
                <h1 className="font-satoshi font-medium text-[15px] text-snow leading-tight truncate">{activeMeta.label}</h1>
                <p className="text-[11px] text-snow-muted leading-tight truncate">SnowCap Insights · 智慧產業地圖</p>
              </div>
            </div>

            {/* 行動版顯示 logo */}
            <img src={logoMark} alt="SnowCap" className="logo-invert h-6 w-auto sm:hidden" draggable={false} />

            <div className="flex-1" />

            {/* 搜尋 */}
            <div className="relative w-40 sm:w-72 max-w-[40vw]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-snow-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜尋主題… 如矽光子"
                disabled={isResearching}
                onKeyDown={(e) => { if (e.key === 'Enter') executeResearch(searchQuery); }}
                className="w-full text-[13px] pl-9 pr-3 py-2 rounded-xl bg-white/[0.05] border border-white/10
                  text-snow placeholder:text-snow-muted/70 outline-none
                  focus:border-gold/40 focus:bg-white/[0.07] transition"
              />
            </div>

            {/* 收藏 */}
            <div className="relative">
              <button
                onClick={() => setShowWatchlistDropdown(!showWatchlistDropdown)}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl bg-white/[0.05] border border-white/10
                  text-snow-2 hover:text-snow hover:border-white/20 transition text-[13px] font-medium"
              >
                <Bookmark className="w-4 h-4 text-gold" />
                <span className="hidden sm:inline">已存 {savedTopics.length}</span>
              </button>

              {showWatchlistDropdown && (
                <div className="absolute right-0 mt-2 w-72 glass-card rounded-2xl p-3 z-50 space-y-2 animate-fade-in">
                  <h4 className="font-satoshi font-medium text-snow text-sm border-b border-white/[0.06] pb-2">已收藏主題</h4>
                  {savedTopics.length === 0 ? (
                    <p className="text-snow-muted text-xs italic py-4 text-center">暫無收藏，於題材細節頁點選收藏</p>
                  ) : (
                    <div className="space-y-1 max-h-56 overflow-y-auto">
                      {savedTopics.map(st => (
                        <div
                          key={st.id}
                          onClick={() => { executeResearch(st.query); setShowWatchlistDropdown(false); }}
                          className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-gold/10 hover:border-gold/20 border border-transparent
                            cursor-pointer transition flex justify-between items-center gap-2"
                        >
                          <strong className="truncate font-medium text-snow-2 text-[13px]">{st.title}</strong>
                          <span className="text-[10px] text-snow-muted shrink-0 font-mono">{st.createdAt}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Android 安裝 Modal */}
        {showAndroidInstall && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
            <div className="glass-card rounded-3xl max-w-md w-full p-6 relative animate-fade-in">
              <button
                onClick={() => setShowAndroidInstall(false)}
                className="absolute top-4 right-4 bg-white/5 hover:bg-white/10 text-snow-2 w-8 h-8 rounded-full flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
              <InstallGuide />
            </div>
          </div>
        )}

        {/* 主內容 */}
        <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* 載入動畫 */}
          {isResearching && (
            <div className="glass-card rounded-2xl p-8 text-center space-y-4 py-16">
              <div className="w-10 h-10 border-[3px] border-gold border-t-transparent rounded-full animate-spin mx-auto" />
              <div className="space-y-1">
                <p className="font-satoshi font-medium text-snow text-sm">AI 智慧產業地圖精算中…</p>
                <p className="text-xs text-snow-muted font-mono animate-pulse min-h-[1.5rem]">{loadingSteps[researchStep]}</p>
              </div>
              <div className="w-48 bg-white/10 h-1 rounded-full mx-auto overflow-hidden">
                <div
                  className="h-full transition-all duration-1000 ease-out"
                  style={{ width: `${((researchStep + 1) / loadingSteps.length) * 100}%`, background: 'linear-gradient(90deg,#facc15,#f59e0b)' }}
                />
              </div>
            </div>
          )}

          {!isResearching && (
            <div className="animate-fade-in">
              {activeTab === 'podcast-tracker' && <PodcastThemeTracker />}
              {activeTab === 'daily' && <DailyFocus isTaiwanStyle={isTaiwanStyle} />}
              {activeTab === 'themes' && <ThemesOverview onSelectTheme={handleSelectThemeFromOverview} />}
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
                  <div className="text-center py-20 glass-card rounded-2xl">
                    <BarChart3 className="w-10 h-10 mx-auto mb-3 text-snow-muted" />
                    <p className="text-sm text-snow-muted">請先於上方搜尋欄輸入，或至「題材總覽」點選主題，即可查閱深度結構與個股列表。</p>
                  </div>
                )
              )}
              {activeTab === 'company-db' && <CompanyDatabase />}
              {activeTab === 'podcast' && <PodcastBeta />}
              {activeTab === 'heatmap' && <MarketHeatmap isTaiwanStyle={isTaiwanStyle} />}
              {activeTab === 'ai-lab' && <AIAnalysis isTaiwanStyle={isTaiwanStyle} />}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
