import { useRef, useEffect, useCallback, useState } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

const PALETTE = [
  '#FF0000', '#FF4500', '#FF8C00', '#FFD700', '#FFFF00',
  '#7CFC00', '#00FF00', '#00FA9A', '#00FFFF', '#00BFFF',
  '#0000FF', '#4B0082', '#8B00FF', '#FF00FF', '#FF1493',
  '#FFFFFF', '#C0C0C0', '#808080', '#404040', '#000000',
  '#8B4513', '#D2691E', '#F4A460', '#FFE4C4', '#FFC0CB',
];

interface CanvasRendererProps {
  battleActive: boolean;
  onPixelPlaced: () => void;
  pixelUpdates: { x: number; y: number; color: string }[];
}

export function CanvasRenderer({ battleActive, onPixelPlaced, pixelUpdates }: CanvasRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const user = useAuthStore((s) => s.user);

  const [viewport, setViewport] = useState({ x: 0, y: 0, scale: 1 });
  const [selectedColor, setSelectedColor] = useState('#FF0000');
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);

  const pixelsRef = useRef<Map<string, string>>(new Map());
  const viewportRef = useRef(viewport);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, vx: 0, vy: 0 });
  const hasDraggedRef = useRef(false);
  const animRef = useRef<number>();
  const lastLoadRef = useRef('');

  viewportRef.current = viewport;

  // Apply websocket pixel updates
  useEffect(() => {
    for (const p of pixelUpdates) {
      pixelsRef.current.set(`${p.x},${p.y}`, p.color);
    }
  }, [pixelUpdates]);

  // Load pixels for viewport
  const loadViewport = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const vp = viewportRef.current;
    const rect = canvas.getBoundingClientRect();

    const xMin = Math.max(0, Math.floor(-vp.x / vp.scale) - 10);
    const yMin = Math.max(0, Math.floor(-vp.y / vp.scale) - 10);
    const xMax = Math.min(1000, Math.ceil((rect.width - vp.x) / vp.scale) + 10);
    const yMax = Math.min(1000, Math.ceil((rect.height - vp.y) / vp.scale) + 10);

    const key = `${xMin},${yMin},${xMax},${yMax}`;
    if (key === lastLoadRef.current) return;
    lastLoadRef.current = key;

    api.getCanvas(xMin, yMin, xMax, yMax).then((data) => {
      for (const p of data.pixels) {
        pixelsRef.current.set(`${p.x},${p.y}`, p.color);
      }
    }).catch(() => {});
  }, []);

  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
    loadTimeoutRef.current = setTimeout(loadViewport, 150);
  }, [viewport, loadViewport]);

  useEffect(() => { loadViewport(); }, [loadViewport]);

  // Cooldown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setCooldownRemaining((prev) => Math.max(0, prev - 0.1));
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // Fetch initial cooldown
  useEffect(() => {
    if (user) {
      api.getCooldown().then((data) => {
        setCooldownRemaining(data.remaining);
      }).catch(() => {});
    }
  }, [user]);

  // Render loop
  useEffect(() => {
    let running = true;
    const render = () => {
      if (!running) return;
      const canvas = canvasRef.current;
      if (!canvas) { animRef.current = requestAnimationFrame(render); return; }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== Math.floor(rect.width * dpr) || canvas.height !== Math.floor(rect.height * dpr)) {
        canvas.width = Math.floor(rect.width * dpr);
        canvas.height = Math.floor(rect.height * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const vp = viewportRef.current;

      // Background
      ctx.fillStyle = '#111118';
      ctx.fillRect(0, 0, rect.width, rect.height);

      ctx.save();
      ctx.translate(vp.x, vp.y);
      ctx.scale(vp.scale, vp.scale);

      // Canvas boundary
      ctx.fillStyle = '#1a1a24';
      ctx.fillRect(0, 0, 1000, 1000);

      // Grid lines when zoomed
      if (vp.scale >= 4) {
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 0.5 / vp.scale;
        for (let i = 0; i <= 1000; i++) {
          ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 1000); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(1000, i); ctx.stroke();
        }
      }

      // Draw pixels
      const pixels = pixelsRef.current;
      const xMin = Math.max(0, Math.floor(-vp.x / vp.scale));
      const yMin = Math.max(0, Math.floor(-vp.y / vp.scale));
      const xMax = Math.min(1000, Math.ceil((rect.width - vp.x) / vp.scale));
      const yMax = Math.min(1000, Math.ceil((rect.height - vp.y) / vp.scale));

      for (let x = xMin; x < xMax; x++) {
        for (let y = yMin; y < yMax; y++) {
          const color = pixels.get(`${x},${y}`);
          if (color) {
            ctx.fillStyle = color;
            ctx.fillRect(x, y, 1, 1);
          }
        }
      }

      // Hover pixel highlight
      if (hoverPos && vp.scale >= 2) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2 / vp.scale;
        ctx.strokeRect(hoverPos.x, hoverPos.y, 1, 1);

        // Preview color
        ctx.fillStyle = selectedColor;
        ctx.globalAlpha = 0.5;
        ctx.fillRect(hoverPos.x, hoverPos.y, 1, 1);
        ctx.globalAlpha = 1;
      }

      ctx.restore();

      // HUD bottom-left
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(8, rect.height - 30, 200, 22);
      ctx.fillStyle = '#6b6b8a';
      ctx.font = '11px JetBrains Mono, monospace';
      const wx = hoverPos ? hoverPos.x : Math.floor(-vp.x / vp.scale);
      const wy = hoverPos ? hoverPos.y : Math.floor(-vp.y / vp.scale);
      ctx.fillText(`${wx}, ${wy}  zoom: ${vp.scale.toFixed(1)}x`, 14, rect.height - 14);

      animRef.current = requestAnimationFrame(render);
    };
    animRef.current = requestAnimationFrame(render);
    return () => { running = false; if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [hoverPos, selectedColor]);

  // Center on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    setViewport({ x: rect.width / 2 - 500, y: rect.height / 2 - 500, scale: 1 });
  }, []);

  const screenToWorld = useCallback((sx: number, sy: number) => {
    const vp = viewportRef.current;
    return { x: Math.floor((sx - vp.x) / vp.scale), y: Math.floor((sy - vp.y) / vp.scale) };
  }, []);

  // Place pixel on click
  const handlePlace = useCallback(async (wx: number, wy: number) => {
    if (!user || !battleActive || cooldownRemaining > 0) return;
    if (wx < 0 || wx >= 1000 || wy < 0 || wy >= 1000) return;
    try {
      const res = await api.placePixel(wx, wy, selectedColor);
      pixelsRef.current.set(`${wx},${wy}`, selectedColor);
      setCooldownRemaining(res.cooldown);
      onPixelPlaced();
    } catch (e: any) {
      if (e.message.includes('Wait')) {
        const match = e.message.match(/([\d.]+)s/);
        if (match) setCooldownRemaining(parseFloat(match[1]));
      }
    }
  }, [user, battleActive, cooldownRemaining, selectedColor, onPixelPlaced]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDraggingRef.current = true;
    hasDraggedRef.current = false;
    const vp = viewportRef.current;
    dragStartRef.current = { x: e.clientX, y: e.clientY, vx: vp.x, vy: vp.y };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    if (isDraggingRef.current) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasDraggedRef.current = true;
      setViewport(v => ({ ...v, x: dragStartRef.current.vx + dx, y: dragStartRef.current.vy + dy }));
      return;
    }

    const world = screenToWorld(sx, sy);
    if (world.x >= 0 && world.x < 1000 && world.y >= 0 && world.y < 1000) {
      setHoverPos(world);
    } else {
      setHoverPos(null);
    }
  }, [screenToWorld]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    const wasDrag = hasDraggedRef.current;
    isDraggingRef.current = false;
    if (!wasDrag) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const world = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
      handlePlace(world.x, world.y);
    }
  }, [screenToWorld, handlePlace]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const vp = viewportRef.current;
    const factor = e.deltaY < 0 ? 1.15 : 0.87;
    const newScale = Math.min(Math.max(vp.scale * factor, 0.3), 40);
    const wx = (sx - vp.x) / vp.scale;
    const wy = (sy - vp.y) / vp.scale;
    setViewport({ scale: newScale, x: sx - wx * newScale, y: sy - wy * newScale });
  }, []);

  const cooldownPct = user
    ? Math.min(100, (cooldownRemaining / (user.is_subscriber ? 5 : 30)) * 100)
    : 0;

  return (
    <div className="w-full h-full relative">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair"
        style={{ touchAction: 'none' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { isDraggingRef.current = false; setHoverPos(null); }}
        onWheel={handleWheel}
      />

      {/* Color palette */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 glass rounded-2xl px-3 py-2 flex items-center gap-2">
        <div className="flex flex-wrap gap-1 max-w-[320px]">
          {PALETTE.map((c) => (
            <button key={c} onClick={() => setSelectedColor(c)}
              className={`w-6 h-6 rounded border-2 transition-all hover:scale-110 ${selectedColor === c ? 'border-white scale-110 shadow-[0_0_8px_rgba(255,255,255,0.4)]' : 'border-transparent'}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <div className="pl-2 border-l border-canvas-border">
          <label className="relative cursor-pointer">
            <div className="w-7 h-7 rounded-lg border-2 border-canvas-border" style={{ backgroundColor: selectedColor }} />
            <input type="color" value={selectedColor} onChange={(e) => setSelectedColor(e.target.value)}
                   className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
          </label>
        </div>

        {/* Cooldown indicator */}
        {user && (
          <div className="pl-2 border-l border-canvas-border flex items-center gap-2 min-w-[80px]">
            {cooldownRemaining > 0 ? (
              <div className="flex items-center gap-1.5">
                <div className="w-16 h-2 bg-canvas-bg rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${100 - cooldownPct}%` }} />
                </div>
                <span className="text-xs font-mono text-orange-400">{cooldownRemaining.toFixed(1)}s</span>
              </div>
            ) : (
              <span className="text-xs font-mono text-neon-green">Ready!</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
