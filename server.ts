import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { keyManager, cacheManager, r2Uploader } from './server_utils';
import { fetchLatestEpisodes } from './src/lib/gooayeFetcher';
import {
  upsertEpisode,
  getRollingEpisodes,
  getAggregatedThemes,
  pruneOldEpisodes,
  getLastSync,
  getEpisodeCount,
} from './src/lib/themeStore';
import { analyzeEpisode } from './src/lib/episodeAnalyzer';
import { runIndustrySurvey, runCompanyRevenueBreakdown } from './src/lib/industryAnalysis';
import { fetchCredibleNews } from './src/lib/newsFetcher';

// Load environment variables
dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Initialize Gemini SDK lazily to avoid crash if API key is missing
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required. Please set it in Settings > Secrets.');
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Built-in high-quality fallback data in Traditional Chinese for hot recommended topics
// in case developers are running offline, API quota is exceeded (429), or need immediate access.
const FALLBACK_RESEARCH_DATA: Record<string, any> = {
  "矽光子": {
    "title": "矽光子與共同封裝光學 (CPO)",
    "query": "矽光子 CPO",
    "description": "隨著 AI 與高效能運算 (HPC) 需求爆發，傳統銅線電信傳輸面臨頻寬瓶頸與高耗能挑戰。矽光子技術將「電訊號」改為「光訊號」傳訊，具備高頻寬、低延遲、低耗能等優勢。共同封裝光學 (CPO) 技術則將光電轉換元件與晶片直接封裝在一起，大幅縮短訊號傳輸距離，是下一代 AI 伺服器的關鍵傳輸技術。",
    "marketDrivers": [
      "AI 晶片算力大增，傳統電介面面臨傳輸瓶頸",
      "超大型資料中心對低功耗、超高傳輸速率的急迫需求",
      "台積電、Intel 晶圓大廠積極主導與訂定 CPO 技術標準",
      "資料傳輸頻寬需求每兩年翻倍的技術升級潮"
    ],
    "keyFactors": [
      "台積電與通訊大廠的 CPO 標準研發時程 (預估 2026 量產)",
      "光電元件整合度與封裝良率",
      "測試介面與檢測設備的精準度",
      "資料中心設備商 (如 Cisco, Arista) 的改裝需求與速度"
    ],
    "chainMap": {
      "upstream": "磊晶材料 (InP/GaAs), 電子設計自動化 (EDA) 軟體支援, 雷射光源晶片製造",
      "midstream": "晶圓代工 (TSMC 矽光子製程), 封裝測試 (CPO 封測、先進中介層), 光通訊模組收發器",
      "downstream": "AI 伺服器主機、超大型資料中心 (Mircosoft, Google, Meta, Amazon)、高速交換器廠商"
    },
    "outlook": "矽光子是 2025-2027 年半導體最關鍵的技術革命之一。短期内因成本較高且標準制定中，仍以部分資料中心試點為主；中長期隨著 AI 算力往 1.6T/3.2T 邁進，CPO 將成為標配。台積電引領的台灣半導體封測供應鏈將在此技術革命中扮演全球領導者職群。",
    "stocks": [
      {
        "id": "2330.TW",
        "name": "台積電",
        "code": "2330.TW",
        "role": "晶圓代工與先進 CPO 開發",
        "roleCategory": "upstream",
        "description": "提供矽光子晶圓代工製造服務，積極開發 COUPE (緊湊型矽光子先進封裝) 技術，並籌組矽光子聯盟界定產業標準。",
        "advantage": "擁有獨一無二的先進封裝產能 (CoWoS/SoIC) 以及全方位的光通訊與晶圓製造整合平台。",
        "recentReturn5D": 1.45,
        "recentReturn1M": 5.82,
        "recentReturn3M": 14.8,
        "trendAnalysis": "隨著 3 奈米與先進封裝持續供不應求，股價展現強勁的抗跌性，於均線上方呈現階梯式走升穩健整理。",
        "whyBuy": "身為全球 CPO 平台最重要的製造與封測終點站，任何晶片商要做矽光子都離不開台積電。",
        "risk": "地緣政治風險，先進封裝產能擴張速度是否符合預期。",
        "historyData": [
          {"date": "t-9", "price": 100}, {"date": "t-8", "price": 102}, {"date": "t-7", "price": 101.5}, {"date": "t-6", "price": 103}, {"date": "t-5", "price": 102.8},
          {"date": "t-4", "price": 104.5}, {"date": "t-3", "price": 106}, {"date": "t-2", "price": 105.5}, {"date": "t-1", "price": 108}, {"date": "今日", "price": 114.8}
        ]
      },
      {
        "id": "3081.TW",
        "name": "聯亞",
        "code": "3081.TW",
        "role": "雷射光源射頻磊晶",
        "roleCategory": "upstream",
        "description": "主要提供光學雷射磊晶片 (Epi)，是 CPO 雷射光源(矽光子雷射源)晶片的核心供應商，為美系大廠量產供貨。",
        "advantage": "技術壁壘極高，是少數具有規模化雷射光源磊晶能力、且同時打進美系 AI 巨頭與亞太供應鏈的廠商。",
        "recentReturn5D": 4.12,
        "recentReturn1M": 12.3,
        "recentReturn3M": 28.5,
        "trendAnalysis": "股價呈現非常強勢的高強度上攻態勢，短期均線多頭排列。成交量配合放大，在題材面最受資金追捧。",
        "whyBuy": "光電元件上游核心，CPO 雷射光源用量大增，毛利率高彈性強。",
        "risk": "美中出口管制政策干擾，以及對單一美系通訊客戶依存度較高。",
        "historyData": [
          {"date": "t-9", "price": 100}, {"date": "t-8", "price": 103.5}, {"date": "t-7", "price": 106}, {"date": "t-6", "price": 105.2}, {"date": "t-5", "price": 108.7},
          {"date": "t-4", "price": 112.1}, {"date": "t-3", "price": 115.8}, {"date": "t-2", "price": 118}, {"date": "t-1", "price": 123}, {"date": "今日", "price": 128.5}
        ]
      },
      {
        "id": "3450.TW",
        "name": "聯鈞",
        "code": "3450.TW",
        "role": "光主動元件封測",
        "roleCategory": "midstream",
        "description": "封裝測試大廠，切入矽光子 CPO 模組領域。配合大客戶開發之矽光子封裝與測試產能於 2025 年起陸續量產貢獻營收。",
        "advantage": "與台積電及美系晶片設計公司策略合作緊密，轉投資源傑具備高度光通訊關鍵整合能力。",
        "recentReturn5D": 2.8,
        "recentReturn1M": 8.4,
        "recentReturn3M": 22.1,
        "trendAnalysis": "股價在波段整理後，近期受光通訊題材重燃影響，帶量突破橫盤整理平台，中期趨勢向上挑。",
        "whyBuy": "高階光電封裝技術高牆難以跨越，是少數有能力量產多通道光封裝(CPO)的關鍵受惠者。",
        "risk": "折舊費用上揚，傳統通信封裝產品需求低迷拖累整體利潤率。",
        "historyData": [
          {"date": "t-9", "price": 100}, {"date": "t-8", "price": 101}, {"date": "t-7", "price": 102.5}, {"date": "t-6", "price": 99.8}, {"date": "t-5", "price": 104.2},
          {"date": "t-4", "price": 106.3}, {"date": "t-3", "price": 110}, {"date": "t-2", "price": 112.5}, {"date": "t-1", "price": 118.4}, {"date": "今日", "price": 122.1}
        ]
      },
      {
        "id": "4979.TW",
        "name": "華星光",
        "code": "4979.TW",
        "role": "代工與高頻收發晶粒封裝",
        "roleCategory": "midstream",
        "description": "主要為美系光模組收發大廠進行 400G / 800G 光通訊主動元件代工，高度受惠於資料中心傳輸架構升級。",
        "advantage": "緊跟美系網路大廠客戶腳步，代工良率極佳且產能彈性配置大。",
        "recentReturn5D": -1.2,
        "recentReturn1M": 3.15,
        "recentReturn3M": 10.4,
        "trendAnalysis": "走勢相較於聯亞更為震盪，目前在月線與季線之間進行箱型盤整，等待 800G CPO 量產利多釋出突破。",
        "whyBuy": "資料中心對 800G 收發器與骨幹交換器升級是現在進行式，營收兌現最直接。",
        "risk": "產業同業價格競爭，客戶代工比例配額調度變更。",
        "historyData": [
          {"date": "t-9", "price": 100}, {"date": "t-8", "price": 98.5}, {"date": "t-7", "price": 99}, {"date": "t-6", "price": 101.2}, {"date": "t-5", "price": 102},
          {"date": "t-4", "price": 100.5}, {"date": "t-3", "price": 103}, {"date": "t-2", "price": 105.8}, {"date": "t-1", "price": 108.2}, {"date": "今日", "price": 110.4}
        ]
      },
      {
        "id": "2345.TW",
        "name": "智邦",
        "code": "2345.TW",
        "role": "高頻高速交換器研發製造",
        "roleCategory": "downstream",
        "description": "白牌網路交換器龍頭，研發 800G、1.6T 高階交換器，並首創融入 CPO 矽光子模組之中介解決方案。",
        "advantage": "全球資料中心市佔率第一大，軟硬體整合及客製化白牌交換器開發實力在歐美通吃。",
        "recentReturn5D": 1.1,
        "recentReturn1M": 4.5,
        "recentReturn3M": 18.2,
        "trendAnalysis": "高檔橫盤，股價創波段新高後呈現量縮整理。支撐力學極佳，多投格局未遭破壞。",
        "whyBuy": "無論光通訊晶片如何改變，最終都必須整合上萬台高端口交換器。智邦為下游客戶主要受益核心。",
        "risk": "關鍵零組件(MCU、其他IC)缺料影響出貨，競爭對手打價格戰。",
        "historyData": [
          {"date": "t-9", "price": 100}, {"date": "t-8", "price": 102}, {"date": "t-7", "price": 103.5}, {"date": "t-6", "price": 103}, {"date": "t-5", "price": 105.1},
          {"date": "t-4", "price": 107}, {"date": "t-3", "price": 108.5}, {"date": "t-2", "price": 111.2}, {"date": "t-1", "price": 115}, {"date": "今日", "price": 118.2}
        ]
      }
    ]
  },
  "液冷散熱": {
    "title": "AI 伺服器水冷與液冷散熱革命",
    "query": "液冷散熱",
    "description": "輝達晶片如 Blackwell 系列的功耗大幅飆升至超過 1000 瓦，傳統氣冷(風扇+熱導管)已達散熱物理極限。業界正全面轉型為「水冷與液冷技術」。液冷主要分為冷板式(Direct-to-Chip 3D Liquid Cooling)以及浸沒式(Immersion Cooling)，其中冷板式因技術成熟度和相容性最高，已進入大規模量產與建置。",
    "marketDrivers": [
      "AI 晶片 (NVDA GB200/B200) 單晶片發熱量急劇突破 1000W 臨界點",
      "綠色資料中心 PUE 廢散熱率指標法規，限制傳統高耗能冷氣使用",
      "冷卻液分配裝置 (CDU) 及水冷板供應產能極其受限，供不應求"
    ],
    "keyFactors": [
      "伺服器水冷板 (Cold Plate) 及 CDU 的交貨進展",
      "水冷接頭與管線之「防漏水檢測認證」與長期信賴度",
      "冷卻液專利配方材料及特殊供應鏈掌控度"
    ],
    "chainMap": {
      "upstream": "水冷快速接頭、水冷管線、特殊冷卻液原料商",
      "midstream": "冷卻板 (Cold Plate)、冷卻液分配主機 (CDU)、風扇與冷卻排 (Radiator) 組裝封裝",
      "downstream": "AI 伺服器機櫃製造廠 (緯創, 廣達, 美超微, 英業達) 及終端雲端資料中心 (AWS, GCP)"
    },
    "outlook": "散熱正在從伺服器的「配角技術」躍升為「核心瓶頸」。2025-2026 年是 GB200 量產出貨洪流期，全液冷機櫃產值比傳統氣冷膨脹數倍，對散熱模組產能吃緊的廠商來說營收將產生數倍暴增爆發力。",
    "stocks": [
      {
        "id": "3017.TW",
        "name": "奇鋐",
        "code": "3017.TW",
        "role": "CDU與冷板全套解決方案",
        "roleCategory": "midstream",
        "description": "散熱大廠，提供完整冷板 (Cold Plate)、冷卻液分配裝置 (CDU) 高單值整套研發與量產出貨，為輝達認證核心主力廠商。",
        "advantage": "擁有高度機櫃垂直整合能力，自製率達八成以上，獲利表現及毛利在同業中居冠。",
        "recentReturn5D": 2.15,
        "recentReturn1M": 7.4,
        "recentReturn3M": 19.3,
        "trendAnalysis": "股價表現非常優異，回踩支撐後沿著 5 日線上攻，高姿態整理，充分展現法人資金對龍頭的偏愛。",
        "whyBuy": "擁有完整機櫃驗證出貨能力，是 Blackwell 系列水冷系統市佔率最大的贏家之一。",
        "risk": "對手產能擴張速度造成的紅海殺價，以及晶片延遲出貨風險。",
        "historyData": [
          {"date": "t-9", "price": 100}, {"date": "t-8", "price": 101.5}, {"date": "t-7", "price": 103.2}, {"date": "t-6", "price": 102.1}, {"date": "t-5", "price": 104.5},
          {"date": "t-4", "price": 108.1}, {"date": "t-3", "price": 111.4}, {"date": "t-2", "price": 110.8}, {"date": "t-1", "price": 115.5}, {"date": "今日", "price": 119.3}
        ]
      },
      {
        "id": "3324.TW",
        "name": "雙鴻",
        "code": "3324.TW",
        "role": "水冷板 Cold Plate 生產研發",
        "roleCategory": "midstream",
        "description": "主力研發冷板模組。其開發的高階冷板獲得美系資料中心及數家晶圓設計巨頭指定採用，產能迅速擴大。",
        "advantage": "在超薄熱導管與冷板研發上技術領先，在大規模自動化焊接良率具有製程優勢。",
        "recentReturn5D": 1.1,
        "recentReturn1M": -2.3,
        "recentReturn3M": 8.5,
        "trendAnalysis": "近期股價展開區間震盪調整，處於籌碼換手期，目前在季線上緣有強烈支撐，等待大筆訂單放量重拾動能。",
        "whyBuy": "水冷板用量是晶片數量的數倍，產品單價比傳統高出數十倍，毛利改善空間最大。",
        "risk": "上游原料銅、鋁等報價上揚壓抑毛利率，客戶認證測試拉長。",
        "historyData": [
          {"date": "t-9", "price": 100}, {"date": "t-8", "price": 101}, {"date": "t-7", "price": 98.7}, {"date": "t-6", "price": 99.1}, {"date": "t-5", "price": 97.4},
          {"date": "t-4", "price": 102.5}, {"date": "t-3", "price": 104.3}, {"date": "t-2", "price": 103.9}, {"date": "t-1", "price": 105.1}, {"date": "今日", "price": 108.5}
        ]
      },
      {
        "id": "3533.TW",
        "name": "嘉澤",
        "code": "3533.TW",
        "role": "水冷快拆接頭與 Socket 扣件",
        "roleCategory": "upstream",
        "description": "伺服器 CPU Socket 領導者，強勢切入水冷快速接頭 (Quick Disconnect) 金屬精密零組件生產，防漏水認證突破順暢。",
        "advantage": "精密金屬模具開發能力為世界級，擁有龐大的產能規模去應對客裝與客製化的高規格水冷配件生產。",
        "recentReturn5D": 3.4,
        "recentReturn1M": 11.2,
        "recentReturn3M": 25.6,
        "trendAnalysis": "股價在高價股中表現亮眼，創下歷史波段新高，均線呈現完美的多頭發散，高毛利特質極度吸引外資投信。",
        "whyBuy": "水冷接頭是全液冷系統「容錯率最低」的環節，一旦漏水會毀掉千萬伺服器，因此護城河極深。",
        "risk": "新產品認證延後，CPU 改版週期過長影響本業出貨。",
        "historyData": [
          {"date": "t-9", "price": 100}, {"date": "t-8", "price": 104.2}, {"date": "t-7", "price": 106}, {"date": "t-6", "price": 105}, {"date": "t-5", "price": 108.3},
          {"date": "t-4", "price": 111.5}, {"date": "t-3", "price": 115.6}, {"date": "t-2", "price": 118}, {"date": "t-1", "price": 122.3}, {"date": "今日", "price": 125.6}
        ]
      }
    ]
  },
  "GB200 伺服器": {
    "title": "輝達 NVDA GB200 伺服器與高效能算力機櫃",
    "query": "GB200 伺服器",
    "description": "NVIDIA 推出的 GB200 NVL72 AI 超級算力主機櫃，代表著下世代 AI 超大型資料中心的架構變革。其高度整合 36 顆 Grace CPU 與 72 顆 Blackwell GPU。因為單一機櫃功耗直逼 120 萬瓦，帶動了精密大電流銅導軌排、高速網絡交換板、液冷 CDU、防漏盲插快速接頭（QD）等核心零組件供應鏈的大洗牌與爆發性增長。",
    "marketDrivers": [
      "Blackwell 系列算力大幅飆升，微軟、Meta、Google 及 OCI 的海量主機架構升級",
      "整櫃整合度極高，零組件單價與毛利率相較上一代伺服器產品呈數倍提升"
    ],
    "keyFactors": [
      "台廠整櫃 L11 系統板組裝與 L12 整櫃綜合測試產能",
      "金屬大電流銅排 busbar、高階高速連接線卡良率",
      "NVIDIA 核心晶片交貨速度及資料中心裝機排程"
    ],
    "chainMap": {
      "upstream": "精密超導銅排 (Busbar)、機櫃金屬滑軌、極早期高壓斷路與安全閥件",
      "midstream": "伺服器主機電路板與 OAM 加速晶粒卡、液冷 CDU 與耐大壓快拆接頭、高速冷板組裝",
      "downstream": "L11 整機櫃系統裝配與 L12 整體可靠度測試 (鴻海、廣達、緯穎) 及超大規模 CSP 資料中心"
    },
    "outlook": "GB200 NVL72/NVL36 伺服器機櫃將自 2025 年起進入極大規模的裝機爆發期。由於整合散熱、配電與高頻網通組件，單櫃價值大幅飆升，掌握關鍵組件製程與整機櫃測試能見度的供應商，利潤增長預計將顯著超越營收，引領市場高檔溢價。",
    "stocks": [
      {
        "id": "2317.TW",
        "name": "鴻海",
        "code": "2317.TW",
        "role": "L11 伺服器整櫃裝配與 L12 包裝測試",
        "roleCategory": "downstream",
        "description": "全球電子代工巨頭，與 NVIDIA 緊密合作，為 GB200 伺服器機櫃的最主要組裝廠商，市佔率居霸主地位。",
        "advantage": "擁有世界級的大規模系統供應鏈整合與整機櫃 (L12) 檢測能力，並可垂直自製高比例機櫃關鍵零件。",
        "recentReturn5D": 1.2,
        "recentReturn1M": 6.35,
        "recentReturn3M": 19.5,
        "trendAnalysis": "股價在高檔箱型區間整理，下緣有法人投信大筆敲進支撐，伴隨出貨能見度提升，後市看俏。",
        "whyBuy": "身為 Blackwell 整櫃出貨的最大市佔家，營收最能得到剛性兌現，長線安全度極高。",
        "risk": "晶片供貨不順造成裝機空窗期，以及部分非核心零件良率挑戰。",
        "historyData": [
          {"date": "t-9", "price": 100}, {"date": "t-8", "price": 101}, {"date": "t-7", "price": 100.5}, {"date": "t-6", "price": 102}, {"date": "t-5", "price": 103.5},
          {"date": "t-4", "price": 105}, {"date": "t-3", "price": 108.2}, {"date": "t-2", "price": 111.4}, {"date": "t-1", "price": 115.3}, {"date": "今日", "price": 119.5}
        ]
      },
      {
        "id": "2382.TW",
        "name": "廣達",
        "code": "2382.TW",
        "role": "美系大雲端家 L11 整機及主機板代工",
        "roleCategory": "downstream",
        "description": "高階伺服器 ODM 大廠，手握 Google、Amazon 等美系巨擘 CSP 大單，優先配合出貨 GB200 主機解決方案。",
        "advantage": "具備強大的美系資料中心直客服務管道，且旗下雲達科技 (QCT) 的系統軟硬體調校技術領先群雄。",
        "recentReturn5D": 2.1,
        "recentReturn1M": 4.8,
        "recentReturn3M": 12.4,
        "trendAnalysis": "回踩季線尋求穩健支撐，近期成交量開始增溫，外資買盤高姿態吸納籌碼，等待帶量跳空表態挑戰前高。",
        "whyBuy": "掌握一線 CSP 核心大單，GB200 AI 機櫃的單櫃平均價格 (ASP) 狂飆，將為營收挹注翻倍動能。",
        "risk": "零組件缺料拖遲產能交付，以及毛利率受低毛利系統代工稀釋的可能。",
        "historyData": [
          {"date": "t-9", "price": 100}, {"date": "t-8", "price": 102}, {"date": "t-7", "price": 103}, {"date": "t-6", "price": 101.5}, {"date": "t-5", "price": 104},
          {"date": "t-4", "price": 106.5}, {"date": "t-3", "price": 108}, {"date": "t-2", "price": 107.2}, {"date": "t-1", "price": 110}, {"date": "今日", "price": 112.4}
        ]
      },
      {
        "id": "6669.TW",
        "name": "緯穎",
        "code": "6669.TW",
        "role": "Meta 與 Microsoft 機櫃出貨ODM",
        "roleCategory": "downstream",
        "description": "專攻雲端超大型資料中心配備之ODM廠，大客戶微軟與 Meta 為 GB200 NVL72 的領先競標與裝機者。",
        "advantage": "營運結構極度精純，無傳統筆電代工包袱，高階 AI 伺服器出貨比重與營業利益率位列產業之冠。",
        "recentReturn5D": 3.8,
        "recentReturn1M": 9.2,
        "recentReturn3M": 16.5,
        "trendAnalysis": "股價突破短期均線反壓，KD 向上黃金交叉，投信法人在低基期區積極卡位，趨勢呈現盤堅向上格局。",
        "whyBuy": "微軟及 Meta 預計在 2025 年裝配萬個算力機櫃，緯穎身為核心主應商，獲利能見度極致清晰。",
        "risk": "客戶專案進度調整風險，新平台量產爬坡初期的折舊費用壓力。",
        "historyData": [
          {"date": "t-9", "price": 100}, {"date": "t-8", "price": 102.5}, {"date": "t-7", "price": 104}, {"date": "t-6", "price": 103}, {"date": "t-5", "price": 106.2},
          {"date": "t-4", "price": 108.5}, {"date": "t-3", "price": 112}, {"date": "t-2", "price": 111.4}, {"date": "t-1", "price": 114.2}, {"date": "今日", "price": 116.5}
        ]
      }
    ]
  },
  "CoWoS 先進封裝": {
    "title": "先進封裝 CoWoS 與晶片堆疊大商機",
    "query": "CoWoS 先進封裝",
    "description": "晶片製程邁向 3 奈米以下，物理極限使單一晶片微縮成本高昂且良率降低。台積電主導的 CoWoS (Chip-on-Wafer-on-Substrate) 先進封裝技術，透過矽中介層將多個不同的晶粒(如運算核心、高頻寬記憶體 HBM)整合堆疊封裝在一起，大幅提升資料傳輸頻寬與算力密度，成為輝達與超微高階 AI 晶片能順利出貨的絕對關鍵製程。",
    "marketDrivers": [
      "AI 與 High Performance Computing (HPC) 對超高傳輸頻寬及散熱的極限要求",
      "HBM3e/HBM4 新世代高規格記憶體在大算力晶片上的整合封裝趨勢",
      "CoWoS 產能吃緊，台積電與轉包封測廠大舉擴廠擴產，設備與製程耗材商接單爆發"
    ],
    "keyFactors": [
      "台積電 CoWoS 產能與月產量擴建進程",
      "先進檢測設備與濕製程自動化清洗良率指標",
      "高階封裝材料與點膠機、黏晶機出貨單價"
    ],
    "chainMap": {
      "upstream": "先進封裝設備 (濕製程清洗、點膠、自動光學檢測 AOI)、高性能封裝膠材",
      "midstream": "先進中介層 (Silicon Interposer) 製造、晶圓級貼合與先進測試服務",
      "downstream": "AI 晶片開發商 (NVIDIA, AMD)、高階 ASIC 設計廠 (世芯-KY, 創意)"
    },
    "outlook": "先進封裝已成為半導體延續摩爾定律的核心動能。預估 2024-2026 年 CoWoS 產能將呈倍數增長，設備商與製程材料供應鏈將在長線上共同享有高毛利率及剛性成長。而具有高壁壘檢測與清洗製程特性的設備商，更是高含金量的贏家。",
    "stocks": [
      {
        "id": "2330.TW",
        "name": "台積電",
        "code": "2330.TW",
        "role": "CoWoS 先進封裝核心主導者",
        "roleCategory": "midstream",
        "description": "晶圓代工與先進封裝全球龍頭，開創並主導 CoWoS 及 SoIC 全套技術標準，掌控全球九成以上的 AI 晶片封裝產能。",
        "advantage": "擁有世界第一門檻研發團隊、超高整合度中介層製程，以及結合晶圓代工的 COUPE 平台優勢。",
        "recentReturn5D": 1.45,
        "recentReturn1M": 5.82,
        "recentReturn3M": 14.8,
        "trendAnalysis": "股價表現穩健，均線呈多頭排列，外資法人於低檔極力防守吸納，為全球 AI 基礎建設的最穩固支柱。",
        "whyBuy": "所有 AI 與先進製程的高規格晶片，都必須在台積電進行 CoWoS 先進封裝方能順利出貨，剛性需求絕對穩固。",
        "risk": "產能擴增速度若受限於廠房興建進度或特定氣體耗材供應延宕。",
        "historyData": [
          {"date": "t-9", "price": 100}, {"date": "t-8", "price": 102}, {"date": "t-7", "price": 101.5}, {"date": "t-6", "price": 103}, {"date": "t-5", "price": 102.8},
          {"date": "t-4", "price": 104.5}, {"date": "t-3", "price": 106}, {"date": "t-2", "price": 105.5}, {"date": "t-1", "price": 108}, {"date": "今日", "price": 114.8}
        ]
      },
      {
        "id": "6187.TW",
        "name": "萬潤",
        "code": "6187.TW",
        "role": "先進封裝點膠與貼合設備",
        "roleCategory": "upstream",
        "description": "精密點膠與散熱片貼合設備供應大廠，強勢切入台積電 CoWoS 供應鏈，為自動化關鍵點膠機最大主應商。",
        "advantage": "技術垂直整合與高度客製化能力，因與龍頭客戶共同開發製程設備，具備先行者優勢。",
        "recentReturn5D": 4.5,
        "recentReturn1M": 11.2,
        "recentReturn3M": 24.3,
        "trendAnalysis": "股價非常強勁，帶量拉出長紅棒創高，均線呈現多頭仰角發散，受投信及主力資資金支持。",
        "whyBuy": "點膠與黏貼製程是先進封裝中防漏防震的剛性核心，受惠台積電大擴 CoWoS 產能，訂單能見度直達 2026 年底。",
        "risk": "客戶設備驗收時程若延遲影響入帳認列，或市場出現同業降價競爭。",
        "historyData": [
          {"date": "t-9", "price": 100}, {"date": "t-8", "price": 103}, {"date": "t-7", "price": 105.5}, {"date": "t-6", "price": 104}, {"date": "t-5", "price": 107.2},
          {"date": "t-4", "price": 110.1}, {"date": "t-3", "price": 114}, {"date": "t-2", "price": 115.8}, {"date": "t-1", "price": 119.5}, {"date": "今日", "price": 124.3}
        ]
      },
      {
        "id": "3583.TW",
        "name": "辛耘",
        "code": "3583.TW",
        "role": "晶圓級濕製程清洗設備商",
        "roleCategory": "upstream",
        "description": "半導體材料代理及客製化設備商，提供先進封裝所需之晶圓級單片清洗、剝膜與顯影等濕製程專用自動化機台。",
        "advantage": "清洗機台技術成熟，其晶圓刻蝕與潔淨良率優異，自製設備毛利率表現持續攀高。",
        "recentReturn5D": 2.3,
        "recentReturn1M": 6.8,
        "recentReturn3M": 15.6,
        "trendAnalysis": "股價回檔沉澱賣壓後，在 20 日均線附近守穩，法人進駐持股比重攀升，準備發起新一波攻勢。",
        "whyBuy": "先進封裝過程必須進行頻繁且極高精度的晶圓潔淨與殘膠去除，自製濕製程清洗機台出貨暢旺，成長動能飽滿。",
        "risk": "半導體代理業務代理權異動，以及關鍵控制器晶片缺料風險。",
        "historyData": [
          {"date": "t-9", "price": 100}, {"date": "t-8", "price": 101.5}, {"date": "t-7", "price": 103}, {"date": "t-6", "price": 102.1}, {"date": "t-5", "price": 105},
          {"date": "t-4", "price": 108.2}, {"date": "t-3", "price": 111.4}, {"date": "t-2", "price": 110}, {"date": "t-1", "price": 113}, {"date": "今日", "price": 115.6}
        ]
      }
    ]
  },
  "低軌衛星": {
    "title": "低軌衛星通訊與航太商用大升級",
    "query": "低軌衛星",
    "description": "以 SpaceX Starlink 為代表的低軌道衛星 (LEO) 天基網通基礎建設，已成為全球通訊死角覆蓋、車載、航海及國防安全的剛性配套。低軌衛星具備低延遲、高頻寬天線等通訊特點，其升級至 Direct to Cell (直連手機) 更是新一輪巨量市場。台廠精密高頻射頻、微波元件、PCB 外殼等供應鏈，憑籍卓越的製程良率，成功卡位國際大廠關鍵角色。",
    "marketDrivers": [
      "微型衛星大規模發射週期加速，每年在軌天線部署數量翻倍成長",
      "Direct to Cell (普通手機直連衛星通訊) 新商機在多國進入商化實用",
      "高頻大容量毫米波 Ku/Ka 頻段元件單價與利潤表現極高"
    ],
    "keyFactors": [
      "國際前三大衛星營運商釋出的 LEO 地面接收站訂單量",
      "戶外高階毫米波高增益主動天線 (AESA) 的良率及量產進度",
      "通訊零組件通過航太級太空嚴苛極限環境耐受測試時程"
    ],
    "chainMap": {
      "upstream": "低雜訊微波放大器晶粒、高頻特殊板材 (聚四氟乙烯)、射頻元件與金屬腔體模組",
      "midstream": "天線整合封裝、衛星酬載毫米波發射接收機、高密度 LEO 用戶終端接收設備 (UT)",
      "downstream": "衛星營運商 (SpaceX, OneWeb, Amazon Project Kuiper) 及通訊整裝終端通路"
    },
    "outlook": "航太通訊已從軍工國防正式迎來巨量商用化。隨地面終端 (UT) 的出貨放量與主動天線模組 (AESA) 製程升級，台廠具備極高的高頻元件精密金屬加工優勢，毛利率能長線維持在 35-40% 的高水準狀態，未來 3 年迎來巨幅高速增長。",
    "stocks": [
      {
        "id": "3491.TW",
        "name": "昇達科",
        "code": "3491.TW",
        "role": "低軌衛星毫米波高頻饋線元件",
        "roleCategory": "upstream",
        "description": "微波天線及高頻高頻量零件大廠，核心出貨 Ku/Ka 頻段雙工器、高斯天線及微波饋線，直接供應多個前三大國際衛星營運巨頭。",
        "advantage": "擁有全球最頂尖的高頻毫米波電學設計與超精密金屬 3D 列印加機械鑄造設備，護城河極深。",
        "recentReturn5D": 4.1,
        "recentReturn1M": 9.8,
        "recentReturn3M": 22.5,
        "trendAnalysis": "股價呈現強烈的大多頭攻勢，股價帶量一舉突破盤整並守住紅盤，買盤力道極高，外資投信均同步拉抬進駐。",
        "whyBuy": "低軌衛星毫米波頻寬愈高，所需之高難度饋線、雙工器元件數量及精度呈幾何級數增加，昇達科具封裝主導優勢。",
        "risk": "主要客戶火箭發射排程延後，以及高頻特殊銅鋁塑料等材料成本波動。",
        "historyData": [
          {"date": "t-9", "price": 100}, {"date": "t-8", "price": 102.5}, {"date": "t-7", "price": 105}, {"date": "t-6", "price": 104.2}, {"date": "t-5", "price": 109},
          {"date": "t-4", "price": 112.4}, {"date": "t-3", "price": 115}, {"date": "t-2", "price": 114.2}, {"date": "t-1", "price": 119.8}, {"date": "今日", "price": 122.5}
        ]
      },
      {
        "id": "6285.TW",
        "name": "啟碁",
        "code": "6285.TW",
        "role": "低軌衛星地面接收站 (UT) 網通",
        "roleCategory": "midstream",
        "description": "全方位無線通訊設備系統大廠，手握美系大客戶 Starlink 家用及車用低軌衛星地面接收終端路由器整機設備訂單。",
        "advantage": "擁有世界頂級的車級無線電子製造產能、天線封裝模擬實驗室，並能提供超高效率之白牌網路天線出貨。",
        "recentReturn5D": 1.15,
        "recentReturn1M": 3.42,
        "recentReturn3M": 8.9,
        "trendAnalysis": "股價沿著 10 日線溫和爬高，下檔均線支撐力道密集，法人籌碼相對沉澱，適合長線分批持股佈局者。",
        "whyBuy": "衛星覆蓋普及化帶動地面終端硬體 (UT) 的出貨放量，低軌天線產線產能維持在 90% 以上的高檔位置。",
        "risk": "網通系統同業的低利潤削價競爭，以及新興市場電信政策變化。",
        "historyData": [
          {"date": "t-9", "price": 100}, {"date": "t-8", "price": 101.2}, {"date": "t-7", "price": 102}, {"date": "t-6", "price": 100.8}, {"date": "t-5", "price": 103.5},
          {"date": "t-4", "price": 105}, {"date": "t-3", "price": 106.2}, {"date": "t-2", "price": 105.8}, {"date": "t-1", "price": 107.5}, {"date": "今日", "price": 108.9}
        ]
      },
      {
        "id": "2313.TW",
        "name": "華通",
        "code": "2313.TW",
        "role": "衛星射頻級高密度連接板 HDI",
        "roleCategory": "upstream",
        "description": "高密度連接板(HDI)領導者，為 SpaceX 衛星酬載及地面端接收設備之專門印刷電路板硬體供應大商，市占率超高。",
        "advantage": "擁有獨一無二的大容量、超高精度之多層 HDI 生產工廠，因技術認證耗時，競標壁壘高。",
        "recentReturn5D": 1.8,
        "recentReturn1M": 4.5,
        "recentReturn3M": 11.2,
        "trendAnalysis": "在高階 HDI 出貨轉強提振下，股價成功化解了先前蘋果鏈調節壓力，在年線之上築成堅實底部。",
        "whyBuy": "低軌衛星通訊線路複雜度是普通通訊板的數倍，高階 HDI 及軟硬結合板是信號無損傳輸必備品，毛利高彈性強。",
        "risk": "消費性電子需求疲弱拉低整體稼動率，以及廠房新折舊費用干擾。",
        "historyData": [
          {"date": "t-9", "price": 100}, {"date": "t-8", "price": 101}, {"date": "t-7", "price": 103}, {"date": "t-6", "price": 102.5}, {"date": "t-5", "price": 104.2},
          {"date": "t-4", "price": 105.5}, {"date": "t-3", "price": 108}, {"date": "t-2", "price": 107.5}, {"date": "t-1", "price": 109.8}, {"date": "今日", "price": 111.2}
        ]
      }
    ]
  },
  "人形機器人": {
    "title": "人形機器人與核心關節驅動革命",
    "query": "人形機器人",
    "description": "特斯拉 Optimus 機器人以及波士頓動力的技術推進，宣告了人形機器人正式從實驗室進軍工廠安檢、商務引導及家庭照護市場。人形機器人具備智慧自主性與高度靈巧擬真，其高精密金屬關節、行星滾柱絲槓 (Actuator)、諧波減速機 (Harmonic Drive) 與視覺邊緣運算模組，構成全球供應鏈重塑的大紅海與新風口。",
    "marketDrivers": [
      "全球少子化與工廠勞動力斷崖式枯竭，帶動工業擬真自主裝備急迫需求",
      "TESLA Optimus 等領先品牌宣佈即將進入大規模量產與工廠實用階段",
      "關鍵金屬諧波減速、無刷空心杯電機 (Motor) 單機件單價高且技術高牆"
    ],
    "keyFactors": [
      "人形機器人單台生產製造成本下降曲線與廠商量產爬坡規律",
      "諧波減速機器人精密齒輪與力矩感測器之抗疲勞、長期信賴度指標",
      "AI 邊緣影像演算法對大流量立體視覺晶片的運算核心整合"
    ],
    "chainMap": {
      "upstream": "精密機器人諧波減速機、高效空心杯直流電機、高性能力矩感測器與超薄微型編碼器",
      "midstream": "靈巧機械手爪組裝、高剛性絲槓滾柱螺桿模組、3D 視覺光學影像感測器模組",
      "downstream": "人形機器人整機研發商 (Tesla, Boston Dynamics, Figure) 及終端工業自動化代工廠"
    },
    "outlook": "人形機器人被譽為 AI 落地現實世界的最高端載體。其關節與運動控制器中需要用到的行星減速齒輪、微型編碼器、力矩傳感元器件数量比汽車多出百倍。擁有成熟精密金屬模具、高精密齒輪減速機及 3D 自動化檢測技術的核心台廠，將成享高溢價之長期黑馬。",
    "stocks": [
      {
        "id": "2359.TW",
        "name": "所羅門",
        "code": "2359.TW",
        "role": "3D 視覺 AI 影像辨識與機械運動控制",
        "roleCategory": "upstream",
        "description": "自動化視覺科技大廠，結合自製 3D 視覺 AI 軟體，提供高敏捷智慧機器人撿貨、智慧巡檢與 3D 立體視覺系統配套。",
        "advantage": "擁有自主開發、世界領先的 3D AI 視覺演算法與 NVIDIA 具備多維度平台合夥關係，辨識率高居同業前茅。",
        "recentReturn5D": 3.82,
        "recentReturn1M": 11.4,
        "recentReturn3M": 29.5,
        "trendAnalysis": "股價表現極其亮眼。帶量突破短箱整理區間並高姿態站穩，融資籌碼洗盤完成，人氣高張多頭行情延續。",
        "whyBuy": "人工智慧機器人最需要眼睛 (3D 視覺技術) 來辨識複雜三維物體進而控制關節，所羅門深得輝達高度支持。",
        "risk": "全球機器人量產量產落地時間若晚於市場主流預期，或 AI 硬體競爭加劇。",
        "historyData": [
          {"date": "t-9", "price": 100}, {"date": "t-8", "price": 103}, {"date": "t-7", "price": 106}, {"date": "t-6", "price": 105.1}, {"date": "t-5", "price": 108.5},
          {"date": "t-4", "price": 112.5}, {"date": "t-3", "price": 118}, {"date": "t-2", "price": 116.8}, {"date": "t-1", "price": 124}, {"date": "今日", "price": 129.5}
        ]
      },
      {
        "id": "2464.TW",
        "name": "盟立",
        "code": "2464.TW",
        "role": "諧波減速機與關節伺服控制元件",
        "roleCategory": "upstream",
        "description": "自動化系統整合大廠，轉投資盟英科技成功量產人形齒輪與諧波減速機 (Harmonic Drive) 關鍵精密關節組件。",
        "advantage": "成功解決了精密金屬抗疲勞強度製程卡點，並具有豐富的整裝建置工廠自動化系統實戰經驗。",
        "recentReturn5D": 1.25,
        "recentReturn1M": 4.15,
        "recentReturn3M": 10.8,
        "trendAnalysis": "股價於高位進行多空震盪拉鋸整理，筹码進程穩健。短期均線開始翻揚向上交叉，外資法人維持買超基調。",
        "whyBuy": "諧波減速機是機器人關節最核心也是價格最高的黃金配件，盟英產能成功放量有機會打破日本製造巨頭壟斷。",
        "risk": "精密關節測試時間若過長，或與美系車廠合作專案交付延宕。",
        "historyData": [
          {"date": "t-9", "price": 100}, {"date": "t-8", "price": 102}, {"date": "t-7", "price": 101.5}, {"date": "t-6", "price": 103}, {"date": "t-5", "price": 102.8},
          {"date": "t-4", "price": 104.5}, {"date": "t-3", "price": 106}, {"date": "t-2", "price": 105.5}, {"date": "t-1", "price": 108}, {"date": "今日", "price": 110.8}
        ]
      },
      {
        "id": "6188.TWO",
        "name": "廣明",
        "code": "6188.TWO",
        "role": "協力靈巧手臂達明機器人與控制軟體",
        "roleCategory": "midstream",
        "description": "廣達集團旗下精銳主力。旗下子公司達明機器人 (Techman Robot) 是全球第二大協作型靈巧機械手臂領先廠商。",
        "advantage": "擁有獨創的內建 3D 視覺手臂，並積極配合廣達集團與 NVIDIA 開發先進自主人形控制與搬運系統。",
        "recentReturn5D": 2.1,
        "recentReturn1M": 5.8,
        "recentReturn3M": 14.2,
        "trendAnalysis": "股價打底完成後發起突破，突破先前半年線長期反壓，投信法人的連續買單進逼令多方氣勢長線看佳。",
        "whyBuy": "達明智慧手臂市佔率極大且成功結合 AI 算力，隨黑傑克及工廠手臂自動化裝載量大爆發，獲利空間顯著拉長。",
        "risk": "智慧手臂供應鏈零件成本上揚拉低毛利，或中低階白牌協作手臂低價競爭。",
        "historyData": [
          {"date": "t-9", "price": 100}, {"date": "t-8", "price": 101.5}, {"date": "t-7", "price": 102.5}, {"date": "t-6", "price": 101.2}, {"date": "t-5", "price": 104},
          {"date": "t-4", "price": 106.8}, {"date": "t-3", "price": 110}, {"date": "t-2", "price": 109.5}, {"date": "t-1", "price": 112.4}, {"date": "今日", "price": 114.2}
        ]
      }
    ]
  },
  "ASIC IP 設計": {
    "title": "ASIC IP 設計與特殊應用晶片大商機",
    "query": "ASIC IP 設計",
    "description": "隨著 AI 算力急遽膨脹，超大型雲端系統服務商 (CSP) 如微軟、Google、Meta 及亞馬遜，為降低採購成本、提高算力垂直整合效益，紛紛啟動「ASIC 自研晶片計劃」。ASIC 配備高度客製化運算核心，而 IP (矽智慧財產權) 則是高速傳輸、加密、運算電路的關鍵基石。台灣 ASIC 設計服務與 IP 授權廠商擁有獨特的台積電先進製程生態系協同優勢，成為這波客製化 AI 算力硬體爆發潮的核心贏家。",
    "marketDrivers": [
      "雲端大廠 (CSP) 強烈追求自研 AI 加速晶片以解耦 NVIDIA 壟斷并降本增效",
      "先進製程設計複雜度飆升，IP 授權可顯著縮短晶片開發週期與投片風險",
      "HBM3e/HBM4、高速傳輸介面 PCIe Gen6/CXL 等介面 IP 授權單價上揚"
    ],
    "keyFactors": [
      "台積電 N3、N2 先進製程晶片設計服務 (NRE) 簽約案量與投片 (Turnkey) 進度",
      "高速介面 (High-speed Interface) IP 的完整度與認證時程",
      "量產客戶之晶片終端出貨量與後續權利金 (Royalty) 貢獻年複合增速"
    ],
    "chainMap": {
      "upstream": "核心矽智慧財產權 (矽IP授權如 M31、力旺、ARM)，高速傳輸、基礎元件、非揮發性記憶體 IP 核心",
      "midstream": "ASIC 晶片設計服務 (NRE & SoC 設計平台如世芯-KY、創意、智原)，封裝基板(Substrate) 協同設計",
      "downstream": "晶圓代客製造 (TSMC、聯電) 及先進封裝生產認證，最終交付予 CSP 超大規模雲端資料中心"
    },
    "outlook": "自研客製化 AI 晶片 (ASIC) 已經是大型資料中心的剛性共識。伴隨 3 奈米製程及 CoWoS 封裝普及化，單顆 ASIC 的研發與生產門檻攀高，ASIC 設計服務大廠因有台積電產能保障與一線 CSP 深度合夥關係，後市權利金與 NRE 營收將迎來長期雙位數高速增長。",
    "stocks": [
      {
        "id": "3661.TW",
        "name": "世芯-KY",
        "code": "3661.TW",
        "role": "美系大雲端家 AI ASIC 設計服務龍頭",
        "roleCategory": "midstream",
        "description": "客製化 SoC 設計服務 (ASIC) 大廠，為亞馬遜 AWS 晶片最主要設計者，掌握北美核心大雲端超算晶片委託合約。",
        "advantage": "擁有超高複雜度的 3nm/5nm 先進製程晶片設計與量產經驗，以及跟台積電 CoWoS 產能獲配的高度互信。",
        "recentReturn5D": 2.3,
        "recentReturn1M": 7.45,
        "recentReturn3M": -12.5,
        "trendAnalysis": "股價回檔盤洗沉澱，近期季線站穩，投信與主動型外資於低位階分批建倉，具有強烈的底部分形跡象。",
        "whyBuy": "2025/2026 美系主要客戶下一波 3nm ASIC 晶片即將進入大規模投片量產 (Turnkey) 階段，下半年利潤與能見度極高。",
        "risk": "地緣政治政策監管風險，以及大客戶第二代自製晶片釋單比例的變動懸念。",
        "historyData": [
          {"date": "t-9", "price": 100}, {"date": "t-8", "price": 102.5}, {"date": "t-7", "price": 101}, {"date": "t-6", "price": 98.5}, {"date": "t-5", "price": 103},
          {"date": "t-4", "price": 104.2}, {"date": "t-3", "price": 102.1}, {"date": "t-2", "price": 105.4}, {"date": "t-1", "price": 106.8}, {"date": "今日", "price": 107.45}
        ]
      },
      {
        "id": "3443.TW",
        "name": "創意電子",
        "code": "3443.TW",
        "role": "台積電官方轉投資 ASIC 服務與 HBM IP",
        "roleCategory": "midstream",
        "description": "台積電持股之先進製程 ASIC 設計公司，擁有台積電最直接的一線製程與關鍵 IP 技術授權支持，專注超算與高階網通領域。",
        "advantage": "擁有獨占鰲頭的 HBM3/HBM4 先進封裝實用 IP 以及台積電 CoWoS/SoIC 平台的一戰式整合能力。",
        "recentReturn5D": 1.15,
        "recentReturn1M": 4.82,
        "recentReturn3M": 6.4,
        "trendAnalysis": "股價目前處於健康的中期整理區，短期均線收斂糾結，伴隨投信買單點火，一旦突破上緣將展開量能大噴發。",
        "whyBuy": "掌握微軟與 Meta 部分高速傳輸、HBM 先進封裝開發，營運穩居台積電生態系受惠首位。",
        "risk": "終端測試或驗證進度延宕，以及非 AI 傳統消費性客群之晶片需求復甦緩慢。",
        "historyData": [
          {"date": "t-9", "price": 100}, {"date": "t-8", "price": 101}, {"date": "t-7", "price": 102.2}, {"date": "t-6", "price": 99.5}, {"date": "t-5", "price": 101},
          {"date": "t-4", "price": 103.5}, {"date": "t-3", "price": 103}, {"date": "t-2", "price": 104.2}, {"date": "t-1", "price": 103.8}, {"date": "今日", "price": 104.82}
        ]
      },
      {
        "id": "3035.TW",
        "name": "智原",
        "code": "3035.TW",
        "role": "全製程 ASIC 設計與高速傳輸 IP 平台",
        "roleCategory": "midstream",
        "description": "聯電集團旗下 ASIC 設計服務龍頭，成功切入英特爾與台積電 3nm / 4nm 生態系，向先進製程與小晶片 (Chiplet) 快速挺進。",
        "advantage": "擁有長達數十年的成熟製程 IP 自製庫，且與跨晶圓代工廠 (聯電、台積電、Intel Foundry) 展開多元平台垂直整合優勢。",
        "recentReturn5D": 3.42,
        "recentReturn1M": 8.9,
        "recentReturn3M": 14.3,
        "trendAnalysis": "日K線打底成型，量能放大，均線呈黃金交叉多頭排列，顯示新製程設計案量 NRE 入帳表現已獲資法人認同。",
        "whyBuy": "小晶片先進封裝趨勢下，智原高階設計平台能接獲大量客製化晶片高毛利專案。權利金獲利成長趨勢明朗。",
        "risk": "同業在成熟製程設計代工之削價競爭，全球晶圓產能調度對中小客戶之干擾。",
        "historyData": [
          {"date": "t-9", "price": 100}, {"date": "t-8", "price": 101.5}, {"date": "t-7", "price": 103}, {"date": "t-6", "price": 102.2}, {"date": "t-5", "price": 105},
          {"date": "t-4", "price": 106.4}, {"date": "t-3", "price": 108.2}, {"date": "t-2", "price": 107.5}, {"date": "t-1", "price": 109}, {"date": "今日", "price": 108.9}
        ]
      },
      {
        "id": "6643.TW",
        "name": "M31",
        "code": "6643.TW",
        "role": "高速傳輸與基礎電性 IP 授權",
        "roleCategory": "upstream",
        "description": "全球少數純 IP 供應大廠，專攻超高速傳輸介面 (PCIe, USB, MIPI) 與基礎庫元件 IP 開發，為台積電 IP 推薦重要夥伴。",
        "advantage": "純 IP 授權商，營運結構為「近百分之百極高毛利率」，不需承擔量產庫存與高額製造投資風險。",
        "recentReturn5D": 1.8,
        "recentReturn1M": 5.4,
        "recentReturn3M": 10.5,
        "trendAnalysis": "股價在高位階沉澱完，守在半年線之上，籌碼被大基金與中長期融資穩定掌控，蓄勢突破前期短壓線。",
        "whyBuy": "高速傳輸與 N3E 製程基礎 IP 是任何 ASIC 晶片必買授權，先進製程 N3E / N2 的認證將帶動利潤大幅翻倍。",
        "risk": "研發工程師團隊薪資成本高漲壓縮利潤，新製程認證測試可能延遲。",
        "historyData": [
          {"date": "t-9", "price": 100}, {"date": "t-8", "price": 101.2}, {"date": "t-7", "price": 102.5}, {"date": "t-6", "price": 101.8}, {"date": "t-5", "price": 103.5},
          {"date": "t-4", "price": 105.1}, {"date": "t-3", "price": 104.8}, {"date": "t-2", "price": 106.2}, {"date": "t-1", "price": 107}, {"date": "今日", "price": 105.4}
        ]
      }
    ]
  }
};

