import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { motion, AnimatePresence } from 'framer-motion';

const API = import.meta.env.VITE_API_URL || '';

function fetchWithAuth(path: string, opts?: RequestInit) {
  const token = localStorage.getItem('token');
  return fetch(`${API}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(opts?.headers as any) },
  });
}

// ============ ONBOARDING ============

const STEPS = [
  {
    title: 'Добро пожаловать в PixelStake!',
    text: 'Каждый месяц — эпическая битва за холст 1000×1000 пикселей. Ставь пиксели, захватывай территорию, побеждай.',
    icon: '🎯',
  },
  {
    title: 'Ставь пиксели',
    text: 'Выбери цвет в палитре, нажми на холст — пиксель твой! Бесплатно: 1 пиксель каждые 30 секунд. С Pro — каждые 5.',
    icon: '🎨',
  },
  {
    title: 'Создай клан',
    text: 'Объединяйся с друзьями в клан. Вместе захватывайте территорию и сражайтесь за топ-3!',
    icon: '⚔',
  },
  {
    title: 'Зарабатывай PixelCoin',
    text: 'За каждый пиксель — 1 монета. Трать на эксклюзивные цвета, создание клана и бонусы. Заходи каждый день ради streak-бонуса!',
    icon: '💰',
  },
  {
    title: 'Побеждай и получай призы',
    text: 'Топ-3 игрока и кланы получают Pro-подписку, бонусные пиксели и тысячи PixelCoin!',
    icon: '🏆',
  },
];

export function OnboardingTutorial({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      fetchWithAuth('/api/economy/complete-onboarding', { method: 'POST' }).catch(() => {});
      onComplete();
    } else {
      setStep((s) => s + 1);
    }
  };

  const handleSkip = () => {
    fetchWithAuth('/api/economy/complete-onboarding', { method: 'POST' }).catch(() => {});
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-[9998] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        key={step}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className="w-full max-w-sm"
      >
        <div className="bg-canvas-surface border border-canvas-border rounded-2xl p-6 text-center">
          <div className="text-5xl mb-4">{STEPS[step].icon}</div>
          <h2 className="font-display font-bold text-xl text-canvas-bright mb-2">
            {STEPS[step].title}
          </h2>
          <p className="text-canvas-muted text-sm leading-relaxed mb-6">
            {STEPS[step].text}
          </p>

          {/* Progress dots */}
          <div className="flex justify-center gap-1.5 mb-5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === step ? 'bg-orange-500 w-6' : i < step ? 'bg-orange-500/50' : 'bg-canvas-border'
                }`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSkip}
              className="flex-1 px-4 py-2.5 text-sm text-canvas-muted hover:text-canvas-bright transition-all rounded-xl"
            >
              Пропустить
            </button>
            <button
              onClick={handleNext}
              className="flex-1 px-4 py-2.5 text-sm font-display font-bold bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-400 hover:to-red-400 transition-all"
            >
              {isLast ? 'Начать играть!' : 'Далее'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}


// ============ DAILY REWARD POPUP ============

export function DailyRewardPopup() {
  const user = useAuthStore((s) => s.user);
  const [show, setShow] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    fetchWithAuth('/api/economy/daily-status')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d?.can_claim) setShow(true);
      })
      .catch(() => {});
  }, [user]);

  const handleClaim = async () => {
    setClaiming(true);
    try {
      const res = await fetchWithAuth('/api/economy/daily-reward', { method: 'POST' });
      const data = await res.json();
      setResult(data);
    } catch {
      setShow(false);
    }
    setClaiming(false);
  };

  if (!show || !user) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9997] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="w-full max-w-xs"
        >
          <div className="bg-canvas-surface border border-yellow-500/30 rounded-2xl p-6 text-center">
            {result ? (
              <>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 10, stiffness: 200, delay: 0.1 }}
                  className="text-5xl mb-3"
                >
                  🎁
                </motion.div>
                <h2 className="font-display font-bold text-lg text-canvas-bright mb-1">
                  +{result.reward} PixelCoin!
                </h2>
                <p className="text-canvas-muted text-sm mb-1">
                  Streak: {result.streak} {result.streak === 1 ? 'день' : result.streak < 5 ? 'дня' : 'дней'}
                </p>
                <p className="text-xs text-yellow-400/70 mb-4">
                  Заходи завтра чтобы увеличить streak!
                </p>
                <button
                  onClick={() => setShow(false)}
                  className="w-full px-4 py-2.5 text-sm font-display font-bold bg-gradient-to-r from-yellow-500 to-orange-500 text-black rounded-xl"
                >
                  Отлично!
                </button>
              </>
            ) : (
              <>
                <div className="text-5xl mb-3">🎁</div>
                <h2 className="font-display font-bold text-lg text-canvas-bright mb-1">
                  Ежедневная награда
                </h2>
                <p className="text-canvas-muted text-sm mb-4">
                  Заходи каждый день и получай больше PixelCoin!
                </p>
                <button
                  onClick={handleClaim}
                  disabled={claiming}
                  className="w-full px-4 py-2.5 text-sm font-display font-bold bg-gradient-to-r from-yellow-500 to-orange-500 text-black rounded-xl disabled:opacity-50"
                >
                  {claiming ? 'Получаем...' : 'Забрать награду'}
                </button>
                <button
                  onClick={() => setShow(false)}
                  className="mt-2 text-xs text-canvas-muted hover:text-canvas-bright"
                >
                  Позже
                </button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
