import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FloatingReaction {
  id: number;
  emoji: string;
  x: number;
  y: number;
}

let reactionId = 0;

const REACTIONS = ['🔥', '❤️', '👀', '💀', '😂', '⚔️'];

export function useReactions() {
  const [floating, setFloating] = useState<FloatingReaction[]>([]);

  const addReaction = useCallback((emoji: string) => {
    const id = ++reactionId;
    const x = 40 + Math.random() * 60; // % from left
    const y = 30 + Math.random() * 40; // % from top
    setFloating((prev) => [...prev.slice(-10), { id, emoji, x, y }]);
    setTimeout(() => {
      setFloating((prev) => prev.filter((r) => r.id !== id));
    }, 2000);
  }, []);

  return { floating, addReaction };
}

export function ReactionBar({ onReact }: { onReact: (emoji: string) => void }) {
  return (
    <div className="flex gap-1">
      {REACTIONS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => onReact(emoji)}
          className="w-7 h-7 rounded-lg bg-canvas-bg border border-canvas-border flex items-center justify-center text-sm hover:scale-125 hover:bg-canvas-elevated transition-all"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

export function FloatingReactions({ reactions }: { reactions: FloatingReaction[] }) {
  return (
    <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
      <AnimatePresence>
        {reactions.map((r) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, y: 0, scale: 0.5 }}
            animate={{ opacity: 1, y: -60, scale: 1.2 }}
            exit={{ opacity: 0, y: -120, scale: 0.3 }}
            transition={{ duration: 1.8, ease: 'easeOut' }}
            className="absolute text-2xl"
            style={{ left: `${r.x}%`, top: `${r.y}%` }}
          >
            {r.emoji}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
