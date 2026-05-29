import React from 'react';
import { ArrowRight, Link, Layers, Milestone, ShoppingCart, HelpCircle } from 'lucide-react';
import { TopicResearchResult, StockInfo } from '../types';

interface ChainMapProps {
  data: TopicResearchResult;
  onSelectStock: (stock: StockInfo) => void;
  selectedStockId?: string;
  isTaiwanStyle?: boolean;
}

export default function ChainMap({ data, onSelectStock, selectedStockId, isTaiwanStyle = true }: ChainMapProps) {
  const { chainMap, stocks } = data;

  const getStageStocks = (category: 'upstream' | 'midstream' | 'downstream') => {
    return stocks.filter(s => s.roleCategory === category);
  };

  const stages = [
    {
      key: 'upstream' as const,
      title: '上游環節 (Upstream)',
      icon: <Layers className="w-5 h-5 text-sky-600" />,
      bgHeader: 'bg-sky-50 border-sky-100',
      textColor: 'text-sky-800',
      textBtn: 'border-sky-200 hover:bg-sky-50',
      description: chainMap.upstream,
      stocks: getStageStocks('upstream'),
    },
    {
      key: 'midstream' as const,
      title: '中游環節 (Midstream)',
      icon: <Milestone className="w-5 h-5 text-indigo-600" />,
      bgHeader: 'bg-indigo-50 border-indigo-100',
      textColor: 'text-indigo-800',
      textBtn: 'border-indigo-200 hover:bg-indigo-50',
      description: chainMap.midstream,
      stocks: getStageStocks('midstream'),
    },
    {
      key: 'downstream' as const,
      title: '下游環節 (Downstream)',
      icon: <ShoppingCart className="w-5 h-5 text-emerald-600" />,
      bgHeader: 'bg-emerald-50 border-emerald-100',
      textColor: 'text-emerald-800',
      textBtn: 'border-emerald-200 hover:bg-emerald-50',
      description: chainMap.downstream,
      stocks: getStageStocks('downstream'),
    },
  ];

  return (
    <div className="space-y-5" id="chain-map-container">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-indigo-600" />
          <span>產業鏈上下游關係圖</span>
        </h3>
        <span className="text-[10px] text-slate-400 font-mono">觸控個股即可展開深度研究</span>
      </div>

      {/* Grid of Stages */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stages.map((stage) => (
          <div
            key={stage.key}
            className="bg-white border border-slate-100 rounded-xl shadow-xs overflow-hidden flex flex-col justify-between"
          >
            {/* Header */}
            <div>
              <div className={`p-3 border-b flex items-center gap-2 ${stage.bgHeader}`}>
                {stage.icon}
                <span className={`font-semibold text-xs ${stage.textColor}`}>{stage.title}</span>
              </div>
              
              {/* Description */}
              <div className="p-3 text-xs text-slate-600 leading-relaxed bg-slate-50/50 min-h-[5rem]">
                {stage.description}
              </div>
            </div>

            {/* Stage Stocks */}
            <div className="p-3 bg-white border-t border-slate-50 space-y-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                相關概念股 ({stage.stocks.length})
              </span>
              {stage.stocks.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic py-1">暫無此環節的直接覆蓋個股</p>
              ) : (
                <div className="space-y-1.5">
                  {stage.stocks.map((stock) => {
                    const isSelected = selectedStockId === stock.id;
                    const changeVal = stock.recentReturn1M;
                    const isUp = changeVal >= 0;

                    return (
                      <button
                        key={stock.id}
                        onClick={() => onSelectStock(stock)}
                        className={`w-full p-2 text-left rounded-lg border text-xs transition duration-200 flex items-center justify-between ${
                          isSelected
                            ? 'bg-indigo-50 border-indigo-400 ring-1 ring-indigo-200'
                            : 'bg-white border-slate-100 hover:bg-slate-50'
                        }`}
                      >
                        <div className="truncate pr-1">
                          <p className="font-semibold text-slate-800 truncate flex items-center gap-1">
                            <span>{stock.name}</span>
                            <span className="text-[10px] text-slate-400 bg-slate-100 px-1 py-0.5 rounded font-mono font-normal">
                              {stock.code.replace('.TW', '').replace('.TWO', '')}
                            </span>
                          </p>
                          <p className="text-[10px] text-slate-500 truncate mt-0.5 leading-none">
                            {stock.role}
                          </p>
                        </div>

                        {/* 1M change indicator */}
                        <div className="text-right shrink-0">
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                              isUp
                                ? isTaiwanStyle ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                                : isTaiwanStyle ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-700'
                            }`}
                          >
                            {isUp ? '+' : ''}
                            {changeVal}% (1M)
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
