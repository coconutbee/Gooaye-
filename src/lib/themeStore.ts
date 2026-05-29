// ============================================================================
// Theme Store — 三個月滾動式題材歷史儲存
// ----------------------------------------------------------------------------
// 為什麼自寫？
//   - Render.com Free Tier 無持久磁碟，所以無論用什麼資料庫，重啟都會清空。
//   - 既然必然要重抓，乾脆改用 JSON 檔 + 可選 R2 備份的最小化做法。
//   - 邏輯需求僅是 append-only + 3 個月滾動視窗 + 題材聚合，
//     不需要關聯查詢，sqlite 反而過度設計。
//
// 結構：
//   data/themes.json
//   {
//     "episodes": [{ ep, date, title, themes: [...], stocks: [...] }],
//     "lastSync": ISO timestamp
//   }
// ============================================================================

import fs from 'fs';
import path from 'path';

export interface ThemeEpisodeRecord {
  ep: string;
  episodeNumber: number | null;
  date: string;           // ISO
  title: string;
  summary: string;
  themes: string[];
  individualStocks: string[];
  sentiment: 'positive' | 'observation' | 'neutral' | 'negative';
  investmentAdvice?: {
    title: string;
    action: string;
    details: string;
  };
  sourceUrl?: string;
}

export interface AggregatedTheme {
  theme: string;
  mentionCount: number;
  episodes: string[];        // 例 ["EP663", "EP661"]
  firstMentioned: string;    // ISO
  lastMentioned: string;     // ISO
  relatedStocks: { stock: string; count: number }[];
  averageSentimentScore: number; // -1 ~ +1
  trend: 'rising' | 'sustained' | 'cooling';
}

const DATA_DIR = path.join(process.cwd(), 'data');
const STORE_PATH = path.join(DATA_DIR, 'themes.json');
const THREE_MONTHS_MS = 90 * 24 * 60 * 60 * 1000;

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadStore(): { episodes: ThemeEpisodeRecord[]; lastSync: string | null } {
  ensureDir();
  if (!fs.existsSync(STORE_PATH)) return { episodes: [], lastSync: null };
  try {
    return JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8'));
  } catch {
    return { episodes: [], lastSync: null };
  }
}

function saveStore(data: { episodes: ThemeEpisodeRecord[]; lastSync: string | null }) {
  ensureDir();
  fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2));
}

// ---------- 寫入：upsert 一集 ----------
export function upsertEpisode(record: ThemeEpisodeRecord): void {
  const store = loadStore();
  const idx = store.episodes.findIndex(e => e.ep === record.ep);
  if (idx >= 0) {
    store.episodes[idx] = { ...store.episodes[idx], ...record };
  } else {
    store.episodes.push(record);
  }
  store.lastSync = new Date().toISOString();
  saveStore(store);
}

// ---------- 讀取：取滾動 3 個月內所有集數 ----------
export function getRollingEpisodes(months = 3): ThemeEpisodeRecord[] {
  const cutoff = Date.now() - months * 30 * 24 * 60 * 60 * 1000;
  return loadStore()
    .episodes
    .filter(e => +new Date(e.date) >= cutoff)
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));
}

// ---------- 聚合：滾動 3 個月題材排行 ----------
export function getAggregatedThemes(months = 3): AggregatedTheme[] {
  const eps = getRollingEpisodes(months);
  const map = new Map<string, AggregatedTheme & { sentimentSum: number; sentimentCount: number }>();

  const sentimentToScore: Record<string, number> = {
    positive: 1,
    observation: 0.2,
    neutral: 0,
    negative: -1,
  };

  for (const ep of eps) {
    const score = sentimentToScore[ep.sentiment] ?? 0;
    for (const theme of ep.themes) {
      const key = theme.trim();
      if (!key) continue;
      const cur = map.get(key) ?? {
        theme: key,
        mentionCount: 0,
        episodes: [],
        firstMentioned: ep.date,
        lastMentioned: ep.date,
        relatedStocks: [],
        averageSentimentScore: 0,
        trend: 'sustained' as const,
        sentimentSum: 0,
        sentimentCount: 0,
      };
      cur.mentionCount += 1;
      cur.episodes.push(ep.ep);
      cur.sentimentSum += score;
      cur.sentimentCount += 1;
      if (+new Date(ep.date) < +new Date(cur.firstMentioned)) cur.firstMentioned = ep.date;
      if (+new Date(ep.date) > +new Date(cur.lastMentioned)) cur.lastMentioned = ep.date;
      // 累積相關股
      for (const stock of ep.individualStocks) {
        const existing = cur.relatedStocks.find(s => s.stock === stock);
        if (existing) existing.count += 1;
        else cur.relatedStocks.push({ stock, count: 1 });
      }
      map.set(key, cur);
    }
  }

  // 計算 trend：最近 1 個月 vs 之前 2 個月的提及次數比較
  const oneMonthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  return Array.from(map.values())
    .map(t => {
      const recent = eps.filter(
        e => e.themes.includes(t.theme) && +new Date(e.date) >= oneMonthAgo
      ).length;
      const earlier = t.mentionCount - recent;
      let trend: AggregatedTheme['trend'] = 'sustained';
      if (recent > earlier * 1.3) trend = 'rising';
      else if (recent < earlier * 0.5) trend = 'cooling';

      return {
        theme: t.theme,
        mentionCount: t.mentionCount,
        episodes: Array.from(new Set(t.episodes)),
        firstMentioned: t.firstMentioned,
        lastMentioned: t.lastMentioned,
        relatedStocks: t.relatedStocks
          .sort((a, b) => b.count - a.count)
          .slice(0, 12),
        averageSentimentScore: t.sentimentCount > 0 ? t.sentimentSum / t.sentimentCount : 0,
        trend,
      };
    })
    .sort((a, b) => b.mentionCount - a.mentionCount);
}

// ---------- 維護：每次寫入時自動裁掉 > 3 個月的紀錄 ----------
export function pruneOldEpisodes(): number {
  const cutoff = Date.now() - THREE_MONTHS_MS;
  const store = loadStore();
  const before = store.episodes.length;
  store.episodes = store.episodes.filter(e => +new Date(e.date) >= cutoff);
  const removed = before - store.episodes.length;
  if (removed > 0) {
    saveStore(store);
  }
  return removed;
}

export function getLastSync(): string | null {
  return loadStore().lastSync;
}

export function getEpisodeCount(): number {
  return loadStore().episodes.length;
}
