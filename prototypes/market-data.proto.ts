// ============================================================================
// PROTOTYPE — 真實行情層 (Yahoo) 接上線 (THROWAWAY，看完即刪)
// 跑法：  npm run proto:market
// ----------------------------------------------------------------------------
// 它在回答的「一個問題」：
//
//   只靠 Yahoo（免金鑰），我們能不能拿到一檔股票真實的
//   收盤價 / 5日·1月·3月報酬 / 走勢？Quote 這個形狀夠不夠前端用？
//   而且：呼叫端只給「數字代號」（不寫 .TW / .TWO），
//   resolver 能不能自動解析成正確的上市 / 上櫃 symbol？
//
// ※ 這版完全不碰 LLM / AI 分析 —— 下面的清單是手填的範例自選股，
//   不是任何模型選出來的，只是拿來打 Yahoo 看真實數字。
//
// 可被搬進正式碼的東西：src/lib/marketData.ts（這支只是拋棄式外殼）。
// ============================================================================

import readline from 'node:readline';
import { fetchQuotes, Quote } from '../src/lib/marketData';

// 手填的範例自選股清單。code 只給「數字」不帶後綴，讓 resolver 去判上市/上櫃。
interface Watchlist {
  label: string;
  tickers: { code: string; name: string }[];
}
const WATCHLISTS: Watchlist[] = [
  {
    label: '範例清單 A（台股，bare code 讓 resolver 處理）',
    tickers: [
      { code: '2330', name: '台積電' }, // → .TW
      { code: '3017', name: '奇鋐' },   // → .TW
      { code: '3081', name: '聯亞' },   // → .TWO
      { code: '3324', name: '雙鴻' },   // → .TWO（resolver 自動修正）
    ],
  },
  {
    label: '範例清單 B（含美股）',
    tickers: [
      { code: '2454', name: '聯發科' },
      { code: 'NVDA', name: 'NVIDIA' },
      { code: '6488', name: '環球晶' },
    ],
  },
];

// ===========================================================================
// 以下全部是拋棄式 TUI 外殼
// ===========================================================================
const C = {
  b: (s: string) => `\x1b[1m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
};

let listIdx = 0;
let selected = 0;
let loading = false;
let quotes: Record<string, Quote> = {};

function ret(n: number | null): string {
  if (n == null) return C.dim('  n/a ');
  const s = `${n > 0 ? '+' : ''}${n.toFixed(2)}%`;
  return n > 0 ? C.red(s.padStart(7)) : C.green(s.padStart(7)); // 台股紅漲綠跌
}

function render() {
  console.clear();
  const wl = WATCHLISTS[listIdx];
  console.log(C.b('━━ PROTOTYPE：真實行情層 (Yahoo) ━━') + C.dim('  即時連網、無金鑰、無 LLM'));
  console.log(C.b('清單: ') + wl.label);
  console.log(C.dim('問題：Yahoo 能不能給真實價/報酬/走勢？Quote 形狀夠用嗎？查不到怎麼降級？'));
  console.log();

  if (loading) {
    console.log(C.yellow('  …正在向 Yahoo 抓真實行情…'));
    return;
  }

  console.log(
    C.b('  #  名稱 (代號)'.padEnd(28)) +
      C.b('收盤(日)'.padEnd(18)) +
      C.b(' 5日'.padEnd(9)) + C.b(' 1月'.padEnd(9)) + C.b(' 3月'.padEnd(9)) +
      C.b('來源')
  );
  wl.tickers.forEach((t, i) => {
    const q = quotes[t.code];
    const cursor = i === selected ? C.b('▶') : ' ';
    const nameCol = `${cursor} ${i} ${t.name} (${t.code})`.padEnd(28);
    const priceCol = q?.ok
      ? `${q.price} ${C.dim(q.currency || '')} ${C.dim('@' + q.asOf)}`.padEnd(26)
      : C.red('查無行情'.padEnd(18));
    const prov = q?.ok ? C.green('● 真實') : C.red('✕ null');
    console.log(
      nameCol + priceCol + ret(q?.returns.d5 ?? null) + '  ' + ret(q?.returns.m1 ?? null) + '  ' + ret(q?.returns.m3 ?? null) + '  ' + prov
    );
  });

  // 選中明細：把 Quote 整個攤開，方便判斷形狀夠不夠
  const t = wl.tickers[selected];
  const q = quotes[t.code];
  console.log();
  console.log(C.b(`── 明細 #${selected}：${t.name} (輸入 ${t.code}) ──`));
  if (q?.ok) {
    const resolved = q.ticker !== q.requested ? C.yellow(`  ⟲ resolver: ${q.requested} → ${q.ticker}`) : C.dim(`  (代號即 ${q.ticker})`);
    console.log(C.green('  [resolver] ') + resolved.trim());
    console.log(C.green('  [真實] ') + `price=${q.price} ${q.currency}  asOf=${q.asOf}  source=${q.source}`);
    console.log(C.green('  [真實] ') + `報酬  5D=${q.returns.d5}%  1M=${q.returns.m1}%  3M=${q.returns.m3}%`);
    console.log(C.green('  [真實] ') + `走勢 ${q.history.length} 點，尾段: ${q.history.slice(-8).map(h => h.price).join(' → ')}`);
  } else {
    console.log(C.red('  [降級] ') + `ok=false，price / 報酬 / history 全部 null`);
    console.log(C.red('  [降級] ') + `error=${q?.error ?? '(未抓取)'}`);
    console.log(C.dim('         → 前端據此顯示「查無行情」，不回退假數字'));
  }

  console.log();
  console.log(C.dim('  ') + `${C.b('0-9')} 選股   ${C.b('t')} 換清單   ${C.b('r')} 重新抓   ${C.b('q')} 離開`);
}

async function load() {
  loading = true;
  render();
  quotes = await fetchQuotes(WATCHLISTS[listIdx].tickers.map((t) => t.code));
  selected = 0;
  loading = false;
  render();
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
function prompt() {
  rl.question('', async (raw) => {
    const k = raw.trim().toLowerCase();
    if (k === 'q') { rl.close(); return; }
    if (k === 't') { listIdx = (listIdx + 1) % WATCHLISTS.length; await load(); }
    else if (k === 'r') { await load(); }
    else if (/^\d$/.test(k) && +k < WATCHLISTS[listIdx].tickers.length) { selected = +k; render(); }
    else { render(); }
    prompt();
  });
}

(async () => {
  await load();
  prompt();
})();
