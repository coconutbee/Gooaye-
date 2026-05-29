import React, { useState } from 'react';
import { Layers, Activity, Calendar, HelpCircle, ArrowUpRight } from 'lucide-react';

interface HeatmapStock {
  name: string;
  code: string;
  weight: number; // For box sizing simulation
  returns: {
    day: number;
    week: number;
    month: number;
  };
  sector: string;
}

interface MarketHeatmapProps {
  isTaiwanStyle: boolean;
}

export default function MarketHeatmap({ isTaiwanStyle }: MarketHeatmapProps) {
  const [duration, setDuration] = useState<'day' | 'week' | 'month'>('day');
  const [selectedSec, setSelectedSec] = useState<string>('全部');

  // Hardcoded real high-fidelity Taiwan Tech stock list
  const stockList: HeatmapStock[] = [
    { name: '台積電', code: '2330', weight: 40, returns: { day: 1.5, week: 3.2, month: 8.5 }, sector: '晶圓代工' },
    { name: '聯發科', code: '2454', weight: 15, returns: { day: 0.8, week: -1.2, month: 5.4 }, sector: 'IC設計' },
    { name: '鴻海', code: '2317', weight: 12, returns: { day: 2.1, week: 4.8, month: 11.2 }, sector: 'AI 伺服器' },
    { name: '廣達', code: '2382', weight: 8, returns: { day: -1.2, week: 2.5, month: -1.4 }, sector: 'AI 伺服器' },
    { name: '欣興', code: '3037', weight: 6, returns: { day: -2.3, week: -4.1, month: 2.8 }, sector: '載板PCB' },
    { name: '世芯-KY', code: '3661', weight: 5, returns: { day: 3.5, week: 8.1, month: 14.5 }, sector: 'IC設計' },
    { name: '創意', code: '3443', weight: 5, returns: { day: 2.8, week: 5.2, month: 12.0 }, sector: 'IC設計' },
    { name: '奇鋐', code: '3017', weight: 4, returns: { day: 4.1, week: 6.8, month: 18.2 }, sector: '液冷散熱' },
    { name: '雙鴻', code: '3324', weight: 4, returns: { day: 3.2, week: 5.5, month: 15.1 }, sector: '液冷散熱' },
    { name: '勤誠', code: '8210', weight: 3, returns: { day: 1.8, week: -0.5, month: 6.9 }, sector: 'AI 伺服器' },
    { name: '力旺', code: '3529', weight: 3, returns: { day: -0.5, week: 3.1, month: 9.3 }, sector: 'IC設計' },
    { name: '聯亞', code: '3081', weight: 2, returns: { day: 5.5, week: 12.4, month: 28.5 }, sector: '矽光子' },
    { name: '光聖', code: '6442', weight: 2, returns: { day: -1.8, week: 4.0, month: 22.1 }, sector: '矽光子' },
  ];

  const valueExtractor = (st: HeatmapStock) => {
    if (duration === 'day') return st.returns.day;
    if (duration === 'week') return st.returns.week;
    return st.returns.month;
  };

  const getHeatColorAndText = (val: number) => {
    const absVal = Math.abs(val);
    const intensity = Math.min(Math.floor(absVal * 15) + 30, 95); // Scale percentage brightness
    
    // Choose colors base on isTaiwanStyle (Taiwan style: Red up, Green down. International: Green up, Red down)
    if (isTaiwanStyle) {
      if (val > 0) {
        return {
          bg: `rgba(220, 38, 38, ${intensity / 100})`, // Red scale
          text: 'text-white'
        };
      } else if (val < 0) {
        return {
          bg: `rgba(16, 185, 129, ${intensity / 100})`, // Green scale
          text: 'text-white'
        };
      } else {
        return { bg: '#F1F3F5', text: 'text-slate-600' };
      }
    } else {
      if (val > 0) {
        return {
          bg: `rgba(16, 185, 129, ${intensity / 100})`, // Green scale
          text: 'text-white'
        };
      } else if (val < 0) {
        return {
          bg: `rgba(220, 38, 38, ${intensity / 100})`, // Red scale
          text: 'text-white'
        };
      } else {
        return { bg: '#F1F3F5', text: 'text-slate-600' };
      }
    }
  };

  const sectors = ['全部', '晶圓代工', 'IC設計', 'AI 伺服器', '液冷散熱', '矽光子'];

  const filteredStocks = stockList.filter(s => {
    if (selectedSec === '全部') return true;
    return s.sector === selectedSec;
  });

  return (
    <div className="space-y-6">
      {/* Upper bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-3xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
            <Activity className="text-indigo-600 w-4 h-4" />
            <span>市場熱力圖 (Sector Heatmap)</span>
          </h3>
          <p className="text-[10px] text-slate-400">依據市值權重及漲跌幅強度顯示（點擊個股可檢視其報價與資料庫關聯）</p>
        </div>

        {/* Controls */}
        <div className="flex gap-2 items-center flex-wrap">
          {/* Duration toggle */}
          <div className="flex bg-slate-50 p-1 rounded-lg">
            {(['day', 'week', 'month'] as const).map((dur) => (
              <button
                key={dur}
                onClick={() => setDuration(dur)}
                className={`text-[10px] font-bold px-3 py-1 rounded-md transition ${
                  duration === dur 
                    ? 'bg-indigo-600 text-white shadow-2xs' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {dur === 'day' ? '單日' : dur === 'week' ? '單週' : '單月'}
              </button>
            ))}
          </div>

          {/* Color Style Info label */}
          <span className="text-[9.5px] font-mono text-slate-400 bg-slate-50 border border-slate-100 px-2 py-1 rounded-md">
            配色：{isTaiwanStyle ? '🔴 漲 / 🟢 跌 (台股風格)' : '🟢 漲 / 🔴 跌 (國際風格)'}
          </span>
        </div>
      </div>

      {/* Sector filter */}
      <div className="flex gap-1 overflow-x-auto pb-1 text-xs">
        {sectors.map((sec) => (
          <button
            key={sec}
            onClick={() => setSelectedSec(sec)}
            className={`text-[11px] font-medium px-3 py-1 rounded-full transition shrink-0 ${
              selectedSec === sec 
                ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' 
                : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200/60'
            }`}
          >
            {sec}
          </button>
        ))}
      </div>

      {/* Treemap visual cards display */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {filteredStocks.map((st) => {
          const ret = valueExtractor(st);
          const colorObj = getHeatColorAndText(ret);
          const isPos = ret > 0;
          return (
            <div
              key={st.code}
              onClick={() => alert(`載入 ${st.name} (${st.code}) 專屬深度資料庫面板中...`)}
              style={{ backgroundColor: colorObj.bg }}
              className={`p-4 rounded-xl shadow-3xs cursor-pointer border border-white/10 hover:shadow-md hover:scale-102 transition duration-200 flex flex-col justify-between`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className={`text-[11px] font-extrabold ${colorObj.text}`}>
                    {st.name}
                  </span>
                  <span className={`text-[9px] font-mono block opacity-70 ${colorObj.text}`}>
                    {st.code}
                  </span>
                </div>
                <span className={`text-[9px] font-bold bg-white/25 px-1.5 py-0.5 rounded ${colorObj.text}`}>
                  {st.sector}
                </span>
              </div>

              <div className="mt-4 flex items-baseline justify-between transition group">
                <span className={`text-base font-extrabold font-mono ${colorObj.text}`}>
                  {isPos ? '+' : ''}{ret.toFixed(2)}%
                </span>
                <ArrowUpRight className={`w-3.5 h-3.5 opacity-60 group-hover:opacity-100 ${colorObj.text}`} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
