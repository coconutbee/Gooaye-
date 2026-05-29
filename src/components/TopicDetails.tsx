import React, { useState } from 'react';
import {
  TrendingUp,
  SlidersHorizontal,
  ChevronRight,
  Info,
  ShieldAlert,
  Sparkles,
  Layers,
  ArrowUpRight,
  Bookmark,
  Calendar,
  DollarSign,
  Briefcase,
  GitCompare,
  TrendingDown,
  Activity
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { TopicResearchResult, StockInfo } from '../types';
import ChainMap from './ChainMap';

interface TopicDetailsProps {
  data: TopicResearchResult;
  isTaiwanStyle: boolean;
  onSaveTopic?: () => void;
  isSaved?: boolean;
  activeTab: 'overview' | 'chain' | 'stocks' | 'chart';
  onTabChange: (tab: 'overview' | 'chain' | 'stocks' | 'chart') => void;
}

export default function TopicDetails({
  data,
  isTaiwanStyle,
  onSaveTopic,
  isSaved = false,
  activeTab,
  onTabChange
}: TopicDetailsProps) {
  const { title, description, marketDrivers, keyFactors, stocks, outlook, fallbackWarning, isFallback } = data;

  const setActiveTab = onTabChange;
  const [selectedStock, setSelectedStock] = useState<StockInfo | null>(stocks[0] || null);
  const [stockFilter, setStockFilter] = useState<'all' | 'upstream' | 'midstream' | 'downstream'>('all');

  // Custom coloring utilities reflecting selected design patterns (Taiwanese vs. Global styles)
  const getChangeColors = (value: number) => {
    const isUp = value >= 0;
    if (isTaiwanStyle) {
      return {
        text: isUp ? 'text-red-600' : 'text-emerald-600',
        bg: isUp ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700',
        border: isUp ? 'border-red-100' : 'border-emerald-100',
        icon: isUp ? <TrendingUp className="w-4 h-4 text-red-600" /> : <TrendingDown className="w-4 h-4 text-emerald-600" />
      };
    } else {
      return {
        text: isUp ? 'text-emerald-600' : 'text-red-600',
        bg: isUp ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700',
        border: isUp ? 'border-emerald-100' : 'border-red-100',
        icon: isUp ? <TrendingUp className="w-4 h-4 text-emerald-600" /> : <TrendingDown className="w-4 h-4 text-red-600" />
      };
    }
  };

  // Convert histories of active stocks into a single comparative charting array
  const prepareChartData = () => {
    if (!stocks || stocks.length === 0) return [];

    // Get dates from first stock
    const sampleStock = stocks[0];
    if (!sampleStock.historyData) return [];

    const dates = sampleStock.historyData.map(h => h.date);

    return dates.map((date, idx) => {
      const row: any = { date };
      stocks.forEach(stock => {
        if (stock.historyData && stock.historyData[idx]) {
          row[stock.name] = stock.historyData[idx].price;
        }
      });
      return row;
    });
  };

  const chartData = prepareChartData();
  const filteredStocks = stocks.filter(stock => {
    if (stockFilter === 'all') return true;
    return stock.roleCategory === stockFilter;
  });

  const handleSelectStockInChain = (stock: StockInfo) => {
    setSelectedStock(stock);
    setActiveTab('stocks');
    // Scroll detailed stock overview into view on mobile
    const element = document.getElementById('selected-stock-detail-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Modern soft charts line color palette
  const chartColors = [
    '#4F46E5', // Indigo
    '#0EA5E9', // Sky blue
    '#10B981', // Emerald
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#64748B'  // Slate
  ];

  return (
    <div className="space-y-6" id="topic-details-container">
      {/* Alert Warning for fallback states */}
      {fallbackWarning && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3.5 rounded-xl text-xs space-y-1 shadow-xs transition duration-200">
          <p className="font-semibold flex items-center gap-1">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <span>智能備用顯示</span>
          </p>
          <p className="leading-relaxed font-sans">{fallbackWarning}</p>
        </div>
      )}

      {/* Header Topic Title & Description */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              {isFallback ? '範例研究' : 'AI 深度研究'}
            </span>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h2>
          </div>

          {onSaveTopic && (
            <button
              onClick={onSaveTopic}
              className={`p-2 rounded-xl border text-xs transition duration-200 flex items-center gap-1 shrink-0 ${
                isSaved
                  ? 'bg-yellow-50 border-yellow-300 text-yellow-700 font-medium'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-yellow-500 text-yellow-600' : ''}`} />
              <span>{isSaved ? '已收藏' : '收藏議題'}</span>
            </button>
          )}
        </div>

        <p className="text-xs text-slate-600 leading-relaxed font-sans">{description}</p>

        {/* Outlook conclustion info */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-indigo-900 block tracking-wide">未來前景分析：</span>
            <p className="text-[11px] text-slate-600 leading-relaxed">{outlook}</p>
          </div>
        </div>
      </div>

      {/* Mini App Grid Layout Tabs */}
      <div className="bg-white p-1 rounded-xl border border-slate-100 flex justify-between gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 py-2 px-1 text-center font-medium text-xs rounded-lg transition duration-150 shrink-0 min-w-[5rem] ${
            activeTab === 'overview'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          議題概覽
        </button>
        <button
          onClick={() => setActiveTab('chain')}
          className={`flex-1 py-2 px-1 text-center font-medium text-xs rounded-lg transition duration-150 shrink-0 min-w-[5rem] ${
            activeTab === 'chain'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          產業鏈結構
        </button>
        <button
          onClick={() => setActiveTab('stocks')}
          className={`flex-1 py-2 px-1 text-center font-medium text-xs rounded-lg transition duration-150 shrink-0 min-w-[5rem] ${
            activeTab === 'stocks'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          概念類股 ({stocks.length})
        </button>
        <button
          onClick={() => setActiveTab('chart')}
          className={`flex-1 py-2 px-1 text-center font-medium text-xs rounded-lg transition duration-150 shrink-0 min-w-[5rem] ${
            activeTab === 'chart'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          漲勢對比
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in" id="panel-overview">
          {/* Market Drivers */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <TrendingUp className="text-indigo-600 w-4.5 h-4.5" />
              <span>股市核心驅動因子</span>
            </h3>
            <div className="space-y-3">
              {marketDrivers.map((driver, index) => (
                <div key={index} className="flex gap-3 text-xs leading-relaxed">
                  <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-700 font-bold shrink-0 flex items-center justify-center font-mono">
                    {index + 1}
                  </span>
                  <p className="text-slate-600">{driver}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Key Observation Factors */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <Activity className="text-indigo-600 w-4.5 h-4.5" />
              <span>產業研究關鍵觀察指標</span>
            </h3>
            <div className="space-y-3">
              {keyFactors.map((factor, index) => (
                <div key={index} className="flex gap-3 text-xs leading-relaxed">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold shrink-0 flex items-center justify-center font-mono">
                    {index + 1}
                  </span>
                  <p className="text-slate-600">{factor}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'chain' && (
        <div className="animate-fade-in" id="panel-chain">
          <ChainMap
            data={data}
            onSelectStock={handleSelectStockInChain}
            selectedStockId={selectedStock?.id}
            isTaiwanStyle={isTaiwanStyle}
          />
        </div>
      )}

      {activeTab === 'stocks' && (
        <div className="space-y-5 animate-fade-in" id="panel-stocks">
          {/* Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <SlidersHorizontal className="w-4 h-4 text-slate-400 shrink-0 mr-1" />
            <button
              onClick={() => setStockFilter('all')}
              className={`px-2.5 py-1 text-xs rounded-full font-medium shrink-0 transition duration-150 ${
                stockFilter === 'all'
                  ? 'bg-indigo-100 text-indigo-800'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              全部 ({stocks.length})
            </button>
            <button
              onClick={() => setStockFilter('upstream')}
              className={`px-2.5 py-1 text-xs rounded-full font-medium shrink-0 transition duration-150 ${
                stockFilter === 'upstream'
                  ? 'bg-sky-100 text-sky-800'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              上游
            </button>
            <button
              onClick={() => setStockFilter('midstream')}
              className={`px-2.5 py-1 text-xs rounded-full font-medium shrink-0 transition duration-150 ${
                stockFilter === 'midstream'
                  ? 'bg-indigo-100 text-indigo-800'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              中游
            </button>
            <button
              onClick={() => setStockFilter('downstream')}
              className={`px-2.5 py-1 text-xs rounded-full font-medium shrink-0 transition duration-150 ${
                stockFilter === 'downstream'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              下游
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Stocks List Grid (Half panel) */}
            <div className="space-y-2 max-h-[28rem] overflow-y-auto pr-1">
              {filteredStocks.map((stock) => {
                const isSelected = selectedStock?.id === stock.id;
                const r3Mcolors = getChangeColors(stock.recentReturn1M);

                return (
                  <button
                    key={stock.id}
                    onClick={() => setSelectedStock(stock)}
                    className={`w-full p-3.5 rounded-xl border text-left transition duration-200 flex items-center justify-between ${
                      isSelected
                        ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-100'
                        : 'bg-white border-slate-100 hover:bg-slate-50'
                    }`}
                  >
                    <div className="space-y-1 truncate pr-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-800 text-sm">{stock.name}</span>
                        <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1 py-0.5 rounded leading-none">
                          {stock.code}
                        </span>
                        <span
                          className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded leading-none ${
                            stock.roleCategory === 'upstream'
                              ? 'bg-sky-50 text-sky-700'
                              : stock.roleCategory === 'midstream'
                              ? 'bg-indigo-50 text-indigo-700'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {stock.roleCategory === 'upstream'
                            ? '上游'
                            : stock.roleCategory === 'midstream'
                            ? '中游'
                            : '下游'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 truncate">{stock.role}</p>
                    </div>

                    <div className="text-right shrink-0 flex items-center gap-2">
                      <div className="text-right">
                        <span className={`text-[11px] font-bold px-2 py-1 rounded font-mono ${r3Mcolors.bg}`}>
                          {stock.recentReturn1M >= 0 ? '+' : ''}
                          {stock.recentReturn1M}% (月)
                        </span>
                      </div>
                      <ChevronRight className={`w-4 h-4 transition duration-200 ${isSelected ? 'text-indigo-600 translate-x-0.5' : 'text-slate-300'}`} />
                    </div>
                  </button>
                );
              })}

              {filteredStocks.length === 0 && (
                <div className="text-center py-10 bg-white border border-dashed border-slate-200 rounded-xl">
                  <p className="text-slate-400 text-xs italic">此產業鏈環節暫無分析的概念股</p>
                </div>
              )}
            </div>

            {/* Live Card Detailed Panel (Half panel) */}
            <div className="scroll-mt-5" id="selected-stock-detail-section">
              {selectedStock ? (
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                  {/* Detailed Stock Header */}
                  <div className="border-b border-slate-50 pb-3 flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900 text-md">{selectedStock.name}</h4>
                        <span className="font-mono text-xs bg-slate-50 text-slate-500 px-1.5 py-0.5 rounded border border-slate-100">
                          {selectedStock.code}
                        </span>
                      </div>
                      <p className="text-xs text-rose-600 font-medium mt-0.5 leading-relaxed">
                        【{selectedStock.role}】
                      </p>
                    </div>
                    
                    <a
                      href={`https://tw.stock.yahoo.com/q/q?s=${selectedStock.code.replace('.TW', '').replace('.TWO', '')}`}
                      target="_blank"
                      referrerPolicy="no-referrer"
                      className="text-[10px] text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg flex items-center gap-0.5 shrink-0 transition"
                    >
                      <span>奇摩股市</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </a>
                  </div>

                  {/* Stock performance returns breakdown */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 bg-slate-50 rounded-lg">
                      <span className="text-[9.5px] text-slate-400 block mb-0.5">近5日變動</span>
                      <span className={`text-[11.5px] font-mono font-bold ${getChangeColors(selectedStock.recentReturn5D).text}`}>
                        {selectedStock.recentReturn5D >= 0 ? '+' : ''}
                        {selectedStock.recentReturn5D}%
                      </span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg">
                      <span className="text-[9.5px] text-slate-400 block mb-0.5 flex items-center justify-center gap-0.5">
                        主要月漲幅
                      </span>
                      <span className={`text-[11.5px] font-mono font-bold ${getChangeColors(selectedStock.recentReturn1M).text}`}>
                        {selectedStock.recentReturn1M >= 0 ? '+' : ''}
                        {selectedStock.recentReturn1M}%
                      </span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg">
                      <span className="text-[9.5px] text-slate-400 block mb-0.5">近3個月</span>
                      <span className={`text-[11.5px] font-mono font-bold ${getChangeColors(selectedStock.recentReturn3M).text}`}>
                        {selectedStock.recentReturn3M >= 0 ? '+' : ''}
                        {selectedStock.recentReturn3M}%
                      </span>
                    </div>
                  </div>

                  {/* Moat & Catalyst details */}
                  <div className="space-y-3.5 text-xs">
                    {/* Business description */}
                    <div className="space-y-1">
                      <div className="text-slate-400 font-semibold flex items-center gap-1 text-[10.5px]">
                        <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                        <span>主要核心業務</span>
                      </div>
                      <p className="text-slate-600 font-sans leading-relaxed">{selectedStock.description}</p>
                    </div>

                    {/* MOAT competitive advantages */}
                    <div className="space-y-1">
                      <div className="text-indigo-600 font-semibold flex items-center gap-1 text-[10.5px]">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                        <span>競爭優勢與核心護城河</span>
                      </div>
                      <p className="text-slate-600 font-sans leading-relaxed">{selectedStock.advantage}</p>
                    </div>

                    {/* INVESTMENT MOVES */}
                    <div className="space-y-1">
                      <div className="text-rose-600 font-semibold flex items-center gap-1 text-[10.5px]">
                        <TrendingUp className="w-3.5 h-3.5 text-rose-500" />
                        <span>主要投資理由及利多關鍵</span>
                      </div>
                      <p className="text-slate-600 font-sans leading-relaxed">{selectedStock.whyBuy}</p>
                    </div>

                    {/* RISKS */}
                    <div className="space-y-1">
                      <div className="text-amber-700 font-semibold flex items-center gap-1 text-[10.5px]">
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                        <span>潛在研究風險警告</span>
                      </div>
                      <p className="text-slate-600 font-sans leading-relaxed">{selectedStock.risk}</p>
                    </div>

                    {/* Stock Trend Commentary */}
                    <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100/50">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-700 block mb-0.5">
                        線型走勢綜合評析：
                      </span>
                      <p className="text-slate-600 text-[11px] leading-relaxed">
                        {selectedStock.trendAnalysis}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full bg-slate-50 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-8 text-center text-slate-400">
                  <Info className="w-8 h-8 text-slate-300 mb-1" />
                  <p className="text-xs">請點選左側個股名稱查看詳盡的投資護城河與潛在風險等研究報告</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'chart' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4 animate-fade-in" id="panel-chart">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <GitCompare className="text-indigo-600 w-4.5 h-4.5" />
                <span>股價近期累計漲勢競速 (Base 100 基準線)</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                以研發起點 100 作為基準，可輕鬆觀察各檔個股月走勢的強度拉鋸及最新爆發力
              </p>
            </div>
          </div>

          {/* Interactive Chart Container */}
          <div className="h-[20rem] md:h-[24rem] w-full bg-slate-50/50 rounded-xl p-2 md:p-4 font-mono text-[11px]">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="date" stroke="#94A3B8" />
                  <YAxis stroke="#94A3B8" label={{ value: '累計演進走勢', angle: -90, position: 'insideLeft', offset: 10 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #E2E8F0' }}
                    labelClassName="font-semibold text-slate-700 text-xs"
                  />
                  <Legend />
                  {stocks.map((stock, idx) => (
                    <Line
                      key={stock.id}
                      type="monotone"
                      dataKey={stock.name}
                      stroke={chartColors[idx % chartColors.length]}
                      strokeWidth={selectedStock?.name === stock.name ? 3.5 : 1.8}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">
                暫無足夠走勢圖數據
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
