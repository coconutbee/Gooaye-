// ============================================================================
// 市場熱力圖資料（台股 + 美股）
// ----------------------------------------------------------------------------
// 對齊「台灣股市 + 美國股市」的精選成分股快照，供 MarketHeatmap 的 treemap 使用。
//   - marketCap：相對市值，決定方塊面積大小
//   - returns：日 / 週 / 月 漲跌幅（%），決定方塊顏色深淺
// 這是一份精選的示範資料；之後若要接真實行情，只需把這裡換成 API 回傳的同型別資料。
// ============================================================================

export type HeatmapPeriod = 'day' | 'week' | 'month';
export type HeatmapMarket = 'tw' | 'us';

export interface HeatmapStock {
  name: string;
  code: string;
  sector: string;
  /** 相對市值（兆元 / 兆美元等任意一致單位），用於方塊面積 */
  marketCap: number;
  returns: Record<HeatmapPeriod, number>;
}

// ---------- 台股：跨產業權值股 ----------
export const TW_HEATMAP: HeatmapStock[] = [
  { name: '台積電', code: '2330', sector: '晶圓代工', marketCap: 28.5, returns: { day: 1.5, week: 3.2, month: 8.5 } },
  { name: '鴻海', code: '2317', sector: 'AI 伺服器', marketCap: 3.1, returns: { day: 2.1, week: 4.8, month: 11.2 } },
  { name: '聯發科', code: '2454', sector: 'IC 設計', marketCap: 2.3, returns: { day: 0.8, week: -1.2, month: 5.4 } },
  { name: '台達電', code: '2308', sector: '電源散熱', marketCap: 1.2, returns: { day: 1.1, week: 2.0, month: 7.3 } },
  { name: '廣達', code: '2382', sector: 'AI 伺服器', marketCap: 1.1, returns: { day: -1.2, week: 2.5, month: -1.4 } },
  { name: '富邦金', code: '2881', sector: '金融', marketCap: 1.3, returns: { day: 0.3, week: 0.9, month: 2.1 } },
  { name: '國泰金', code: '2882', sector: '金融', marketCap: 1.1, returns: { day: -0.4, week: 0.6, month: 1.5 } },
  { name: '中華電', code: '2412', sector: '電信', marketCap: 0.95, returns: { day: 0.1, week: -0.3, month: 0.8 } },
  { name: '聯電', code: '2303', sector: '晶圓代工', marketCap: 0.7, returns: { day: 0.9, week: 1.4, month: 3.2 } },
  { name: '日月光投控', code: '3711', sector: '封測', marketCap: 0.75, returns: { day: 1.6, week: 2.8, month: 6.1 } },
  { name: '緯創', code: '3231', sector: 'AI 伺服器', marketCap: 0.62, returns: { day: 3.0, week: 5.1, month: 9.8 } },
  { name: '緯穎', code: '6669', sector: 'AI 伺服器', marketCap: 0.55, returns: { day: 3.8, week: 9.2, month: 16.5 } },
  { name: '智邦', code: '2345', sector: '網通', marketCap: 0.5, returns: { day: 1.1, week: 4.5, month: 18.2 } },
  { name: '奇鋐', code: '3017', sector: '液冷散熱', marketCap: 0.42, returns: { day: 4.1, week: 6.8, month: 18.2 } },
  { name: '雙鴻', code: '3324', sector: '液冷散熱', marketCap: 0.21, returns: { day: 3.2, week: 5.5, month: 15.1 } },
  { name: '世芯-KY', code: '3661', sector: 'IC 設計', marketCap: 0.48, returns: { day: 3.5, week: 8.1, month: -12.5 } },
  { name: '創意', code: '3443', sector: 'IC 設計', marketCap: 0.38, returns: { day: 2.8, week: 5.2, month: 6.4 } },
  { name: '聯亞', code: '3081', sector: '矽光子', marketCap: 0.18, returns: { day: 5.5, week: 12.4, month: 28.5 } },
  { name: '國巨', code: '2327', sector: '被動元件', marketCap: 0.32, returns: { day: 2.3, week: 4.1, month: 9.7 } },
  { name: '華新科', code: '2492', sector: '被動元件', marketCap: 0.16, returns: { day: 1.9, week: 3.5, month: 8.2 } },
  { name: '欣興', code: '3037', sector: '載板 PCB', marketCap: 0.34, returns: { day: -2.3, week: -4.1, month: 2.8 } },
  { name: '大立光', code: '3008', sector: '光學', marketCap: 0.36, returns: { day: -0.8, week: 1.2, month: -3.4 } },
  { name: '長榮', code: '2603', sector: '航運', marketCap: 0.45, returns: { day: -1.5, week: -2.8, month: 4.6 } },
  { name: '台塑', code: '1301', sector: '塑化', marketCap: 0.42, returns: { day: -0.6, week: -1.1, month: -2.5 } },
];

