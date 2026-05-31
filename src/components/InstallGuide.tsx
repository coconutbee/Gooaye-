import React from 'react';
import { Smartphone, Compass, ArrowUp, Share2, PlusSquare, Globe, Info, Server, Wifi } from 'lucide-react';

export default function InstallGuide() {
  const localIP = window.location.hostname;
  return (
    <div className="space-y-6 max-w-2xl mx-auto px-1 py-2" id="install-guide-container">
      {/* Hero Welcome */}
      <div className="bg-white/[0.04] border border-white/[0.06] text-white p-5 rounded-2xl text-center space-y-2">
        <Smartphone className="w-12 h-12 mx-auto text-gold animate-bounce" />
        <h2 className="font-satoshi text-xl font-medium tracking-tight text-snow">將此研究工具安裝至您的 Android 手機</h2>
        <p className="text-xs text-snow-2 leading-relaxed">
          透過 Progressive Web App (PWA) 技術，不需透過 Play 商店，即可像一般 App 擁有獨立的圖示與全螢幕體驗！
        </p>
      </div>

      {/* Guide Cards */}
      <div className="space-y-4">
        {/* Step 1 */}
        <div className="bg-white/[0.03] p-5 rounded-xl border border-white/[0.06] flex gap-4 items-start">
          <div className="bg-gold/15 text-gold font-bold w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5">
            1
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-snow text-sm">步驟一：使用 Chrome 瀏覽器開啟</h3>
            <p className="text-xs text-snow-muted leading-relaxed">
              在您的 Android 手機上，打開 <strong className="text-snow-2">Google Chrome 行動瀏覽器</strong>，輸入此應用的專屬網址：
            </p>
            <div className="bg-white/[0.04] p-2.5 rounded-lg border border-white/[0.06] flex items-center justify-between text-xs font-mono text-gold truncate break-all overflow-x-auto">
              <span>{window.location.href}</span>
            </div>
            <p className="text-[10px] text-amber-200/90 bg-gold/[0.08] border border-gold/20 px-2 py-1 rounded inline-flex items-center gap-1">
              <Info className="w-3.5 h-3.5 shrink-0" />
              請務必在原生 Chrome 開啟，通訊軟體 (如 Line/FB Messenger) 的內建瀏覽器無法執行安裝。
            </p>
          </div>
        </div>

        {/* Step 2 */}
        <div className="bg-white/[0.03] p-5 rounded-xl border border-white/[0.06] flex gap-4 items-start">
          <div className="bg-gold/15 text-gold font-bold w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5">
            2
          </div>
          <div className="space-y-1.5">
            <h3 className="font-semibold text-snow text-sm">步驟二：點擊「新增至主畫面」</h3>
            <p className="text-xs text-snow-muted leading-relaxed">
              點選 Chrome 瀏覽器右上角的 <strong className="text-snow-2">「三個點 ┇」選單</strong>，在選單列表中找到：
            </p>
            <div className="bg-white/[0.04] p-3 rounded-lg border border-white/[0.06] flex items-center gap-2 text-xs text-snow-2">
              <PlusSquare className="w-4 h-4 text-emerald-300 shrink-0" />
              <span>點選 <strong className="text-snow">「新增至主畫面」</strong> 或 <strong className="text-snow">「安裝應用程式」</strong></span>
            </div>
          </div>
        </div>

        {/* Step 3 */}
        <div className="bg-white/[0.03] p-5 rounded-xl border border-white/[0.06] flex gap-4 items-start">
          <div className="bg-gold/15 text-gold font-bold w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5">
            3
          </div>
          <div className="space-y-1.5">
            <h3 className="font-semibold text-snow text-sm">步驟三：確認命名與安裝</h3>
            <p className="text-xs text-snow-muted leading-relaxed">
              在彈出的對話框中點選 <strong className="text-snow-2">「安裝」</strong>（或新增）。隨後您的 Android
              桌面上將會自動新增一個精美圖示！點選該桌面上圖示，即可全螢幕暢快操作。
            </p>
          </div>
        </div>
      </div>

      {/* iOS iPad Alternate Guide */}
      <details className="bg-white/[0.03] p-4 rounded-xl border border-white/[0.06] text-xs">
        <summary className="font-medium text-snow-2 cursor-pointer flex items-center justify-between">
          <span>💡 蘋果 iOS (Safari) 的安裝步驟？</span>
          <span className="text-gold font-semibold">展開查看</span>
        </summary>
        <div className="mt-2.5 pt-2 border-t border-white/[0.06] space-y-2 text-snow-2 leading-relaxed">
          <p>1. 使用 iPhone / iPad 自帶的 <strong className="text-snow">Safari 瀏覽器</strong> 開啟此網址。</p>
          <p>2. 點選螢幕底部的 <strong className="text-snow font-semibold flex items-center gap-1 inline-flex">「分享按鈕 <Share2 className="w-3.5 h-3.5 inline text-snow-2" />」</strong>。</p>
          <p>3. 往下拉找到並點選 <strong className="text-snow font-semibold flex items-center gap-1 inline-flex">「加入主畫面 <PlusSquare className="w-3.5 h-3.5 inline text-snow-2" />」</strong>，再按新增即可。</p>
        </div>
      </details>

      {/* Deploying locally instruction */}
      <div className="bg-gold/[0.06] p-5 rounded-xl border border-gold/20 space-y-3">
        <h3 className="font-semibold text-snow text-sm flex items-center gap-2">
          <Server className="w-5 h-5 text-gold" />
          <span>如何在自己的電腦與手機上獨立架設運作？</span>
        </h3>
        <p className="text-xs text-snow-2 leading-relaxed">
          若您希望將此專案源代碼下載，在自己的設備上本地運行並讓手機連線：
        </p>

        <div className="space-y-2 text-xs">
          <div className="flex gap-2.5">
            <div className="w-5 h-5 rounded-full bg-gold/20 text-gold font-bold shrink-0 flex items-center justify-center text-[10px]">A</div>
            <div>
              <p className="font-medium text-snow-2">下載源代碼與安裝依賴</p>
              <p className="text-snow-muted text-[11px] mt-0.5">
                下載完此專案後，在終端機 (Terminal) 執行：
              </p>
              <pre className="bg-black/50 border border-white/[0.06] text-snow-2 p-2 rounded-md mt-1 font-mono text-[11px] overflow-x-auto">
                {"npm install\ncp .env.example .env"}
              </pre>
              <p className="text-snow-muted text-[10px] mt-0.5">（請在 .env 中填寫您的 GEMINI_API_KEY 金鑰）</p>
            </div>
          </div>

          <div className="flex gap-2.5 mt-3">
            <div className="w-5 h-5 rounded-full bg-gold/20 text-gold font-bold shrink-0 flex items-center justify-center text-[10px]">B</div>
            <div>
              <p className="font-medium text-snow-2">啟動本地開發服務器</p>
              <p className="text-snow-muted text-[11px] mt-0.5">執行啟動指令：</p>
              <pre className="bg-black/50 border border-white/[0.06] text-snow-2 p-2 rounded-md mt-1 font-mono text-[11px]">
                npm run dev
              </pre>
            </div>
          </div>

          <div className="flex gap-2.5 mt-3">
            <div className="w-5 h-5 rounded-full bg-gold/20 text-gold font-bold shrink-0 flex items-center justify-center text-[10px]">C</div>
            <div>
              <p className="font-medium text-snow-2">手機在相同 WiFi 網絡下連線</p>
              <p className="text-snow-muted text-[11px] mt-0.5">
                確保您的電腦和手機連線到同一個 WiFi 家用路由器。
              </p>
              <p className="text-snow-muted text-[11px] mt-1">
                在手機瀏覽器中輸入 <strong className="text-snow font-mono font-bold">http://{"<電腦的內部IP網路位址>"}:3000</strong>，即可跨平台同步使用與極速研究！
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
