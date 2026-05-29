// ============================================================================
// Industry Chain & Revenue Breakdown Analyzer
// ----------------------------------------------------------------------------
// 給定一個題材 / 公司，用 Gemini + 可信新聞，產出：
//   1. 產業鏈結構 (upstream / midstream / downstream)
//   2. 主流產品 (現行最熱銷的應用 / 規格)
//   3. 每間公司的產品業務佔比（搭配新聞來源）
//
// 設計重點：
//   - 把抓到的「新聞標題清單」當作 grounding 餵給 LLM，讓模型輸出可追溯
//   - LLM 必須在每個百分比後面附上引用編號 [1] [2]，回傳結構附對照表
// ============================================================================

import { GoogleGenAI } from '@google/genai';
import { fetchCredibleNews, NewsItem } from './newsFetcher';

export interface ProductMix {
  product: string;
  share: number;            // 0-100
  description: string;
  citationIds: number[];
}

export interface CompanyBreakdown {
  ticker: string;
  name: string;
  role: 'upstream' | 'midstream' | 'downstream' | 'other';
  mainstreamProduct: string;
  productMix: ProductMix[];
  confidence: 'high' | 'medium' | 'low';
  notes: string;
}

export interface IndustrySurvey {
  topic: string;
  summary: string;
  mainstreamProductTrend: string;
  chain: {
    upstream: { description: string; players: string[] };
    midstream: { description: string; players: string[] };
    downstream: { description: string; players: string[] };
  };
  companies: CompanyBreakdown[];
  citations: { id: number; title: string; url: string; source: string }[];
  generatedAt: string;
}

export async function runIndustrySurvey(
  ai: GoogleGenAI,
  topic: string
): Promise<IndustrySurvey> {
  // 1. 先抓可信新聞（共 ~12 則）
  const news = await fetchCredibleNews(topic, 8);
  const citations = news.slice(0, 12).map((n, i) => ({
    id: i + 1,
    title: n.title,
    url: n.url,
    source: n.source,
  }));

  // 2. 組 prompt：要求 LLM 依新聞清單推估產業鏈與佔比
  const citationBlock = citations
    .map(c => `[${c.id}] ${c.title} (${c.source} — ${c.url})`)
    .join('\n');

  const prompt = `您是一位資深台股產業分析師。請針對下列題材，產出完整的產業鏈與相關企業業務佔比分析。

題材：${topic}

可參考新聞（請優先依此推論，並在輸出中標註引用編號）：
${citationBlock || '（暫無外部新聞，請依公開資訊推估，並把 confidence 標 medium 或 low）'}

請以「合法 JSON 物件」回傳，結構如下：
{
  "topic": "${topic}",
  "summary": "（80-150 字產業總結，標註本題材近期的關鍵驅動）",
  "mainstreamProductTrend": "（明確指出目前產業內「主流產品」是什麼規格 / 世代 / 應用，例如『1.6T 矽光子收發器』、『液冷快接頭分流歧管』，80-120 字）",
  "chain": {
    "upstream": { "description": "（上游做什麼）", "players": ["公司A (代號)", "..."] },
    "midstream": { "description": "（中游做什麼）", "players": ["..."] },
    "downstream": { "description": "（下游做什麼）", "players": ["..."] }
  },
  "companies": [
    {
      "ticker": "（如 2327.TW 或 AVGO）",
      "name": "（公司中文名）",
      "role": "upstream | midstream | downstream | other",
      "mainstreamProduct": "（該公司在本題材中的主力產品，一句話）",
      "productMix": [
        {
          "product": "（產品線名稱）",
          "share": 45,
          "description": "（業務說明 20-50 字）",
          "citationIds": [1, 3]
        }
      ],
      "confidence": "high | medium | low",
      "notes": "（投資人需注意的補充，如近期法說會說了什麼）"
    }
  ]
}

注意事項：
1. 至少列出 5-8 間相關公司，並涵蓋上中下游。
2. productMix 加總應為 100，可有 3-5 條產品線。
3. 每條 productMix 必須有 citationIds（即使是 []，也要解釋 confidence 為 medium / low）。
4. 直接回傳 JSON 物件，不要 markdown 包裝、不要任何說明文字。`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.5-flash',
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: 'application/json',
    },
  });

  let text = (response.text || '').trim();
  if (text.startsWith('```json')) text = text.slice(7);
  if (text.startsWith('```')) text = text.slice(3);
  if (text.endsWith('```')) text = text.slice(0, -3);

  const parsed = JSON.parse(text.trim());

  return {
    ...parsed,
    citations,
    generatedAt: new Date().toISOString(),
  } as IndustrySurvey;
}

// ---------- 單公司產品佔比（更輕量） ----------
export async function runCompanyRevenueBreakdown(
  ai: GoogleGenAI,
  ticker: string,
  companyName: string
): Promise<CompanyBreakdown & { citations: IndustrySurvey['citations'] }> {
  const keyword = `${companyName} 營收 產品比重`;
  const news = await fetchCredibleNews(keyword, 6);
  const citations = news.slice(0, 10).map((n, i) => ({
    id: i + 1,
    title: n.title,
    url: n.url,
    source: n.source,
  }));

  const citationBlock = citations
    .map(c => `[${c.id}] ${c.title} (${c.source} — ${c.url})`)
    .join('\n');

  const prompt = `分析「${companyName} (${ticker})」最近一季的產品 / 業務佔比。

可參考新聞：
${citationBlock || '（暫無外部新聞，請依年報、法說會公開資訊推估）'}

回傳 JSON：
{
  "ticker": "${ticker}",
  "name": "${companyName}",
  "role": "upstream | midstream | downstream | other",
  "mainstreamProduct": "（公司目前主力產品）",
  "productMix": [
    { "product": "產品線", "share": 45, "description": "說明", "citationIds": [1] }
  ],
  "confidence": "high | medium | low",
  "notes": "（補充）"
}

要求：productMix 加總 = 100，3-5 條；可能的話請貼上實際財報 / 法說會數字。直接回傳 JSON。`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.5-flash',
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: 'application/json',
    },
  });

  let text = (response.text || '').trim();
  if (text.startsWith('```json')) text = text.slice(7);
  if (text.startsWith('```')) text = text.slice(3);
  if (text.endsWith('```')) text = text.slice(0, -3);

  const parsed = JSON.parse(text.trim());
  return { ...parsed, citations };
}
