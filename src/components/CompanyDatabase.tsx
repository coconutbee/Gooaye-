import React, { useState } from 'react';
import { 
  Heart, 
  HelpCircle, 
  TrendingUp, 
  TrendingDown, 
  BookOpen, 
  Layers, 
  Activity, 
  ArrowLeft,
  DollarSign, 
  Briefcase, 
  Sparkles, 
  Coffee, 
  ExternalLink 
} from 'lucide-react';

interface CompanyData {
  id: string;
  name: string;
  code: string;
  favorited: boolean;
  revenueStatus: string;
  marginStatus: string;
  institutionStatus: string;
  hasFutureOption: boolean;
  activeThemeSelected: string;
  aiSummary: string;
  marketPosition: {
    title: string;
    description: string;
  };
  techFocus: {
    title: string;
    points: string[];
  };
  keyProduct: string;
  keyClient: string;
  swot: {
    strengths: string;
    weaknesses: string;
    opportunities: string;
    threats: string;
  };
}

export default function CompanyDatabase() {
  const [selectedId, setSelectedId] = useState<string>('3443');
  const [activeTab, setActiveTab] = useState<'info' | 'industry' | 'insider' | 'tech' | 'news' | 'charts'>('industry');
  const [searchWord, setSearchWord] = useState('');
  const [favorites, setFavorites] = useState<Record<string, boolean>>({ '3443': true });
  const [isUpgraded, setIsUpgraded] = useState<boolean>(false);

  // High fidelity database matching Images 2 and 3
  const companies: CompanyData[] = [
    {
      id: '3443',
      name: '創意',
      code: '3443.TW',
      favorited: true,
      revenueStatus: '營收增',
      marginStatus: '連三月增',
      institutionStatus: '外資買超',
      hasFutureOption: true,
      activeThemeSelected: '客製 ASIC 與矽智財',
      aiSummary: '創意 (3443) 2026 年將進入營收與獲利之爆發成長期。隨 Google CPU 倍增出貨及 Tesla AI5 進入量產高峰，全年營收有望挑戰 590 億元新高。其領先之矽光子 (CPO) 與 HBM4 佈局，確保其在次世代 AI 算力軍備競爭中不可動搖的關鍵地位，由設計服務成功進化為 AI 系統整合供應商。',
      marketPosition: {
        title: '產業龍頭',
        description: '台積電先進技術的最前哨，AI 時代高階系統整合之領航者，掌握 CPO 與 3nm 先進封裝核心設計權。'
      },
      techFocus: {
        title: '先進封裝與 3D 堆疊設計',
        points: [
          '台積電 COUPE、CoWoS 與 SoIC 整合設計能力',
          '支援 1.6T 以上傳輸規格之矽光子封裝架構',
          '先進節點 HBM4 與高頻寬記憶體物理層 (PHY) 介面設計研發'
        ]
      },
      keyProduct: '3nm AI 加速器與 CPU Turnkey\n包含 Google 自研 2026 CPU 與 Tesla AI5 專案，預計 2026 年進入量產高峰。',
      keyClient: 'Google\n核心客戶，自研 CPU 2026 出貨量預計成長至 200 萬顆。',
      swot: {
        strengths: '台積電體系背景，在先進製程產能與先進封裝技術協同開發（如 CoWoS-S/L）具有絕對領先之晶圓廠優先配額優權。',
        weaknesses: 'Turnkey (量產投片) 營收佔比快速提升，導致短期整體綜合毛利率降至 24.8% 左右，對高淨值 NRE 利潤有所稀釋。',
        opportunities: '2026 年預估為 ASIC 出貨量超越傳統通用型 GPU 的黃金轉折起點，公司作為產業頂峰設計服務商受惠最深。',
        threats: '全球大型雲端服務商 (CSP) 積極擴大內部自研設計團隊，可能壓縮第三方獨立 ASIC 設計服務廠商的長期主導角色。'
      }
    },
    {
      id: '3661',
      name: '世芯-KY',
      code: '3661.TW',
      favorited: false,
      revenueStatus: '營收暴增',
      marginStatus: '毛利高升',
      institutionStatus: '投信加碼',
      hasFutureOption: true,
      activeThemeSelected: '客製 ASIC 與矽智財',
      aiSummary: '世芯-KY (3661) 作為美系大型雲端服務商的最核心 ASIC 授權夥伴，提供極具競爭力的 3nm 後端晶片物理設計。隨著北美超算資料中心專案拉貨，晶片後續權利金貢獻將呈非線性向上增長，毛利率可同步維持高水平。',
      marketPosition: {
        title: '先進製程領跑者',
        description: '全球 3奈米、2奈米後端設計極少数具備成功投片紀錄的龍頭，北美與日系 AI 晶片的首選委外代工夥伴。'
      },
      techFocus: {
        title: '超大規模微架構與熱設計',
        points: [
          '3奈米 N3E 與 N3P 晶片大型物理收斂與靜態時序分析',
          '搭配高階液冷封裝之多晶粒 (Multi-die) 精密訊號耦合與供電電路優化',
          '先進 SerDes IP 核心整合能力'
        ]
      },
      keyProduct: '美系 CSP 專屬 AI 加速處理器\n提供超高效率之定制 Nare SoC 後端代工設計及投片，預計新一代先進製程晶片即將於本季度投片。',
      keyClient: '亞馬遜 AWS / Meta\n微結構深度配合研發夥伴，長期穩定貢獻後端實體NRE服務價值。',
      swot: {
        strengths: '具備業界最強大的頂尖工程人才庫與成熟的 3nm 先進物理佈線投片經驗，與台積電產能保障高度互惠。',
        weaknesses: '客戶集中度過於強烈（北美單一美系大廠佔營收 50% 以上），單一客戶調度出貨將對月營收造成大幅度的不確定干擾。',
        opportunities: '美系大廠與日系自駕大客戶下一代 3nm 工業晶片啟動全新 NRE 開案，帶動高毛利權利金提前入帳。',
        threats: '美中高科技實體單片制裁政策動態，導致中國區高算力代工案源受地緣限制被迫裁減或延遲。'
      }
    },
    {
      id: '3081',
      name: '聯亞',
      code: '3081.TW',
      favorited: false,
      revenueStatus: '營收盈',
      marginStatus: '淨利倍增',
      institutionStatus: '外資持續買',
      hasFutureOption: false,
      activeThemeSelected: '矽光子與 CPO',
      aiSummary: '聯亞 (3081) 受惠於北美大型基礎設施與 AI 資料中心全面由單元光訊號過渡至矽光子架構的需求爆發。其高功率雷射射頻晶粒矽智財與光通訊基板，是全球唯一獲得北美主要大廠（如 Google 與瑞典大廠）認證通過的方案。',
      marketPosition: {
        title: '光通訊晶粒首選外包商',
        description: '擁有全亞洲最領先的有機金屬氣相磊晶法 (MOCVD) 技術，掌握高階矽光晶粒磊晶的核心產能。'
      },
      techFocus: {
        title: '砷化鎵與磷化銦雷射磊晶',
        points: [
          '具有極高品質控制的光電轉換外部整合雷射光源 (ELS)',
          '提供多模/單模 800G 與 1.6T 先進高頻收發晶片磊晶製造技術',
          '針對 CPO 生態系的矽光整合光學通道精密測試專利方案'
        ]
      },
      keyProduct: '高功率矽光雷射 LD 載板\n主要出貨為北美超高速通訊網絡升級，預計本季度出貨將倍增。',
      keyClient: '北美大型資料中心與網通廠\n深度配合下一代 AI 加速機櫃光纖網絡升級工程。',
      swot: {
        strengths: '磊晶技術屏障極高，設備開發週期長達 2 年以上，在全球 AI 進階光通訊晶圓中具有獨占配額地位。',
        weaknesses: '產品前期良率測試與新製程切換折舊費用提列較高，容易在量產初期拉低短期淨利潤水準。',
        opportunities: '矽光子 CPO 標準規範加速通過，北美雲端資料中心 1.6T 光模組將在下半年強勢啟動剛性替換週期。',
        threats: '英特爾等國際 IDM 廠商大舉切入矽光複合封裝領域，將對亞洲獨立磊晶代工鏈帶來長期競爭警報。'
      }
    }
  ];

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleUpgrade = () => {
    setIsUpgraded(true);
    alert('升級成功！已為您解鎖該股的所有產業分析、基本資料、籌碼及完整 SWOT 分析報告。');
  };

  const currentCompany = companies.find(c => c.id === selectedId) || companies[0];

  const filteredCompanies = companies.filter(c => {
    if (!searchWord) return true;
    return c.name.includes(searchWord) || c.code.includes(searchWord);
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
      {/* Left Navigation: Companies List Grid (4 cols) */}
      <div className="md:col-span-4 glass-card p-4 rounded-xl space-y-4 h-fit">
        <div className="space-y-1">
          <h3 className="font-satoshi font-medium text-snow text-sm flex items-center gap-1.5">
            <BookOpen className="text-gold w-4 h-4" />
            <span>公司資料庫與深度剖析</span>
          </h3>
          <p className="text-[10px] text-snow-muted">快速搜尋個股、查看其技術護城河、關鍵產品、核心客戶及完整 SWOT分析</p>
        </div>

        {/* Search */}
        <input
          type="text"
          value={searchWord}
          onChange={(e) => setSearchWord(e.target.value)}
          placeholder="搜尋公司或代碼... 如: 3443"
          className="w-full px-3 py-2 text-xs rounded-lg bg-white/[0.05] border border-white/10 text-snow placeholder:text-snow-muted/70 outline-none focus:border-gold/40 focus:bg-white/[0.07] transition"
        />

        {/* List items */}
        <div className="space-y-1.5 max-h-[22rem] overflow-y-auto">
          {filteredCompanies.map((co) => {
            const isSelected = co.id === selectedId;
            const isFav = !!favorites[co.id];
            return (
              <div
                key={co.id}
                onClick={() => setSelectedId(co.id)}
                className={`p-3 rounded-lg border cursor-pointer transition flex items-center justify-between ${
                  isSelected
                    ? 'bg-gold/10 border-gold/50 ring-1 ring-gold/25'
                    : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06]'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-snow">{co.name}</span>
                    <span className="text-[10px] text-snow-muted font-mono">({co.code})</span>
                  </div>
                  <span className="text-[9px] bg-white/[0.06] text-snow-muted px-1 py-0.5 rounded leading-none">
                    主核：{co.activeThemeSelected}
                  </span>
                </div>

                <button
                  onClick={(e) => toggleFavorite(co.id, e)}
                  className="p-1 rounded-sm text-snow-muted hover:text-down transition"
                >
                  <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-down text-down' : ''}`} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Content: Deep Profile Layout (8 cols - exactly matching visual mockup) */}
      <div className="md:col-span-8 glass-card rounded-xl p-5 space-y-4">
        {/* Header containing Back and Favorite Button */}
        <div className="flex justify-between items-center border-b border-white/[0.06] pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedId('3443')}
              className="p-1 rounded-lg hover:bg-white/[0.06] transition text-snow-muted hover:text-snow"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h2 className="font-satoshi text-md font-medium text-snow flex items-center gap-1.5">
              <span>{currentCompany.name} ({currentCompany.code.replace('.TW', '')})</span>
            </h2>
            <div className="flex flex-wrap gap-1">
              <span className="text-[9px] bg-up/15 text-emerald-300 font-bold px-1.5 py-0.5 rounded border border-up/25">
                {currentCompany.revenueStatus}
              </span>
              <span className="text-[9px] bg-blue-500/15 text-blue-300 font-bold px-1.5 py-0.5 rounded border border-blue-400/25">
                {currentCompany.marginStatus}
              </span>
              <span className="text-[9px] bg-gold/15 text-gold font-bold px-1.5 py-0.5 rounded border border-gold/25">
                {currentCompany.institutionStatus}
              </span>
              {currentCompany.hasFutureOption && (
                <span className="text-[9px] bg-white/[0.06] text-snow-muted font-bold px-1.5 py-0.5 rounded">
                  有股票期貨
                </span>
              )}
            </div>
          </div>

          <button
            onClick={(e) => toggleFavorite(currentCompany.id, e)}
            className="flex items-center gap-1 text-[10.5px] border border-white/10 hover:bg-white/[0.06] px-3 py-1 rounded-lg transition text-snow-2"
          >
            <Heart className={`w-3.5 h-3.5 ${favorites[currentCompany.id] ? 'fill-down text-down' : 'text-snow-muted'}`} />
            <span>{favorites[currentCompany.id] ? '已加入收藏' : '加入收藏'}</span>
          </button>
        </div>

        {/* Navigation sub-tabs */}
        <div className="flex gap-1.5 border-b border-white/[0.06] pb-1 overflow-x-auto text-xs font-semibold max-w-full scrollbar-none">
          {([
            { k: 'info', label: '基本資料' },
            { k: 'industry', label: '產業分析' },
            { k: 'insider', label: '籌碼分析' },
            { k: 'tech', label: '技術分析' },
            { k: 'news', label: '相關新聞' },
            { k: 'charts', label: '研究圖表' },
          ] as const).map(({ k, label }) => (
            <button
              key={k}
              onClick={() => setActiveTab(k)}
              className={`pb-2 px-1 shrink-0 transition ${activeTab === k ? 'text-gold border-b-2 border-gold font-bold' : 'text-snow-muted hover:text-snow'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Scrollable horizontal theme badges */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 max-w-full scrollbar-none">
          {['AI 伺服器組裝', '客製 ASIC 與矽智財', 'AI 先進封裝', 'CXL 技術', 'HBM 高頻寬記憶體', '矽光子與 CPO'].map((themeName) => {
            const isSelected = themeName === currentCompany.activeThemeSelected;
            return (
              <span
                key={themeName}
                className={`text-[10.5px] px-2.5 py-1 rounded-lg shrink-0 font-bold border transition ${
                  isSelected
                    ? 'text-[#1a1205] border-transparent'
                    : 'bg-white/[0.05] border-white/[0.08] text-snow-muted'
                }`}
                style={isSelected ? { background: 'linear-gradient(180deg,#facc15,#f59e0b)' } : undefined}
              >
                {themeName}
              </span>
            );
          })}
        </div>

        {/* Major Content Screen according to tabs */}
        {activeTab !== 'industry' ? (
          <div className="p-8 bg-white/[0.03] border border-white/[0.06] rounded-xl text-center text-snow-muted text-xs flex flex-col items-center justify-center space-y-2">
            <Activity className="w-8 h-8 text-snow-muted" />
            <span>正在為此股票連結台灣「證交所即時備用籌碼」與「技術線圖對比」系統...</span>
            <button
              onClick={() => setActiveTab('industry')}
              className="text-xs bg-gold/15 text-gold px-3 py-1.5 rounded-lg border border-gold/25"
            >
              返回「產業分析」深度觀看
            </button>
          </div>
        ) : (
          <div className="space-y-4 animate-fade-in text-xs leading-normal">
            {/* Theme Relation Panel */}
            <div className="p-4 bg-down/[0.07] border border-down/20 rounded-xl flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-down uppercase tracking-widest block font-mono">CORE THEME RELATION</span>
                <h3 className="font-satoshi font-medium text-snow text-sm flex items-center gap-1.5">
                  📁 {currentCompany.activeThemeSelected}
                </h3>
              </div>
              <span className="text-[10px] bg-down/20 text-red-300 font-bold px-2.5 py-1 rounded-md">高 關聯度</span>
            </div>

            {/* AI Smart Summary */}
            <div className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl space-y-2">
              <span className="font-bold text-snow flex items-center gap-1 text-[11px]">
                <Sparkles className="w-4 h-4 text-gold animate-pulse" />
                <span>AI 智能摘要</span>
              </span>
              <p className="text-snow-2 leading-relaxed">
                {currentCompany.aiSummary}
              </p>
            </div>

            {/* Market Position & Tech Focus */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl space-y-2">
                <span className="font-bold text-gold flex items-center gap-1 text-[11px]">
                  <span>⚓ 市場定位</span>
                </span>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-up inline-block"></span>
                    <strong className="text-snow text-[11px] font-bold">{currentCompany.marketPosition.title}</strong>
                  </div>
                  <p className="text-snow-muted leading-relaxed text-[11px]">
                    {currentCompany.marketPosition.description}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl space-y-2">
                <span className="font-bold text-snow flex items-center gap-1 text-[11px]">
                  <span>⚙️ 技術重心</span>
                </span>
                <div className="space-y-1.5 text-snow-2">
                  <strong className="text-snow font-semibold block">{currentCompany.techFocus.title}</strong>
                  <ul className="list-disc pl-4 space-y-1 text-snow-muted text-[10.5px]">
                    {currentCompany.techFocus.points.map((pt, i) => (
                      <li key={i}>{pt}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Upgrade tip if not upgraded yet */}
            {!isUpgraded && (
              <div className="bg-gold/[0.08] border border-gold/25 p-3 rounded-xl flex justify-between items-center flex-wrap gap-2.5">
                <div className="flex items-center gap-2">
                  <Coffee className="w-4 h-4 text-gold shrink-0" />
                  <span className="text-[10.5px] text-amber-200/90 font-bold">一個月一杯咖啡支持作者，並解鎖完整深度分析</span>
                </div>
                <button
                  onClick={handleUpgrade}
                  className="text-[#1a1205] font-bold px-3 py-1 rounded-lg text-[10px] transition hover:brightness-110"
                  style={{ background: 'linear-gradient(180deg,#facc15,#f59e0b)' }}
                >
                  登入升級
                </button>
              </div>
            )}

            {/* Key Products & Clients */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl space-y-1">
                <span className="font-bold text-snow flex items-center gap-1 text-[11px]">
                  <Briefcase className="w-3.5 h-3.5 text-gold" />
                  <span>主要產品</span>
                </span>
                <p className="text-snow-2 leading-relaxed style-preserve-nl">
                  {currentCompany.keyProduct}
                </p>
              </div>

              <div className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl space-y-1">
                <span className="font-bold text-snow flex items-center gap-1 text-[11px]">
                  <Activity className="w-3.5 h-3.5 text-gold" />
                  <span>主要客戶</span>
                </span>
                <p className="text-snow-2 leading-relaxed style-preserve-nl">
                  {currentCompany.keyClient}
                </p>
              </div>
            </div>

            {/* SWOT Quadrant Matrix */}
            <div className="space-y-2">
              <h3 className="font-satoshi font-medium text-snow text-xs flex items-center gap-1.5 border-t border-white/[0.06] pt-3">
                🎯 企業 SWOT 深度競爭分析 (Strengths / Weaknesses / Opportunities / Threats)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-2 relative">
                {/* Strength block */}
                <div className="p-3 bg-up/[0.08] border border-up/20 rounded-xl space-y-1 group">
                  <h4 className="font-bold text-emerald-300 flex items-center gap-1 text-[10.5px]">
                    <span className="text-xs">📈</span> 優勢 (S)
                  </h4>
                  <p className="text-snow-2 leading-relaxed text-[10.5px]">
                    {currentCompany.swot.strengths}
                  </p>
                </div>

                {/* Weakness block */}
                <div className="p-3 bg-blue-500/[0.08] border border-blue-400/20 rounded-xl space-y-1 group">
                  <h4 className="font-bold text-blue-300 flex items-center gap-1 text-[10.5px]">
                    <span className="text-xs">📉</span> 劣勢 (W)
                  </h4>
                  <p className="text-snow-2 leading-relaxed text-[10.5px]">
                    {currentCompany.swot.weaknesses}
                  </p>
                </div>

                {/* Opportunity block */}
                <div className="p-3 bg-purple-500/[0.08] border border-purple-400/20 rounded-xl space-y-1 group">
                  <h4 className="font-bold text-purple-300 flex items-center gap-1 text-[10.5px]">
                    <span className="text-xs">🌟</span> 機會 (O)
                  </h4>
                  <p className="text-snow-2 leading-relaxed text-[10.5px]">
                    {currentCompany.swot.opportunities}
                  </p>
                </div>

                {/* Threats block */}
                <div className="p-3 bg-down/[0.08] border border-down/20 rounded-xl space-y-1 group">
                  <h4 className="font-bold text-red-300 flex items-center gap-1 text-[10.5px]">
                    <span className="text-xs">⚠️</span> 威脅 (T)
                  </h4>
                  <p className="text-snow-2 leading-relaxed text-[10.5px]">
                    {currentCompany.swot.threats}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