// ---------- 美股：跨產業大型股 ----------
export const US_HEATMAP: HeatmapStock[] = [
  { name: 'Nvidia', code: 'NVDA', sector: 'Semiconductors', marketCap: 3.4, returns: { day: 2.4, week: 5.8, month: 13.2 } },
  { name: 'Apple', code: 'AAPL', sector: 'Consumer Tech', marketCap: 3.3, returns: { day: 0.6, week: 1.4, month: 4.1 } },
  { name: 'Microsoft', code: 'MSFT', sector: 'Software', marketCap: 3.1, returns: { day: 0.9, week: 2.1, month: 5.6 } },
  { name: 'Alphabet', code: 'GOOGL', sector: 'Internet', marketCap: 2.1, returns: { day: 1.2, week: 3.0, month: 7.4 } },
  { name: 'Amazon', code: 'AMZN', sector: 'Internet', marketCap: 2.0, returns: { day: -0.8, week: 1.1, month: 3.2 } },
  { name: 'Meta', code: 'META', sector: 'Internet', marketCap: 1.4, returns: { day: 1.7, week: 2.9, month: 6.8 } },
  { name: 'Broadcom', code: 'AVGO', sector: 'Semiconductors', marketCap: 1.1, returns: { day: 2.9, week: 6.4, month: 15.1 } },
  { name: 'Tesla', code: 'TSLA', sector: 'EV', marketCap: 0.95, returns: { day: -2.4, week: -5.1, month: 8.9 } },
  { name: 'TSMC ADR', code: 'TSM', sector: 'Semiconductors', marketCap: 0.9, returns: { day: 1.6, week: 3.4, month: 9.1 } },
  { name: 'AMD', code: 'AMD', sector: 'Semiconductors', marketCap: 0.27, returns: { day: 1.9, week: 4.2, month: -4.5 } },
  { name: 'Netflix', code: 'NFLX', sector: 'Media', marketCap: 0.31, returns: { day: 0.4, week: 1.8, month: 5.5 } },
  { name: 'Oracle', code: 'ORCL', sector: 'Software', marketCap: 0.42, returns: { day: 1.1, week: 2.6, month: 10.3 } },
  { name: 'Salesforce', code: 'CRM', sector: 'Software', marketCap: 0.28, returns: { day: -0.5, week: 0.9, month: 2.4 } },
  { name: 'Adobe', code: 'ADBE', sector: 'Software', marketCap: 0.22, returns: { day: -1.1, week: -2.3, month: -5.6 } },
  { name: 'Intel', code: 'INTC', sector: 'Semiconductors', marketCap: 0.13, returns: { day: -1.8, week: -3.5, month: 2.1 } },
  { name: 'Qualcomm', code: 'QCOM', sector: 'Semiconductors', marketCap: 0.18, returns: { day: 0.7, week: 1.5, month: 3.8 } },
  { name: 'Micron', code: 'MU', sector: 'Semiconductors', marketCap: 0.12, returns: { day: 2.2, week: 5.0, month: 11.4 } },
  { name: 'Arm', code: 'ARM', sector: 'Semiconductors', marketCap: 0.14, returns: { day: 3.1, week: 6.9, month: 17.8 } },
  { name: 'Palantir', code: 'PLTR', sector: 'Software', marketCap: 0.16, returns: { day: 4.2, week: 9.8, month: 22.5 } },
  { name: 'Super Micro', code: 'SMCI', sector: 'AI Hardware', marketCap: 0.05, returns: { day: 5.1, week: 11.2, month: -18.4 } },
  { name: 'Arista', code: 'ANET', sector: 'Networking', marketCap: 0.13, returns: { day: 1.4, week: 3.7, month: 8.6 } },
  { name: 'Marvell', code: 'MRVL', sector: 'Semiconductors', marketCap: 0.08, returns: { day: 2.6, week: 5.5, month: 12.9 } },
];

export const HEATMAP_MARKETS: Record<HeatmapMarket, { label: string; stocks: HeatmapStock[] }> = {
  tw: { label: '台股', stocks: TW_HEATMAP },
  us: { label: '美股', stocks: US_HEATMAP },
};