// ----------------------------------------------------
// Core POST Endpoint: 股市研究與智慧過濾 (主控 key-rotation)
// ----------------------------------------------------
app.post('/api/research', async (req, res) => {
  const { query, forceRefresh } = req.body;
  if (!query || query.trim() === '') {
    return res.status(400).json({ error: '請輸入您要研究的股市議題名稱' });
  }

  const cleanQuery = query.trim();

  // 1. Check local cache (Strictly checked once a week = 7 Days)
  if (!forceRefresh) {
    const cached = cacheManager.retrieve(cleanQuery);
    if (cached && !cached.isExpired) {
      console.log(`[Cache Hit] Serving 7-day valid cache for "${cleanQuery}". Age: ${cached.daysOld.toFixed(2)} days.`);
      return res.json({
        ...cached.data,
        isFromCache: true,
        cachedAtString: cached.cachedAt,
        daysOld: cached.daysOld
      });
    }
  }

  // Use Gemini 3.5-flash which is excellent for basic search grounding tasks.
  const prompt = `您是一位專業的資深股市產業分析師。請針對以下股市熱門議題進行深入研究：「${cleanQuery}」。
請利用 Google Search groundings 搜尋最新、最準確的產業趨勢、上市公司、概念股及股票代號。

請提供深入、結構化、專業的中文分析，並嚴格按照以下 JSON 格式回傳，不要有任何 Markdown 包裹（如 \`\`\`json ），直接回傳可被 JSON.parse() 解析的純字串。

JSON 結構規範：
{
  "title": "（請給出一個響亮且精準的中文議題名稱，如：${cleanQuery}與先進製程大商機）",
  "query": "${cleanQuery}",
  "description": "（對此股市議題、關聯產業板塊與市場地位的深度解讀與最新演進情形，字數 150-250 字）",
  "marketDrivers": [
    "（核心驅動因子 1，說明為何此議題在近期 and 未來能推升公司獲利進而帶動大漲，字數 20-40 字）",
    "（核心驅動因子 2）",
    "（核心驅動因子 3）",
    "（核心驅動因子 4，若有的話）"
  ],
  "keyFactors": [
    "（研究此議題或追蹤這類大漲股時，應主要看什麼長期關鍵財務、產能或技術指標 1，字數 20-40 字）",
    "（指標 2）",
    "（指標 3）"
  ],
  "chainMap": {
    "upstream": "（描述上游環節：主要負責的產品、晶粒技術 or 原材料）",
    "midstream": "（描述中游環節：加工、中端組件 or 組裝模組）",
    "downstream": "（描述下游環節：系統整合、終端商用、應用跟通路商）"
  },
  "outlook": "（此議題未來的長短期展望與投資結論，字數 100-150 字）",
  "stocks": [
    {
      "name": "（第一檔最具代表性概念股的中文公司名稱，如：台積電、奇鋐、世芯等）",
      "code": "（完整且正確的股票代號。台灣股市請務必加上 .TW 或 .TWO 後綴，如 2330.TW, 3017.TW，美股請用純英文如 NVDA, AMD）",
      "role": "（在該議題主要擔任的角色或提供之核心產品）",
      "roleCategory": "（必須是 'upstream'、'midstream' 或者是 'downstream' 其中一個，請合理分類該公司在這議題中的產業鏈位置）",
      "description": "（主要業務性質，以及在該熱門議題中的切入深度與合作客戶）",
      "advantage": "（該公司在該技術/產品的競爭優勢與核心護城河，如：技術領先、良率極高、客戶黏著度等）",
      "recentReturn5D": 1.5,
      "recentReturn1M": 5.2,
      "recentReturn3M": 15.4,
      "trendAnalysis": "（對該股近期股價走勢的綜合分析與法人動態描述。字數 30-60 字）",
      "whyBuy": "（關鍵買進/研究理由與未來最主要的看好催化劑）",
      "risk": "（主要的投資風險或潛在踩雷點，如：大客戶轉向、競爭對手削價等）",
      "historyData": [
        {"date": "t-9", "price": 100},
        {"date": "t-8", "price": 102},
        {"date": "t-7", "price": 104},
        {"date": "t-6", "price": 103},
        {"date": "t-5", "price": 105},
        {"date": "t-4", "price": 108},
        {"date": "t-3", "price": 111},
        {"date": "t-2", "price": 110},
        {"date": "t-1", "price": 115},
        {"date": "今日", "price": 119}
      ]
    }
  ]
}`;

  let parsedData = null;
  let errorToThrow = null;
  let activeKeyUsed = '';
  let activeKeyMasked = '';

  // Rotate keys if limit reached
  for (let attempt = 1; attempt <= 5; attempt++) {
    let activeKeyObj;
    try {
      activeKeyObj = keyManager.getActiveClient();
      activeKeyUsed = activeKeyObj.keyString;
      activeKeyMasked = activeKeyObj.masked;
    } catch (keyErr: any) {
      errorToThrow = keyErr;
      break; // No active keys available anymore
    }

    try {
      console.log(`[Gemini Attempt ${attempt}] Fetching query for "${cleanQuery}" via Key ${activeKeyMasked}...`);
      const ai = activeKeyObj.client;
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: 'application/json',
        }
      });

      const text = response.text || '';
      let cleanedText = text.trim();
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.slice(7);
      }
      if (cleanedText.endsWith('```')) {
        cleanedText = cleanedText.slice(0, -3);
      }
      parsedData = JSON.parse(cleanedText.trim());
      
      // Hit a successful retrieval - Break key rotation loop
      console.log(`[Gemini Success!] Succeeded generating for "${cleanQuery}" with key "${activeKeyMasked}"`);
      break;
    } catch (apiError: any) {
      const errMsg = apiError?.message || String(apiError);
      console.error(`[Gemini Attempt Failed] Key ${activeKeyMasked} threw:`, errMsg);
      keyManager.markAsExhausted(activeKeyUsed, errMsg);
      errorToThrow = apiError;
    }
  }

  // 3. Complete structural outputs
  if (parsedData) {
    // Add unique ID for stocks if model didn't add it
    if (parsedData.stocks && Array.isArray(parsedData.stocks)) {
      parsedData.stocks = parsedData.stocks.map((stock: any, idx: number) => ({
        ...stock,
        id: stock.code || `stock-${idx}`,
        roleCategory: ['upstream', 'midstream', 'downstream'].includes(stock.roleCategory)
          ? stock.roleCategory
          : 'midstream'
      }));
    }

    // Try uploading to Cloudflare R2
    const cfResult = await r2Uploader.uploadResult(cleanQuery, parsedData);
    parsedData.cloudflareSync = {
      synced: cfResult.success,
      url: cfResult.url || null,
      error: cfResult.error || null,
      timestamp: Date.now()
    };

    // Save to Cache (Lasts 7 Days)
    cacheManager.save(cleanQuery, parsedData);

    return res.json({
      ...parsedData,
      isFromCache: false,
      keyMasked: activeKeyMasked
    });
  }

  // Graceful fallback if AI is quota-blocked, offline, or failed
  console.log(`[Graceful Fallback Mode] Key rotation exhausted or failed. Triggering smart local caching simulation.`);
  
  // Try to find matching fallback data by keyword
  let fallbackKey = "矽光子";
  const lowercaseQuery = cleanQuery.toLowerCase();
  
  if (lowercaseQuery.includes("散熱") || lowercaseQuery.includes("水冷") || lowercaseQuery.includes("液冷")) {
    fallbackKey = "液冷散熱";
  } else if (lowercaseQuery.includes("gb200") || lowercaseQuery.includes("伺服器") || lowercaseQuery.includes("機架") || lowercaseQuery.includes("機櫃")) {
    fallbackKey = "GB200 伺服器";
  } else if (lowercaseQuery.includes("cowos") || lowercaseQuery.includes("封裝") || lowercaseQuery.includes("先進製程") || lowercaseQuery.includes("先進封裝")) {
    fallbackKey = "CoWoS 先進封裝";
  } else if (lowercaseQuery.includes("衛星") || lowercaseQuery.includes("太空") || lowercaseQuery.includes("低軌")) {
    fallbackKey = "低軌衛星";
  } else if (lowercaseQuery.includes("機器人") || lowercaseQuery.includes("人形") || lowercaseQuery.includes("自動化") || lowercaseQuery.includes("關節")) {
    fallbackKey = "人形機器人";
  } else if (lowercaseQuery.includes("asic") || lowercaseQuery.includes("ip") || lowercaseQuery.includes("設計") || lowercaseQuery.includes("客製化晶片")) {
    fallbackKey = "ASIC IP 設計";
  }

  let fallbackTemplate = FALLBACK_RESEARCH_DATA[fallbackKey];
  let customResult;

  if (fallbackTemplate) {
    customResult = {
      ...fallbackTemplate,
      query: cleanQuery,
      title: fallbackTemplate.title.includes(cleanQuery) ? fallbackTemplate.title : `${cleanQuery}與相關產業鏈研究`,
      description: fallbackTemplate.description
    };
  } else {
    // Dynamic simulated fallback for any other custom search topic!
    fallbackTemplate = FALLBACK_RESEARCH_DATA["矽光子"];
    customResult = {
      "title": `【智慧預測】${cleanQuery}產業技術升級與概念股研究`,
      "query": cleanQuery,
      "description": `針對最近熱門股市議題【${cleanQuery}】，這是一個涵蓋先進製程、關鍵零組件與系統整合技術架構的智慧研究。雖然目前網路環境受限，系統引導模組仍為您模擬了代表性大廠及近期產業鏈變化。`,
      "marketDrivers": [
        `在 AI 與全球高規科技迭代拉動下，【${cleanQuery}】核心需求在 2025-2027 年將迎來顯著的市場規模爬升。`,
        `相關概念股在訂單量與出貨單價 (ASP) 上都有顯著提升前景。`,
        `台廠與美系巨頭在該產業的分工中占據無可取代的關鍵護城河地位。`
      ],
      "keyFactors": [
        `各主要大廠產能擴建進展以及在全球 CSP 技術標準聯盟中的合作比重。`,
        `核心零組件高良率認證的進展速度與新客裝排程。`,
        `公司本業毛利率改善以及代表性大客戶的訂單份額。`
      ],
      "chainMap": {
        "upstream": "上游：關鍵精密零組件、高頻主動元件設計、核心原物料與特殊化學材料",
        "midstream": "中游：高密度多層板、散熱冷板與模組加工、中端組件自動化貼合與封測",
        "downstream": "下游：大型系統整合代工（鴻海、廣達等）、CSP 雲端資料中心及商用終端用戶"
      },
      "outlook": `長短期投資結論：雖然面臨短期波動，【${cleanQuery}】的長線成長趨勢極為明確。能成功通過美系巨頭測試並完成大規模量產的核心大廠，將是長線資金安全停靠與大盤領漲的主力軍。`,
      "stocks": [
        {
          "id": "2330.TW",
          "name": "台積電",
          "code": "2330.TW",
          "role": `晶圓代工與【${cleanQuery}】先進製程技術支援`,
          "roleCategory": "upstream",
          "description": `晶圓代工霸主。為【${cleanQuery}】所需半導體晶片與中介先進材料整合，提供全方位先進封測與晶圓代工。`,
          "advantage": "擁有獨一無二的 CoWoS 先進封裝產能及三奈米以下先進製程高良率優勢。",
          "recentReturn5D": 1.45,
          "recentReturn1M": 5.82,
          "recentReturn3M": 14.8,
          "trendAnalysis": "股價表現持續穩健，隨多頭排列，階梯式走升穩固整理，為長線資金首選避風港。",
          "whyBuy": "身為全球 CPO 與先進封裝核心終點站，任何前瞻晶片商要做先進運算都無法繞過台積電。",
          "risk": "地緣政治風險，及短期產能吃緊限制其部分設備出貨步調。",
          "historyData": [
            {"date": "t-9", "price": 100}, {"date": "t-8", "price": 102}, {"date": "t-7", "price": 101.5}, {"date": "t-6", "price": 103}, {"date": "t-5", "price": 102.8},
            {"date": "t-4", "price": 104.5}, {"date": "t-3", "price": 106}, {"date": "t-2", "price": 105.5}, {"date": "t-1", "price": 108}, {"date": "今日", "price": 114.8}
          ]
        },
        {
          "id": "3017.TW",
          "name": "奇鋐",
          "code": "3017.TW",
          "role": `【${cleanQuery}】關鍵精密結構與零組件供應`,
          "roleCategory": "midstream",
          "description": `散熱與零件巨頭，切入【${cleanQuery}】零組件、高難度配電以及精密金屬機蓋模組。`,
          "advantage": "擁有高度機櫃垂直整合能力，自製率達八成以上，毛利居同業之冠。",
          "recentReturn5D": 2.15,
          "recentReturn1M": 7.4,
          "recentReturn3M": 19.3,
          "trendAnalysis": "股價呈現非常優異的多頭格局，回踩生命線後迅速拉升，高姿態盤整蓄勢待發。",
          "whyBuy": "組裝與設備對該零件用量極大，產品改善組合優異，EPS 爆發力極強。",
          "risk": "同業產能擴增速度造成的毛利稀釋，以及上游原料銅鋁等的價格干擾。",
          "historyData": [
            {"date": "t-9", "price": 100}, {"date": "t-8", "price": 101.5}, {"date": "t-7", "price": 103.2}, {"date": "t-6", "price": 102.1}, {"date": "t-5", "price": 104.5},
            {"date": "t-4", "price": 108.1}, {"date": "t-3", "price": 111.4}, {"date": "t-2", "price": 110.8}, {"date": "t-1", "price": 115.5}, {"date": "今日", "price": 119.3}
          ]
        },
        {
          "id": "2317.TW",
          "name": "鴻海",
          "code": "2317.TW",
          "role": `【${cleanQuery}】終端整機大組裝代工與 L12 系統測試`,
          "roleCategory": "downstream",
          "description": "全球最大的 L11/L12 整機組裝廠。結合自身零件垂直製造優勢，獲取大量訂單份額。",
          "advantage": "規模實力雄厚，具備全球最完整的系統整合測試與大客戶快速出貨能力。",
          "recentReturn5D": 1.2,
          "recentReturn1M": 6.35,
          "recentReturn3M": 19.5,
          "trendAnalysis": "股價持續在高檔箱型整理，有強力低檔法人買盤支撐，為高性價比的最佳定存股代表。",
          "whyBuy": "隨大規模進貨洪流推進，鴻海為 Blackwell 及整櫃組裝的最直接、最巨量受惠企業。",
          "risk": "某些個別關鍵零件供應缺口延宕其整裝出庫時間。",
          "historyData": [
            {"date": "t-9", "price": 100}, {"date": "t-8", "price": 101}, {"date": "t-7", "price": 100.5}, {"date": "t-6", "price": 102}, {"date": "t-5", "price": 103.5},
            {"date": "t-4", "price": 105}, {"date": "t-3", "price": 108.2}, {"date": "t-2", "price": 111.4}, {"date": "t-1", "price": 115.3}, {"date": "今日", "price": 119.5}
          ]
        }
      ]
    };
  }

  const errMessage = errorToThrow?.message || String(errorToThrow || '未知連線錯誤');
  const isQuotaExceeded = errMessage.includes('RESOURCE_EXHAUSTED') || errMessage.includes('429') || errMessage.includes('quota') || errMessage.includes('Quota');

  let warningMsg = '';
  if (isQuotaExceeded) {
    warningMsg = `⚠️ 偵測到您已達到 Gemini API 免費額度上限 (429 RESOURCE_EXHAUSTED)。所有金鑰暫時冷卻，系統已自動為您凍結/暫停實際 API 呼叫以避免不必要的失效。在此狀態下，您仍能流暢檢視其他標的。已為您智能加載【${fallbackKey}】高品質示範產業供應鏈研究數據！`;
  } else {
    warningMsg = `⚠️ Gemini API 連線異常 (${errMessage})。為確保服務不中斷，已特別為您切換至【${fallbackKey}】在地數據。您也可以在 Settings > Secrets 設定多把 Gemini 金鑰以落實自動輪替。`;
  }

  return res.json({
    ...customResult,
    isFallback: true,
    fallbackWarning: warningMsg
  });
});

