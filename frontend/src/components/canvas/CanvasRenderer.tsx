import { useRef, useEffect, useCallback, useState } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

const PALETTE = [
  '#FF0000','#FF4500','#FF8C00','#FFD700','#FFFF00',
  '#7CFC00','#00FF00','#00FA9A','#00FFFF','#00BFFF',
  '#0000FF','#4B0082','#8B00FF','#FF00FF','#FF1493',
  '#FFFFFF','#C0C0C0','#808080','#404040','#000000',
  '#8B4513','#D2691E','#F4A460','#FFE4C4','#FFC0CB',
];

function hexToRgb(hex: string): [number, number, number] {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

interface Props {
  battleActive: boolean;
  onPixelPlaced: () => void;
  pixelUpdates: { x: number; y: number; color: string }[];
}

const W = 1000, H = 1000;

export function CanvasRenderer({ battleActive, onPixelPlaced, pixelUpdates }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const user = useAuthStore((s) => s.user);

  const [viewport, setViewport] = useState({ x: 0, y: 0, scale: 1 });
  const [selectedColor, setSelectedColor] = useState('#FF0000');
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);

  // Offscreen bitmap: 1000x1000 RGBA
  const bitmapRef = useRef<ImageData | null>(null);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);
  const viewportRef = useRef(viewport);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, vx: 0, vy: 0 });
  const hasDraggedRef = useRef(false);
  const animRef = useRef<number>();
  const lastLoadRef = useRef('');
  const loadedRegions = useRef(new Set<string>());

  viewportRef.current = viewport;

  // Init offscreen canvas and bitmap
  useEffect(() => {
    const off = document.createElement('canvas');
    off.width = W; off.height = H;
    offscreenRef.current = off;
    const ctx = off.getContext('2d')!;
    // Fill with dark background
    ctx.fillStyle = '#1a1a24';
    ctx.fillRect(0, 0, W, H);
    bitmapRef.current = ctx.getImageData(0, 0, W, H);
  }, []);

  // Apply websocket pixel updates instantly to bitmap
  useEffect(() => {
    const bmp = bitmapRef.current;
    const off = offscreenRef.current;
    if (!bmp || !off) return;
    let dirty = false;
    for (const p of pixelUpdates) {
      if (p.x < 0 || p.x >= W || p.y < 0 || p.y >= H) continue;
      const [r, g, b] = hexToRgb(p.color);
      const i = (p.y * W + p.x) * 4;
      bmp.data[i] = r; bmp.data[i+1] = g; bmp.data[i+2] = b; bmp.data[i+3] = 255;
      dirty = true;
    }
    if (dirty) {
      off.getContext('2d')!.putImageData(bmp, 0, 0);
    }
  }, [pixelUpdates]);

  // Load pixels from API into bitmap
  const loadRegion = useCallback((xMin: number, yMin: number, xMax: number, yMax: number) => {
    const key = `${Math.floor(xMin/100)},${Math.floor(yMin/100)},${Math.floor(xMax/100)},${Math.floor(yMax/100)}`;
    if (loadedRegions.current.has(key)) return;
    loadedRegions.current.add(key);

    api.getCanvas(xMin, yMin, xMax, yMax).then((data) => {
      const bmp = bitmapRef.current;
      const off = offscreenRef.current;
      if (!bmp || !off) return;
      for (const p of data.pixels) {
        if (p.x < 0 || p.x >= W || p.y < 0 || p.y >= H) continue;
        const [r, g, b] = hexToRgb(p.color);
        const i = (p.y * W + p.x) * 4;
        bmp.data[i] = r; bmp.data[i+1] = g; bmp.data[i+2] = b; bmp.data[i+3] = 255;
      }
      off.getContext('2d')!.putImageData(bmp, 0, 0);
    }).catch(() => {});
  }, []);

  // Load visible viewport
  const loadViewport = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const vp = viewportRef.current;
    const rect = canvas.getBoundingClientRect();
    const xMin = Math.max(0, Math.floor(-vp.x / vp.scale) - 5);
    const yMin = Math.max(0, Math.floor(-vp.y / vp.scale) - 5);
    const xMax = Math.min(W, Math.ceil((rect.width - vp.x) / vp.scale) + 5);
    const yMax = Math.min(H, Math.ceil((rect.height - vp.y) / vp.scale) + 5);
    loadRegion(xMin, yMin, xMax, yMax);
  }, [loadRegion]);

  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
    loadTimeoutRef.current = setTimeout(loadViewport, 200);
  }, [viewport, loadViewport]);
  useEffect(() => { loadViewport(); }, [loadViewport]);

  // Cooldown timer
  useEffect(() => {
    const interval = setInterval(() => setCooldownRemaining((p) => Math.max(0, p - 0.1)), 100);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (user) api.getCooldown().then((d) => setCooldownRemaining(d.remaining)).catch(() => {});
  }, [user]);

  // Render loop — fast! Just draws the offscreen canvas scaled
  useEffect(() => {
    let running = true;
    const render = () => {
      if (!running) return;
      const canvas = canvasRef.current;
      const off = offscreenRef.current;
      if (!canvas || !off) { animRef.current = requestAnimationFrame(render); return; }
      const ctx = canvas.getContext('2d')!;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      if (canvas.width !== Math.floor(rect.width * dpr) || canvas.height !== Math.floor(rect.height * dpr)) {
        canvas.width = Math.floor(rect.width * dpr);
        canvas.height = Math.floor(rect.height * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const vp = viewportRef.current;

      // Clear
      ctx.fillStyle = '#08080c';
      ctx.fillRect(0, 0, rect.width, rect.height);

      // Draw the entire 1000x1000 bitmap in one call — FAST
      ctx.imageSmoothingEnabled = false;
      ctx.save();
      ctx.translate(vp.x, vp.y);
      ctx.scale(vp.scale, vp.scale);
      ctx.drawImage(off, 0, 0);

      // Grid when zoomed in
      if (vp.scale >= 6) {
        const x1 = Math.max(0, Math.floor(-vp.x / vp.scale));
        const y1 = Math.max(0, Math.floor(-vp.y / vp.scale));
        const x2 = Math.min(W, Math.ceil((rect.width - vp.x) / vp.scale));
        const y2 = Math.min(H, Math.ceil((rect.height - vp.y) / vp.scale));
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 0.3 / vp.scale;
        for (let x = x1; x <= x2; x++) { ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x, y2); ctx.stroke(); }
        for (let y = y1; y <= y2; y++) { ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke(); }
      }

      // Hover highlight
      if (hoverPos && vp.scale >= 2) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2 / vp.scale;
        ctx.strokeRect(hoverPos.x, hoverPos.y, 1, 1);
        ctx.fillStyle = selectedColor;
        ctx.globalAlpha = 0.5;
        ctx.fillRect(hoverPos.x, hoverPos.y, 1, 1);
        ctx.globalAlpha = 1;
      }

      ctx.restore();

      // HUD
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(8, rect.height - 28, 180, 20);
      ctx.fillStyle = '#6b6b8a';
      ctx.font = '11px JetBrains Mono, monospace';
      const wx = hoverPos ? hoverPos.x : Math.floor(-vp.x / vp.scale);
      const wy = hoverPos ? hoverPos.y : Math.floor(-vp.y / vp.scale);
      ctx.fillText(`${wx}, ${wy}  ×${vp.scale.toFixed(1)}`, 14, rect.height - 13);

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
    const scale = Math.min(rect.width / W, rect.height / H) * 0.9;
    setViewport({ x: (rect.width - W * scale) / 2, y: (rect.height - H * scale) / 2, scale });
  }, []);

  const screenToWorld = useCallback((sx: number, sy: number) => {
    const vp = viewportRef.current;
    return { x: Math.floor((sx - vp.x) / vp.scale), y: Math.floor((sy - vp.y) / vp.scale) };
  }, []);

  // Place pixel
  const handlePlace = useCallback(async (wx: number, wy: number) => {
    if (!user || !battleActive || cooldownRemaining > 0) return;
    if (wx < 0 || wx >= W || wy < 0 || wy >= H) return;

    // Instant local update
    const bmp = bitmapRef.current;
    const off = offscreenRef.current;
    if (bmp && off) {
      const [r, g, b] = hexToRgb(selectedColor);
      const i = (wy * W + wx) * 4;
      bmp.data[i] = r; bmp.data[i+1] = g; bmp.data[i+2] = b; bmp.data[i+3] = 255;
      off.getContext('2d')!.putImageData(bmp, 0, 0);
    }

    try {
      const res = await api.placePixel(wx, wy, selectedColor);
      setCooldownRemaining(res.cooldown);
      onPixelPlaced();
    } catch (e: any) {
      if (e.message.includes('Wait')) {
        const m = e.message.match(/([\d.]+)s/);
        if (m) setCooldownRemaining(parseFloat(m[1]));
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
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;

    if (isDraggingRef.current) {
      const dx = e.clientX - dragStartRef.current.x, dy = e.clientY - dragStartRef.current.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasDraggedRef.current = true;
      setViewport(v => ({ ...v, x: dragStartRef.current.vx + dx, y: dragStartRef.current.vy + dy }));
      return;
    }

    const w = screenToWorld(sx, sy);
    setHoverPos(w.x >= 0 && w.x < W && w.y >= 0 && w.y < H ? w : null);
  }, [screenToWorld]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    const wasDrag = hasDraggedRef.current;
    isDraggingRef.current = false;
    if (!wasDrag) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const w = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
      handlePlace(w.x, w.y);
    }
  }, [screenToWorld, handlePlace]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    const vp = viewportRef.current;
    const f = e.deltaY < 0 ? 1.15 : 0.87;
    const ns = Math.min(Math.max(vp.scale * f, 0.3), 50);
    const wx = (sx - vp.x) / vp.scale, wy = (sy - vp.y) / vp.scale;
    setViewport({ scale: ns, x: sx - wx * ns, y: sy - wy * ns });
  }, []);

  const cooldownPct = user ? Math.min(100, (cooldownRemaining / (user.is_subscriber ? 5 : 30)) * 100) : 0;

  return (
    <div className="w-full h-full relative">
      <canvas ref={canvasRef} className="w-full h-full cursor-crosshair" style={{ touchAction: 'none' }}
        onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}
        onMouseLeave={() => { isDraggingRef.current = false; setHoverPos(null); }}
        onWheel={handleWheel}
      />

      {/* Palette */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 glass rounded-2xl px-3 py-2 flex items-center gap-2">
        <div className="flex flex-wrap gap-1 max-w-[320px]">
          {PALETTE.map((c) => (
            <button key={c} onClick={() => setSelectedColor(c)}
              className={`w-6 h-6 rounded border-2 transition-all hover:scale-110 ${selectedColor === c ? 'border-white scale-110 shadow-[0_0_8px_rgba(255,255,255,0.4)]' : 'border-transparent'}`}
              style={{ backgroundColor: c }} />
          ))}
        </div>
        <div className="pl-2 border-l border-canvas-border">
          <label className="relative cursor-pointer">
            <div className="w-7 h-7 rounded-lg border-2 border-canvas-border" style={{ backgroundColor: selectedColor }} />
            <input type="color" value={selectedColor} onChange={(e) => setSelectedColor(e.target.value)}
                   className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
          </label>
        </div>
        {user && (
          <div className="pl-2 border-l border-canvas-border flex items-center gap-2 min-w-[80px]">
            {cooldownRemaining > 0 ? (
              <div className="flex items-center gap-1.5">
                <div className="w-16 h-2 bg-canvas-bg rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${100 - cooldownPct}%` }} />
                </div>
                <span className="text-xs font-mono text-orange-400">{cooldownRemaining.toFixed(1)}s</span>
              </div>
            ) : battleActive ? (
              <span className="text-xs font-mono text-neon-green">Ready!</span>
            ) : (
              <span className="text-xs font-mono text-canvas-muted">Батл не активен</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
