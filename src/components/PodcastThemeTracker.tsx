// ============================================================================
// PodcastThemeTracker
// 主控板：把股癌 Podcast 3 個月內所有題材聚合，點題材 → 自動跑產業鏈 + 業務佔比
// ============================================================================

import React, { useEffect, useState } from 'react';
import {
  RefreshCw,
  Mic,
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  Layers,
  PieChart,
  ExternalLink,
  AlertTriangle,
  Calendar,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import {
  PieChart as RPieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface AggregatedTheme {
  theme: string;
  mentionCount: number;
  episodes: string[];
  firstMentioned: string;
  lastMentioned: string;
  relatedStocks: { stock: string; count: number }[];
  averageSentimentScore: number;
  trend: 'rising' | 'sustained' | 'cooling';
}

interface ThemeEpisode {
  ep: string;
  date: string;
  title: string;
  summary: string;
  themes: string[];
  individualStocks: string[];
  sentiment: string;
  investmentAdvice?: { title: string; action: string; details: string };
  sourceUrl?: string;
}

interface ProductMix {
  product: string;
  share: number;
  description: string;
  citationIds: number[];
}

interface CompanyBreakdown {
  ticker: string;
  name: string;
  role: 'upstream' | 'midstream' | 'downstream' | 'other';
  mainstreamProduct: string;
  productMix: ProductMix[];
  confidence: 'high' | 'medium' | 'low';
  notes: string;
}

interface IndustrySurvey {
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

const PIE_COLORS = ['#4F46E5', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function PodcastThemeTracker() {
  const [themes, setThemes] = useState<AggregatedTheme[]>([]);
  const [episodes, setEpisodes] = useState<ThemeEpisode[]>([]);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [survey, setSurvey] = useState<IndustrySurvey | null>(null);
  const [surveyLoading, setSurveyLoading] = useState(false);
  const [surveyError, setSurveyError] = useState<string | null>(null);

  const [searchKeyword, setSearchKeyword] = useState('');

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    try {
      const [tRes, eRes] = await Promise.all([
        fetch('/api/gooaye/themes?months=3'),
        fetch('/api/gooaye/episodes'),
      ]);
      const tData = await tRes.json();
      const eData = await eRes.json();
      setThemes(tData.themes || []);
      setEpisodes(eData.episodes || []);
      setLastSync(tData.lastSync || eData.lastSync);
    } finally {
      setLoading(false);
    }
  }

  async function syncFromSource() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/gooaye/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 15 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '同步失敗');
      setSyncResult(
        `本次抓 ${data.fetched} 集，新增 ${data.processed.length} 集 (跳過 ${data.skipped.length}，失敗 ${data.failed.length})`
      );
      await refresh();
    } catch (e) {
      setSyncResult('同步失敗：' + (e as Error).message);
    } finally {
      setSyncing(false);
    }
  }

  async function runSurvey(theme: string) {
    setSelectedTheme(theme);
    setSurvey(null);
    setSurveyError(null);
    setSurveyLoading(true);
    try {
      const res = await fetch('/api/industry/survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: theme }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '分析失敗');
      setSurvey(data);
    } catch (e) {
      setSurveyError((e as Error).message);
    } finally {
      setSurveyLoading(false);
    }
  }

  const filteredThemes = themes.filter(t =>
    !searchKeyword || t.theme.toLowerCase().includes(searchKeyword.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      {/* ============ 頂部狀態列 ============ */}
      <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Mic className="w-7 h-7" />
              股癌題材追蹤儀表板
            </h2>
            <p className="text-indigo-100 mt-1 text-sm">
              滾動 3 個月內被提及的所有題材，點題材即可跑完整產業鏈與業務佔比
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 md:flex-row md:items-center">
            <div className="text-xs text-indigo-100 text-right">
              {lastSync ? (
                <>最後同步：{new Date(lastSync).toLocaleString('zh-TW')}</>
              ) : (
                <>尚未同步任何集數</>
              )}
              <div>儲存集數：{episodes.length}</div>
            </div>
            <button
              onClick={syncFromSource}
              disabled={syncing}
              className="bg-white text-indigo-700 px-4 py-2 rounded-lg font-semibold hover:bg-indigo-50 disabled:opacity-60 flex items-center gap-2"
            >
              {syncing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {syncing ? '同步中…' : '同步最新集數'}
            </button>
          </div>
        </div>
        {syncResult && (
          <div className="mt-3 text-sm bg-white/20 px-3 py-2 rounded-lg">{syncResult}</div>
        )}
      </div>

      {/* ============ 題材搜尋 ============ */}
      <div className="bg-white rounded-xl p-4 shadow border border-gray-100">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            value={searchKeyword}
            onChange={e => setSearchKeyword(e.target.value)}
            placeholder="搜尋題材（如：被動元件、矽光子、液冷）"
            className="flex-1 outline-none text-sm"
          />
        </div>
      </div>

      {/* ============ 3 個月題材排行榜 ============ */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            3 個月題材熱度榜（{filteredThemes.length}）
          </h3>
          {loading && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
        </div>

        {filteredThemes.length === 0 && !loading && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5" />
            目前沒有任何題材資料，請按右上「同步最新集數」啟動第一次抓取。
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredThemes.map(t => (
            <ThemeCard
              key={t.theme}
              theme={t}
              onClick={() => runSurvey(t.theme)}
              isSelected={selectedTheme === t.theme}
            />
          ))}
        </div>
      </div>

      {/* ============ 產業鏈調查結果 ============ */}
      {selectedTheme && (
        <div className="border-t pt-6">
          <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-indigo-600" />
            產業鏈 + 業務佔比調查：「{selectedTheme}」
          </h3>

          {surveyLoading && (
            <div className="bg-indigo-50 rounded-xl p-6 text-center">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto mb-2" />
              <div className="text-sm text-indigo-700">
                正在抓經濟日報 / 工商時報 / 鉅亨網 ，並用 Gemini 整合產業鏈…
              </div>
            </div>
          )}

          {surveyError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">
              分析失敗：{surveyError}
            </div>
          )}

          {survey && <SurveyView survey={survey} />}
        </div>
      )}

      {/* ============ 最近集數列表 ============ */}
      <div>
        <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-600" />
          3 個月內集數 ({episodes.length})
        </h3>
        <div className="space-y-2">
          {episodes.map(ep => (
            <EpisodeRow key={ep.ep} ep={ep} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- 題材卡片 ----------
function ThemeCard({
  theme,
  onClick,
  isSelected,
}: {
  theme: AggregatedTheme;
  onClick: () => void;
  isSelected: boolean;
}) {
  const trendBadge = {
    rising: { icon: TrendingUp, color: 'text-red-600 bg-red-50', label: '升溫' },
    sustained: { icon: Minus, color: 'text-gray-600 bg-gray-100', label: '持平' },
    cooling: { icon: TrendingDown, color: 'text-emerald-600 bg-emerald-50', label: '降溫' },
  }[theme.trend];
  const T = trendBadge.icon;

  const sentimentEmoji =
    theme.averageSentimentScore > 0.4
      ? '🟢'
      : theme.averageSentimentScore < -0.3
        ? '🔴'
        : '🟡';

  return (
    <button
      onClick={onClick}
      className={`text-left bg-white rounded-xl p-4 shadow-sm border-2 hover:shadow-md transition-all ${
        isSelected ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-gray-100'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="font-bold text-gray-800 flex-1">{theme.theme}</div>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 ${trendBadge.color}`}
        >
          <T className="w-3 h-3" />
          {trendBadge.label}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
        <span>{sentimentEmoji}</span>
        <span>提及 {theme.mentionCount} 次</span>
        <span>·</span>
        <span>橫跨 {theme.episodes.length} 集</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-1">
        {theme.relatedStocks.slice(0, 4).map(s => (
          <span
            key={s.stock}
            className="text-[11px] px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded"
          >
            {s.stock}
          </span>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-gray-400">
        <span>{new Date(theme.lastMentioned).toLocaleDateString('zh-TW')}</span>
        <span className="flex items-center gap-1 text-indigo-600 font-semibold">
          跑產業鏈 <ChevronRight className="w-3 h-3" />
        </span>
      </div>
    </button>
  );
}

// ---------- 集數列 ----------
function EpisodeRow({ ep }: { ep: ThemeEpisode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white rounded-lg border border-gray-100 p-3">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full text-left flex items-center gap-3"
      >
        <span className="bg-indigo-100 text-indigo-700 font-bold text-xs px-2 py-0.5 rounded">
          {ep.ep}
        </span>
        <span className="text-xs text-gray-400">
          {new Date(ep.date).toLocaleDateString('zh-TW')}
        </span>
        <span className="flex-1 font-medium text-gray-700 text-sm truncate">{ep.title}</span>
        <ChevronRight
          className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-90' : ''}`}
        />
      </button>
      {open && (
        <div className="mt-3 pl-2 border-l-2 border-indigo-100 space-y-2 text-sm">
          <p className="text-gray-700">{ep.summary}</p>
          <div className="flex flex-wrap gap-1">
            {ep.themes.map(t => (
              <span
                key={t}
                className="text-[11px] px-2 py-0.5 bg-violet-50 text-violet-700 rounded"
              >
                {t}
              </span>
            ))}
          </div>
          {ep.investmentAdvice && (
            <div className="bg-amber-50 border border-amber-200 rounded p-2 text-xs">
              <div className="font-bold text-amber-800">{ep.investmentAdvice.title}</div>
              <div className="text-amber-700 mt-1">{ep.investmentAdvice.action}</div>
              <div className="text-gray-700 mt-1">{ep.investmentAdvice.details}</div>
            </div>
          )}
          {ep.sourceUrl && (
            <a
              href={ep.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="text-indigo-600 text-xs inline-flex items-center gap-1"
            >
              來源 <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// ---------- 產業調查結果 ----------
function SurveyView({ survey }: { survey: IndustrySurvey }) {
  const stages = [
    { key: 'upstream' as const, label: '上游', color: 'from-emerald-500 to-emerald-700' },
    { key: 'midstream' as const, label: '中游', color: 'from-amber-500 to-amber-700' },
    { key: 'downstream' as const, label: '下游', color: 'from-rose-500 to-rose-700' },
  ];

  return (
    <div className="space-y-5">
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
        <div className="text-sm text-indigo-900">{survey.summary}</div>
        <div className="mt-3 bg-white rounded-lg p-3 border border-indigo-100">
          <div className="text-xs text-indigo-500 font-semibold mb-1">
            主流產品趨勢
          </div>
          <div className="text-sm text-gray-800">{survey.mainstreamProductTrend}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {stages.map(s => (
          <div
            key={s.key}
            className="rounded-xl overflow-hidden border border-gray-200 bg-white"
          >
            <div className={`bg-gradient-to-r ${s.color} text-white p-3`}>
              <div className="font-bold">{s.label}</div>
              <div className="text-xs opacity-90 mt-0.5">
                {survey.chain[s.key].description}
              </div>
            </div>
            <div className="p-3 flex flex-wrap gap-1">
              {survey.chain[s.key].players.map(p => (
                <span
                  key={p}
                  className="text-xs px-2 py-0.5 bg-gray-100 rounded text-gray-700"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div>
        <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
          <PieChart className="w-4 h-4 text-indigo-600" />
          相關企業業務佔比
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {survey.companies.map(c => (
            <CompanyCard key={c.ticker} c={c} citations={survey.citations} />
          ))}
        </div>
      </div>

      <CitationList citations={survey.citations} />
    </div>
  );
}

function CompanyCard({
  c,
  citations,
}: {
  c: CompanyBreakdown;
  citations: { id: number; title: string; url: string; source: string }[];
}) {
  const data = c.productMix.map((p, i) => ({
    name: p.product,
    value: p.share,
    description: p.description,
    citationIds: p.citationIds,
    color: PIE_COLORS[i % PIE_COLORS.length],
  }));

  const roleColor = {
    upstream: 'bg-emerald-100 text-emerald-700',
    midstream: 'bg-amber-100 text-amber-700',
    downstream: 'bg-rose-100 text-rose-700',
    other: 'bg-gray-100 text-gray-700',
  }[c.role];

  const confColor = {
    high: 'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low: 'bg-red-100 text-red-700',
  }[c.confidence];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-bold text-gray-800">
            {c.name} <span className="text-gray-400 text-sm">({c.ticker})</span>
          </div>
          <div className="text-xs text-gray-500 mt-0.5">{c.mainstreamProduct}</div>
        </div>
        <div className="flex flex-col gap-1 items-end">
          <span className={`text-[11px] px-2 py-0.5 rounded font-semibold ${roleColor}`}>
            {c.role}
          </span>
          <span className={`text-[11px] px-2 py-0.5 rounded font-semibold ${confColor}`}>
            信心度：{c.confidence}
          </span>
        </div>
      </div>

      <div className="my-3 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <RPieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              outerRadius={70}
              label={({ name, value }) => `${name} ${value}%`}
              labelLine={false}
            >
              {data.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Pie>
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </RPieChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-1 text-xs">
        {c.productMix.map((p, i) => (
          <div
            key={i}
            className="flex items-start gap-2 border-l-2 pl-2"
            style={{ borderColor: PIE_COLORS[i % PIE_COLORS.length] }}
          >
            <span className="font-semibold text-gray-800 min-w-[60px]">
              {p.product} {p.share}%
            </span>
            <span className="text-gray-600 flex-1">
              {p.description}
              {p.citationIds.length > 0 && (
                <>
                  {' '}
                  {p.citationIds.map(id => (
                    <a
                      key={id}
                      href={citations.find(c => c.id === id)?.url || '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-600"
                    >
                      [{id}]
                    </a>
                  ))}
                </>
              )}
            </span>
          </div>
        ))}
      </div>

      {c.notes && (
        <div className="mt-3 text-[11px] text-gray-500 bg-gray-50 p-2 rounded">
          ⚠️ {c.notes}
        </div>
      )}
    </div>
  );
}

function CitationList({
  citations,
}: {
  citations: { id: number; title: string; url: string; source: string }[];
}) {
  if (citations.length === 0) return null;
  return (
    <div className="bg-gray-50 rounded-xl p-4 text-xs">
      <div className="font-bold text-gray-700 mb-2">📰 引用來源</div>
      <ol className="space-y-1">
        {citations.map(c => (
          <li key={c.id} className="text-gray-600">
            [{c.id}]{' '}
            <a
              href={c.url}
              target="_blank"
              rel="noreferrer"
              className="text-indigo-600 hover:underline"
            >
              {c.title}
            </a>
            <span className="text-gray-400 ml-2">({c.source})</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
