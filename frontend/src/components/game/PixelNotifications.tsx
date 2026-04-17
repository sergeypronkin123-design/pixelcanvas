import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PixelNotification {
  id: number;
  text: string;
  color: string;
  x: number;
  y: number;
}

let notifId = 0;

export function usePixelNotifications(user: any) {
  const [notifications, setNotifications] = useState<PixelNotification[]>([]);

  const addNotification = useCallback((text: string, color: string) => {
    const id = ++notifId;
    // Random position near top
    const x = 50 + Math.random() * 200;
    const y = 80 + Math.random() * 40;
    setNotifications((prev) => [...prev.slice(-4), { id, text, color, x, y }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 2500);
  }, []);

  const handleBatchPixels = useCallback((pixels: { x: number; y: number; color: string; user_id?: number; clan_id?: number }[]) => {
    if (!user) return;
    for (const p of pixels) {
      // Кто-то перекрасил наш пиксель
      if (p.user_id && p.user_id !== user.id && p.clan_id && user.clan_id && p.clan_id !== user.clan_id) {
        addNotification('Территория атакована!', '#ef4444');
        return; // одно уведомление за батч
      }
    }
  }, [user, addNotification]);

  return { notifications, handleBatchPixels, addNotification };
}

export function PixelNotifications({ notifications }: { notifications: PixelNotification[] }) {
  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <AnimatePresence>
        {notifications.map((n) => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.8 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="mb-2 px-4 py-2 rounded-xl text-sm font-display font-bold text-white whitespace-nowrap"
            style={{ background: `${n.color}cc`, boxShadow: `0 0 20px ${n.color}44` }}
          >
            {n.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
