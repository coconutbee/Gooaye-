// ============================================================================
// Episode Analyzer — 把原始集數（標題 + shownotes / 逐字稿）餵給 Gemini
// 抽出結構化題材、情緒、相關個股、投資建議
// ============================================================================

import { RawEpisode } from './gooayeFetcher';
import { ThemeEpisodeRecord } from './themeStore';
import { geminiJson } from './geminiClient';

const SYSTEM_PROMPT = `您是一位專業的台股題材分析助手。請從下方股癌 Podcast 集數的內容中，抽出結構化資訊。
務必直接回傳 JSON 物件，不要加任何說明、markdown 包裝。`;

export async function analyzeEpisode(
  raw: RawEpisode
): Promise<ThemeEpisodeRecord> {
  // 截斷過長 shownotes，避免 token 爆掉
  const content = raw.shownotes.length > 6000
    ? raw.shownotes.slice(0, 6000)
    : raw.shownotes;

  const prompt = `${SYSTEM_PROMPT}

集數編號：${raw.ep}
發佈時間：${raw.publishedAt}
原始標題：${raw.title}
原始內容（可能為 shownotes 或逐字稿節錄）：
"""
${content}
"""

請回傳 JSON：
{
  "summary": "（100-150 字本集精細摘要，必須具體點名提到的事件與題材）",
  "themes": ["（產業 / 題材關鍵詞，4-8 個，例：被動元件 / 矽光子 / 液冷散熱）"],
  "individualStocks": ["（個股名 + 代號，例：國巨 (2327.TW)、博通 (AVGO)，5-12 檔）"],
  "sentiment": "positive | observation | neutral | negative",
  "investmentAdvice": {
    "title": "（短標題）",
    "action": "（核心建議行為）",
    "details": "（80-150 字，分點清楚）"
  }
}`;

  const parsed = await geminiJson<any>(prompt);

  return {
    ep: raw.ep,
    episodeNumber: raw.episodeNumber,
    date: raw.publishedAt,
    title: raw.title,
    summary: parsed.summary || '',
    themes: Array.isArray(parsed.themes) ? parsed.themes : [],
    individualStocks: Array.isArray(parsed.individualStocks) ? parsed.individualStocks : [],
    sentiment: parsed.sentiment || 'neutral',
    investmentAdvice: parsed.investmentAdvice,
    sourceUrl: raw.sourceUrl,
  };
}
