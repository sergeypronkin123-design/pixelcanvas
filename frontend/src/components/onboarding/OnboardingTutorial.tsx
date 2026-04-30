import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Coins, Trophy, ArrowRight, X } from 'lucide-react';
import { duration, easing, spring } from '../../lib/motion';

const STORAGE_KEY = 'pixelstake_onboarding_v1';

const STEPS = [
  {
    icon: Sparkles,
    title: 'Поставь свой первый пиксель',
    body: 'Кликни в любую точку холста. Твой пиксель появится в реальном времени, его увидят все игроки.',
    cta: 'Понятно',
  },
  {
    icon: Coins,
    title: 'Получай PixelCoin за каждый пиксель',
    body: 'За каждый поставленный пиксель ты получаешь 1 монету. Тратить можно на палитры, Pro-подписку и создание клана.',
    cta: 'Дальше',
  },
  {
    icon: Trophy,
    title: 'Побеждай в ежемесячных битвах',
    body: 'Топ-3 игроков каждого месяца получают по 1500₽ на карту. Соревнуйся соло или вступай в клан и захватывай территорию.',
    cta: 'В бой',
  },
];

interface OnboardingProps {
  forceShow?: boolean;
  onClose?: () => void;
}

export function OnboardingTutorial({ forceShow = false, onClose }: OnboardingProps) {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (forceShow) {
      setVisible(true);
      return;
    }
    try {
      const seen = localStorage.getItem(STORAGE_KEY);
      if (!seen) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, [forceShow]);

  const close = () => {
    try {
      localStorage.setItem(STORAGE_KEY, 'completed');
    } catch {}
    setVisible(false);
    onClose?.();
  };

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      close();
    }
  };

  const Icon = STEPS[step].icon;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: duration.base, ease: easing.standard }}
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ backgroundColor: 'rgba(8, 8, 12, 0.85)', backdropFilter: 'blur(8px)' }}
        >
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.96 }}
            transition={spring.gentle}
            className="relative w-full max-w-md bg-surface-raised border border-border rounded-3xl p-8 shadow-elevated"
          >
            <button
              onClick={close}
              aria-label="Закрыть"
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-elevated transition-colors duration-fast"
            >
              <X className="w-4 h-4" strokeWidth={2} />
            </button>

            {/* Progress dots */}
            <div className="flex justify-center gap-2 mb-8">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-base ease-apple ${
                    i === step ? 'w-8 bg-accent' : i < step ? 'w-2 bg-accent/40' : 'w-2 bg-border'
                  }`}
                />
              ))}
            </div>

            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center">
                <Icon className="w-7 h-7 text-accent" strokeWidth={1.8} />
              </div>
            </div>

            <h2 className="font-display text-2xl font-bold text-text-primary text-center tracking-tight mb-3">
              {STEPS[step].title}
            </h2>
            <p className="text-base text-text-secondary text-center leading-relaxed mb-8">
              {STEPS[step].body}
            </p>

            <motion.button
              onClick={next}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={spring.standard}
              className="w-full h-12 px-6 rounded-xl bg-accent hover:bg-accent-hover text-text-primary font-medium transition-colors duration-fast inline-flex items-center justify-center gap-2 shadow-card"
            >
              {STEPS[step].cta}
              <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
            </motion.button>

            {step < STEPS.length - 1 && (
              <button
                onClick={close}
                className="block mx-auto mt-4 text-sm text-text-tertiary hover:text-text-secondary transition-colors duration-fast"
              >
                Пропустить
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
