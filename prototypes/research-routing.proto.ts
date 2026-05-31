// ============================================================================
// PROTOTYPE — 分層研究路由 (免費=策略清單 / 付費=Gemini) (THROWAWAY，看完即刪)
// 跑法：  npm run proto:routing
// ----------------------------------------------------------------------------
// 它在回答的「一個問題」：
//
//   /api/research 改成分層後，免費版（策略清單 + Yahoo，不碰 Google Search）
//   實際吐出來的東西長怎樣？關鍵字對題材對得準嗎？對不到時怎麼回？
//   付費版（Gemini）在沒 key 時又該回什麼？
//
// 可被搬進正式碼的東西：
//   - src/lib/strategyResearch.ts（免費版選股，已是 production 模組）
//   - src/lib/marketData.ts（真實行情）
// 這支只是把兩者接起來 + tier 切換的拋棄式外殼。
// ============================================================================

import readline from 'node:readline';
import { matchStrategyTopic, listStrategyThemes } from '../src/lib/strategyResearch';
import { fetchQuotes, Quote } from '../src/lib/marketData';

const C = {
  b: (s: string) => `\x1b[1m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
};

let tier: 'free' | 'paid' = 'free';
let query = '矽光子';
let loading = false;
let lastResult: { kind: string; lines: string[] } | null = null;

function ret(n: number | null): string {
  if (n == null) return C.dim('n/a');
  const s = `${n > 0 ? '+' : ''}${n.toFixed(2)}%`;
  return n > 0 ? C.red(s) : C.green(s);
}

async function runFree(q: string): Promise<{ kind: string; lines: string[] }> {
  const m = matchStrategyTopic(q);
  if (!m.matched) {
    return {
      kind: '免費版・未收錄',
      lines: [
        C.yellow(`  「${q}」不在策略清單裡 → matched:false`),
        C.dim(`  前端提示：此題材免費版未收錄，升級可用 AI 即時研究`),
        C.dim(`  目前清單：${listStrategyThemes().join('、')}`),
      ],
    };
  }
  // 對到題材 → 用 Yahoo 覆蓋真實數字
  const codes = m.data.stocks.map((s: any) => s.code);
  const quotes = await fetchQuotes(codes);
  const lines = [
    C.cyan(`  對到題材：${m.themeKey}  (${m.reason})`),
    C.dim(`  ${m.data.title}`),
    C.b('  個股（敘事=策略清單，數字=Yahoo 即時）：'),
  ];
  m.data.stocks.forEach((s: any) => {
    const q2: Quote = quotes[s.code];
    const sym = q2?.ok && q2.ticker !== s.code ? C.yellow(`→${q2.ticker}`) : '';
    const price = q2?.ok ? `${q2.price}${q2.currency}` : C.red('查無');
    const rr = q2?.ok
      ? `5D ${ret(q2.returns.d5)}  1M ${ret(q2.returns.m1)}  3M ${ret(q2.returns.m3)}`
      : C.red('null（不回退假數字）');
    lines.push(`    ${s.name} (${s.code}${sym})  ${price}  ${rr}`);
  });
  return { kind: '免費版・策略清單 + Yahoo', lines };
}

function runPaid(q: string): { kind: string; lines: string[] } {
  const hasKey = !!(process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY);
  if (!hasKey) {
    return {
      kind: '付費版・Gemini',
      lines: [
        C.red(`  未設定 GEMINI_API_KEY → 付費功能不可用`),
        C.dim(`  正式碼策略：付費 tier 但缺 key 時，退回免費版策略清單（而不是卡 google search）`),
      ],
    };
  }
  return {
    kind: '付費版・Gemini',
    lines: [
      C.green(`  偵測到 key → 會呼叫 Gemini + Google Search 選股 + 敘事`),
      C.dim(`  （此 prototype 不實打 Gemini，正式邏輯在 server.ts）`),
    ],
  };
}

function render() {
  console.clear();
  console.log(C.b('━━ PROTOTYPE：分層研究路由 ━━'));
  console.log(C.b('tier: ') + (tier === 'free' ? C.cyan('FREE（策略清單）') : C.green('PAID（Gemini）')) +
    '    ' + C.b('查詢: ') + query);
  console.log(C.dim('問題：免費版吐什麼？關鍵字對得準嗎？對不到怎麼回？付費沒 key 怎麼辦？'));
  console.log();
  if (loading) { console.log(C.yellow('  …執行中（免費版會打 Yahoo）…')); return; }
  if (lastResult) {
    console.log(C.b('結果路徑：') + lastResult.kind);
    lastResult.lines.forEach((l) => console.log(l));
  }
  console.log();
  console.log(C.dim('  ') + `${C.b('s')} 輸入查詢   ${C.b('f')} 切 free/paid   ${C.b('r')} 重跑   ${C.b('q')} 離開`);
}

async function run() {
  loading = true; render();
  lastResult = tier === 'free' ? await runFree(query) : runPaid(query);
  loading = false; render();
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
function loop() {
  rl.question('', async (raw) => {
    const k = raw.trim().toLowerCase();
    if (k === 'q') { rl.close(); return; }
    if (k === 'f') { tier = tier === 'free' ? 'paid' : 'free'; await run(); }
    else if (k === 'r') { await run(); }
    else if (k === 's') {
      rl.question(C.b('輸入查詢題材> '), async (qq) => { if (qq.trim()) query = qq.trim(); await run(); loop(); });
      return;
    } else { render(); }
    loop();
  });
}

(async () => { await run(); loop(); })();
