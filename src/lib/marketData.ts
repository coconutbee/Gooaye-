// ============================================================================
// Market Data — 真實行情數據來源 (keepable / portable)
// ----------------------------------------------------------------------------
// 取代目前 StockInfo 裡被 LLM 捏造的 recentReturn5D/1M/3M 與 historyData。
//
// 來源：Yahoo Finance chart API（v8）
//   - 免金鑰、台股（2330.TW / 3017.TWO）與美股（NVDA）皆可
//   - 回傳日線收盤，由我們自行計算 5日/1月/3月報酬與走勢
//
// 設計原則：
//   - 純粹只負責「真實數字」。任何敘事 / 選股 / 風險文字都不在這裡。
//   - 永遠回傳 Quote（含 ok 旗標）；查不到不丟例外，讓上層決定如何降級。
//   - 之後要換 FinMind / TWSE / 自架快取，只要維持這個介面即可。
// ============================================================================

export interface Quote {
  ticker: string;
  currency: string | null;
  price: number | null;
  returns: {
    d5: number | null;   // % 近 5 個交易日
    m1: number | null;   // % 近 ~1 個月
    m3: number | null;   // % 近 ~3 個月
  };
  history: { date: string; price: number }[]; // 近 ~40 個交易日，給走勢圖用
  source: 'yahoo';
  asOf: string | null;   // 最新一筆收盤的日期
  requested: string;     // 呼叫端原本給的代號（可能沒後綴或後綴錯）
  ok: boolean;
  error?: string;
}

const CHART_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';

function pct(latest: number, past: number | undefined | null): number | null {
  if (past == null || past === 0 || latest == null) return null;
  return Number((((latest - past) / past) * 100).toFixed(2));
}

function fmtDate(epochSec: number): string {
  const d = new Date(epochSec * 1000);
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * 抓單一代號的真實行情。台股請帶 .TW / .TWO 後綴，美股直接代號。
 * 查不到時回傳 ok:false 而非丟例外。
 */
export async function fetchQuote(ticker: string): Promise<Quote> {
  const empty: Quote = {
    ticker,
    currency: null,
    price: null,
    returns: { d5: null, m1: null, m3: null },
    history: [],
    source: 'yahoo',
    asOf: null,
    requested: ticker,
    ok: false,
  };

  try {
    // 取 6 個月：3 月報酬需回看 ~63 個交易日，range=3mo 的點數不夠會算出 null
    const url = `${CHART_BASE}/${encodeURIComponent(ticker)}?range=6mo&interval=1d`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (gooaye-stock-analyzer)' },
    });
    if (!res.ok) return { ...empty, error: `Yahoo HTTP ${res.status}` };

    const json: any = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) {
      return { ...empty, error: json?.chart?.error?.description || '查無此代號' };
    }

    const meta = result.meta ?? {};
    const timestamps: number[] = result.timestamp ?? [];
    const rawCloses: (number | null)[] = result.indicators?.quote?.[0]?.close ?? [];

    // 對齊 timestamp 與 close，丟掉停牌的 null
    const series: { t: number; c: number }[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const c = rawCloses[i];
      if (typeof c === 'number') series.push({ t: timestamps[i], c });
    }
    if (series.length === 0) return { ...empty, error: '無有效收盤資料' };

    const last = series[series.length - 1];
    const at = (tradingDaysBack: number) =>
      series[series.length - 1 - tradingDaysBack]?.c;

    return {
      ticker,
      currency: meta.currency ?? null,
      price: Number(last.c.toFixed(2)),
      returns: {
        d5: pct(last.c, at(5)),
        m1: pct(last.c, at(21)),  // ~1 月 ≈ 21 個交易日
        m3: pct(last.c, at(63)),  // ~3 月 ≈ 63 個交易日
      },
      history: series.slice(-40).map((p) => ({
        date: fmtDate(p.t),
        price: Number(p.c.toFixed(2)),
      })),
      source: 'yahoo',
      asOf: fmtDate(last.t),
      requested: ticker,
      ok: true,
    };
  } catch (e) {
    return { ...empty, error: (e as Error).message };
  }
}

// ----------------------------------------------------------------------------
// 代號 resolver — 台股 .TW（上市）vs .TWO（上櫃）後綴猜不得，得跟交易所走。
// 策略：給定代號產生候選清單，依序打 Yahoo，回傳第一個有資料的。
//   - 純英文（美股，如 NVDA）→ 原樣，不加後綴
//   - 台股數字（"3324" / "3324.TW" / "3324.TWO"）→ 兩個後綴都試
// 解析結果快取在記憶體，避免每次都重打那個會 404 的後綴。
// ----------------------------------------------------------------------------
const resolveCache = new Map<string, string>(); // requested(正規化) -> 確認可用的 symbol

export function candidateSymbols(code: string): string[] {
  const c = code.trim().toUpperCase();
  const m = c.match(/^(\d{3,6}[A-Z]?)(\.TWO?)?$/); // 台股數字代號（可帶後綴）
  if (!m) return [c];                              // 非數字（美股等）→ 原樣
  const num = m[1];
  // 已指定後綴 → 先試指定的，再試另一個當備援；沒指定 → 先上市再上櫃
  if (c.endsWith('.TWO')) return [`${num}.TWO`, `${num}.TW`];
  if (c.endsWith('.TW')) return [`${num}.TW`, `${num}.TWO`];
  return [`${num}.TW`, `${num}.TWO`];
}

/**
 * 解析代號後抓真實行情。呼叫端不必知道 .TW / .TWO，給數字即可。
 * 解析失敗時回傳最後一個候選的 ok:false Quote（保留 requested）。
 */
export async function fetchQuoteResolved(code: string): Promise<Quote> {
  const key = code.trim().toUpperCase();

  // 命中快取：直接抓已知可用的 symbol
  const cached = resolveCache.get(key);
  if (cached) return { ...(await fetchQuote(cached)), requested: code };

  let last: Quote | null = null;
  for (const sym of candidateSymbols(code)) {
    const q = await fetchQuote(sym);
    if (q.ok) {
      resolveCache.set(key, sym);
      return { ...q, requested: code };
    }
    last = q;
  }
  return { ...(last as Quote), requested: code };
}

/** 批次抓多檔（含 resolver），平行但獨立降級；以「原始輸入代號」為 key。 */
export async function fetchQuotes(codes: string[]): Promise<Record<string, Quote>> {
  const entries = await Promise.all(
    codes.map(async (c) => [c, await fetchQuoteResolved(c)] as const)
  );
  return Object.fromEntries(entries);
}