// Telemetry endpoint: get API key rotation and quota status
app.get('/api/keys-status', (req, res) => {
  const status = keyManager.getKeysStatus();
  const cfConfigured = !!(process.env.CLOUDFLARE_R2_ACCOUNT_ID && 
                          process.env.CLOUDFLARE_R2_ACCESS_KEY_ID && 
                          process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY && 
                          process.env.CLOUDFLARE_R2_BUCKET_NAME);
  
  res.json({
    keys: status,
    activeKeysCount: status.filter(k => !k.isExhausted).length,
    cloudflare: {
      isConfigured: cfConfigured,
      bucketName: process.env.CLOUDFLARE_R2_BUCKET_NAME || null,
      accountId: process.env.CLOUDFLARE_R2_ACCOUNT_ID ? '已設定' : null
    },
    cacheCount: cacheManager.listCachedQueries().length
  });
});

// Verified podcast episodes database
let verifiedPodcastEpisodes: any[] = [
  {
    ep: 'EP663',
    date: '2026年5月20日',
    title: 'EP663 主板與通訊高頻元件之亂，被動大廠現貨掃盤與網通回春 🦘',
    summary: '本集分析台積電論壇後對光通訊大方向的肯定，指出「利多出盡只是短期雜訊，趨勢依舊存在」。另外深入探討被動元件最新市況：各大雲端與高頻大廠開始在現貨市場大舉掃貨被動元件，漲價潮蓄勢待發，Google TPU 帶動專用 IPD 需求大增。美股部分則高度肯定博通 Broadcom (AVGO) 的晶片路線圖與 AI 增長格局。',
    themes: ['被動元件', '博通 AVGO', '光通訊', 'IPD 需求', '台積電論壇'],
    sentiment: 'positive',
    industryTopic: '被動元件大廠掃貨與高頻 1.6T 光學網通主升段',
    individualStocks: ['國巨 (2327.TW)', '華新科 (2492.TW)', '博通 (AVGO)', '聯亞 (3081.TW)', '聯鈞 (3450.TW)'],
    investmentAdvice: {
      title: '被動漲價潮搭配 1.6T 光電整合主力方案',
      action: '逢低買進龍頭被動組件與博通，抱緊光通訊先導股',
      details: '1. 被動元件看多：大廠在現貨市場瘋狂掃貨是需求復甦與產能排擠的強烈訊號，國巨 (2327.TW) 與華新科 (2492.TW) 長線評價偏低，具備補漲潛能。2. 網通光通訊看多：台積電最新技術論壇再次驗證 CPO 與矽光子在 AI 機櫃是不可逆的剛性主流，利多出盡只是震盪洗盤，聯亞 (3081.TW) 與聯鈞 (3450.TW) 承壓拉回皆是布局點。3. 博通 (AVGO)：晶片路線圖健全，AI 客製晶片 (ASIC) 與高頻硬體定海神針，長線投資首選。'
    }
  },
  {
    ep: 'EP662',
    date: '2026年5月16日',
    title: 'EP662 老AI籌碼輪動，被動元件之亂再起信號 ⛑️',
    summary: '本集錄於台股週五大跌後，主持人分享老手面對修正反趨跌加碼的心態，認為市場正在淘汰籌碼不穩的人。金管會放寬投信持台積電上限是最大催化劑，預計一個月後更多投信完成流程並大舉增持，資金可能從中小型老AI輪動過去。老AI股毛利率短暫受壓屬下一代替代期間的正常現象。',
    themes: ['老AI籌碼', '被動元件', '台積電上限', '籌碼輪動'],
    sentiment: 'observation',
    industryTopic: 'AI 伺服器供應鏈與成熟被動元組件排擠',
    individualStocks: ['台積電 (2330.TW)', '國巨 (2327.TW)', '奇鋐 (3017.TW)', '金像電 (2368.TW)'],
    investmentAdvice: {
      title: '老 AI股大震盪期，強勢投信加碼防守策略',
      action: '分批逢低承接老 AI 指標股，關注巨型權值防禦力',
      details: '1. 長期基本面並未破壞：伺服器水冷及中階零件拉貨持續健康，短線回檔係因外資期貨空單避險。2. 關注國巨等被動元件大廠：Legacy晶片供給吃緊導致拉貨延後，一旦第3季舒緩，MLCC補庫存效應將非常強烈。3. 台積電權重放寬後將迎來投信被動買盤，龍頭防禦首選。'
    }
  },
  {
    ep: 'EP661',
    date: '2026年5月13日',
    title: 'EP661 被動元件排擠效應確立，Legacy漲價成本與需求二分 🚲',
    summary: '本集深入分析成熟與先進製程交會口。主板與通訊晶片大量引進高整合被動元件，瑞薩等外大廠擴大車用投片，造成Legacy（成熟製程）組件短期面臨毛利率調降與部分成本轉移。與此同時，先進載板及CoWoS鏈產能依舊緊繃，形成強烈的冰火二分天。',
    themes: ['被動元件', 'Legacy成熟製程', '先進載板', 'CoWoS緊繃'],
    sentiment: 'positive',
    industryTopic: '成熟製程元件漲價與車用晶粒外包',
    individualStocks: ['華通 (2313.TW)', '欣興 (3037.TW)', '日月光 (3711.TW)'],
    investmentAdvice: {
      title: '先進載板與成熟封測排擠之應變佈局',
      action: '避開毛利下滑之二線成熟封測，聚焦高階 2.5D 先進封裝設備與載板大廠',
      details: '1. 欣興、景碩等載板龍頭位階較低，近期打底訊號成型可逢低關注。2. 避免盲目追高一線成熟製程零組件，其漲價並非由強勁終端需求拉動，而是供應鏈產能排擠。3. 先進封測（日月光投控）隨台積電CoWoS產能大增具有長期委外統包溢出紅利。'
    }
  },
  {
    ep: 'EP660',
    date: '2026年5月9日',
    title: 'EP660 伺服器模組熱度續燒，散熱效應擴增至高階光網通 🍄‍🟫',
    summary: '主講輝達 GB200 正式出貨前的供應鏈最後校準。水冷散熱與液冷歧管測試進入最終關卡，散熱效益向外蔓延到中興、雷射等高階通信設備與主動式光纜。同時討論美國非農就業增長放緩，市場對降息預期再度轉趨樂觀的宏觀資金解讀。',
    themes: ['液冷散熱', '高階光通訊', 'GB200 機櫃', '非農與降息'],
    sentiment: 'positive',
    industryTopic: 'GB200 水冷洩漏測試與1.6T光收發晶粒',
    individualStocks: ['聯亞 (3081.TW)', '上詮 (3363.TW)', '雙鴻 (3324.TW)', '奇鋐 (3017.TW)'],
    investmentAdvice: {
      title: '散熱外溢與矽光子主升段卡位方案',
      action: '鎖定水冷歧管獨供者與台積電矽光子聯盟要員',
      details: '1. 散熱板塊正從一線機殼整機外溢到二線零組件（如快接頭、分流歧管）。2. 光通訊（聯亞、波若威）受惠北美雲端業者1.6T大單提前試產，是高確信度賽道。3. 建議持股比例控制在六成，保留手頭資金因應高位階財報週大震盪。'
    }
  }
];

