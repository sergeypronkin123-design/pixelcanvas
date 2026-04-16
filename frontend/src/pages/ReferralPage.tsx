import { useEffect, useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { useAuthStore } from '@/stores/authStore';
import { motion } from 'framer-motion';
import { Share2, Copy, Check, Users, Gift, Crosshair, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || '';
async function fetchApi(path: string) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return null;
  return res.json();
}

export function ReferralPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    fetchApi('/api/referral/my-code').then((d) => d && setData(d)).catch(() => {});
    fetchApi('/api/referral/stats').then((d) => d && setStats(d)).catch(() => {});
  }, [user]);

  const handleCopy = () => {
    if (data?.referral_link) {
      navigator.clipboard.writeText(data.referral_link).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {
        // Fallback for mobile
        const input = document.createElement('input');
        input.value = data.referral_link;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  const handleShare = async () => {
    if (data?.referral_link && navigator.share) {
      try {
        await navigator.share({
          title: 'PixelStake — Pixel Battle',
          text: 'Присоединяйся к пиксельному батлу!',
          url: data.referral_link,
        });
      } catch {}
    } else {
      handleCopy();
    }
  };

  if (!user) return null;

  const bonusPixels = user.bonus_pixels || 0;

  return (
    <div className="min-h-screen bg-canvas-bg flex flex-col"><Navbar />
      <main className="flex-1">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-20 sm:pt-24 pb-16">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <div className="text-center mb-8">
            <Share2 size={36} className="text-neon-green mx-auto mb-3" />
            <h1 className="font-display font-black text-2xl sm:text-3xl text-canvas-bright mb-2">Пригласи друзей</h1>
            <p className="text-canvas-muted text-sm">Получай бонусные пиксели за каждого приглашённого</p>
          </div>

          {/* Bonus pixels banner */}
          {bonusPixels > 0 && (
            <div className="card mb-4 border-neon-green/30 bg-neon-green/5">
              <div className="flex items-center gap-3">
                <Zap size={20} className="text-neon-green flex-shrink-0" />
                <div>
                  <div className="font-display font-bold text-canvas-bright">
                    У тебя {bonusPixels} бонусных пикселей!
                  </div>
                  <div className="text-xs text-canvas-muted">Они ставятся без кулдауна — мгновенно</div>
                </div>
              </div>
            </div>
          )}

          {/* Referral link */}
          <div className="card mb-4 border-neon-green/20">
            <h2 className="font-display font-semibold text-base text-canvas-bright mb-3 flex items-center gap-2">
              <Gift size={16} className="text-neon-green" /> Твоя ссылка
            </h2>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 px-3 py-2.5 bg-canvas-bg rounded-xl font-mono text-xs sm:text-sm text-orange-400 truncate border border-canvas-border">
                {data?.referral_link || 'Загрузка...'}
              </div>
              <div className="flex gap-2">
                <button onClick={handleCopy}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-neon-green/10 border border-neon-green/30 text-neon-green rounded-xl hover:bg-neon-green/20 transition-all flex items-center justify-center gap-1.5 text-sm">
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Готово!' : 'Копировать'}
                </button>
                {typeof navigator.share === 'function' && (
                  <button onClick={handleShare}
                    className="px-4 py-2.5 bg-orange-500/10 border border-orange-500/30 text-orange-400 rounded-xl hover:bg-orange-500/20 transition-all flex items-center justify-center gap-1.5 text-sm">
                    <Share2 size={14} /> Поделиться
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6">
            <div className="card !p-3 text-center">
              <Users size={18} className="text-orange-400 mx-auto mb-1.5" />
              <div className="text-xl font-display font-bold text-canvas-bright">{data?.invited_count || 0}</div>
              <div className="text-[10px] sm:text-xs text-canvas-muted">Приглашено</div>
            </div>
            <div className="card !p-3 text-center">
              <Gift size={18} className="text-neon-green mx-auto mb-1.5" />
              <div className="text-xl font-display font-bold text-canvas-bright">{data?.bonus_pixels_earned || 0}</div>
              <div className="text-[10px] sm:text-xs text-canvas-muted">Заработано</div>
            </div>
            <div className="card !p-3 text-center">
              <Zap size={18} className="text-neon-cyan mx-auto mb-1.5" />
              <div className="text-xl font-display font-bold text-canvas-bright">{bonusPixels}</div>
              <div className="text-[10px] sm:text-xs text-canvas-muted">Осталось</div>
            </div>
          </div>

          {/* How it works */}
          <div className="card mb-4">
            <h2 className="font-display font-semibold text-base text-canvas-bright mb-3">Как это работает</h2>
            <div className="space-y-2.5 text-sm text-canvas-muted">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">1</span>
                <p>Отправь ссылку другу</p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">2</span>
                <p>Друг регистрируется по ссылке</p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">3</span>
                <p>Ты получаешь <span className="text-neon-green font-bold">5 бонусных пикселей</span> без кулдауна</p>
              </div>
            </div>
          </div>

          {/* Invited users */}
          {stats?.invited_users?.length > 0 && (
            <div className="card">
              <h2 className="font-display font-semibold text-base text-canvas-bright mb-3">Приглашённые</h2>
              <div className="space-y-1.5">
                {stats.invited_users.map((u: any, i: number) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 rounded-xl bg-canvas-elevated">
                    <span className="text-sm text-canvas-bright">{u.username}</span>
                    <span className="text-xs font-mono text-canvas-muted">{u.pixels_placed} px</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>
      </main>
      <Footer />
    </div>
  );
}
