import { useEffect, useState, useCallback } from 'react';
import { CanvasRenderer } from '@/components/canvas/CanvasRenderer';
import { Navbar } from '@/components/layout/Navbar';
import { useAuthStore } from '@/stores/authStore';
import { useWebSocket } from '@/hooks/useWebSocket';
import { api } from '@/lib/api';
import { getRank } from '@/lib/ranks';
import { Users, Clock, Swords, Crown, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';

export function CanvasPage() {
  const { user, loadUser } = useAuthStore();
  const [status, setStatus] = useState<any>(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState('');
  const [pixelUpdates, setPixelUpdates] = useState<{ x: number; y: number; color: string }[]>([]);
  const [totalPixels, setTotalPixels] = useState(user?.pixels_placed_total || 0);

  useEffect(() => {
    api.getBattleStatus().then((s) => { setStatus(s); setOnlineCount(s.online_count); }).catch(() => {});
  }, []);

  useEffect(() => { setTotalPixels(user?.pixels_placed_total || 0); }, [user]);

  const handleWS = useCallback((msg: any) => {
    if (msg.type === 'online_count') setOnlineCount(msg.count);
    else if (msg.type === 'pixel') setPixelUpdates((prev) => [...prev, { x: msg.x, y: msg.y, color: msg.color }]);
    else if (msg.type === 'pixels_batch' && Array.isArray(msg.pixels)) {
      setPixelUpdates((prev) => [...prev, ...msg.pixels.map((p: any) => ({ x: p.x, y: p.y, color: p.color }))]);
    }
  }, []);
  useWebSocket(handleWS);

  // Timer
  useEffect(() => {
    if (!status) return;
    const target = status.is_active ? status.battle_end : status.next_battle_start;
    if (!target) return;
    const interval = setInterval(() => {
      const diff = new Date(target).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft('00:00:00'); api.getBattleStatus().then(setStatus).catch(() => {}); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(d > 0 ? `${d}д ${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}` : `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [status]);

  const handlePixelPlaced = useCallback(() => {
    setTotalPixels((p) => p + 1);
    // Reload user to update server-side count
    setTimeout(() => loadUser(), 500);
  }, [loadUser]);

  const rank = getRank(totalPixels);

  return (
    <div className="h-screen w-screen overflow-hidden bg-canvas-bg">
      <Navbar />

      {/* HUD bar */}
      <div className="fixed top-14 left-0 right-0 z-40 flex items-center justify-between px-2 sm:px-3 py-1 glass text-[10px] sm:text-xs overflow-x-auto">
        <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
          {status?.is_active ? (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-500/10 border border-red-500/30">
              <Swords size={10} className="text-red-400" />
              <span className="font-display font-bold text-red-400 hidden sm:inline">BATTLE</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-canvas-elevated border border-canvas-border">
              <Lock size={10} className="text-canvas-muted" />
            </div>
          )}
          <div className="flex items-center gap-1">
            <Clock size={10} className="text-orange-400" />
            <span className="font-mono text-orange-400 font-bold">{timeLeft}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
          {user && (
            <Link to="/profile" className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-canvas-elevated border border-canvas-border">
              <span className="text-[10px]">{rank.emoji}</span>
              <span className="font-mono text-canvas-muted">{totalPixels}</span>
            </Link>
          )}

          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
            <span className="font-mono text-canvas-bright">{onlineCount}</span>
          </div>

          {/* Pro */}
          {user?.is_subscriber ? (
            <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-yellow-500/10 border border-yellow-500/30">
              <Crown size={10} className="text-yellow-400" />
              <span className="font-display font-bold text-yellow-400">PRO</span>
            </div>
          ) : user ? (
            <Link to="/subscribe" className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-canvas-elevated border border-canvas-border hover:border-orange-500/30 transition-all">
              <Crown size={10} className="text-canvas-muted" />
              <span className="font-display text-canvas-muted">Pro</span>
            </Link>
          ) : null}
        </div>
      </div>

      {/* Canvas */}
      <div className="pt-[82px] h-full">
        <CanvasRenderer battleActive={status?.is_active || false} onPixelPlaced={handlePixelPlaced} pixelUpdates={pixelUpdates} />
      </div>

      {/* Login prompt */}
      {!user && status?.is_active && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 glass rounded-2xl px-6 py-3 text-center">
          <p className="text-sm text-canvas-muted mb-2">Войди, чтобы ставить пиксели</p>
          <Link to="/login" className="btn-primary text-sm !px-6 !py-2">Войти</Link>
        </div>
      )}

      {/* Battle inactive overlay */}
      {!status?.is_active && (
        <div className="fixed inset-0 z-30 flex items-center justify-center pointer-events-none" style={{ paddingTop: '82px' }}>
          <div className="glass rounded-3xl px-10 py-8 text-center pointer-events-auto max-w-md">
            <Swords size={44} className="text-canvas-muted mx-auto mb-4" />
            <h2 className="font-display font-bold text-2xl text-canvas-bright mb-2">Батл завершён</h2>
            <p className="text-canvas-muted text-sm mb-4">Следующий батл начнётся 1 числа</p>
            <div className="text-2xl font-mono text-orange-400 font-bold">{timeLeft}</div>
          </div>
        </div>
      )}
    </div>
  );
}
