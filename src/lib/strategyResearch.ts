// ============================================================================
// Strategy Research — 免費版「策略清單」研究來源 (keepable / portable)
// ----------------------------------------------------------------------------
// 分層設計：
//   - 免費版：題材 → 個股用「策定的對照清單」(這支)，完全不碰 Gemini / Google Search
//   - 付費版：才解鎖 Gemini 即時研究（在 server.ts，需 GEMINI_API_KEY）
//
// 清單來源沿用 src/data/fallbackResearch.ts 那 7 個策定題材
// （矽光子 / 液冷散熱 / GB200 / CoWoS / 低軌衛星 / 人形機器人 / ASIC IP）。
// 它們原本只被當「fallback」，現在升格成免費版的主要來源。
//
// 重要：這裡只負責「選股 + 敘事」，所有數字 (price / 報酬 / 走勢) 一律留 null，
// 由上層用 marketData (Yahoo) 覆蓋成真實值。捏造數字不從這裡出去。
// ============================================================================

import { FALLBACK_RESEARCH_DATA } from '../data/fallbackResearch';

export interface StrategyMatch {
  matched: boolean;
  themeKey: string | null;     // 對到的策略題材；沒對到為 null
  reason: 'exact' | 'keyword' | 'none';
  data: any | null;            // TopicResearchResult 形狀（數字已清成 null，待行情覆蓋）
}

// query 關鍵字 → 策略題材。順序有意義：較專指的擺前面，「矽光子」當最後的廣義收口。
const KEYWORD_RULES: { key: string; patterns: string[] }[] = [
  { key: '液冷散熱', patterns: ['散熱', '水冷', '液冷', 'cooling'] },
  { key: 'GB200 伺服器', patterns: ['gb200', 'gb300', '伺服器', '機架', '機櫃', 'server'] },
  { key: 'CoWoS 先進封裝', patterns: ['cowos', '封裝', '先進製程', '先進封裝', 'soic'] },
  { key: '低軌衛星', patterns: ['衛星', '太空', '低軌', 'leo', 'satellite'] },
  { key: '人形機器人', patterns: ['機器人', '人形', '自動化', '關節', 'robot'] },
  { key: 'ASIC IP 設計', patterns: ['asic', 'ip', '客製化晶片', '特殊應用'] },
  { key: '矽光子', patterns: ['矽光子', '光通訊', 'cpo', '光收發', '光學', 'photonic'] },
];

export function listStrategyThemes(): string[] {
  return Object.keys(FALLBACK_RESEARCH_DATA);
}

/** 把策略題材的數字欄位清成 null（真實數字交給 marketData 覆蓋），保留選股 + 敘事。 */
function stripFabricatedNumbers(themeKey: string, query: string) {
  const tpl = FALLBACK_RESEARCH_DATA[themeKey];
  const stocks = (tpl.stocks || []).map((s: any) => ({
    ...s,
    recentReturn5D: null,
    recentReturn1M: null,
    recentReturn3M: null,
    historyData: [],
  }));
  return { ...tpl, query, stocks, source: 'strategy-list', themeKey };
}

/**
 * 免費版選股：把查詢字串對到策略清單裡的題材。
 * 對不到 → matched:false（免費版未收錄，交由上層提示「升級可用 AI 研究」）。
 */
export function matchStrategyTopic(query: string): StrategyMatch {
  const q = query.trim().toLowerCase();
  if (!q) return { matched: false, themeKey: null, reason: 'none', data: null };

  // 1) 直接命中策略題材名稱
  for (const key of Object.keys(FALLBACK_RESEARCH_DATA)) {
    const k = key.toLowerCase();
    if (k === q || q.includes(k) || k.includes(q)) {
      return { matched: true, themeKey: key, reason: 'exact', data: stripFabricatedNumbers(key, query) };
    }
  }
  // 2) 關鍵字規則
  for (const rule of KEYWORD_RULES) {
    if (rule.patterns.some((p) => q.includes(p))) {
      return { matched: true, themeKey: rule.key, reason: 'keyword', data: stripFabricatedNumbers(rule.key, query) };
    }
  }
  return { matched: false, themeKey: null, reason: 'none', data: null };
}
