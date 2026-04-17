import { useRef, useEffect, useCallback } from 'react';

interface MinimapProps {
  offscreenCanvas: HTMLCanvasElement | null;
  viewport: { x: number; y: number; scale: number };
  canvasWidth: number;
  canvasHeight: number;
  containerWidth: number;
  containerHeight: number;
  onNavigate: (x: number, y: number) => void;
}

const MINIMAP_SIZE = 120;

export function Minimap({
  offscreenCanvas, viewport, canvasWidth, canvasHeight,
  containerWidth, containerHeight, onNavigate,
}: MinimapProps) {
  const miniRef = useRef<HTMLCanvasElement>(null);
  const scale = MINIMAP_SIZE / canvasWidth;

  const draw = useCallback(() => {
    const mini = miniRef.current;
    const src = offscreenCanvas;
    if (!mini || !src) return;
    const ctx = mini.getContext('2d')!;

    // Рисуем уменьшенный холст
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);
    ctx.drawImage(src, 0, 0, canvasWidth, canvasHeight, 0, 0, MINIMAP_SIZE, MINIMAP_SIZE);

    // Рамка видимой области
    const vx = (-viewport.x / viewport.scale) * scale;
    const vy = (-viewport.y / viewport.scale) * scale;
    const vw = (containerWidth / viewport.scale) * scale;
    const vh = (containerHeight / viewport.scale) * scale;

    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(vx, vy, vw, vh);
  }, [offscreenCanvas, viewport, canvasWidth, canvasHeight, containerWidth, containerHeight, scale]);

  useEffect(() => {
    const id = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(id);
  }, [draw]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = miniRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = (e.clientX - rect.left) / scale;
    const my = (e.clientY - rect.top) / scale;
    onNavigate(mx, my);
  };

  return (
    <div className="absolute bottom-20 right-3 z-30 rounded-lg overflow-hidden border border-canvas-border/50 shadow-lg opacity-70 hover:opacity-100 transition-opacity cursor-crosshair"
      style={{ width: MINIMAP_SIZE, height: MINIMAP_SIZE, background: '#0f0f17' }}
    >
      <canvas
        ref={miniRef}
        width={MINIMAP_SIZE}
        height={MINIMAP_SIZE}
        onClick={handleClick}
        style={{ width: MINIMAP_SIZE, height: MINIMAP_SIZE, imageRendering: 'pixelated' }}
      />
    </div>
  );
}