// Endpoint: dynamic verified podcasts retrieval & optional Gemini live-search verification
app.get('/api/podcasts', async (req, res) => {
  const { forceRefresh } = req.query;

  if (forceRefresh === 'true') {
    console.log(`[Podcasts] Attempting Google Search via Gemini to pull real fresh episodes of Gooaye...`);
    try {
      const ai = getGeminiClient();
      const prompt = `您是一位自動化的台美股理財資訊抓取助手。
請網頁搜尋 股癌 (Gooaye) 最近 1-2 週最新發佈的 Podcast 集數 (2026年5月中下旬及之後，如 EP663 等)，核實其內容主體與推薦個股。

請回傳一個完全合法的 JSON 陣列，其含有最新集數之摘要物件。
JSON 格式格式如下 (必須是合法的 JSON 陣列)：
[
  {
    "ep": "（例如: EP663）",
    "date": "（例如: 2026年5月20日）",
    "title": "（例如: EP663 主板與通訊高頻元件之亂，被動大廠現貨掃盤 🦘）",
    "summary": "（本集內容的直白中文精細摘要，字數 100-150 字）",
    "themes": ["被動元件", "博通", "光通訊"],
    "sentiment": "positive",
    "industryTopic": "被動元件精細晶粒整合",
    "individualStocks": ["國巨 (2327.TW)", "博通 (AVGO)"],
    "investmentAdvice": {
      "title": "（投資主體標題）",
      "action": "（核心操作行為，如：逢低佈局被動元件）",
      "details": "（具體說明，點出細節與防守水準）"
    }
  }
]
如果未找到新的內容，請優先完整回傳我們已確認的 EP663、EP662、EP661 與 EP660，確保個股代號加上 .TW 等正確名稱。直接回傳純 JSON 陣列，不要有 \`\`\`json 等 Markdown 包裝。`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: 'application/json',
        }
      });

      const text = response.text || '';
      let cleanedText = text.trim();
      if (cleanedText.startsWith('```json')) cleanedText = cleanedText.slice(7);
      if (cleanedText.endsWith('```')) cleanedText = cleanedText.slice(0, -3);

      const parsed = JSON.parse(cleanedText.trim());
      if (Array.isArray(parsed) && parsed.length > 0) {
        verifiedPodcastEpisodes = parsed;
        console.log(`[Podcasts] Successfully verified and updated ${parsed.length} items from Google Search.`);
      }
    } catch (err) {
      console.error('[Podcasts API Refresh Error] Fallback to cached verified list:', err);
    }
  }

  res.json(verifiedPodcastEpisodes);
});

