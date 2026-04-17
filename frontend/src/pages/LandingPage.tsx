import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Crosshair, Zap, ArrowRight, Clock, Users, Crown, Swords, Smartphone } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api';
import { RankIcon } from '@/components/icons/RankIcons';

function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
      return;
    }

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      if (result.outcome === 'accepted') setInstalled(true);
      setDeferredPrompt(null);
    }
  };

  if (installed) return null;

  return (
    <section className="py-12 px-6">
      <div className="max-w-2xl mx-auto">
        <div className="card border-orange-500/20 flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center flex-shrink-0">
            <Smartphone size={24} className="text-white" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h3 className="font-display font-bold text-lg text-canvas-bright mb-1">Установи приложение</h3>
            <p className="text-canvas-muted text-sm">Играй прямо с рабочего стола — без браузера, в полном экране</p>
          </div>
          {deferredPrompt ? (
            <button onClick={handleInstall} className="btn-primary text-sm !px-6 !py-2.5 flex-shrink-0">
              Установить
            </button>
          ) : (
            <div className="text-xs text-canvas-muted text-center">
              <p>Нажми <span className="text-orange-400">⋮</span> → <span className="text-orange-400">Установить</span></p>
              <p>в меню браузера</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

const PREVIEW_COLORS = ['#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#8b5cf6','#ec4899','#14b8a6','#f43f5e','#a855f7'];

function PixelGridPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const SIZE = 24; // grid cells
    const PX = 16;   // pixel size
    canvas.width = SIZE * PX;
    canvas.height = SIZE * PX;

    // Fill with dark
    ctx.fillStyle = '#1a1a24';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Pre-fill some pixels
    const grid: (string | null)[][] = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
    for (let i = 0; i < 120; i++) {
      const x = Math.floor(Math.random() * SIZE);
      const y = Math.floor(Math.random() * SIZE);
      const color = PREVIEW_COLORS[Math.floor(Math.random() * PREVIEW_COLORS.length)];
      grid[y][x] = color;
      ctx.fillStyle = color;
      ctx.fillRect(x * PX, y * PX, PX - 1, PX - 1);
    }

    // Animate: place new pixels periodically
    const interval = setInterval(() => {
      const x = Math.floor(Math.random() * SIZE);
      const y = Math.floor(Math.random() * SIZE);
      const color = PREVIEW_COLORS[Math.floor(Math.random() * PREVIEW_COLORS.length)];

      // Flash effect
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.8;
      ctx.fillRect(x * PX - 2, y * PX - 2, PX + 3, PX + 3);
      ctx.globalAlpha = 1;

      setTimeout(() => {
        ctx.fillStyle = color;
        ctx.fillRect(x * PX, y * PX, PX - 1, PX - 1);
      }, 80);
    }, 300);

    return () => clearInterval(interval);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full max-w-[384px] mx-auto rounded-2xl border border-canvas-border/30"
      style={{ imageRendering: 'pixelated', aspectRatio: '1/1' }}
    />
  );
}

export function LandingPage() {
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    api.getConfig().then(setConfig).catch(() => {});
  }, []);

  const battleActive = config?.battle_active;

  return (
    <div className="min-h-screen bg-canvas-bg">
      <Navbar />

      {/* Hero — split-screen (taste-skill: anti-center bias) */}
      <section className="relative min-h-[100dvh] flex items-center overflow-hidden pt-14">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'linear-gradient(rgba(249,115,22,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(249,115,22,0.12) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }} />
        </div>
        <div className="absolute top-1/4 left-0 w-96 h-96 bg-orange-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-red-500/5 rounded-full blur-[120px]" />

        <div className="relative z-10 w-full max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: text */}
          <motion.div initial={{ x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.7 }}>
            {battleActive ? (
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-display font-bold tracking-wider uppercase mb-6 animate-pulse">
                <Swords size={14} />
                BATTLE ИДЁТ ПРЯМО СЕЙЧАС
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-display font-medium tracking-wider uppercase mb-6">
                <Clock size={12} />
                Следующий батл — 1 числа
              </div>
            )}

            <h1 className="font-display font-black text-4xl sm:text-5xl lg:text-7xl tracking-tight leading-[0.9] mb-5">
              <span className="text-canvas-bright">Pixel</span>
              <br />
              <span className="bg-gradient-to-r from-orange-400 via-red-500 to-pink-500 bg-clip-text text-transparent">
                Battle
              </span>
            </h1>

            <p className="text-base sm:text-lg text-canvas-muted max-w-md mb-8 leading-relaxed">
              Каждый месяц — эпическое сражение за холст 1000×1000 пикселей.
              Создавай кланы, зарабатывай PixelCoin, побеждай.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link to="/canvas" className="btn-primary text-base !px-7 !py-3.5 flex items-center gap-2 group">
                {battleActive ? 'Вступить в бой' : 'Смотреть холст'}
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link to="/register" className="btn-secondary text-base !px-7 !py-3.5">
                Создать аккаунт
              </Link>
            </div>

            {/* Live stats */}
            <div className="flex gap-6 mt-8 text-sm">
              <div>
                <div className="font-display font-bold text-canvas-bright text-xl">1000²</div>
                <div className="text-canvas-muted text-xs">пикселей</div>
              </div>
              <div className="w-px bg-canvas-border" />
              <div>
                <div className="font-display font-bold text-neon-green text-xl flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse" /> Live
                </div>
                <div className="text-canvas-muted text-xs">в реальном времени</div>
              </div>
              <div className="w-px bg-canvas-border" />
              <div>
                <div className="font-display font-bold text-yellow-400 text-xl">199₽</div>
                <div className="text-canvas-muted text-xs">Pro / месяц</div>
              </div>
            </div>
          </motion.div>

          {/* Right: animated pixel grid preview */}
          <motion.div
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="hidden lg:block"
          >
            <div className="relative">
              <PixelGridPreview />
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-canvas-bg via-transparent to-transparent" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="font-display font-bold text-4xl text-canvas-bright mb-3">Как это работает</h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: <Swords className="text-red-400" size={26} />, title: 'Батл каждый месяц', desc: 'С 1 по 7 число — неделя пиксельного сражения. Все рисуют на одном огромном холсте.' },
              { icon: <Clock className="text-orange-400" size={26} />, title: 'Бесплатные пиксели', desc: 'Каждые 30 секунд можно поставить 1 пиксель бесплатно. С Pro-подпиской — каждые 5 секунд.' },
              { icon: <Crown className="text-yellow-400" size={26} />, title: 'Результат навсегда', desc: 'Финальная картина сохраняется в истории. Твой вклад — навечно в архиве батлов.' },
            ].map((item, i) => (
              <motion.div key={i} initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }}
                          className="card group hover:border-orange-500/20 transition-all">
                <div className="w-12 h-12 rounded-xl bg-canvas-elevated flex items-center justify-center mb-4">{item.icon}</div>
                <h3 className="font-display font-bold text-lg text-canvas-bright mb-2">{item.title}</h3>
                <p className="text-canvas-muted text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Ranks section */}
      <section className="py-24 px-6 bg-canvas-surface/30">
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} className="text-center mb-12">
            <h2 className="font-display font-bold text-3xl text-canvas-bright mb-3">Звания и прогресс</h2>
            <p className="text-canvas-muted">Чем больше пикселей — тем круче твой ранг</p>
          </motion.div>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {[
              { tier: 0, name: 'Новичок', px: '0' },
              { tier: 1, name: 'Боец', px: '10' },
              { tier: 2, name: 'Художник', px: '50' },
              { tier: 3, name: 'Мастер', px: '100' },
              { tier: 4, name: 'Воин', px: '250' },
              { tier: 5, name: 'Легенда', px: '500' },
              { tier: 6, name: 'Бог', px: '1K' },
              { tier: 7, name: 'Император', px: '5K' },
              { tier: 8, name: 'Создатель', px: '10K' },
            ].map((r, i) => (
              <motion.div key={i} initial={{ y: 20, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}
                          className="card !p-3 text-center">
                <div className="flex justify-center mb-1"><RankIcon tier={r.tier} size={36} /></div>
                <div className="text-xs font-display font-semibold text-canvas-bright">{r.name}</div>
                <div className="text-xs font-mono text-canvas-muted">{r.px} px</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pro section */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <Crown size={40} className="text-yellow-400 mx-auto mb-6" />
          <h2 className="font-display font-bold text-3xl text-canvas-bright mb-4">PixelStake Pro</h2>
          <p className="text-canvas-muted mb-8 max-w-lg mx-auto">
            Ставь пиксели каждые 5 секунд вместо 30. Доминируй на холсте.
            В 6 раз быстрее обычных игроков.
          </p>
          <Link to="/subscribe" className="btn-primary text-base !px-8 !py-4 inline-flex items-center gap-2">
            Получить Pro <Zap size={18} />
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="py-28 px-6 text-center">
        <h2 className="font-display font-black text-4xl sm:text-5xl text-canvas-bright mb-6">
          Готов к битве?
        </h2>
        <p className="text-canvas-muted text-lg mb-10">
          1 000 000 пикселей. Тысячи игроков. Один холст.
        </p>
        <Link to="/canvas" className="btn-primary text-lg !px-10 !py-5 inline-flex items-center gap-2">
          Начать <ArrowRight size={20} />
        </Link>
      </section>

      {/* Install app */}
      <InstallBanner />

      <Footer />
    </div>
  );
}
