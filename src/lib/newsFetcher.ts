// ============================================================================
// News Fetcher — 可信財經新聞抓取（用於佐證業務佔比與題材熱度）
// ----------------------------------------------------------------------------
// 目標：給定關鍵字（公司名 / 題材），回傳最近 30 天的相關報導摘要與來源連結，
//      供 LLM 整合分析時做為事實基準，避免「憑空捏造佔比」。
//
// 來源策略：
//   - 經濟日報 (money.udn.com)
//   - 工商時報 (ctee.com.tw)
//   - 鉅亨網 (cnyes.com)
//   - 鏡週刊 / 商周（可選）
//
// 實作：用站內搜尋頁 + HTML 解析。無 API key 需求。
// ============================================================================

export interface NewsItem {
  title: string;
  url: string;
  publishedAt: string;     // ISO（若解析不到則為空字串）
  source: '經濟日報' | '工商時報' | '鉅亨網' | '其他';
  snippet: string;
}

const UA = 'Mozilla/5.0 (compatible; GooayeAnalyzer/1.0)';

async function safeGet(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return await res.text();
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

// ---------- 經濟日報 ----------
async function searchUdnMoney(keyword: string, limit = 6): Promise<NewsItem[]> {
  const url = `https://money.udn.com/search/result/1001/${encodeURIComponent(keyword)}`;
  try {
    const html = await safeGet(url);
    const items: NewsItem[] = [];
    // 經濟日報搜尋結果頁的卡片：a.story__headline
    const re = /<a[^>]+href="([^"]+)"[^>]*class="[^"]*story__headline[^"]*"[^>]*>([\s\S]*?)<\/a>/g;
    let m;
    while ((m = re.exec(html)) && items.length < limit) {
      items.push({
        title: stripTags(m[2]),
        url: m[1].startsWith('http') ? m[1] : `https://money.udn.com${m[1]}`,
        publishedAt: '',
        source: '經濟日報',
        snippet: '',
      });
    }
    return items;
  } catch (e) {
    console.warn('[newsFetcher] UDN failed:', (e as Error).message);
    return [];
  }
}

// ---------- 工商時報 ----------
async function searchCtee(keyword: string, limit = 6): Promise<NewsItem[]> {
  const url = `https://www.ctee.com.tw/search/${encodeURIComponent(keyword)}`;
  try {
    const html = await safeGet(url);
    const items: NewsItem[] = [];
    const re = /<a[^>]+href="(https:\/\/www\.ctee\.com\.tw\/news\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
    let m;
    while ((m = re.exec(html)) && items.length < limit) {
      const title = stripTags(m[2]);
      if (title.length < 6) continue;
      items.push({
        title,
        url: m[1],
        publishedAt: '',
        source: '工商時報',
        snippet: '',
      });
    }
    return items;
  } catch (e) {
    console.warn('[newsFetcher] Ctee failed:', (e as Error).message);
    return [];
  }
}

// ---------- 鉅亨網 ----------
async function searchCnyes(keyword: string, limit = 6): Promise<NewsItem[]> {
  const url = `https://news.cnyes.com/search/query?q=${encodeURIComponent(keyword)}`;
  try {
    const html = await safeGet(url);
    const items: NewsItem[] = [];
    const re = /<a[^>]+href="(\/news\/id\/\d+[^"]*)"[^>]*>([\s\S]*?)<\/a>/g;
    let m;
    while ((m = re.exec(html)) && items.length < limit) {
      const title = stripTags(m[2]);
      if (title.length < 6) continue;
      items.push({
        title,
        url: `https://news.cnyes.com${m[1]}`,
        publishedAt: '',
        source: '鉅亨網',
        snippet: '',
      });
    }
    return items;
  } catch (e) {
    console.warn('[newsFetcher] Cnyes failed:', (e as Error).message);
    return [];
  }
}

// ---------- 統一介面 ----------
export async function fetchCredibleNews(keyword: string, limit = 6): Promise<NewsItem[]> {
  const [udn, ctee, cnyes] = await Promise.all([
    searchUdnMoney(keyword, limit),
    searchCtee(keyword, limit),
    searchCnyes(keyword, limit),
  ]);

  // 經濟日報優先、再來工商、再鉅亨
  const merged = [...udn, ...ctee, ...cnyes];

  // 同標題 dedupe
  const seen = new Set<string>();
  return merged.filter(n => {
    const key = n.title.replace(/\s+/g, '');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, limit * 2);
}
