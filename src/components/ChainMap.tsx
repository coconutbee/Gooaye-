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
      icon: <Layers className="w-5 h-5 text-sky-300" />,
      bgHeader: 'bg-sky-500/12 border-white/[0.06]',
      textColor: 'text-sky-300',
      description: chainMap.upstream,
      stocks: getStageStocks('upstream'),
    },
    {
      key: 'midstream' as const,
      title: '中游環節 (Midstream)',
      icon: <Milestone className="w-5 h-5 text-gold" />,
      bgHeader: 'bg-gold/12 border-white/[0.06]',
      textColor: 'text-gold',
      description: chainMap.midstream,
      stocks: getStageStocks('midstream'),
    },
    {
      key: 'downstream' as const,
      title: '下游環節 (Downstream)',
      icon: <ShoppingCart className="w-5 h-5 text-emerald-300" />,
      bgHeader: 'bg-up/12 border-white/[0.06]',
      textColor: 'text-emerald-300',
      description: chainMap.downstream,
      stocks: getStageStocks('downstream'),
    },
  ];

  return (
    <div className="space-y-5" id="chain-map-container">
      <div className="flex items-center justify-between">
        <h3 className="font-satoshi font-medium text-snow text-sm flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-gold" />
          <span>產業鏈上下游關係圖</span>
        </h3>
        <span className="text-[10px] text-snow-muted font-mono">觸控個股即可展開深度研究</span>
      </div>

      {/* Grid of Stages */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stages.map((stage) => (
          <div
            key={stage.key}
            className="glass-card rounded-xl overflow-hidden flex flex-col justify-between"
          >
            {/* Header */}
            <div>
              <div className={`p-3 border-b flex items-center gap-2 ${stage.bgHeader}`}>
                {stage.icon}
                <span className={`font-semibold text-xs ${stage.textColor}`}>{stage.title}</span>
              </div>

              {/* Description */}
              <div className="p-3 text-xs text-snow-2 leading-relaxed bg-white/[0.02] min-h-[5rem]">
                {stage.description}
              </div>
            </div>

            {/* Stage Stocks */}
            <div className="p-3 border-t border-white/[0.06] space-y-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-snow-muted block">
                相關概念股 ({stage.stocks.length})
              </span>
              {stage.stocks.length === 0 ? (
                <p className="text-[11px] text-snow-muted italic py-1">暫無此環節的直接覆蓋個股</p>
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
                            ? 'bg-gold/10 border-gold/50 ring-1 ring-gold/25'
                            : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06]'
                        }`}
                      >
                        <div className="truncate pr-1">
                          <p className="font-semibold text-snow truncate flex items-center gap-1">
                            <span>{stock.name}</span>
                            <span className="text-[10px] text-snow-muted bg-white/[0.06] px-1 py-0.5 rounded font-mono font-normal">
                              {stock.code.replace('.TW', '').replace('.TWO', '')}
                            </span>
                          </p>
                          <p className="text-[10px] text-snow-muted truncate mt-0.5 leading-none">
                            {stock.role}
                          </p>
                        </div>

                        {/* 1M change indicator */}
                        <div className="text-right shrink-0">
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                              isUp
                                ? isTaiwanStyle ? 'bg-down/15 text-red-300' : 'bg-up/15 text-emerald-300'
                                : isTaiwanStyle ? 'bg-up/15 text-emerald-300' : 'bg-down/15 text-red-300'
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
