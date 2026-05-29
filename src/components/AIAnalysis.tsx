import React, { useState } from 'react';
import { Sparkles, Terminal, Activity, FileText, CheckCircle, ArrowRight, Play, AlertCircle } from 'lucide-react';
import Markdown from 'react-markdown';

interface AIAnalysisProps {
  isTaiwanStyle: boolean;
}

export default function AIAnalysis({ isTaiwanStyle }: AIAnalysisProps) {
  const [topicPrompt, setTopicPrompt] = useState<string>('分析台積電N2製程進度與ASIC影響');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [report, setReport] = useState<string>('');

  const steps = [
    '正在橫向調閱 Google Search Grounding 先進製程最新研究文獻...',
    '調取 MOPS 台灣公開資訊觀測站之股東會決議及最新財報數據...',
    '分析全球 AWS/Google/Meta ASIC 專案 NRE 開案時程與排程...',
    '正在套用 Taiwan Color-Style 進行財務回報比對模型運算...',
    '完成！正在編排深度股市智慧報告...'
  ];

  const handleStartAnalysis = () => {
    if (!topicPrompt.trim()) return;
    setIsSearching(true);
    setCurrentStep(0);
    setReport('');

    // Step by step visual simulation
    let stepCount = 0;
    const interval = setInterval(() => {
      stepCount++;
      if (stepCount < steps.length) {
        setCurrentStep(stepCount);
      } else {
        clearInterval(interval);
        // Load report
        const generatedReport = `
# 🔬 ${topicPrompt} 深度研究報告

### 📅 分析報告更新時間：2026年5月21日 | 評估評級：**強力買進研究 (Strong Buy Research)**

隨著全球 AI 硬體架構過渡至更高單元算力與先進封裝技術，**${topicPrompt}** 的多維度演進已被視為下半年最重要的資金板塊推手。

---

## 💡 核心產業趨勢與驅動點
1. **N2製程大幅領先物理極限**：
   台積電 (2330.TW) 最新 2 奈米技術採背端供電 (Backside Power Delivery) 技術，速度相較 N3E 增值 13%，耗電大幅調調減少 30%。本季度已進入大坪廠大規模裝機測試，2026 年量產無虞。
2. **ASIC 與 CSP 的深度耦合關係**：
   由於 NVIDIA 晶片在單機櫃供貨存在排擠，各大 CSP 如 Google (TPU v6), Amazon (Trainium 2) 全力轉向成熟 ASIC，世芯-KY及創意作為 3奈米/2奈米首選投片夥伴，後端一站式 NRE 與 3D 先進封裝服務產值將倍數提升。
3. **成本效益與水冷擴張**、
   高效能 IC 物理表面溫度突破傳統封裝載板极限。CoWoS 與矽光子 (CPO) 聯手打造全新的跨晶片高带宽網絡。

---

## 📊  핵심概念股佈局一覽外資法人焦點

### 1. 台積電 (2330.TW) - 晶圓製造核心
*   **產業角色**：全球唯一 2 奈米先行量產提供者。
*   **優勢核心**：先進封裝 CoWoS 配額大於 80%，市場定價權極強。
*   **操作策略**：長線基本持倉防守首選。

### 2. 世芯-KY (3661.TW) - 高階後端設計
*   **產業角色**：CSP 大型專案物理收斂核心。
*   **優勢核心**：北美雲端巨擘最重要量產設計鏈。
*   **操作策略**：中性偏多，避開高分點短線高回撤期。

### 3. 創意 (3443.TW) - 台積電先進設計
*   **產業角色**：系統整合及 HBM4 物理層授權。
*   **優勢核心**：與台積電 SoIC 技術最深嵌合。
*   **操作策略**：分批長線關注。

---

## ⚙️ 投資建議與資產配比規劃

| 建議持倉比重 | 主要催化劑 | 關鍵回撤底線守則 |
| :--- | :--- | :--- |
| **35% ~ 40% 核心持股** | 1. 2奈米新製程首款 CSP 投片送驗確認<br>2. 投信放寬權限資金湧入 | 1. 投信籌碼連買突然斷頭<br>2. 北美 CSP 硬體資本支出意外下修 |

> ⚠️ **聲明警告**：本研究由 AI 智慧搜索 Grounding 技術自動產生，投資大眾應注意股市具備高度槓桿與波動性，應依據個人風險承受力進行獨立理財判斷。
`;
        setReport(generatedReport);
        setIsSearching(false);
      }
    }, 1500);
  };

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-3xs space-y-4">
      <div className="space-y-1">
        <h3 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-indigo-600 animate-spin-slow" />
          <span>AI 深度主題產業分析實驗室</span>
        </h3>
        <p className="text-[10.5px] text-slate-400">
          結合 Google Search 智慧、台灣觀測站數據以及產業鏈關係，實施高確信度推演與資產規劃建議。
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex gap-2.5">
          <input 
            type="text"
            value={topicPrompt}
            onChange={(e) => setTopicPrompt(e.target.value)}
            disabled={isSearching}
            placeholder="請輸入欲深度分析的關鍵議題或個股如：矽光子與 CPO 晶粒..."
            className="flex-1 text-xs px-3.5 py-2.5 border border-slate-200 outline-hidden focus:bg-white focus:ring-2 focus:ring-indigo-100 bg-slate-50 rounded-xl font-medium transition"
          />
          <button
            onClick={handleStartAnalysis}
            disabled={isSearching || !topicPrompt.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1 shrink-0 disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>開始 AI 研究</span>
          </button>
        </div>

        {/* Step-by-step Loading State */}
        {isSearching && (
          <div className="p-5 bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-3 animate-fade-in text-xs">
            <div className="flex justify-between items-center text-slate-500 pb-1.5 border-b border-slate-200/50">
              <span className="font-bold flex items-center gap-1">
                <Terminal className="w-4 h-4" />
                <span>分析引擎執行中...</span>
              </span>
              <span className="font-mono text-[10px] bg-indigo-50 text-indigo-700 font-bold px-1.5 rounded">{currentStep + 1}/5</span>
            </div>

            <div className="space-y-2">
              {steps.map((st, idx) => {
                const isActive = idx === currentStep;
                const isCompleted = idx < currentStep;
                return (
                  <div key={idx} className="flex items-center gap-2 text-[11px] transition duration-200">
                    {isCompleted ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : isActive ? (
                      <Activity className="w-4 h-4 text-indigo-600 animate-spin shrink-0" />
                    ) : (
                      <span className="w-4 h-4 rounded-full border border-slate-300 inline-block shrink-0"></span>
                    )}
                    <span className={`${isActive ? 'text-indigo-900 font-bold' : isCompleted ? 'text-slate-400' : 'text-slate-400 font-light'}`}>
                      {st}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Report Result */}
        {report && (
          <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 animate-fade-in overflow-x-auto">
            <div className="prose prose-slate max-w-none text-xs text-slate-600 leading-relaxed max-h-[35rem] overflow-y-auto">
              <Markdown>{report}</Markdown>
            </div>
            
            <div className="mt-4 pt-4 border-t border-slate-200/50 flex justify-between items-center text-[10px] text-slate-400">
              <span>報告印記代碼：#AI-STUDIO-LAB-2026</span>
              <button 
                onClick={() => alert('研究報告已導出為優化 PDF 格式並存入您的 Watchlist 關聯硬碟中。')}
                className="bg-indigo-600 text-white hover:bg-indigo-700 font-bold px-3 py-1.5 rounded-lg transition"
              >
                📥 導出 PDF 報告
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
