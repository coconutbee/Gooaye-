import React, { useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { Activity, Grid3X3 } from 'lucide-react';
import {
  HEATMAP_MARKETS,
  HeatmapMarket,
  HeatmapPeriod,
} from '../data/heatmapData';

interface MarketHeatmapProps {
  isTaiwanStyle: boolean;
}

type Dimension = 'sector' | 'stock';

interface TreeNode {
  name: string;
  code?: string;
  value: number;          // 面積 = 相對市值
  changePercent: number;  // 顏色 = 漲跌幅
  sector?: string;
  count?: number;
}

// 顏色：依台股 / 國際配色決定漲跌色，深淺依漲跌幅強度
function tileColor(change: number, isTaiwanStyle: boolean): string {
  if (!change) return 'rgba(120,120,130,0.35)';
  const RED = '247, 66, 75';   // tradytics --text-warning
  const GREEN = '106, 206, 98'; // tradytics --text-success
  const up = change > 0;
  const rgb = up
    ? (isTaiwanStyle ? RED : GREEN)
    : (isTaiwanStyle ? GREEN : RED);
  const intensity = Math.min(Math.abs(change) / 8, 1);
  return `rgba(${rgb}, ${0.32 + intensity * 0.6})`;
}

const fmtPct = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(2)}%`;

const PERIODS: { key: HeatmapPeriod; label: string }[] = [
  { key: 'day', label: '單日' },
  { key: 'week', label: '單週' },
  { key: 'month', label: '單月' },
];

const DIMENSIONS: { key: Dimension; label: string }[] = [
  { key: 'sector', label: '產業' },
  { key: 'stock', label: '個股' },
];

export default function MarketHeatmap({ isTaiwanStyle }: MarketHeatmapProps) {
  const [market, setMarket] = useState<HeatmapMarket>('tw');
  const [period, setPeriod] = useState<HeatmapPeriod>('day');
  const [dimension, setDimension] = useState<Dimension>('sector');

  const nodes = useMemo<TreeNode[]>(() => {
    const stocks = HEATMAP_MARKETS[market].stocks;
    const change = (s: typeof stocks[number]) => s.returns[period];

    if (dimension === 'stock') {
      return stocks.map((s) => ({
        name: s.name,
        code: s.code,
        value: s.marketCap,
        changePercent: change(s),
        sector: s.sector,
      }));
    }

    // 依產業聚合：面積=市值加總，漲跌幅=市值加權平均
    const agg = new Map<string, { cap: number; weighted: number; count: number }>();
    for (const s of stocks) {
      const e = agg.get(s.sector) ?? { cap: 0, weighted: 0, count: 0 };
      e.cap += s.marketCap;
      e.weighted += change(s) * s.marketCap;
      e.count += 1;
      agg.set(s.sector, e);
    }
    return [...agg.entries()]
      .map(([sector, e]) => ({
        name: sector,
        value: e.cap,
        changePercent: e.weighted / e.cap,
        count: e.count,
      }))
      .sort((a, b) => b.value - a.value);
  }, [market, period, dimension]);

  const option = useMemo(() => {
    const data = nodes.map((n) => ({
      ...n,
      itemStyle: { color: tileColor(n.changePercent, isTaiwanStyle) },
    }));

    return {
      backgroundColor: 'transparent',
      tooltip: {
        backgroundColor: 'rgba(12,12,14,0.96)',
        borderColor: '#2a2a2e',
        borderWidth: 1,
        padding: [10, 14],
        textStyle: { color: '#e6e6e6', fontSize: 12 },
        extraCssText: 'box-shadow: 0 8px 24px rgba(0,0,0,0.5); border-radius: 8px;',
        formatter: (p: { data: TreeNode }) => {
          const d = p.data;
          if (!d || !d.name) return '';
          const up = d.changePercent > 0;
          const c = up ? (isTaiwanStyle ? '#f7424b' : '#6ace62') : (isTaiwanStyle ? '#6ace62' : '#f7424b');
          let html = `<div style="font-weight:700;font-size:13px;margin-bottom:6px;color:#fff;">${d.name}${d.code ? ` <span style="color:#8f8f8f;font-weight:400">${d.code}</span>` : ''}</div>`;
          html += `<div style="display:flex;justify-content:space-between;gap:18px;"><span style="color:#8f8f8f">漲跌幅</span><span style="color:${c};font-weight:600">${fmtPct(d.changePercent)}</span></div>`;
          if (d.sector) html += `<div style="display:flex;justify-content:space-between;gap:18px;margin-top:2px;"><span style="color:#8f8f8f">產業</span><span>${d.sector}</span></div>`;
          if (d.count) html += `<div style="display:flex;justify-content:space-between;gap:18px;margin-top:2px;"><span style="color:#8f8f8f">成分股</span><span>${d.count} 檔</span></div>`;
          return html;
        },
      },
      series: [
        {
          type: 'treemap',
          left: 0, top: 0, right: 0, bottom: 0,
          roam: false,
          nodeClick: false,
          breadcrumb: { show: false },
          label: {
            show: true,
            formatter: (p: { data: TreeNode }) => {
              const d = p.data;
              if (!d || !d.name) return '';
              return `{name|${d.name}}\n{change|${fmtPct(d.changePercent)}}`;
            },
            rich: {
              name: { fontSize: 13, color: '#fff', fontWeight: 700, textShadowColor: 'rgba(0,0,0,0.6)', textShadowBlur: 3 },
              change: { fontSize: 12, color: 'rgba(255,255,255,0.92)', padding: [3, 0, 0, 0], textShadowColor: 'rgba(0,0,0,0.6)', textShadowBlur: 3 },
            },
          },
          itemStyle: { borderColor: '#0c0c0e', borderWidth: 2, gapWidth: 2 },
          emphasis: { itemStyle: { borderColor: '#6ace62', borderWidth: 2 } },
          data,
        },
      ],
    };
  }, [nodes, isTaiwanStyle]);

  // 小型分段控制元件
  const Seg = (props: {
    value: string; options: { key: string; label: string }[]; onChange: (k: string) => void;
  }) => (
    <div className="flex bg-white/5 p-0.5 rounded-lg border border-white/10">
      {props.options.map((o) => (
        <button
          key={o.key}
          onClick={() => props.onChange(o.key)}
          className={`text-[11px] font-bold px-3 py-1 rounded-md transition ${
            props.value === o.key ? 'bg-[#6ace62] text-black shadow' : 'text-slate-300 hover:text-white'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="rounded-2xl bg-[#0c0c0e] border border-white/10 shadow-lg overflow-hidden text-slate-200">
      {/* 標題列 */}
      <div className="px-5 py-4 border-b border-white/5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="bg-[#6ace62]/15 text-[#6ace62] p-2 rounded-xl">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-extrabold text-white text-sm">市場熱力圖 · Market Heatmap</h3>
            <p className="text-[10.5px] text-slate-500">方塊面積＝市值權重，顏色＝{PERIODS.find(p => p.key === period)?.label}漲跌幅</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Seg value={market} options={[{ key: 'tw', label: '台股' }, { key: 'us', label: '美股' }]} onChange={(k) => setMarket(k as HeatmapMarket)} />
          <Seg value={dimension} options={DIMENSIONS} onChange={(k) => setDimension(k as Dimension)} />
          <Seg value={period} options={PERIODS} onChange={(k) => setPeriod(k as HeatmapPeriod)} />
          <span className="text-[9.5px] font-mono text-slate-400 bg-white/5 border border-white/10 px-2 py-1 rounded-md">
            {isTaiwanStyle ? '🔴漲 / 🟢跌' : '🟢漲 / 🔴跌'}
          </span>
        </div>
      </div>

      {/* Treemap */}
      <div className="p-3">
        {nodes.length > 0 ? (
          <ReactECharts
            option={option}
            style={{ height: 480, width: '100%' }}
            notMerge
            opts={{ renderer: 'canvas' }}
          />
        ) : (
          <div className="h-[480px] flex flex-col items-center justify-center gap-3 text-slate-600">
            <Grid3X3 size={48} strokeWidth={1} />
            <p className="text-xs">暫無資料</p>
          </div>
        )}
      </div>

      {/* 圖例 */}
      <div className="px-5 py-3 border-t border-white/5 flex items-center justify-center gap-3">
        <span className="text-[10px] uppercase tracking-wider text-slate-500">{isTaiwanStyle ? '跌' : '漲'}</span>
        <div
          className="w-44 h-1.5 rounded-full"
          style={{
            background: isTaiwanStyle
              ? 'linear-gradient(to right, #6ace62, #3a3a3e, #f7424b)'
              : 'linear-gradient(to right, #f7424b, #3a3a3e, #6ace62)',
          }}
        />
        <span className="text-[10px] uppercase tracking-wider text-slate-500">{isTaiwanStyle ? '漲' : '跌'}</span>
        <span className="text-[10px] text-slate-600 ml-3 font-mono">
          {HEATMAP_MARKETS[market].label} · {nodes.length} {dimension === 'sector' ? '產業' : '檔'}
        </span>
      </div>
    </div>
  );
}
