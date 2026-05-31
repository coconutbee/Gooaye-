import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { keyManager, cacheManager, r2Uploader } from './server_utils';
import { geminiJson } from './src/lib/geminiClient';
import { fetchQuotes } from './src/lib/marketData';
import { matchStrategyTopic } from './src/lib/strategyResearch';
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

// 所有 Gemini「要 JSON」呼叫都走 src/lib/geminiClient 的 geminiJson()，
// 內含多金鑰輪替 + 重試（取代原本散落各處的手刻 client 與 rotation 迴圈）。

// ----------------------------------------------------------------------------
// 用真實行情覆蓋 LLM 捏造的數字。
//   - LLM 只負責選股 + 敘事（name/code/role/description/whyBuy/risk…）
//   - 股價 / 5日·1月·3月報酬 / historyData 一律改由 Yahoo 真實數據覆蓋
//   - 查無行情：數字留 null + marketDataOk=false，不回退假數字
// 每次回應（含 cache hit）都會重新覆蓋，所以行情永遠是最新的。
// ----------------------------------------------------------------------------
async function enrichStocksWithMarketData(stocks: any[]): Promise<any[]> {
  if (!Array.isArray(stocks) || stocks.length === 0) return stocks;
  const codes = stocks.map((s) => s?.code).filter(Boolean);
  const quotes = await fetchQuotes(codes);
  return stocks.map((s) => {
    const q = quotes[s?.code];
    if (q && q.ok) {
      return {
        ...s,
        ticker: q.ticker,              // resolver 校正後的 symbol（.TW / .TWO）
        price: q.price,
        currency: q.currency,
        asOf: q.asOf,
        recentReturn5D: q.returns.d5,
        recentReturn1M: q.returns.m1,
        recentReturn3M: q.returns.m3,
        historyData: q.history,
        marketDataOk: true,
      };
    }
    return {
      ...s,
      price: null,
      currency: null,
      asOf: null,
      recentReturn5D: null,
      recentReturn1M: null,
      recentReturn3M: null,
      historyData: [],
      marketDataOk: false,
      marketDataError: q?.error ?? '查無行情',
    };
  });
}


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
      // 敘事用快取，行情即時覆蓋（避免顯示 7 天前的舊價）
      const stocks = await enrichStocksWithMarketData(cached.data.stocks);
      return res.json({
        ...cached.data,
        stocks,
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

  let parsedData: any = null;
  let errorToThrow: any = null;
  let activeKeyMasked = '';

  // ---- Tier 判定：設了 GEMINI_API_KEY 才解鎖付費版 Gemini 即時研究 ----
  const hasGeminiKey = !!(process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY);

  // 付費版：Gemini + Google Search 選股 + 敘事。
  // 免費版完全跳過這段，所以不會卡在 Google Search grounding。
  if (hasGeminiKey) {
    // 多金鑰輪替 + 重試 + JSON 解析全部收斂在 geminiJson 內
    try {
      parsedData = await geminiJson(prompt, {
        search: true,
        onKeyUsed: (masked) => { activeKeyMasked = masked; },
      });
      console.log(`[Gemini Success!] Generated research for "${cleanQuery}" via key ${activeKeyMasked}`);
    } catch (apiError: any) {
      errorToThrow = apiError;
      console.error(`[Gemini Failed] research for "${cleanQuery}":`, apiError?.message || apiError);
    }
  } else {
    console.log(`[Free Tier] 無 GEMINI_API_KEY → 走策略清單，不呼叫 Gemini / Google Search。`);
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
      // 用真實行情覆蓋 LLM 捏造的股價 / 報酬 / 走勢
      parsedData.stocks = await enrichStocksWithMarketData(parsedData.stocks);
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

  // ============================================================
  // 免費版主路徑 / 付費版 Gemini 失敗時的退路：策略清單選股 + 真實行情
  // 不呼叫 Gemini，所以不會卡在 Google Search。
  // ============================================================
  const strat = matchStrategyTopic(cleanQuery);
  let customResult: any;

  if (strat.matched) {
    // 對到策略題材 → 選股 + 敘事來自策略清單（數字已清 null，稍後用 Yahoo 覆蓋）
    console.log(`[Strategy List] "${cleanQuery}" → 「${strat.themeKey}」(${strat.reason})`);
    customResult = { ...strat.data };
  } else {
    // 免費版未收錄此題材 → 通用示範模板（仍接真實行情）
    console.log(`[Strategy List] "${cleanQuery}" 未收錄 → 通用示範模板`);
    customResult = {
      "title": `${cleanQuery}產業鏈與概念股研究（通用示範）`,
      "query": cleanQuery,
      "description": `針對【${cleanQuery}】整理出涵蓋上中下游的代表性概念股與即時行情。此題材尚未納入策略清單精選，以下為通用示範標的；升級可使用 AI 即時深度研究。`,
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

  // 警示訊息：免費版未收錄，或付費版 Gemini 失敗退回策略清單
  let warningMsg = '';
  if (!strat.matched) {
    warningMsg = `「${cleanQuery}」目前未納入免費版策略清單，已為您顯示通用示範標的與即時行情。升級可解鎖 AI 即時研究。`;
  } else if (hasGeminiKey && errorToThrow) {
    const errMessage = errorToThrow?.message || String(errorToThrow || '未知連線錯誤');
    const isQuota = /RESOURCE_EXHAUSTED|429|quota/i.test(errMessage);
    warningMsg = isQuota
      ? `⚠️ Gemini 額度暫時用盡，已退回策略清單「${strat.themeKey}」＋即時行情。`
      : `⚠️ Gemini 暫時不可用（${errMessage}），已退回策略清單「${strat.themeKey}」＋即時行情。`;
  }

  // 用真實行情覆蓋數字（免費版核心：策略清單選股、Yahoo 出數字）
  customResult.stocks = await enrichStocksWithMarketData(customResult.stocks);

  return res.json({
    ...customResult,
    source: strat.matched ? 'strategy-list' : 'generic',
    notCovered: !strat.matched,
    isFallback: !strat.matched || (hasGeminiKey && !!errorToThrow),
    fallbackWarning: warningMsg || undefined,
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

      const parsed = await geminiJson<any[]>(prompt, { search: true });
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
        const analyzed = await analyzeEpisode(raw);
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
    const survey = await runIndustrySurvey(topic);
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
    const breakdown = await runCompanyRevenueBreakdown(ticker, name);
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
