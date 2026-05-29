// ============================================================================
// 股癌 Gooaye Podcast Fetcher
// ----------------------------------------------------------------------------
// 抓取股癌節目資料的服務模組。
//
// 資料來源優先順序：
//   1) gooayetranscript.com  — 社群維護的逐字稿與重點整理（HTML 抓取）
//   2) SoundOn RSS feed       — 取得最新集數的標題、日期、Shownotes
//   3) Apple Podcasts lookup  — 集數與發佈日期備援
//
// 設計目標：
//   - 不依賴付費 API
//   - 允許離線時回退到伺服器內 cached snapshot
//   - 輸出結構統一為 RawEpisode（待 LLM 進一步抽題材）
// ============================================================================

export interface RawEpisode {
  ep: string;                  // 例 "EP663"
  episodeNumber: number | null;
  title: string;               // 完整節目標題
  publishedAt: string;         // ISO date
  shownotes: string;           // 原始描述（可能含 HTML / Markdown）
  audioUrl?: string;
  source: 'rss' | 'transcript' | 'fallback';
  sourceUrl: string;
}

const SOUNDON_RSS = 'https://feeds.soundon.fm/podcasts/954689a5-3096-43a4-a80b-7810b219cef3.xml';
const TRANSCRIPT_SITE = 'https://www.gooayetranscript.com';
const APPLE_LOOKUP = 'https://itunes.apple.com/lookup?id=1500839292&entity=podcastEpisode&limit=40';

// ---------- 公用：從標題抓 EP 編號 ----------
function extractEpisodeNumber(title: string): { ep: string; num: number | null } {
  const m = title.match(/EP\s*?(\d{2,4})/i);
  if (m) {
    const num = parseInt(m[1], 10);
    return { ep: `EP${num}`, num };
  }
  return { ep: title.slice(0, 20), num: null };
}

// ---------- 來源 A：SoundOn RSS ----------
export async function fetchFromRss(limit = 30): Promise<RawEpisode[]> {
  const res = await fetch(SOUNDON_RSS, {
    headers: { 'User-Agent': 'Mozilla/5.0 (gooaye-stock-analyzer)' }
  });
  if (!res.ok) throw new Error(`SoundOn RSS HTTP ${res.status}`);
  const xml = await res.text();

  // 用 regex 解析 RSS（避免額外相依）
  const items = xml.split(/<item>/i).slice(1);
  const episodes: RawEpisode[] = [];

  for (const block of items.slice(0, limit)) {
    const titleMatch = block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
    const pubMatch = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);
    const descMatch = block.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
    const linkMatch = block.match(/<link>([\s\S]*?)<\/link>/i);
    const enclosureMatch = block.match(/<enclosure[^>]+url="([^"]+)"/i);

    if (!titleMatch || !pubMatch) continue;

    const title = titleMatch[1].trim();
    const { ep, num } = extractEpisodeNumber(title);

    episodes.push({
      ep,
      episodeNumber: num,
      title,
      publishedAt: new Date(pubMatch[1]).toISOString(),
      shownotes: stripHtml(descMatch?.[1] ?? ''),
      audioUrl: enclosureMatch?.[1],
      source: 'rss',
      sourceUrl: linkMatch?.[1]?.trim() || SOUNDON_RSS
    });
  }
  return episodes;
}

// ---------- 來源 B：gooayetranscript.com ----------
// 社群網站 - 抓主頁列出最新集數的標題與連結，再進入詳情頁拿逐字稿
export async function fetchFromTranscriptSite(limit = 20): Promise<RawEpisode[]> {
  // 首頁列表（SPA：實際資料來自 sitemap.xml）
  const sitemapRes = await fetch(`${TRANSCRIPT_SITE}/sitemap.xml`, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  }).catch(() => null);

  if (!sitemapRes || !sitemapRes.ok) return [];

  const xml = await sitemapRes.text();
  const urls = Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g))
    .map(m => m[1])
    .filter(u => /\/article\//.test(u))
    .slice(0, limit);

  const episodes: RawEpisode[] = [];
  for (const url of urls) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!r.ok) continue;
      const html = await r.text();
      const title = (html.match(/<title>([^<]+)<\/title>/) || [])[1] || url;
      const dateMatch = html.match(/(\d{4})[-\/](\d{2})[-\/](\d{2})/);
      const { ep, num } = extractEpisodeNumber(title);
      const bodyText = stripHtml(
        (html.match(/<article[\s\S]*?<\/article>/) || ['', ''])[0] || html
      ).slice(0, 6000);

      episodes.push({
        ep,
        episodeNumber: num,
        title: title.replace(/\s*\|.*$/, '').trim(),
        publishedAt: dateMatch
          ? new Date(`${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`).toISOString()
          : new Date().toISOString(),
        shownotes: bodyText,
        source: 'transcript',
        sourceUrl: url
      });
    } catch {
      /* skip individual failures */
    }
  }
  return episodes;
}

// ---------- 來源 C：Apple Podcasts iTunes Lookup（純集數列表） ----------
export async function fetchFromApple(): Promise<RawEpisode[]> {
  const r = await fetch(APPLE_LOOKUP);
  if (!r.ok) return [];
  const data = await r.json();
  if (!Array.isArray(data.results)) return [];
  const eps = data.results.filter((it: any) => it.kind === 'podcast-episode');
  return eps.map((it: any): RawEpisode => {
    const { ep, num } = extractEpisodeNumber(it.trackName || '');
    return {
      ep,
      episodeNumber: num,
      title: it.trackName || '',
      publishedAt: it.releaseDate || new Date().toISOString(),
      shownotes: stripHtml(it.description || it.shortDescription || ''),
      audioUrl: it.episodeUrl,
      source: 'rss',
      sourceUrl: it.trackViewUrl || ''
    };
  });
}

// ---------- 合併多來源（同集以最豐富資料為主） ----------
export async function fetchLatestEpisodes(limit = 40): Promise<RawEpisode[]> {
  const results: RawEpisode[] = [];

  const safe = async (fn: () => Promise<RawEpisode[]>) => {
    try {
      const r = await fn();
      results.push(...r);
    } catch (e) {
      console.warn('[gooayeFetcher] source failed:', (e as Error).message);
    }
  };

  // 平行抓三個來源
  await Promise.all([
    safe(() => fetchFromRss(limit)),
    safe(() => fetchFromTranscriptSite(20)),
    safe(() => fetchFromApple()),
  ]);

  // 按 EP 編號 dedupe，較長 shownotes 勝出
  const byEp = new Map<string, RawEpisode>();
  for (const e of results) {
    const key = e.ep || e.title.slice(0, 20);
    const existing = byEp.get(key);
    if (!existing || e.shownotes.length > existing.shownotes.length) {
      byEp.set(key, e);
    }
  }

  return Array.from(byEp.values())
    .sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt))
    .slice(0, limit);
}

// ---------- 工具：剝離 HTML 標籤 ----------
function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
