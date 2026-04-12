import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Crosshair, Zap, ArrowRight, Clock, Users, Crown, Swords } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export function LandingPage() {
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    api.getConfig().then(setConfig).catch(() => {});
  }, []);

  const battleActive = config?.battle_active;

  return (
    <div className="min-h-screen bg-canvas-bg">
      <Navbar />

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-14">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'linear-gradient(rgba(249,115,22,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(249,115,22,0.15) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }} />
        </div>
        <div className="absolute top-1/3 left-1/3 w-80 h-80 bg-orange-500/5 rounded-full blur-[100px] animate-glow-pulse" />
        <div className="absolute bottom-1/3 right-1/3 w-80 h-80 bg-red-500/5 rounded-full blur-[100px] animate-glow-pulse" style={{ animationDelay: '1s' }} />

        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8 }}>
            {battleActive ? (
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-display font-bold tracking-wider uppercase mb-8 animate-pulse">
                <Swords size={14} />
                BATTLE ИДЁТ ПРЯМО СЕЙЧАС
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-display font-medium tracking-wider uppercase mb-8">
                <Clock size={12} />
                Следующий батл — 1 числа
              </div>
            )}

            <h1 className="font-display font-black text-5xl sm:text-7xl lg:text-8xl tracking-tight leading-[0.9] mb-6">
              <span className="text-canvas-bright">Pixel</span>
              <br />
              <span className="bg-gradient-to-r from-orange-400 via-red-500 to-pink-500 bg-clip-text text-transparent">
                Battle
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-canvas-muted max-w-xl mx-auto mb-10 leading-relaxed">
              Каждый месяц — эпическое сражение за холст 1000×1000 пикселей.
              Ставь пиксели, защищай территорию, побеждай.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/canvas" className="btn-primary text-base !px-8 !py-4 flex items-center gap-2 group">
                {battleActive ? 'Вступить в бой' : 'Смотреть холст'}
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link to="/register" className="btn-secondary text-base !px-8 !py-4">
                Создать аккаунт
              </Link>
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
              { emoji: '🔰', name: 'Новичок', px: '0' },
              { emoji: '⚔️', name: 'Боец', px: '10' },
              { emoji: '🎨', name: 'Художник', px: '50' },
              { emoji: '🖌️', name: 'Мастер', px: '100' },
              { emoji: '🛡️', name: 'Воин', px: '250' },
              { emoji: '🏆', name: 'Легенда', px: '500' },
              { emoji: '👑', name: 'Бог', px: '1K' },
              { emoji: '🔥', name: 'Император', px: '5K' },
              { emoji: '🌍', name: 'Создатель', px: '10K' },
            ].map((r, i) => (
              <motion.div key={i} initial={{ y: 20, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}
                          className="card !p-3 text-center">
                <div className="text-2xl mb-1">{r.emoji}</div>
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

      {/* Footer */}
      <footer className="border-t border-canvas-border py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Crosshair size={14} className="text-orange-400" />
            <span className="font-display font-semibold text-sm text-canvas-muted">Pixel<span className="text-orange-400">Stake</span></span>
          </div>
          <div className="flex gap-6 text-xs text-canvas-muted">
            <Link to="/offer" className="hover:text-canvas-bright transition-colors">Оферта</Link>
            <Link to="/refund" className="hover:text-canvas-bright transition-colors">Возврат</Link>
            <Link to="/privacy" className="hover:text-canvas-bright transition-colors">Конфиденциальность</Link>
          </div>
          <div className="text-xs text-canvas-muted">&copy; {new Date().getFullYear()} PixelStake</div>
        </div>
      </footer>
    </div>
  );
}
