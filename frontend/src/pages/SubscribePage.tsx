import { useState, useEffect } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { motion } from 'framer-motion';
import { Crown, Zap, Check, CreditCard } from 'lucide-react';
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
    <div className="min-h-screen bg-canvas-bg flex flex-col"><Navbar />
      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-20 sm:pt-24 pb-12">
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center mb-10">
            <Crown size={44} className="text-yellow-400 mx-auto mb-4" />
            <h1 className="font-display font-black text-3xl sm:text-4xl text-canvas-bright mb-2">PixelStake Pro</h1>
            <p className="text-canvas-muted text-base sm:text-lg">Доминируй на холсте. В 6 раз быстрее обычных игроков.</p>
          </motion.div>

          {subStatus?.is_subscriber ? (
            <div className="card text-center py-10">
              <Check size={48} className="text-neon-green mx-auto mb-4" />
              <h2 className="font-display font-bold text-2xl text-canvas-bright mb-2">Подписка активна</h2>
              <p className="text-canvas-muted">Действует до: <span className="text-orange-400 font-mono">{new Date(subStatus.subscription_until).toLocaleDateString('ru')}</span></p>
              <p className="text-canvas-muted text-sm mt-4">Ставь пиксели каждые 5 секунд</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
              {/* Free */}
              <div className="card">
                <h3 className="font-display font-bold text-lg text-canvas-bright mb-4">Бесплатно</h3>
                <div className="text-3xl font-display font-black text-canvas-bright mb-6">0 ₽</div>
                <ul className="space-y-3 text-sm text-canvas-muted mb-6">
                  <li className="flex items-center gap-2"><Check size={14} className="text-neon-green flex-shrink-0" /> 1 пиксель каждые 30 секунд</li>
                  <li className="flex items-center gap-2"><Check size={14} className="text-neon-green flex-shrink-0" /> Участие во всех батлах</li>
                  <li className="flex items-center gap-2"><Check size={14} className="text-neon-green flex-shrink-0" /> Бонусные пиксели за друзей</li>
                </ul>
                <Link to="/canvas" className="btn-secondary w-full text-center block">Играть бесплатно</Link>
              </div>

              {/* Pro */}
              <div className="card border-orange-500/30 relative overflow-hidden">
                <div className="absolute top-0 right-0 px-3 py-1 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-display font-bold rounded-bl-xl">
                  6× БЫСТРЕЕ
                </div>
                <h3 className="font-display font-bold text-lg text-orange-400 mb-4 flex items-center gap-2">
                  <Crown size={18} /> Pro
                </h3>
                <div className="text-3xl font-display font-black text-canvas-bright mb-1">
                  199 ₽ <span className="text-base font-normal text-canvas-muted">/ $2.99</span>
                </div>
                <div className="text-xs text-canvas-muted mb-4">за 30 дней доступа</div>

                <div className="mb-5 p-3 bg-canvas-bg rounded-xl border border-canvas-border">
                  <h4 className="text-xs font-display font-semibold text-canvas-bright mb-2">Что вы получаете:</h4>
                  <ul className="space-y-1.5 text-xs text-canvas-muted">
                    <li className="flex items-start gap-2"><Zap size={12} className="text-orange-400 flex-shrink-0 mt-0.5" /> Ускоренный кулдаун — 5 сек вместо 30</li>
                    <li className="flex items-start gap-2"><Check size={12} className="text-neon-green flex-shrink-0 mt-0.5" /> Активация мгновенно после оплаты</li>
                    <li className="flex items-start gap-2"><Check size={12} className="text-neon-green flex-shrink-0 mt-0.5" /> Срок: 30 календарных дней</li>
                    <li className="flex items-start gap-2"><Crown size={12} className="text-yellow-400 flex-shrink-0 mt-0.5" /> Значок Pro в профиле</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <button onClick={() => handleSubscribe('yukassa')} disabled={loading}
                    className="w-full px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl
                               font-display font-bold hover:from-orange-400 hover:to-red-400 transition-all
                               disabled:opacity-40 flex items-center justify-center gap-2">
                    <CreditCard size={16} /> {loading ? '...' : 'Оплатить 199 ₽'}
                  </button>
                  <button onClick={() => handleSubscribe('stripe')} disabled={loading}
                    className="w-full px-6 py-2.5 bg-canvas-elevated border border-canvas-border text-canvas-muted rounded-xl
                               font-display text-sm hover:border-orange-500/30 hover:text-canvas-bright transition-all
                               disabled:opacity-40 flex items-center justify-center gap-2">
                    {loading ? '...' : '$2.99 international card'}
                  </button>
                </div>

                <p className="text-[10px] text-canvas-muted mt-3 text-center">
                  Нажимая кнопку, вы соглашаетесь с <Link to="/offer" className="text-orange-400 hover:underline">офертой</Link>
                </p>
              </div>
            </div>
          )}

          <div className="mt-8 text-center">
            <p className="text-xs text-canvas-muted">
              Возврат средств возможен согласно <Link to="/refund" className="text-orange-400 hover:underline">политике возврата</Link>
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export function SubscribeSuccessPage() {
  return (
    <div className="min-h-screen bg-canvas-bg flex flex-col"><Navbar />
      <main className="flex-1 flex items-center justify-center px-4 pt-14">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center max-w-md">
          <Crown size={56} className="text-yellow-400 mx-auto mb-5" />
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-canvas-bright mb-3">Pro активирован!</h1>
          <p className="text-canvas-muted mb-6 text-sm">Теперь ты можешь ставить пиксели каждые 5 секунд. Вперёд к победе!</p>
          <Link to="/canvas" className="btn-primary inline-flex items-center gap-2">В бой! <Zap size={16} /></Link>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}

export function SubscribeCancelPage() {
  return (
    <div className="min-h-screen bg-canvas-bg flex flex-col"><Navbar />
      <main className="flex-1 flex items-center justify-center px-4 pt-14">
        <div className="text-center max-w-md">
          <h1 className="font-display font-bold text-xl sm:text-2xl text-canvas-bright mb-3">Оплата отменена</h1>
          <p className="text-canvas-muted mb-6 text-sm">Можешь попробовать позже или играть бесплатно.</p>
          <Link to="/canvas" className="btn-secondary">Вернуться на холст</Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
