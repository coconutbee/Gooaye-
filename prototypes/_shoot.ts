// 拋棄式：用系統 Chrome 截三個熱力圖變體。跑法 npx tsx prototypes/_shoot.ts
// 注意：page.evaluate 一律傳「字串」，避免 tsx/esbuild 注入 __name 在瀏覽器爆掉。
import puppeteer from 'puppeteer-core';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = 'http://127.0.0.1:3000';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--window-size=1320,1000'],
});

try {
  for (const v of ['A', 'B', 'C'] as const) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1320, height: 1000, deviceScaleFactor: 1.5 });
    await page.goto(`${BASE}/?variant=${v}`, { waitUntil: 'networkidle2', timeout: 30000 });

    // 等首頁初始 research loading 結束 + 分頁鈕出現
    await page.waitForFunction(
      "!document.body.textContent.includes('精算中') && [...document.querySelectorAll('button')].some(b=>b.textContent && b.textContent.includes('市場熱力圖'))",
      { timeout: 20000 }
    );
    // 點「市場熱力圖」
    await page.evaluate(
      "(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent&&x.textContent.includes('市場熱力圖'));if(b)b.click();})()"
    );
    // 等內容渲染
    await page.waitForFunction("document.body.textContent.includes('Market Heatmap')", { timeout: 15000 });
    await sleep(1400); // treemap / 字體 / 動畫

    const file = `prototypes/heatmap-variant-${v}.png`;
    await page.screenshot({ path: file as `${string}.png` });
    console.log('saved', file);
    await page.close();
  }
} finally {
  await browser.close();
}
