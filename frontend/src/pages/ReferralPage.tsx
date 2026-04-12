import { useEffect, useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { useAuthStore } from '@/stores/authStore';
import { motion } from 'framer-motion';
import { Share2, Copy, Check, Users, Gift, Crosshair } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || '';
async function fetchApi(path: string) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } });
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
    fetchApi('/api/referral/my-code').then(setData).catch(() => {});
    fetchApi('/api/referral/stats').then(setStats).catch(() => {});
  }, [user]);

  const handleCopy = () => {
    if (data?.referral_link) {
      navigator.clipboard.writeText(data.referral_link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-canvas-bg"><Navbar />
      <div className="max-w-3xl mx-auto px-6 pt-24 pb-16">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <div className="text-center mb-10">
            <Share2 size={40} className="text-neon-green mx-auto mb-4" />
            <h1 className="font-display font-black text-3xl text-canvas-bright mb-2">Пригласи друзей</h1>
            <p className="text-canvas-muted">Получай бонусные пиксели за каждого приглашённого</p>
          </div>

          {/* Referral link card */}
          <div className="card mb-6 border-neon-green/20">
            <h2 className="font-display font-semibold text-lg text-canvas-bright mb-4 flex items-center gap-2">
              <Gift size={18} className="text-neon-green" /> Твоя реферальная ссылка
            </h2>
            <div className="flex gap-2">
              <div className="flex-1 px-4 py-3 bg-canvas-bg rounded-xl font-mono text-sm text-orange-400 truncate border border-canvas-border">
                {data?.referral_link || 'Загрузка...'}
              </div>
              <button onClick={handleCopy}
                className="px-4 py-3 bg-neon-green/10 border border-neon-green/30 text-neon-green rounded-xl hover:bg-neon-green/20 transition-all flex items-center gap-2">
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Скопировано!' : 'Копировать'}
              </button>
            </div>
            <p className="text-xs text-canvas-muted mt-3">
              Отправь эту ссылку друзьям. Когда они зарегистрируются — ты получишь 5 бонусных пикселей без кулдауна.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="card !p-4 text-center">
              <Users size={20} className="text-orange-400 mx-auto mb-2" />
              <div className="text-2xl font-display font-bold text-canvas-bright">{data?.invited_count || 0}</div>
              <div className="text-xs text-canvas-muted">Приглашено</div>
            </div>
            <div className="card !p-4 text-center">
              <Gift size={20} className="text-neon-green mx-auto mb-2" />
              <div className="text-2xl font-display font-bold text-canvas-bright">{data?.bonus_pixels_earned || 0}</div>
              <div className="text-xs text-canvas-muted">Бонус пикселей</div>
            </div>
            <div className="card !p-4 text-center">
              <Crosshair size={20} className="text-neon-cyan mx-auto mb-2" />
              <div className="text-2xl font-display font-bold text-canvas-bright">5</div>
              <div className="text-xs text-canvas-muted">За каждого друга</div>
            </div>
          </div>

          {/* How it works */}
          <div className="card mb-6">
            <h2 className="font-display font-semibold text-lg text-canvas-bright mb-4">Как это работает</h2>
            <div className="space-y-3 text-sm text-canvas-muted">
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                <p>Скопируй свою реферальную ссылку и отправь друзьям</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                <p>Друг регистрируется по твоей ссылке</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                <p>Ты получаешь 5 бонусных пикселей, которые можно поставить без ожидания кулдауна</p>
              </div>
            </div>
          </div>

          {/* Invited users */}
          {stats?.invited_users?.length > 0 && (
            <div className="card">
              <h2 className="font-display font-semibold text-lg text-canvas-bright mb-4">Приглашённые</h2>
              <div className="space-y-2">
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
    </div>
  );
}