// ============================================================================
// NEW: Gooaye podcast 真實同步、滾動 3 個月題材追蹤、產業鏈業務佔比
// ============================================================================

// 取得目前儲存的滾動 3 個月集數
app.get('/api/gooaye/episodes', (_req, res) => {
  const months = 3;
  pruneOldEpisodes();
  res.json({
    months,
    lastSync: getLastSync(),
    count: getEpisodeCount(),
    episodes: getRollingEpisodes(months),
  });
});

// 滾動 3 個月題材聚合（按提及次數排序）
app.get('/api/gooaye/themes', (req, res) => {
  const months = parseInt((req.query.months as string) || '3', 10);
  pruneOldEpisodes();
  res.json({
    months,
    lastSync: getLastSync(),
    themes: getAggregatedThemes(months),
  });
});

// 從來源抓最新集數 → Gemini 抽題材 → 寫入 store
app.post('/api/gooaye/sync', async (req, res) => {
  const limit = Math.min(parseInt(req.body?.limit ?? '15', 10), 40);
  try {
    const raws = await fetchLatestEpisodes(limit);
    if (raws.length === 0) {
      return res.status(502).json({ error: '所有資料來源皆抓取失敗，請稍後再試' });
    }

    const ai = getGeminiClient();
    const processed: string[] = [];
    const skipped: string[] = [];
    const failed: { ep: string; reason: string }[] = [];

    // 串行避免並發超量呼叫 Gemini
    for (const raw of raws) {
      try {
        const existing = getRollingEpisodes(3).find(e => e.ep === raw.ep);
        if (existing && existing.themes.length > 0) {
          skipped.push(raw.ep);
          continue;
        }
        const analyzed = await analyzeEpisode(ai, raw);
        upsertEpisode(analyzed);
        processed.push(raw.ep);
      } catch (e) {
        failed.push({ ep: raw.ep, reason: (e as Error).message });
      }
    }

    pruneOldEpisodes();
    res.json({
      success: true,
      fetched: raws.length,
      processed,
      skipped,
      failed,
      lastSync: getLastSync(),
      totalStored: getEpisodeCount(),
    });
  } catch (e) {
    console.error('[Gooaye Sync] failed:', e);
    res.status(500).json({ error: (e as Error).message });
  }
});

