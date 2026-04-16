import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { useAuthStore } from '@/stores/authStore';
import { motion } from 'framer-motion';
import {
  ShoppingBag, Coins, Trophy, CheckCircle, Lock, Sparkles,
  Palette, Shield, Crown, User, Zap, Target
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || '';

async function fetchApi(path: string, options?: RequestInit) {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const res = await fetch(`${API}${path}`, { ...options, headers: { ...headers, ...(options?.headers as any) } });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Error' }));
    throw new Error(err.detail || 'Error');
  }
  return res.json();
}


// ============ SHOP ============
export function ShopPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const load = () => {
    fetchApi('/api/economy/shop').then((d) => {
      setItems(d.items);
      setBalance(d.balance);
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    load();
  }, [user]);

  const handleBuy = async (code: string) => {
    if (!confirm('Подтвердить покупку?')) return;
    setBuying(code);
    setMessage('');
    try {
      const r = await fetchApi('/api/economy/shop/buy', {
        method: 'POST',
        body: JSON.stringify({ item_code: code }),
      });
      setMessage(r.message);
      load();
      setTimeout(() => setMessage(''), 5000);
    } catch (e: any) {
      setMessage(`❌ ${e.message}`);
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setBuying(null);
    }
  };

  if (!user) return null;

  const categories = [
    { key: 'palette', name: 'Палитры', icon: <Palette size={18} /> },
    { key: 'feature', name: 'Возможности', icon: <Shield size={18} /> },
    { key: 'cosmetic', name: 'Косметика', icon: <User size={18} /> },
    { key: 'premium', name: 'Премиум', icon: <Crown size={18} /> },
  ];

  return (
    <div className="min-h-screen bg-canvas-bg flex flex-col"><Navbar />
      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-20 sm:pt-24 pb-12">
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
              <div>
                <h1 className="font-display font-black text-2xl sm:text-3xl text-canvas-bright flex items-center gap-2">
                  <ShoppingBag size={26} className="text-orange-400" /> Магазин
                </h1>
                <p className="text-canvas-muted text-sm mt-1">Трать заработанные PixelCoin на полезности</p>
              </div>
              <div className="card !p-3 flex items-center gap-2">
                <Coins size={20} className="text-yellow-400" />
                <span className="font-mono font-bold text-lg text-canvas-bright">{balance.toLocaleString()}</span>
              </div>
            </div>

            {message && (
              <div className={`mb-4 px-4 py-3 rounded-xl text-sm ${message.startsWith('❌') ? 'bg-red-500/10 border border-red-500/30 text-red-400' : 'bg-neon-green/10 border border-neon-green/30 text-neon-green'}`}>
                {message}
              </div>
            )}

            {loading ? (
              <div className="card text-center py-10 text-canvas-muted">Загрузка...</div>
            ) : (
              <div className="space-y-6">
                {categories.map((cat) => {
                  const catItems = items.filter((i) => i.category === cat.key);
                  if (catItems.length === 0) return null;
                  return (
                    <div key={cat.key}>
                      <h2 className="font-display font-bold text-lg text-canvas-bright mb-3 flex items-center gap-2">
                        {cat.icon} {cat.name}
                      </h2>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {catItems.map((item) => (
                          <div key={item.id} className={`card ${item.is_owned ? 'opacity-60 border-neon-green/30' : ''}`}>
                            <div className="flex items-start gap-3 mb-3">
                              <div className="text-3xl flex-shrink-0">{item.emoji}</div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-display font-semibold text-canvas-bright">{item.name}</h3>
                                <p className="text-xs text-canvas-muted mt-1">{item.description}</p>
                              </div>
                            </div>

                            {/* Palette preview */}
                            {item.category === 'palette' && item.data?.colors && (
                              <div className="flex gap-1 mb-3 flex-wrap">
                                {item.data.colors.map((c: string, i: number) => (
                                  <div key={i} className="w-6 h-6 rounded-md border border-canvas-border"
                                    style={{ backgroundColor: c }} />
                                ))}
                              </div>
                            )}

                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5">
                                <Coins size={14} className="text-yellow-400" />
                                <span className="font-mono font-bold text-canvas-bright">{item.price_coins.toLocaleString()}</span>
                              </div>
                              {item.is_owned ? (
                                <span className="text-xs text-neon-green flex items-center gap-1">
                                  <CheckCircle size={12} /> Куплено
                                </span>
                              ) : (
                                <button onClick={() => handleBuy(item.code)}
                                  disabled={!item.can_afford || buying === item.code}
                                  className={`px-4 py-1.5 rounded-xl text-sm font-display font-semibold transition-all ${
                                    item.can_afford
                                      ? 'bg-orange-500/10 border border-orange-500/30 text-orange-400 hover:bg-orange-500/20'
                                      : 'bg-canvas-elevated border border-canvas-border text-canvas-muted cursor-not-allowed'
                                  }`}>
                                  {buying === item.code ? '...' : item.can_afford ? 'Купить' : 'Не хватает'}
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-8 p-4 bg-canvas-elevated rounded-xl border border-canvas-border">
              <h3 className="font-display font-semibold text-canvas-bright mb-2 flex items-center gap-2">
                <Sparkles size={14} className="text-yellow-400" /> Как заработать PixelCoin?
              </h3>
              <ul className="space-y-1 text-sm text-canvas-muted">
                <li>• <span className="text-canvas-bright">1 PC</span> за каждый поставленный пиксель</li>
                <li>• <span className="text-canvas-bright">50 PC</span> за приглашение друга</li>
                <li>• <span className="text-canvas-bright">10 – 10 000 PC</span> за достижения</li>
                <li>• <span className="text-canvas-bright">500 – 2 000 PC</span> за топ-3 батла</li>
              </ul>
              <Link to="/achievements" className="inline-block mt-3 text-sm text-orange-400 hover:underline">
                Посмотреть все достижения →
              </Link>
            </div>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
}


// ============ ACHIEVEMENTS ============
export function AchievementsPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [achievements, setAchievements] = useState<any[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    fetchApi('/api/economy/achievements').then(setAchievements).finally(() => setLoading(false));
    fetchApi('/api/economy/balance').then((d) => setBalance(d.balance)).catch(() => {});
  }, [user]);

  if (!user) return null;

  const earned = achievements.filter((a) => a.is_earned);
  const categories = [
    { key: 'progression', name: 'Прогрессия', icon: <Target size={16} /> },
    { key: 'social', name: 'Социальные', icon: <User size={16} /> },
    { key: 'clan', name: 'Клановые', icon: <Shield size={16} /> },
    { key: 'battle', name: 'Боевые', icon: <Trophy size={16} /> },
  ];

  return (
    <div className="min-h-screen bg-canvas-bg flex flex-col"><Navbar />
      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-20 sm:pt-24 pb-12">
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
              <div>
                <h1 className="font-display font-black text-2xl sm:text-3xl text-canvas-bright flex items-center gap-2">
                  <Trophy size={26} className="text-yellow-400" /> Достижения
                </h1>
                <p className="text-canvas-muted text-sm mt-1">
                  {earned.length} из {achievements.length} · Получено {earned.reduce((s, a) => s + a.coin_reward, 0)} PC
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="card !p-3 flex items-center gap-2">
                  <Coins size={18} className="text-yellow-400" />
                  <span className="font-mono font-bold text-canvas-bright">{balance.toLocaleString()}</span>
                </div>
                <Link to="/shop" className="btn-primary !px-4 !py-2.5 text-sm">Магазин</Link>
              </div>
            </div>

            {loading ? (
              <div className="card text-center py-10 text-canvas-muted">Загрузка...</div>
            ) : (
              <div className="space-y-6">
                {categories.map((cat) => {
                  const catItems = achievements.filter((a) => a.category === cat.key);
                  if (catItems.length === 0) return null;
                  return (
                    <div key={cat.key}>
                      <h2 className="font-display font-semibold text-base text-canvas-bright mb-3 flex items-center gap-2">
                        {cat.icon} {cat.name}
                      </h2>
                      <div className="grid sm:grid-cols-2 gap-2">
                        {catItems.map((ach) => (
                          <div key={ach.id}
                            className={`card !p-3 flex items-center gap-3 ${ach.is_earned ? 'border-yellow-400/40 bg-yellow-500/5' : 'opacity-60'}`}>
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${ach.is_earned ? 'bg-yellow-500/10' : 'bg-canvas-elevated'}`}>
                              {ach.is_earned ? ach.emoji : <Lock size={14} className="text-canvas-muted" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-display font-semibold text-sm text-canvas-bright flex items-center gap-2">
                                {ach.name}
                                {ach.is_earned && <CheckCircle size={12} className="text-yellow-400 flex-shrink-0" />}
                              </div>
                              <p className="text-xs text-canvas-muted mt-0.5">{ach.description}</p>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <Coins size={12} className="text-yellow-400" />
                              <span className="font-mono text-sm text-canvas-bright">{ach.coin_reward}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
