# 🎙️ Gooaye 股癌題材追蹤分析器

> 以股癌 Podcast 為起點，自動建立 **滾動 3 個月題材熱度榜** → 點題材即跑 **完整產業鏈 + 各公司業務佔比**，並附經濟日報 / 工商時報 / 鉅亨網引用佐證。

---

## 主功能

| 模組 | 說明 |
|---|---|
| 🎯 **股癌題材追蹤** | 抓股癌最新集數 → Gemini 抽題材、個股、情緒 → 寫入 3 個月滾動資料庫 |
| 📈 **題材熱度榜** | 自動聚合每個題材被提及次數、升 / 持平 / 降趨勢、相關股清單 |
| 🗺️ **產業鏈調查** | 點任一題材即跑 LLM 上中下游分析，標註目前「主流產品」是什麼世代 / 規格 |
| 🥧 **業務佔比 Donut** | 每家相關企業列出產品線佔比，每條後面附經濟日報新聞引用編號 |
| 🔬 其他既有頁籤 | 每日焦點、題材總覽、公司資料庫、市場熱力圖、AI 分析等 |

---

## 資料來源

- **Podcast**：[gooayetranscript.com](https://www.gooayetranscript.com) 逐字稿 + SoundOn RSS + Apple Podcasts iTunes Lookup（3 個來源 fallback）
- **新聞驗證**：經濟日報 `money.udn.com`、工商時報 `ctee.com.tw`、鉅亨網 `news.cnyes.com`
- **LLM**：Gemini 3.5 Flash with Google Search grounding

---

## 系統架構

```
┌────────────────────────────────────────────────────────────┐
│  React + Vite 前端 (src/)                                  │
│   └─ PodcastThemeTracker.tsx ← 主控板                     │
├────────────────────────────────────────────────────────────┤
│  Express 後端 (server.ts)                                  │
│   ├─ /api/gooaye/sync         (抓 → LLM 分析 → 入庫)      │
│   ├─ /api/gooaye/episodes     (近 3 月集數)               │
│   ├─ /api/gooaye/themes       (滾動聚合題材)              │
│   ├─ /api/industry/survey     (產業鏈 + 業務佔比)         │
│   ├─ /api/company/breakdown   (單家公司業務佔比)          │
│   └─ /api/news/credible       (經濟日報 / 工商 / 鉅亨)    │
├────────────────────────────────────────────────────────────┤
│  src/lib/ 服務模組                                         │
│   ├─ gooayeFetcher.ts    多來源抓集數                    │
│   ├─ episodeAnalyzer.ts  Gemini 抽結構化題材              │
│   ├─ themeStore.ts       data/themes.json 滾動 3 個月    │
│   ├─ newsFetcher.ts      可信新聞 HTML 搜尋               │
│   └─ industryAnalysis.ts 產業鏈 + 業務佔比（含引用）      │
└────────────────────────────────────────────────────────────┘
```

---

## 本地開發

```bash
# 1. 安裝依賴
npm install

# 2. 設定環境變數
cp .env.example .env.local
# 編輯 .env.local，填入 GEMINI_API_KEY

# 3. 啟動 dev server
npm run dev
# → http://localhost:5173
```

---

## 部署到 Render.com（免費）

1. **Fork / Push 到 GitHub**
2. 進入 [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**
3. 連到你的 GitHub repo，Render 會自動讀取 `render.yaml`
4. 在 Setup 畫面填入 `GEMINI_API_KEY`
5. 點 **Apply** — 5 分鐘後上線

### ⚠️ Render Free Tier 限制

| 限制 | 影響 | 解決方法 |
|---|---|---|
| 30 分鐘無流量休眠 | 第一次喚醒慢 ~30 秒 | 接 [UptimeRobot](https://uptimerobot.com) 每 5 分鐘 ping |
| 無持久磁碟 | `data/themes.json` 重啟清空 | 按一下「同步最新集數」即可重建（90 秒） |
| 每月 750 小時上限 | 單服務不會超過 | n/a |

> 若要真正持久化：升級 Starter ($7/月) + 加 1GB Disk，掛到 `/opt/render/project/src/data`。或開啟 Cloudflare R2 環境變數，後端會自動把 `data/themes.json` 備份上去（已內建支援）。

---

## 環境變數

| Key | 必填 | 說明 |
|---|---|---|
| `GEMINI_API_KEY` | ✅ | https://aistudio.google.com 申請 |
| `CLOUDFLARE_R2_*` | ❌ | 用於自動備份 / 跨機共享資料 |
| `PORT` | 自動 | Render 注入 10000 |

---

## 工作流程（使用者視角）

```
打開首頁
   ↓
🎯「股癌題材追蹤」(預設) → 按「同步最新集數」
   ↓
看到 3 個月所有題材排行（升溫 🔥 / 持平 / 降溫）
   ↓
點任一題材 (例：被動元件)
   ↓
自動抓經濟日報 / 工商 / 鉅亨新聞 → Gemini 建模
   ↓
顯示：
  ├─ 產業鏈上中下游圖
  ├─ 主流產品趨勢說明
  ├─ 各家公司業務佔比 Donut + 文字
  └─ 引用編號 [1][2][3] 全部可點到原始新聞
```

---

## 已知限制與資訊揭露

- **AI 推估的業務佔比僅供參考**，每張卡片右上有 `confidence: high/medium/low` 標示。投資前請以官方財報為準。
- 抓取依賴目標網站結構，若 `gooayetranscript.com` / `ctee.com.tw` 改版可能需要更新 regex。
- 本工具非投資建議，僅供研究使用。

---

## License

MIT