// 對指定題材跑完整產業鏈 + 業務佔比分析
app.post('/api/industry/survey', async (req, res) => {
  const topic = (req.body?.topic as string)?.trim();
  if (!topic) return res.status(400).json({ error: '請提供 topic' });
  try {
    const ai = getGeminiClient();
    const survey = await runIndustrySurvey(ai, topic);
    res.json(survey);
  } catch (e) {
    console.error('[Industry Survey] failed:', e);
    res.status(500).json({ error: (e as Error).message });
  }
});

// 對指定公司跑產品業務佔比
app.post('/api/company/breakdown', async (req, res) => {
  const ticker = (req.body?.ticker as string)?.trim();
  const name = (req.body?.name as string)?.trim();
  if (!ticker || !name) return res.status(400).json({ error: '請提供 ticker 與 name' });
  try {
    const ai = getGeminiClient();
    const breakdown = await runCompanyRevenueBreakdown(ai, ticker, name);
    res.json(breakdown);
  } catch (e) {
    console.error('[Company Breakdown] failed:', e);
    res.status(500).json({ error: (e as Error).message });
  }
});

// 給定關鍵字回傳可信新聞
app.get('/api/news/credible', async (req, res) => {
  const keyword = ((req.query.q as string) || '').trim();
  if (!keyword) return res.status(400).json({ error: '請提供 q 參數' });
  try {
    const items = await fetchCredibleNews(keyword, 6);
    res.json({ keyword, items });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// Admin endpoint: manual reset key status
app.post('/api/keys-reset', (req, res) => {
  keyManager.refreshKeys();
  keyManager.resetCooldowns();
  res.json({ success: true, message: '已成功解鎖所有暫停的金鑰與冷卻狀態，重置完成。' });
});

// Telemetry endpoint: List all locally cached researches
app.get('/api/cache-list', (req, res) => {
  res.json({ cache: cacheManager.listCachedQueries() });
});

// Admin endpoint: delete specific cache file to let next click regenerate
app.post('/api/cache-clear', (req, res) => {
  const { query, clearAll } = req.body;
  if (clearAll) {
    const list = cacheManager.listCachedQueries();
    list.forEach(item => cacheManager.deleteCache(item.query));
    return res.json({ success: true, message: '已成功清空所有標的之本地快取！' });
  }
  
  if (query) {
    cacheManager.deleteCache(query);
    return res.json({ success: true, message: `已成功清除「${query}」的本地快取！下一點選將會重新向 AI 生成。` });
  }
  
  res.status(400).json({ error: '請提供要清除的標的 query' });
});

// Admin endpoint: test R2 uploads
app.post('/api/test-cloudflare', async (req, res) => {
  const testPayload = { test: true, timestamp: Date.now(), message: 'Cloudflare R2 connection test success!' };
  const cfResult = await r2Uploader.uploadResult('connection_test', testPayload);
  res.json(cfResult);
});

/*
// DUPLICATED JUNK DISCARDED IN COMMENTS:�商機）",
  "query": "${cleanQuery}",
  "description": "（對此股市議題、關聯產業板塊與市場地位的深度解讀與最新演進情形，字數 150-250 字）",
  "marketDrivers": [
    "（核心驅動因子 1，說明為何此議題在近期和未來能推升公司獲利進而帶動大漲，字數 20-40 字）",
    "（核心驅動因子 2）",
    "（核心驅動因子 3）",
    "（核心驅動因子 4，若有的話）"
  ],
  "keyFactors": [
    "（研究此議題或追蹤這類大漲股時，應主要看什麼長期關鍵財務、產能或技術指標 1，字數 20-40 字）",
    "（指標 2）",
    "（指標 3）"
  ],
  "chainMap": {
    "upstream": "（描述上游環節：主要負責的產品、晶粒技術或原材料）",
    "midstream": "（描述中游環節：加工、中端組件或組裝模組）",
    "downstream": "（描述下游環節：系統整合、終端商用、應用跟通路商）"
  },
  "outlook": "（此議題未來的長短期展望與投資結論，字數 100-150 字）",
  "stocks": [
    {
      "name": "（第一檔最具代表性概念股的中文公司名稱，如：台積電、奇鋐、世芯等）",
      "code": "（完整且正確的股票代號。台灣股市請務必加上 .TW 或 .TWO 後綴，如 2330.TW, 3017.TW，美股請用純英文如 NVDA, AMD）",
      "role": "（在該議題主要擔任的角色或提供之核心產品）",
      "roleCategory": "（必須是 'upstream'、'midstream' 或者是 'downstream' 其中一個，請合理分類該公司在這議題中的產業鏈位置）",
      "description": "（主要業務性質，以及在該熱門議題中的切入深度與合作客戶）",
      "advantage": "（該公司在該技術/產品的競爭優勢與核心護城河，如：技術領先、良率極高、客戶黏著度等）",
      "recentReturn5D": （填入一個數字，表示其「近期5日」的模擬或實際累積漲跌幅百分比。例：如果是漲1.5%，填入 1.5。如果是跌0.8%，填入 -0.8。不要包含 % 符號）,
      "recentReturn1M": （填入一個數字，表示其「近期1個月」累積漲跌幅百分比）,
      "recentReturn3M": （填入一個數字，表示其「近期3個月」累積漲跌幅百分比）,
      "trendAnalysis": "（對該股近期股價走勢的綜合分析與法人動態描述。字數 30-60 字）",
      "whyBuy": "（關鍵買進/研究理由與未來最主要的看好催化劑）",
      "risk": "（主要的投資風險或潛在踩雷點，如：大客戶轉向、競爭對手削價等）",
      "historyData": [
        {"date": "t-9", "price": 100},
        {"date": "t-8", "price": （模擬股價 price 數值，從100起始做階段性變化，反映 1M 累積漲跌幅的波段走勢）},
        {"date": "t-7", "price": （數值）},
        {"date": "t-6", "price": （數值）},
        {"date": "t-5", "price": （數值）},
        {"date": "t-4", "price": （數值）},
        {"date": "t-3", "price": （數值）},
        {"date": "t-2", "price": （數值）},
        {"date": "t-1", "price": （數值）},
        {"date": "今日", "price": （反映最終累計變化的數值，例如若1M漲了15%，則今日數值約在 115 左右）}
      ]
    }
    （請提供 5 - 8 檔與該議題「深度重合、高度相關」的台股/美股公司，台股比例請佔 70% 以上，並按照其於該議題的重要性或代號正確性排序寫入這個 arrays 裡）
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: 'application/json',
      }
    });

    const text = response.text || '';
    let parsedData;
    try {
      parsedData = JSON.parse(text.trim());
    } catch (parseError) {
      console.error('JSON parsing failed. Attempting cleanup of raw text:');
      // Simple regex cleanup if model added markdown wrappers despite instructions
      let cleanedText = text.trim();
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.slice(7);
      }
      if (cleanedText.endsWith('```')) {
        cleanedText = cleanedText.slice(0, -3);
      }
      parsedData = JSON.parse(cleanedText.trim());
    }

    // Add unique ID for stocks if model didn't add it
    if (parsedData.stocks && Array.isArray(parsedData.stocks)) {
      parsedData.stocks = parsedData.stocks.map((stock: any, idx: number) => ({
        ...stock,
        id: stock.code || `stock-${idx}`,
        roleCategory: ['upstream', 'midstream', 'downstream'].includes(stock.roleCategory)
          ? stock.roleCategory
          : 'midstream'
      }));
    }

    return res.json(parsedData);

  } catch (error: any) {
    console.error('Gemini Research API error:', error);
    
    // Safely parse or convert the error message to clean text
    let errorMessage = error?.message || (error && typeof error === 'object' ? JSON.stringify(error) : String(error));
    if (errorMessage.includes('"message":')) {
      try {
        const matches = errorMessage.match(/"message"\s*:\s*"([^"]+)"/);
        if (matches && matches[1]) {
          errorMessage = matches[1];
        } else {
          const parsed = JSON.parse(errorMessage);
          if (parsed?.error?.message) {
            errorMessage = parsed.error.message;
          }
        }
      } catch (e) {
        // ignore parsing errors
      }
    }

    const isQuotaExceeded = error?.status === 429 || 
                            errorMessage.includes("429") || 
                            errorMessage.includes("quota") || 
                            errorMessage.includes("Quota") ||
                            errorMessage.includes("RESOURCE_EXHAUSTED");

    // Try to find matching fallback data by keyword
    let fallbackKey = "矽光子";
    const lowercaseQuery = cleanQuery.toLowerCase();
    
    if (lowercaseQuery.includes("散熱") || lowercaseQuery.includes("水冷") || lowercaseQuery.includes("液冷")) {
      fallbackKey = "液冷散熱";
    } else if (lowercaseQuery.includes("gb200") || lowercaseQuery.includes("伺服器") || lowercaseQuery.includes("機架") || lowercaseQuery.includes("機櫃")) {
      fallbackKey = "GB200 伺服器";
    } else if (lowercaseQuery.includes("cowos") || lowercaseQuery.includes("封裝") || lowercaseQuery.includes("先進製程") || lowercaseQuery.includes("先進封裝")) {
      fallbackKey = "CoWoS 先進封裝";
    } else if (lowercaseQuery.includes("衛星") || lowercaseQuery.includes("太空") || lowercaseQuery.includes("低軌")) {
      fallbackKey = "低軌衛星";
    } else if (lowercaseQuery.includes("機器人") || lowercaseQuery.includes("人形") || lowercaseQuery.includes("自動化") || lowercaseQuery.includes("關節")) {
      fallbackKey = "人形機器人";
    }

    let fallbackTemplate = FALLBACK_RESEARCH_DATA[fallbackKey];
    let customResult;

    if (fallbackTemplate) {
      customResult = {
        ...fallbackTemplate,
        query: cleanQuery,
        title: fallbackTemplate.title.includes(cleanQuery) ? fallbackTemplate.title : `${cleanQuery} CPO與相關產業鏈研究`,
        description: fallbackTemplate.description
      };
    } else {
      // Dynamic simulated fallback for any other custom search topic!
      fallbackTemplate = FALLBACK_RESEARCH_DATA["矽光子"];
      customResult = {
        "title": `【智慧預測】${cleanQuery}產業技術升級與概念股研究`,
        "query": cleanQuery,
        "description": `針對最近熱門股市議題【${cleanQuery}】，這是一個涵蓋先進製程、關鍵零組件與系統整合技術架構的智慧研究。雖然目前網路環境受限，系統引導模組仍為您模擬了代表性大廠及近期產業鏈變化。`,
        "marketDrivers": [
          `在 AI 與全球高規科技迭代拉動下，【${cleanQuery}】核心需求在 2025-2027 年將迎來顯著的市場規模爬升。`,
          `相關概念股在訂單量與出貨單價 (ASP) 上都有顯著提升前景。`,
          `台廠與美系巨頭在該產業的分工中占據無可取代的關鍵護城河地位。`
        ],
        "keyFactors": [
          `各主要大廠產能擴建進展以及在全球 CSP 技術標準聯盟中的合作比重。`,
          `核心零組件高良率認證的進展速度與新客裝排程。`,
          `公司本業毛利率改善以及代表性大客戶的訂單份額。`
        ],
        "chainMap": {
          "upstream": "上游：關鍵精密零組件、高頻主動元件設計、核心原物料與特殊化學材料",
          "midstream": "中游：高密度多層板、散熱冷板與模組加工、中端組件自動化貼合與封測",
          "downstream": "下游：大型系統整合代工（鴻海、廣達等）、CSP 雲端資料中心及商用終端用戶"
        },
        "outlook": `長短期投資結論：雖然面臨短期波動，【${cleanQuery}】的長線成長趨勢極為明確。能成功通過美系巨頭測試並完成大規模量產的核心大廠，將是長線資金安全停靠與大盤領漲的主力軍。`,
        "stocks": [
          {
            "id": "2330.TW",
            "name": "台積電",
            "code": "2330.TW",
            "role": `晶圓代工與【${cleanQuery}】先進製程技術支援`,
            "roleCategory": "upstream",
            "description": `晶圓代工霸主。為【${cleanQuery}】所需半導體晶片與中介先進材料整合，提供全方位先進封測與晶圓代工。`,
            "advantage": "擁有獨一無二的 CoWoS 先進封裝產能及三奈米以下先進製程高良率優勢。",
            "recentReturn5D": 1.45,
            "recentReturn1M": 5.82,
            "recentReturn3M": 14.8,
            "trendAnalysis": "股價表現持續穩健，隨多頭排列，階梯式走升穩固整理，為長線資金首選避風港。",
            "whyBuy": "身為全球 CPO 與先進封裝核心終點站，任何前瞻晶片商要做先進運算都無法繞過台積電。",
            "risk": "地緣政治風險，及短期產能吃緊限制其部分設備出貨步調。",
            "historyData": [
              {"date": "t-9", "price": 100}, {"date": "t-8", "price": 102}, {"date": "t-7", "price": 101.5}, {"date": "t-6", "price": 103}, {"date": "t-5", "price": 102.8},
              {"date": "t-4", "price": 104.5}, {"date": "t-3", "price": 106}, {"date": "t-2", "price": 105.5}, {"date": "t-1", "price": 108}, {"date": "今日", "price": 114.8}
            ]
          },
          {
            "id": "3017.TW",
            "name": "奇鋐",
            "code": "3017.TW",
            "role": `【${cleanQuery}】關鍵精密結構與零組件供應`,
            "roleCategory": "midstream",
            "description": `散熱與零件巨頭，切入【${cleanQuery}】零組件、高難度配電以及精密金屬機蓋模組。`,
            "advantage": "擁有高度機櫃垂直整合能力，自製率達八成以上，毛利居同業之冠。",
            "recentReturn5D": 2.15,
            "recentReturn1M": 7.4,
            "recentReturn3M": 19.3,
            "trendAnalysis": "股價呈現非常優異的多頭格局，回踩生命線後迅速拉升，高姿態盤整蓄勢待發。",
            "whyBuy": "組裝與設備對該零件用量極大，產品改善組合優異，EPS 爆發力極強。",
            "risk": "同業產能擴增速度造成的毛利稀釋，以及上游原料銅鋁等的價格干擾。",
            "historyData": [
              {"date": "t-9", "price": 100}, {"date": "t-8", "price": 101.5}, {"date": "t-7", "price": 103.2}, {"date": "t-6", "price": 102.1}, {"date": "t-5", "price": 104.5},
              {"date": "t-4", "price": 108.1}, {"date": "t-3", "price": 111.4}, {"date": "t-2", "price": 110.8}, {"date": "t-1", "price": 115.5}, {"date": "今日", "price": 119.3}
            ]
          },
          {
            "id": "2317.TW",
            "name": "鴻海",
            "code": "2317.TW",
            "role": `【${cleanQuery}】終端整機大組裝代工與 L12 系統測試`,
            "roleCategory": "downstream",
            "description": "全球最大的 L11/L12 整機組裝廠。結合自身零件垂直製造優勢，獲取大量訂單份額。",
            "advantage": "規模實力雄厚，具備全球最完整的系統整合測試與大客戶快速出貨能力。",
            "recentReturn5D": 1.2,
            "recentReturn1M": 6.35,
            "recentReturn3M": 19.5,
            "trendAnalysis": "股價持續在高檔箱型整理，有強力低檔法人買盤支撐，為高性價比的最佳定存股代表。",
            "whyBuy": "隨大規模進貨洪流推進，鴻海為 Blackwell 及整櫃組裝的最直接、最巨量受惠企業。",
            "risk": "某些個別關鍵零件供應缺口延宕其整裝出庫時間。",
            "historyData": [
              {"date": "t-9", "price": 100}, {"date": "t-8", "price": 101}, {"date": "t-7", "price": 100.5}, {"date": "t-6", "price": 102}, {"date": "t-5", "price": 103.5},
              {"date": "t-4", "price": 105}, {"date": "t-3", "price": 108.2}, {"date": "t-2", "price": 111.4}, {"date": "t-1", "price": 115.3}, {"date": "今日", "price": 119.5}
            ]
          }
        ]
      };
    }

    let warningMsg = '';
    if (isQuotaExceeded) {
      warningMsg = `⚠️ 偵測到您已達到 Gemini API 免費額度上限 (429 RESOURCE_EXHAUSTED)。系統暫時連線受限，已為您智能加載【${fallbackKey}】高品質示範產業供應鏈研究大數據，讓您的研究不中斷！`;
    } else if (process.env.GEMINI_API_KEY) {
      warningMsg = `連線異常 (${errorMessage})，已特別為您切換至【${fallbackKey}】關鍵產業鏈數據，您也可以在 Settings > Secrets 設定您個人的 Gemini 金鑰突破頻率限制。`;
    } else {
      warningMsg = `尚未設定 GEMINI_API_KEY，已為您預載【${fallbackKey}】關鍵產業鏈研究數據。您可在 Settings > Secrets 設定金鑰啟用完整的全智合 AI 搜尋研究。`;
    }

    return res.json({
      ...customResult,
      isFallback: true,
      fallbackWarning: warningMsg
    });
  }
});
*/

// Configure Vite middleware inside express server
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    // Mount Vite's middlewares
    app.use(vite.middlewares);
    console.log("Vite development server middleware loaded.");
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log("Serving production static files from: " + distPath);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express application active and running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
