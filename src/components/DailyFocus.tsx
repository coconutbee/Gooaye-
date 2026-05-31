import React, { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Bell, 
  Clock, 
  Calendar, 
  ChevronRight, 
  Lock, 
  Coffee, 
  AlertTriangle,
  Info,
  DollarSign,
  Activity,
  ArrowUpRight,
  Eye
} from 'lucide-react';
import { FocusNews } from '../types';

interface DailyFocusProps {
  isTaiwanStyle: boolean;
}

export default function DailyFocus({ isTaiwanStyle }: DailyFocusProps) {
  const [selectedDate, setSelectedDate] = useState<string>('今日');
  const [newsFilter, setNewsFilter] = useState<'all' | 'premium' | 'normal'>('all');
  const [mopTab, setMopTab] = useState<'all' | 'clarify' | 'financial' | 'governance' | 'event'>('all');
  const [buySellTab, setBuySellTab] = useState<'buy' | 'sell'>('buy');
  const [buySellDuration, setBuySellDuration] = useState<'day' | 'week' | 'month'>('day');
  const [mopDate, setMopDate] = useState<string>('今天');
  const [hasUpgraded, setHasUpgraded] = useState<boolean>(false);

  // Indexes list matching Image 5
  const indexes = [
    { name: '那斯達克', code: 'NASDAQ', price: '25,929.98', change: '+59.27', pct: '+0.23%', isUp: true },
    { name: 'S&P 500', code: 'SPX', price: '7,359.10', change: '+5.49', pct: '+0.07%', isUp: true },
    { name: '費城半導體', code: 'SOX', price: '11,595.79', change: '+290.29', pct: '+2.57%', isUp: true },
    { name: '台積電 ADR', code: 'TSM', price: '396.20', change: '+3.59', pct: '+0.91%', isUp: true },
    { name: '輝達 NVIDIA', code: 'NVDA', price: '222.52', change: '+1.91', pct: '+0.87%', isUp: true },
    { name: '日經 225', code: 'N225', price: '59,804.41', change: '-746.18', pct: '-1.23%', isUp: false },
    { name: '韓國綜合', code: 'KS11', price: '7,208.95', change: '-62.71', pct: '-0.86%', isUp: false },
    { name: 'VIX 恐慌', code: 'VIX', price: '17.86', change: '-0.20', pct: '-1.11%', isUp: false },
  ];

  // Large institutional forces matching Image 5 (2026-05-19)
  const institutionalFlows = [
    { name: '外資', buy: '4,860億', sell: '5,458億', net: '-597億', isPositive: false },
    { name: '投信', buy: '489億', sell: '414億', net: '+75億', isPositive: true },
    { name: '自營商', buy: '79億', sell: '138億', net: '-59億', isPositive: false },
  ];

  // Margin/Short balances matching Image 5
  const marginStats = [
    { name: '融資餘額', buy: '52.7萬', sell: '59.9萬', change: '-7.9萬張', isPositive: false },
    { name: '融券餘額', buy: '3萬', sell: '3.2萬', change: '-852張', isPositive: false },
    { name: '融資金額(上市)', buy: '333億', sell: '374億', change: '-47億', isPositive: false },
  ];

  // Active ETFs list matching Image 6
  const activeETFs = [
    { name: '主動群益台灣強棒 00982A', add: '--', buy: '~22', sell: '~20', remove: '--' },
    { name: '主動野村台灣高息 00999A', add: '--', buy: '~39', sell: '--', remove: '--' },
    { name: '主動國泰動能高息 00400A', add: '--', buy: '~22', sell: '~15', remove: '--' },
    { name: '主動野村台灣優選 00980A', add: '--', buy: '~11', sell: '~11', remove: '2' },
    { name: '主動統一升級50 00403A', add: '--', buy: '~13', sell: '--', remove: '--' },
  ];

  // Active buy/sell rankings by ETF integration matching Image 6
  const activeBuyList = [
    { name: '勤誠', code: '8210', counts: '~2家', change: '+0.69%', etfs: ['00991A', '00996A'] },
    { name: '台積電', code: '2330', counts: '~2家', change: '+0.55%', etfs: ['00980A', '00999A'] },
    { name: '聯發科', code: '2454', counts: '~2家', change: '+0.38%', etfs: ['00400A', '00982A'] },
    { name: '鈊象', code: '3293', counts: '~2家', change: '+0.36%', etfs: ['00400A', '00980A'] },
  ];

  const activeSellList = [
    { name: '廣達', code: '2382', counts: '~3家', change: '-1.42%', etfs: ['00982A', '00980A'] },
    { name: '緯創', code: '3231', counts: '~2家', change: '-0.85%', etfs: ['00400A', '00999A'] },
    { name: '奇鋐', code: '3017', counts: '~2家', change: '-2.10%', etfs: ['00991A', '00996A'] },
  ];

  // S&P, CNBC, Economic daily news list matching Image 5
  const focusNews: FocusNews[] = [
    {
      id: 'n1',
      source: 'CNBC',
      date: '5月20日',
      title: '美中關稅與科技角力延續',
      content: '美中貿易與科技限制措施持續，推動供應鏈重組與區域製造配置，台系電子代工與伺服器族群面臨產能調度機會。',
      tags: ['EMS 電子代工', 'PC、筆電與平板']
    },
    {
      id: 'n2',
      source: '經濟日報',
      date: '5月20日',
      title: '台積電中科廠升級 4 奈米',
      content: '台積電中科 15A 廠將由 28/22 奈米升級至 4 奈米先進製程，投資逾千億元，帶動半導體設備與廠務工程需求走強。',
      tags: ['晶圓代工設備', '設備與廠務工程']
    },
    {
      id: 'n3',
      source: 'S&P Global',
      date: '5月20日',
      title: '地緣風險支撐油價展望',
      content: '中東局勢與地緣政治不確定性增加油價震盪，推升來源與通膨預期，影響塑化與下游製造業成本結構。',
      tags: ['石化與塑膠產業']
    },
    {
      id: 'n4',
      source: 'Premium 獨家',
      date: '5月20日',
      title: '獨家：輝達 GB200 機架出貨時程最新評核',
      content: '針對台系關鍵組裝廠 (鴻海、廣達、廣運、勤誠) 的水冷漏液測試與第二季底量產投產時程的機密核算數據...',
      tags: ['GB200 伺服器', '水冷散熱系統'],
      isPremium: true
    }
  ];

  // Taiwanese Exchange Announcements (MOPS) matching Image 6
  const mopsAnnouncements = [
    { id: 'm1', type: 'governance', badge: '公司治理', title: '本公司115年股東常會重要決議事項', company: '7863 科物流', time: '2026/05/20 19:00' },
    { id: 'm2', type: 'event', badge: '重大事件', title: '公告本公司永續發展委員會委員', company: '1563 巧新', time: '2026/05/20 18:59' },
    { id: 'm3', type: 'event', badge: '重大事件', title: '公告本公司第二屆永續發展提名委員會委員選任名單', company: '7703 銳澤', time: '2026/05/20 18:58' },
    { id: 'm4', type: 'clarify', badge: '澄清回應', title: '媒體報導澄清：關於第三季面板調價合約與出貨狀況說明', company: '3481 群創', time: '2026/05/20 14:20' },
    { id: 'm5', type: 'financial', badge: '財務數據', title: '公告本公司115年度四月份自結損益與EPS營收速報', company: '3081 聯亞', time: '2026/05/20 13:10' },
  ];

  const getUpDownColor = (isUp: boolean) => {
    if (isTaiwanStyle) {
      return isUp ? 'text-red-300 bg-down/15' : 'text-emerald-300 bg-up/15';
    } else {
      return isUp ? 'text-emerald-300 bg-up/15' : 'text-red-300 bg-down/15';
    }
  };

  const getNetColor = (isPositive: boolean) => {
    if (isTaiwanStyle) {
      return isPositive ? 'text-red-400' : 'text-emerald-400';
    } else {
      return isPositive ? 'text-emerald-400' : 'text-red-400';
    }
  };

  const datesList = ['今日', '05/19', '05/18', '05/17', '05/16', '05/15', '05/14'];
  const mopDatesList = ['今天', '05/19', '05/18', '05/17', '05/16', '05/15', '05/14'];

  const filteredMops = mopsAnnouncements.filter(ann => {
    if (mopTab === 'all') return true;
    return ann.type === mopTab;
  });

  return (
    <div className="space-y-6">
      {/* 1. Header Alert banner */}
      <div className="glass-card border-down/25 text-red-300 p-3 rounded-xl text-xs flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-down opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-down"></span>
          </span>
          <span className="font-semibold text-snow">🔥 重點更新：</span>
          <span className="text-snow-2">聯亞光電 (3081) 深度分析與研究圖表已上線 by Vincent</span>
        </div>
        <button
          onClick={() => alert('已載入 3081 聯亞光電 研究圖表！歡迎至公司資料庫查閱。')}
          className="bg-down/90 hover:bg-down text-white px-2.5 py-1 text-[11px] font-bold rounded-lg transition shrink-0"
        >
          查看 &gt;
        </button>
      </div>

      {/* 2. Global Index Grid (8 Grid) */}
      <div className="glass-card p-4 rounded-xl">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-1.5 text-xs text-snow-muted">
            <Clock className="w-4 h-4 text-snow-muted" />
            <span>核心指數與特定概念股即時表現</span>
          </div>
          <span className="text-[10px] text-snow-muted font-mono">資料更新時間：2026-05-20 22:16:05</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {indexes.map((idx, index) => {
            const upColorClasses = getUpDownColor(idx.isUp);
            return (
              <div
                key={index}
                className="p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl flex flex-col justify-between hover:border-gold/30 transition duration-150 cursor-pointer group"
                onClick={() => alert(`載入 ${idx.name} 指數細部追蹤數據`)}
              >
                <div className="flex justify-between items-start">
                  <span className="font-bold text-xs text-snow tracking-tight group-hover:text-gold transition truncate">
                    {idx.name}
                  </span>
                  <span className="text-[9px] font-mono text-snow-muted font-medium">
                    {idx.code}
                  </span>
                </div>
                <div className="mt-2.5 flex items-baseline justify-between">
                  <span className="font-mono text-sm font-bold text-snow">
                    {idx.price}
                  </span>
                  <span className={`text-[10.5px] font-bold px-1.5 py-0.5 rounded-md font-mono ${upColorClasses}`}>
                    {idx.pct}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Industry News Navigation Grid */}
      <div className="glass-card p-4 rounded-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
          <div className="flex items-center gap-2">
            <div className="bg-gold/15 text-gold p-1.5 rounded-lg">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-satoshi font-medium text-snow text-sm">產業焦點導航</h3>
              <p className="text-[10.5px] text-snow-muted">快速掌握每日焦點題材及連結關係（排定更新：每日 12:00 台灣時間）</p>
            </div>
          </div>

          {/* Date Selector Navigation */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full scrollbar-none">
            {datesList.map((dt) => (
              <button
                key={dt}
                onClick={() => setSelectedDate(dt)}
                className={`text-[11px] font-medium px-2.5 py-1 rounded-lg shrink-0 transition ${
                  selectedDate === dt
                    ? 'text-[#1a1205]'
                    : 'bg-white/[0.05] hover:bg-white/[0.08] text-snow-muted'
                }`}
                style={selectedDate === dt ? { background: 'linear-gradient(180deg,#facc15,#f59e0b)' } : undefined}
              >
                {dt}
              </button>
            ))}
          </div>
        </div>

        {/* 4 Cards News Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
          {focusNews.map((news) => {
            const isLocked = news.isPremium && !hasUpgraded;
            return (
              <div
                key={news.id}
                className={`p-3.5 rounded-xl border transition duration-150 flex flex-col justify-between relative ${
                  isLocked
                    ? 'bg-white/[0.02] border-white/[0.06]'
                    : 'bg-white/[0.03] border-white/[0.06] hover:border-gold/30'
                }`}
              >
                {isLocked && (
                  <div className="absolute inset-0 bg-black/50 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center p-4 text-center z-10">
                    <Lock className="w-5 h-5 text-gold animate-bounce mb-1" />
                    <span className="text-[10px] uppercase font-bold text-snow-2 block mb-0.5">Premium 限定</span>
                    <button
                      onClick={() => setHasUpgraded(true)}
                      className="text-[10px] text-[#1a1205] font-bold px-3 py-1 rounded-md transition"
                      style={{ background: 'linear-gradient(180deg,#facc15,#f59e0b)' }}
                    >
                      立即解鎖
                    </button>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] bg-white/[0.06] text-snow-2 font-bold px-2 py-0.5 rounded-md">
                      {news.source}
                    </span>
                    <span className="text-[10px] text-snow-muted font-mono flex items-center gap-0.5">
                      <Calendar className="w-3 h-3" />
                      {news.date}
                    </span>
                  </div>

                  <h4 className="font-bold text-xs text-snow leading-snug hover:text-gold cursor-pointer">
                    {news.title}
                  </h4>
                  <p className="text-[11px] text-snow-muted leading-normal line-clamp-3">
                    {news.content}
                  </p>
                </div>

                <div className="mt-3 pt-3 border-t border-white/[0.06] flex flex-wrap gap-1">
                  {news.tags.map((tag) => (
                    <span key={tag} className="text-[9.5px] bg-gold/10 text-amber-200/90 px-1.5 py-0.5 rounded leading-none font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Three Big Institutional Force (三大法人) and Margin stats (資券變化) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Column: 三大法人 */}
        <div className="glass-card p-4 rounded-xl space-y-3">
          <div className="flex justify-between items-center border-b border-white/[0.06] pb-2">
            <h3 className="font-satoshi font-medium text-snow text-xs flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-gold" />
              <span>三大法人進出概觀</span>
            </h3>
            <span className="text-[10px] font-mono text-snow-muted bg-white/[0.05] px-2 py-0.5 rounded">2026-05-19</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="py-2 text-[10px] font-bold text-snow-muted uppercase">法人名稱</th>
                  <th className="py-2 text-[10px] font-bold text-snow-muted uppercase text-right">買進金額</th>
                  <th className="py-2 text-[10px] font-bold text-snow-muted uppercase text-right">賣出金額</th>
                  <th className="py-2 text-[10px] font-bold text-snow-muted uppercase text-right">買賣超</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] text-xs">
                {institutionalFlows.map((flow, index) => (
                  <tr key={index} className="hover:bg-white/[0.03]">
                    <td className="py-2.5 font-bold text-snow-2">{flow.name}</td>
                    <td className="py-2.5 text-right font-mono text-snow-muted">{flow.buy}</td>
                    <td className="py-2.5 text-right font-mono text-snow-muted">{flow.sell}</td>
                    <td className={`py-2.5 text-right font-mono font-bold ${getNetColor(flow.isPositive)}`}>
                      {flow.net}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: 資券變化 */}
        <div className="glass-card p-4 rounded-xl space-y-3">
          <div className="flex justify-between items-center border-b border-white/[0.06] pb-2">
            <h3 className="font-satoshi font-medium text-snow text-xs flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-gold" />
              <span>信用交易餘額與籌碼變化</span>
            </h3>
            <span className="text-[10px] font-mono text-snow-muted bg-white/[0.05] px-2 py-0.5 rounded">2026-05-19</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="py-2 text-[10px] font-bold text-snow-muted uppercase">指標項目</th>
                  <th className="py-2 text-[10px] font-bold text-snow-muted uppercase text-right">融資/買入</th>
                  <th className="py-2 text-[10px] font-bold text-snow-muted uppercase text-right">融券/賣出</th>
                  <th className="py-2 text-[10px] font-bold text-snow-muted uppercase text-right">增減變動</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] text-xs">
                {marginStats.map((stat, index) => (
                  <tr key={index} className="hover:bg-white/[0.03]">
                    <td className="py-2.5 font-bold text-snow-2">{stat.name}</td>
                    <td className="py-2.5 text-right font-mono text-snow-muted">{stat.buy}</td>
                    <td className="py-2.5 text-right font-mono text-snow-muted">{stat.sell}</td>
                    <td className={`py-2.5 text-right font-mono font-bold ${getNetColor(stat.isPositive)}`}>
                      {stat.change}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 5. Active ETF tracking & Buying/Selling Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Grid: Active ETFs tracker */}
        <div className="glass-card p-4 rounded-xl space-y-3">
          <div className="flex justify-between items-center border-b border-white/[0.06] pb-2">
            <div>
              <h3 className="font-satoshi font-medium text-snow text-xs flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-gold" />
                <span>主動型 ETF 持股變動追蹤</span>
              </h3>
              <p className="text-[10px] text-snow-muted">觀察高資產大額資金主動調度之風向</p>
            </div>
            <span className="text-[9.5px] font-mono text-gold bg-gold/10 px-2.5 py-1 rounded-md font-bold">每日持股變動</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="py-2 text-[9.5px] font-bold text-snow-muted uppercase">ETF 名稱</th>
                  <th className="py-2 text-[9.5px] font-bold text-gold uppercase text-right">新增</th>
                  <th className="py-2 text-[9.5px] font-bold text-red-400 uppercase text-right">加碼</th>
                  <th className="py-2 text-[9.5px] font-bold text-emerald-400 uppercase text-right">減碼</th>
                  <th className="py-2 text-[9.5px] font-bold text-snow-muted uppercase text-right">移出</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] text-xs">
                {activeETFs.map((etf, index) => (
                  <tr key={index} className="hover:bg-white/[0.03]">
                    <td className="py-2 font-bold text-snow-2 truncate max-w-[12rem]">{etf.name}</td>
                    <td className="py-2 text-right font-mono text-snow-muted">{etf.add}</td>
                    <td className="py-2 text-right font-mono text-red-400 font-semibold">{etf.buy}</td>
                    <td className="py-2 text-right font-mono text-emerald-400 font-semibold">{etf.sell}</td>
                    <td className="py-2 text-right font-mono text-snow-muted">{etf.remove}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-[9.5px] text-snow-muted border-t border-white/[0.06] pt-2 flex justify-between">
            <span>排定更新：每日 18:00 (台灣時間)</span>
            <span>最新資料：2026-05-21</span>
          </div>
        </div>

        {/* Right Grid: Active Buy/Sell Stats */}
        <div className="glass-card p-4 rounded-xl space-y-3">
          <div className="flex justify-between items-center border-b border-white/[0.06] pb-2">
            <div>
              <h3 className="font-satoshi font-medium text-snow text-xs">主動買賣超個股統計</h3>
              <p className="text-[10px] text-snow-muted">經主動式 ETF 整合持股之跨基金統計</p>
            </div>
            <span className="text-[10px] font-mono text-snow-muted bg-white/[0.05] px-2 py-0.5 rounded font-bold">跨ETF整合</span>
          </div>

          <div className="flex justify-between items-center">
            {/* Buy / Sell Tabs */}
            <div className="flex bg-white/[0.05] p-1 rounded-lg">
              <button
                onClick={() => setBuySellTab('buy')}
                className={`text-[10.5px] px-3 py-1 font-bold rounded-md transition ${
                  buySellTab === 'buy'
                    ? 'bg-down text-white'
                    : 'text-snow-muted hover:text-snow-2'
                }`}
              >
                🔴 買進區 <span className="font-mono text-[9px] bg-black/25 px-1 rounded ml-0.5">101</span>
              </button>
              <button
                onClick={() => setBuySellTab('sell')}
                className={`text-[10.5px] px-3 py-1 font-bold rounded-md transition ${
                  buySellTab === 'sell'
                    ? 'bg-up text-white'
                    : 'text-snow-muted hover:text-snow-2'
                }`}
              >
                🟢 賣出區 <span className="font-mono text-[9px] bg-black/25 px-1 rounded ml-0.5">69</span>
              </button>
            </div>

            {/* Duration Filters */}
            <div className="flex gap-1 border border-white/[0.08] rounded-lg p-0.5 bg-white/[0.04]">
              {(['day', 'week', 'month'] as const).map((dur) => (
                <button
                  key={dur}
                  onClick={() => setBuySellDuration(dur)}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded transition ${
                    buySellDuration === dur
                      ? 'text-[#1a1205]'
                      : 'text-snow-muted'
                  }`}
                  style={buySellDuration === dur ? { background: 'linear-gradient(180deg,#facc15,#f59e0b)' } : undefined}
                >
                  {dur === 'day' ? '日' : dur === 'week' ? '週' : '月'}
                </button>
              ))}
            </div>
          </div>

          {/* Table display */}
          <div className="space-y-2 max-h-[12.5rem] overflow-y-auto">
            {(buySellTab === 'buy' ? activeBuyList : activeSellList).map((stock, index) => (
              <div
                key={index}
                className="p-2.5 bg-white/[0.03] hover:bg-white/[0.06] rounded-xl flex justify-between items-center transition cursor-pointer"
                onClick={() => alert(`載入 ${stock.name} (${stock.code}) 主動買賣超詳情`)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10.5px] font-bold text-snow">{stock.name}</span>
                  <span className="text-[9.5px] font-mono text-snow-muted">{stock.code}</span>
                  <div className="flex gap-0.5">
                    {stock.etfs.map(etf => (
                      <span key={etf} className="text-[8.5px] bg-white/[0.06] text-snow-2 font-mono px-1 rounded border border-white/[0.06] leading-none py-0.5 scale-95">
                        {etf}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-[10.5px] font-bold mr-2 ${getNetColor(buySellTab === 'buy')}`}>
                    {stock.counts}
                  </span>
                  <span className="text-[10.5px] font-mono text-snow-2 bg-white/[0.06] px-1.5 py-0.5 rounded">
                    {stock.change}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 6. Major Announcements Station (重大資訊觀測站)  */}
      <div className="glass-card p-4 rounded-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">📋</span>
            <div>
              <h3 className="font-satoshi font-medium text-snow text-sm flex items-center gap-1">
                <span>重大資訊觀測站公告</span>
                <span className="text-[9px] bg-gold/15 text-gold font-bold px-1.5 rounded uppercase font-mono tracking-wider">PREVIEW</span>
              </h3>
              <p className="text-[10.5px] text-snow-muted">證交所即時公告、上市公司重大訊息過濾（整合 ESG 與股常決議）</p>
            </div>
          </div>

          <div className="flex gap-1 overflow-x-auto pb-1 max-w-full scrollbar-none">
            {mopDatesList.slice(0, 4).map((d) => (
              <button
                key={d}
                onClick={() => setMopDate(d)}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-lg shrink-0 transition ${
                  mopDate === d ? 'text-[#1a1205]' : 'bg-white/[0.05] text-snow-muted hover:bg-white/[0.08]'
                }`}
                style={mopDate === d ? { background: 'linear-gradient(180deg,#facc15,#f59e0b)' } : undefined}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Categories filters for announcements */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] font-medium scrollbar-none">
          <button
            onClick={() => setMopTab('all')}
            className={`px-3 py-1 rounded-full transition ${mopTab === 'all' ? 'bg-gold/15 text-gold border border-gold/30' : 'bg-white/[0.05] text-snow-muted hover:bg-white/[0.08]'}`}
          >
            全部 <span className="text-[9.5px] font-bold bg-white/10 text-snow-2 px-1 rounded ml-0.5">3</span>
          </button>
          <button
            onClick={() => setMopTab('clarify')}
            className={`px-3 py-1 rounded-full transition ${mopTab === 'clarify' ? 'bg-blue-500/15 text-blue-300 border border-blue-400/30' : 'bg-white/[0.05] text-snow-muted hover:bg-white/[0.08]'}`}
          >
            澄清回應
          </button>
          <button
            onClick={() => setMopTab('financial')}
            className={`px-3 py-1 rounded-full transition ${mopTab === 'financial' ? 'bg-up/15 text-emerald-300 border border-up/30' : 'bg-white/[0.05] text-snow-muted hover:bg-white/[0.08]'}`}
          >
            財務數據
          </button>
          <button
            onClick={() => setMopTab('governance')}
            className={`px-3 py-1 rounded-full transition ${mopTab === 'governance' ? 'bg-purple-500/15 text-purple-300 border border-purple-400/30' : 'bg-white/[0.05] text-snow-muted hover:bg-white/[0.08]'}`}
          >
            公司治理 <span className="text-[9.5px] font-bold bg-white/10 text-snow-2 px-1 rounded ml-1">1</span>
          </button>
          <button
            onClick={() => setMopTab('event')}
            className={`px-3 py-1 rounded-full transition ${mopTab === 'event' ? 'bg-down/15 text-red-300 border border-down/30' : 'bg-white/[0.05] text-snow-muted hover:bg-white/[0.08]'}`}
          >
            重大事件 <span className="text-[9.5px] font-bold bg-white/10 text-snow-2 px-1 rounded ml-1">2</span>
          </button>
        </div>

        {/* Announcements list */}
        <div className="space-y-2 relative">
          {filteredMops.slice(0, 3).map((ann) => (
            <div
              key={ann.id}
              className="p-3 bg-white/[0.03] border border-white/[0.06] hover:border-gold/30 rounded-xl flex flex-col md:flex-row justify-between gap-2.5 transition cursor-pointer"
              onClick={() => alert(`【觀測站訊息詳閱】\n公司：${ann.company}\n時間：${ann.time}\n主旨：${ann.title}`)}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded leading-none ${
                    ann.type === 'governance' ? 'bg-purple-500/15 text-purple-300' :
                    ann.type === 'event' ? 'bg-down/15 text-red-300' :
                    ann.type === 'clarify' ? 'bg-blue-500/15 text-blue-300' : 'bg-up/15 text-emerald-300'
                  }`}>
                    {ann.badge}
                  </span>
                  <span className="text-[10.5px] font-bold text-snow">{ann.title}</span>
                </div>
                <p className="text-[10.5px] font-mono text-snow-muted">
                  上市代號及公司：<span className="text-snow-2 font-sans font-semibold">{ann.company}</span>
                </p>
              </div>
              <span className="text-[10px] text-snow-muted font-mono shrink-0 md:self-center bg-white/[0.05] px-2 py-0.5 rounded border border-white/[0.06]">
                {ann.time}
              </span>
            </div>
          ))}

          {/* Premium Watermark */}
          <div className="bg-gold/[0.08] border border-gold/25 p-4 rounded-xl flex flex-col md:flex-row justify-between items-center gap-3 mt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 text-[#1a1205] rounded-xl" style={{ background: 'linear-gradient(180deg,#facc15,#f59e0b)' }}>
                <Coffee className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-gold block">解鎖專業股市大情報</span>
                <p className="text-[11px] text-amber-200/80 leading-snug">一個月一杯咖啡支持作者，即可解鎖完整 MOPS 重大公告以及 ESG 深度數據！</p>
              </div>
            </div>
            <button
              onClick={() => alert('感謝支持！已模擬解鎖，並自動載入全站數據。')}
              className="text-[#1a1205] px-4 py-2 text-xs font-bold rounded-xl transition shrink-0 hover:brightness-110"
              style={{ background: 'linear-gradient(180deg,#facc15,#f59e0b)' }}
            >
              立即升級
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
