import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { Navbar } from '@/components/layout/Navbar';
import { motion } from 'framer-motion';
import { User, Crown, Crosshair, Calendar, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getRank, getNextRank, getProgress, RANKS } from '@/lib/ranks';

export function ProfilePage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => { if (!user) navigate('/login'); }, [user]);
  if (!user) return null;

  const pixels = user.pixels_placed_total || 0;
  const rank = getRank(pixels);
  const nextRank = getNextRank(pixels);
  const progress = getProgress(pixels);
  const isSub = user.is_subscriber && user.subscription_until && new Date(user.subscription_until) > new Date();

  return (
    <div className="min-h-screen bg-canvas-bg"><Navbar />
      <div className="max-w-3xl mx-auto px-6 pt-24 pb-16">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>

          {/* Profile header */}
          <div className="card mb-6">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-2xl">
                {rank.emoji}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-display font-bold text-2xl text-canvas-bright">{user.username}</h1>
                  {isSub && (
                    <span className="px-2 py-0.5 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-xs font-display font-bold text-yellow-400 flex items-center gap-1">
                      <Crown size={11} /> PRO
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-display font-semibold" style={{ color: rank.color }}>{rank.emoji} {rank.nameRu}</span>
                </div>
                <p className="text-canvas-muted text-xs mt-0.5">{user.email}</p>
              </div>
            </div>
          </div>

          {/* Rank progress */}
          <div className="card mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-semibold text-base text-canvas-bright flex items-center gap-2">
                <TrendingUp size={16} className="text-orange-400" /> Прогресс
              </h2>
              <span className="text-xs font-mono text-canvas-muted">{pixels} пикселей</span>
            </div>

            {/* Current rank bar */}
            <div className="mb-2">
              <div className="flex items-center justify-between text-xs mb-1">
                <span style={{ color: rank.color }}>{rank.emoji} {rank.nameRu}</span>
                {nextRank ? (
                  <span className="text-canvas-muted">{nextRank.emoji} {nextRank.nameRu} ({nextRank.minPixels})</span>
                ) : (
                  <span className="text-neon-cyan">Максимальный ранг!</span>
                )}
              </div>
              <div className="w-full h-3 bg-canvas-bg rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className="h-full rounded-full"
                  style={{ background: `linear-gradient(to right, ${rank.color}, ${nextRank?.color || rank.color})` }}
                />
              </div>
              {nextRank && (
                <p className="text-xs text-canvas-muted mt-1">
                  Ещё <span className="text-orange-400 font-mono font-bold">{nextRank.minPixels - pixels}</span> пикселей до следующего ранга
                </p>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="card !p-4 text-center">
              <Crosshair size={18} className="text-orange-400 mx-auto mb-2" />
              <div className="text-xl font-display font-bold text-canvas-bright">{pixels.toLocaleString()}</div>
              <div className="text-xs text-canvas-muted">Пикселей</div>
            </div>
            <div className="card !p-4 text-center">
              <Calendar size={18} className="text-neon-green mx-auto mb-2" />
              <div className="text-sm font-display font-bold text-canvas-bright">{new Date(user.created_at).toLocaleDateString('ru')}</div>
              <div className="text-xs text-canvas-muted">Регистрация</div>
            </div>
            <div className="card !p-4 text-center">
              <Crown size={18} className="text-yellow-400 mx-auto mb-2" />
              <div className="text-sm font-display font-bold text-canvas-bright">{isSub ? 'Активна' : 'Нет'}</div>
              <div className="text-xs text-canvas-muted">Подписка</div>
            </div>
          </div>

          {/* All ranks */}
          <div className="card">
            <h2 className="font-display font-semibold text-base text-canvas-bright mb-4">Все звания</h2>
            <div className="space-y-2">
              {RANKS.map((r) => {
                const unlocked = pixels >= r.minPixels;
                return (
                  <div key={r.minPixels} className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all
                    ${unlocked ? 'bg-canvas-elevated' : 'opacity-40'}`}>
                    <span className="text-lg w-8 text-center">{r.emoji}</span>
                    <div className="flex-1">
                      <span className="text-sm font-display font-semibold" style={{ color: unlocked ? r.color : '#6b6b8a' }}>
                        {r.nameRu}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-canvas-muted">{r.minPixels.toLocaleString()} px</span>
                    {unlocked && <span className="text-xs text-neon-green">✓</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Battle history */}
          <div className="card mt-6">
            <h2 className="font-display font-semibold text-base text-canvas-bright mb-4">История батлов</h2>
            <p className="text-canvas-muted text-sm">
              Финальные картины каждого батла будут сохраняться здесь.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="aspect-square rounded-xl bg-canvas-bg border border-canvas-border flex items-center justify-center">
                <span className="text-canvas-muted text-xs text-center px-4">Ожидание первого батла...</span>
              </div>
            </div>
          </div>

        </motion.div>
      </div>
    </div>
  );
}
