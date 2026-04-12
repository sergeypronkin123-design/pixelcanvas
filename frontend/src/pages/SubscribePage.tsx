import { useState, useEffect } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { motion } from 'framer-motion';
import { Crown, Zap, Clock, Check, CreditCard } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export function SubscribePage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [subStatus, setSubStatus] = useState<any>(null);

  useEffect(() => {
    if (user) api.getSubStatus().then(setSubStatus).catch(() => {});
  }, [user]);

  const handleSubscribe = async (provider: 'stripe' | 'yukassa') => {
    if (!user) { navigate('/login'); return; }
    setLoading(true);
    try {
      const res = await api.subscribeCheckout(provider);
      window.location.href = res.checkout_url;
    } catch (e: any) {
      alert(e.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-canvas-bg"><Navbar />
      <div className="max-w-3xl mx-auto px-6 pt-24 pb-16">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center mb-12">
          <Crown size={48} className="text-yellow-400 mx-auto mb-4" />
          <h1 className="font-display font-black text-4xl text-canvas-bright mb-3">PixelStake Pro</h1>
          <p className="text-canvas-muted text-lg">Доминируй на холсте. В 6 раз быстрее обычных игроков.</p>
        </motion.div>

        {subStatus?.is_subscriber ? (
          <div className="card text-center py-10">
            <Check size={48} className="text-neon-green mx-auto mb-4" />
            <h2 className="font-display font-bold text-2xl text-canvas-bright mb-2">Подписка активна!</h2>
            <p className="text-canvas-muted">Действует до: <span className="text-orange-400 font-mono">{new Date(subStatus.subscription_until).toLocaleDateString('ru')}</span></p>
            <p className="text-canvas-muted text-sm mt-4">Ставь пиксели каждые 5 секунд</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Free */}
            <div className="card">
              <h3 className="font-display font-bold text-lg text-canvas-bright mb-4">Бесплатно</h3>
              <div className="text-3xl font-display font-black text-canvas-bright mb-6">$0</div>
              <ul className="space-y-3 text-sm text-canvas-muted mb-6">
                <li className="flex items-center gap-2"><Check size={14} className="text-neon-green" /> 1 пиксель каждые 30 секунд</li>
                <li className="flex items-center gap-2"><Check size={14} className="text-neon-green" /> Участие в батлах</li>
                <li className="flex items-center gap-2"><Check size={14} className="text-neon-green" /> Сохранение результатов</li>
              </ul>
              <Link to="/canvas" className="btn-secondary w-full text-center block">Играть бесплатно</Link>
            </div>

            {/* Pro */}
            <div className="card border-orange-500/30 relative overflow-hidden">
              <div className="absolute top-0 right-0 px-3 py-1 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-display font-bold rounded-bl-xl">
                6x БЫСТРЕЕ
              </div>
              <h3 className="font-display font-bold text-lg text-orange-400 mb-4 flex items-center gap-2">
                <Crown size={18} /> Pro
              </h3>
              <div className="text-3xl font-display font-black text-canvas-bright mb-1">$2.99 <span className="text-base font-normal text-canvas-muted">/ 199₽</span></div>
              <div className="text-xs text-canvas-muted mb-6">на 30 дней</div>
              <ul className="space-y-3 text-sm text-canvas-muted mb-6">
                <li className="flex items-center gap-2"><Zap size={14} className="text-orange-400" /> 1 пиксель каждые 5 секунд</li>
                <li className="flex items-center gap-2"><Check size={14} className="text-neon-green" /> Участие в батлах</li>
                <li className="flex items-center gap-2"><Check size={14} className="text-neon-green" /> Сохранение результатов</li>
                <li className="flex items-center gap-2"><Crown size={14} className="text-yellow-400" /> Значок Pro в профиле</li>
              </ul>
              <div className="space-y-2">
                <button onClick={() => handleSubscribe('stripe')} disabled={loading}
                  className="btn-primary w-full flex items-center justify-center gap-2">
                  <CreditCard size={16} /> {loading ? '...' : 'Оплатить $2.99 (Card)'}
                </button>
                <button onClick={() => handleSubscribe('yukassa')} disabled={loading}
                  className="w-full px-6 py-3 bg-neon-green/10 border border-neon-green/30 text-neon-green rounded-xl
                             font-display font-bold hover:bg-neon-green/20 transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                  {loading ? '...' : 'Оплатить 199₽ (ЮKassa)'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function SubscribeSuccessPage() {
  return (
    <div className="min-h-screen bg-canvas-bg"><Navbar />
      <div className="flex items-center justify-center min-h-screen px-4 pt-14">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center max-w-md">
          <Crown size={64} className="text-yellow-400 mx-auto mb-6" />
          <h1 className="font-display font-bold text-3xl text-canvas-bright mb-3">Pro активирован!</h1>
          <p className="text-canvas-muted mb-8">Теперь ты можешь ставить пиксели каждые 5 секунд. Вперёд к победе!</p>
          <Link to="/canvas" className="btn-primary inline-flex items-center gap-2">В бой! <Zap size={16} /></Link>
        </motion.div>
      </div>
    </div>
  );
}

export function SubscribeCancelPage() {
  return (
    <div className="min-h-screen bg-canvas-bg"><Navbar />
      <div className="flex items-center justify-center min-h-screen px-4 pt-14">
        <div className="text-center max-w-md">
          <h1 className="font-display font-bold text-2xl text-canvas-bright mb-3">Оплата отменена</h1>
          <p className="text-canvas-muted mb-6">Можешь попробовать позже или играть бесплатно.</p>
          <Link to="/canvas" className="btn-secondary">Вернуться на холст</Link>
        </div>
      </div>
    </div>
  );
}
