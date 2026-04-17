import { useEffect, useState, useCallback, useRef } from 'react';
import { CanvasRenderer } from '@/components/canvas/CanvasRenderer';
import { Navbar } from '@/components/layout/Navbar';
import { useAuthStore } from '@/stores/authStore';
import { useWebSocket } from '@/hooks/useWebSocket';
import { api } from '@/lib/api';
import { getRank } from '@/lib/ranks';
import { Users, Clock, Swords, Crown, Lock } from 'lucide-react';
import { RankIcon } from '@/components/icons/RankIcons';
import { Link } from 'react-router-dom';
import { OnboardingTutorial, DailyRewardPopup } from '@/components/game/OnboardingAndRewards';
import { ShareArtButton } from '@/components/game/ShareArtButton';
import { Minimap } from '@/components/canvas/Minimap';
import { usePixelNotifications, PixelNotifications } from '@/components/game/PixelNotifications';
import { useReactions, ReactionBar, FloatingReactions } from '@/components/game/Reactions';

export function CanvasPage() {
  const { user, loadUser } = useAuthStore();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState('');
  const [pixelUpdates, setPixelUpdates] = useState<{ x: number; y: number; color: string }[]>([]);
  const [totalPixels, setTotalPixels] = useState(user?.pixels_placed_total || 0);

  // Refs from CanvasRenderer
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenElRef = useRef<HTMLCanvasElement | null>(null);
  const viewportRef = useRef({ x: 0, y: 0, scale: 1 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Notifications + Reactions
  const { notifications, handleBatchPixels } = usePixelNotifications(user);
  const { floating, addReaction } = useReactions();

  useEffect(() => {
    api.getBattleStatus().then((s) => { setStatus(s); setOnlineCount(s.online_count); }).catch(() => {});
  }, []);

  useEffect(() => { setTotalPixels(user?.pixels_placed_total || 0); }, [user]);

  useEffect(() => {
    if (user && !user.onboarding_completed) setShowOnboarding(true);
  }, [user]);

  const handleWS = useCallback((msg: any) => {
    if (msg.type === 'online_count') setOnlineCount(msg.count);
    else if (msg.type === 'pixel') {
      setPixelUpdates((prev) => [...prev, { x: msg.x, y: msg.y, color: msg.color }]);
    } else if (msg.type === 'pixels_batch' && Array.isArray(msg.pixels)) {
      const batch = msg.pixels.map((p: any) => ({ x: p.x, y: p.y, color: p.color, user_id: p.user_id, clan_id: p.clan_id }));
      setPixelUpdates((prev) => [...prev, ...batch]);
      handleBatchPixels(batch);
    } else if (msg.type === 'reaction') {
      addReaction(msg.emoji);
    }
  }, [handleBatchPixels, addReaction]);
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
    // Optimistic: increment my_pixels locally
    setStatus((prev: any) => prev ? { ...prev, my_pixels_on_canvas: (prev.my_pixels_on_canvas || 0) + 1 } : prev);
    setTimeout(() => loadUser(), 500);
  }, [loadUser]);

  const handleRefsReady = useCallback((canvas: HTMLCanvasElement, offscreen: HTMLCanvasElement, vp: { x: number; y: number; scale: number }) => {
    canvasElRef.current = canvas;
    offscreenElRef.current = offscreen;
    viewportRef.current = vp;
  }, []);

  const handleMinimapNavigate = useCallback((wx: number, wy: number) => {
    // Навигация по мини-карте — посылаем событие в CanvasRenderer через viewport
    // Простейший подход: устанавливаем viewport
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const scale = viewportRef.current.scale;
    // Центрируем viewport на (wx, wy)
    const newX = -wx * scale + rect.width / 2;
    const newY = -wy * scale + rect.height / 2;
    // TODO: нужно прокинуть setViewport из CanvasRenderer
    // Пока мини-карта показывает только обзор без навигации по клику
  }, []);

  const rank = getRank(totalPixels);

  return (
    <div className="h-screen w-screen overflow-hidden bg-canvas-bg">
      <Navbar />

      {/* Onboarding */}
      {showOnboarding && <OnboardingTutorial onComplete={() => setShowOnboarding(false)} />}

      {/* Daily reward */}
      {!showOnboarding && user && <DailyRewardPopup />}

      {/* Territory notifications */}
      <PixelNotifications notifications={notifications} />

      {/* Floating reactions */}
      <FloatingReactions reactions={floating} />

      {/* HUD bar */}
      <div className="fixed top-14 left-0 right-0 z-40 flex items-center justify-between px-2 sm:px-3 py-1 glass text-[10px] sm:text-xs overflow-x-auto">
        <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
          {status?.phase === 'solo' ? (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/30">
              <Swords size={10} className="text-orange-400" />
              <span className="font-display font-bold text-orange-400 hidden sm:inline">СОЛО</span>
            </div>
          ) : status?.phase === 'clan' ? (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30">
              <Swords size={10} className="text-purple-400" />
              <span className="font-display font-bold text-purple-400 hidden sm:inline">КЛАНЫ</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-canvas-elevated border border-canvas-border">
              <Lock size={10} className="text-canvas-muted" />
              <span className="font-display text-canvas-muted hidden sm:inline">Пауза</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Clock size={10} className="text-orange-400" />
            <span className="font-mono text-orange-400 font-bold">{timeLeft}</span>
          </div>
          {/* My pixels on canvas */}
          {user && status?.my_pixels_on_canvas !== undefined && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-neon-green/10 border border-neon-green/30">
              <span className="font-mono text-neon-green font-bold">{(status.my_pixels_on_canvas || 0).toLocaleString()}</span>
              <span className="text-neon-green/70 hidden sm:inline">блоков</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
          {/* Reactions */}
          {user && status?.is_active && (
            <ReactionBar onReact={addReaction} />
          )}

          {/* Share */}
          {user && <ShareArtButton canvasRef={canvasElRef as React.RefObject<HTMLCanvasElement>} />}

          {user && (
            <Link to="/profile" className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-canvas-elevated border border-canvas-border">
              <RankIcon tier={rank.tier} size={14} />
              <span className="font-mono text-canvas-muted">{totalPixels}</span>
            </Link>
          )}

          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
            <span className="font-mono text-canvas-bright">{onlineCount}</span>
          </div>

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
      <div ref={containerRef} className="pt-[82px] h-full relative">
        <CanvasRenderer
          battleActive={status?.is_active || false}
          onPixelPlaced={handlePixelPlaced}
          pixelUpdates={pixelUpdates}
          onRefsReady={handleRefsReady}
        />

        {/* Minimap */}
        {offscreenElRef.current && containerRef.current && (
          <Minimap
            offscreenCanvas={offscreenElRef.current}
            viewport={viewportRef.current}
            canvasWidth={1000}
            canvasHeight={1000}
            containerWidth={containerRef.current.clientWidth}
            containerHeight={containerRef.current.clientHeight}
            onNavigate={handleMinimapNavigate}
          />
        )}
      </div>

      {/* Login prompt */}
      {!user && status?.is_active && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 glass rounded-2xl px-6 py-3 text-center">
          <p className="text-sm text-canvas-muted mb-2">Войди, чтобы ставить пиксели</p>
          <Link to="/login" className="btn-primary text-sm !px-6 !py-2">Войти</Link>
        </div>
      )}

      {/* Battle inactive overlay */}
      {status && !status.is_active && (
        <div className="fixed inset-0 z-30 flex items-center justify-center pointer-events-none" style={{ paddingTop: '82px' }}>
          <div className="glass rounded-3xl px-10 py-8 text-center pointer-events-auto max-w-md">
            <Swords size={44} className="text-canvas-muted mx-auto mb-4" />
            <h2 className="font-display font-bold text-2xl text-canvas-bright mb-2">Мирное время</h2>
            <p className="text-canvas-muted text-sm mb-2">
              Следующий батл: <span className="text-canvas-bright font-semibold">
                {status.phase === 'peace' ? 'Соло (1-10 числа)' : 'скоро'}
              </span>
            </p>
            <p className="text-xs text-canvas-muted mb-4">
              1-10: Соло батл (кто больше пикселей) · 11-20: Клановые войны (территория)
            </p>
            <div className="text-2xl font-mono text-orange-400 font-bold">{timeLeft}</div>
          </div>
        </div>
      )}
    </div>
  );
}
