// ============================================================================
// MeteorShower — pixel-art 流星雨背景
// 低解析 canvas buffer + image-rendering:pixelated → 細小像素塊流星。
// 固定在最底層、透明清除（露出 snow-ambient 光暈），卡片的 liquid glass 會折射它。
// ============================================================================
import React, { useEffect, useRef } from 'react';

const PIXEL = 3; // 每個藝術像素 = 3 裝置像素（越大越「塊」）

interface Meteor {
  x: number;
  y: number;
  vx: number;
  vy: number;
  len: number;       // 拖尾長度（藝術像素）
  speed: number;
  bright: number;    // 0–1
  hue: 'white' | 'gold' | 'ice';
}

interface Star {
  x: number;
  y: number;
  base: number;      // 基礎亮度
  tw: number;        // 閃爍相位
}

const COLORS: Record<Meteor['hue'], [number, number, number]> = {
  white: [245, 245, 245],
  gold: [245, 200, 110],
  ice: [150, 200, 245],
};

export default function MeteorShower() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d')!;
    let raf = 0;
    let W = 0, H = 0;            // buffer（低解析）尺寸
    let meteors: Meteor[] = [];
    let stars: Star[] = [];
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const rand = (a: number, b: number) => a + Math.random() * (b - a);

    function spawnMeteor(initial = false): Meteor {
      const angle = rand(Math.PI * 0.62, Math.PI * 0.78); // 往下、略偏左
      const speed = rand(0.45, 1.15);
      const hue: Meteor['hue'] = Math.random() < 0.16 ? 'gold' : Math.random() < 0.4 ? 'ice' : 'white';
      return {
        x: rand(0, W * 1.25),
        y: initial ? rand(0, H) : rand(-H * 0.4, -2),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        len: Math.round(rand(3, 8)),
        speed,
        bright: rand(0.45, 1),
        hue,
      };
    }

    function resize() {
      const w = window.innerWidth, h = window.innerHeight;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      W = Math.max(1, Math.floor(w / PIXEL));
      H = Math.max(1, Math.floor(h / PIXEL));
      canvas.width = W;
      canvas.height = H;
      ctx.imageSmoothingEnabled = false;

      const area = W * H;
      const starCount = Math.round(area / 1400);
      stars = Array.from({ length: starCount }, () => ({
        x: Math.floor(rand(0, W)),
        y: Math.floor(rand(0, H)),
        base: rand(0.08, 0.5),
        tw: rand(0, Math.PI * 2),
      }));

      const meteorCount = Math.min(46, Math.max(14, Math.round(area / 5200)));
      meteors = Array.from({ length: meteorCount }, () => spawnMeteor(true));
    }

    function px(x: number, y: number, r: number, g: number, b: number, a: number) {
      if (x < 0 || y < 0 || x >= W || y >= H || a <= 0.01) return;
      ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
      ctx.fillRect(x | 0, y | 0, 1, 1);
    }

    let t = 0;
    function frame() {
      t += 1;
      ctx.clearRect(0, 0, W, H);

      // 星點閃爍
      for (const s of stars) {
        const a = s.base * (0.55 + 0.45 * Math.sin(t * 0.03 + s.tw));
        px(s.x, s.y, 235, 240, 250, a);
      }

      // 流星
      for (const m of meteors) {
        m.x += m.vx;
        m.y += m.vy;

        const [r, g, b] = COLORS[m.hue];
        // 拖尾（往速度反方向遞減）
        const nx = m.vx / m.speed, ny = m.vy / m.speed;
        for (let i = 0; i < m.len; i++) {
          const a = m.bright * (1 - i / m.len) * 0.9;
          px(Math.round(m.x - nx * i), Math.round(m.y - ny * i), r, g, b, a);
        }
        // 頭部高光
        px(Math.round(m.x), Math.round(m.y), 255, 255, 255, m.bright);

        if (m.y - m.len > H + 2 || m.x < -m.len - 2 || m.x > W + m.len + 2) {
          Object.assign(m, spawnMeteor(false));
        }
      }

      if (!reduce) raf = requestAnimationFrame(frame);
    }

    resize();
    window.addEventListener('resize', resize);
    if (reduce) {
      frame(); // 靜態一張
    } else {
      raf = requestAnimationFrame(frame);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ imageRendering: 'pixelated' }}
    />
  );
}
