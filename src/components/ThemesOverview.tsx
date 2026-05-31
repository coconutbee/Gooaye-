import React from 'react';
import { 
  TrendingUp, 
  Layers, 
  MapPin, 
  Users, 
  Clock, 
  ArrowRight,
  Bookmark,
  Sparkles,
  Zap,
  Globe
} from 'lucide-react';

interface ThemeItem {
  name: string;
  query: string;
  slug: string;
  cagr: string;
  marketSize: string;
  companiesCount: number;
  description: string;
  keyLeaders: string[];
  vibe: 'amber' | 'blue' | 'purple' | 'emerald' | 'indigo' | 'rose' | 'pink';
}

interface ThemesOverviewProps {
  onSelectTheme: (query: string) => void;
}

export default function ThemesOverview({ onSelectTheme }: ThemesOverviewProps) {
  const themes: ThemeItem[] = [
    {
      name: 'ASIC IP 設計',
      query: 'ASIC IP 設計',
      slug: 'asic-ip-design',
      cagr: '30%+',
      marketSize: '18.5 億美元',
      companiesCount: 8,
      description: '雲端大廠 (CSP) 自研 AI 晶片浪潮，去 NVIDIA 化必備最上游矽智財 (IP) 授權與 ASIC 設計統包服務。',
      keyLeaders: ['世芯-KY', '創意', '力旺', 'M31'],
      vibe: 'purple'
    },
    {
      name: '矽光子 CPO',
      query: '矽光子',
      slug: 'cpo-silicon-photonics',
      cagr: '25%+',
      marketSize: '12.0 億美元',
      companiesCount: 6,
      description: '解決傳統高速電信號傳輸高功耗、散熱瓶頸，台積電帶頭整合光電共同封裝 (CPO) 新革命。',
      keyLeaders: ['聯亞', '上詮', '波若威', '光聖'],
      vibe: 'blue'
    },
    {
      name: '液冷散熱技術',
      query: '液冷散熱',
      slug: 'liquid-cooling',
      cagr: '28%+',
      marketSize: '15.4 億美元',
      companiesCount: 5,
      description: '輝達 AI 伺服器功耗突破 1000W 關卡，傳統風扇散熱無法承載，3D液冷與浸沒式水冷為剛性採購。',
      keyLeaders: ['奇鋐', '雙鴻', '高力', '廣運'],
      vibe: 'emerald'
    },
    {
      name: '輝達 GB200 精密機櫃',
      query: 'GB200 伺服器',
      slug: 'gb200',
      cagr: '35%+',
      marketSize: '32.1 億美元',
      companiesCount: 7,
      description: '次世代 AI 超級伺服器核心結構，黑科技整合液冷、高速背板傳輸、電力總成，系統整合產值翻倍增。',
      keyLeaders: ['鴻海', '廣達', '緯創', '勤誠'],
      vibe: 'rose'
    },
    {
      name: '先進封裝 CoWoS',
      query: 'CoWoS 先進封裝',
      slug: 'cowos',
      cagr: '32%+',
      marketSize: '24.2 億美元',
      companiesCount: 5,
      description: '台積電主導黑科技。為突破摩爾定律物理極限，透過晶圓級矽穿孔 2.5D/3D 先進堆疊打通算力。',
      keyLeaders: ['台積電', '日月光', '京元電', '萬潤'],
      vibe: 'amber'
    },
    {
      name: '低軌衛星通訊',
      query: '低軌衛星',
      slug: 'leo-satellite',
      cagr: '18%+',
      marketSize: '11.8 億美元',
      companiesCount: 4,
      description: '太空產業鏈爆發，涵蓋無死角地表通訊覆蓋。Starlink 等衛星終端、射頻前端與微波收發設備。',
      keyLeaders: ['華通', '昇達科', '啟碁', '啟碁-創'],
      vibe: 'pink'
    },
    {
      name: '人形機器人供應鏈',
      query: '人形機器人',
      slug: 'humanoid-robot',
      cagr: '40%+',
      marketSize: '8.5 億美元',
      companiesCount: 5,
      description: '終極具身智能 (Embodied AI)。Tesla Optimus 量產帶動精密諧波減速器、無刷馬達與力控感測器大商機。',
      keyLeaders: ['所羅門', '盟立', '廣明', '上銀'],
      vibe: 'indigo'
    }
  ];

  const getVibeStyles = (vibe: string) => {
    switch (vibe) {
      case 'amber':
        return { bg: 'bg-amber-500/12 text-amber-300 border-amber-400/30', line: 'from-amber-400 to-amber-600' };
      case 'blue':
        return { bg: 'bg-blue-500/12 text-blue-300 border-blue-400/30', line: 'from-blue-400 to-blue-600' };
      case 'purple':
        return { bg: 'bg-purple-500/12 text-purple-300 border-purple-400/30', line: 'from-purple-400 to-purple-600' };
      case 'emerald':
        return { bg: 'bg-emerald-500/12 text-emerald-300 border-emerald-400/30', line: 'from-emerald-400 to-emerald-600' };
      case 'rose':
        return { bg: 'bg-rose-500/12 text-rose-300 border-rose-400/30', line: 'from-rose-400 to-rose-600' };
      case 'pink':
        return { bg: 'bg-pink-500/12 text-pink-300 border-pink-400/30', line: 'from-pink-400 to-pink-600' };
      default:
        return { bg: 'bg-indigo-500/12 text-indigo-300 border-indigo-400/30', line: 'from-indigo-400 to-indigo-600' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Introduction Card */}
      <div className="glass-card p-5 rounded-2xl space-y-2">
        <h3 className="font-satoshi font-medium text-snow text-[15px] flex items-center gap-2">
          <Globe className="text-gold w-5 h-5" />
          <span>最新 AI 智慧與關鍵硬體革命題材總覽</span>
        </h3>
        <p className="text-[13px] text-snow-muted leading-relaxed">
          全球半導體、AI 軍備競賽與太空硬體科技正在重塑台灣科技股的股價爆發空間。下方爲您精選整理 7 大最核心的趨勢题材。點按任何一個即可載入完整產業鏈架構、熱力圖以及領軍個股！
        </p>
      </div>

      {/* Grid of Themes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {themes.map((theme, index) => {
          const styles = getVibeStyles(theme.vibe);
          return (
            <div
              key={index}
              onClick={() => onSelectTheme(theme.query)}
              className="glass-card p-5 rounded-2xl hover:border-gold/40 cursor-pointer transition duration-200 flex flex-col justify-between group relative overflow-hidden"
            >
              {/* Accents Line Side indicator */}
              <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${styles.line}`} />

              <div className="space-y-3 pl-1">
                <div className="flex justify-between items-center">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${styles.bg}`}>
                    CAGR {theme.cagr}
                  </span>
                  <span className="text-[10px] font-mono text-snow-muted">
                    規模: {theme.marketSize}
                  </span>
                </div>

                <div className="space-y-1">
                  <h4 className="font-satoshi font-medium text-snow text-[15px] flex items-center gap-1.5 group-hover:text-gold transition">
                    <span>{theme.name}</span>
                    <Sparkles className="w-3.5 h-3.5 text-gold opacity-0 group-hover:opacity-100 transition duration-300" />
                  </h4>
                  <p className="text-[13px] text-snow-muted leading-relaxed pr-5">
                    {theme.description}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] pl-1">
                <div className="flex items-center gap-1">
                  <span className="text-snow-muted">龍頭代表股：</span>
                  <div className="flex flex-wrap gap-1">
                    {theme.keyLeaders.map((co) => (
                      <span key={co} className="text-snow-2 bg-white/[0.06] border border-white/[0.06] px-1.5 rounded-md font-semibold text-[10px] py-0.5 leading-none">
                        {co}
                      </span>
                    ))}
                  </div>
                </div>

                <button className="text-gold font-bold text-[11px] flex items-center gap-0.5 group-hover:translate-x-1 transition duration-200 shrink-0">
                  <span>進行研究</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
