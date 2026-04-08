import { useRef, useEffect, useCallback, useState } from 'react';
import { useCanvasStore } from '@/stores/canvasStore';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import type { BlockBulk } from '@/types';

const COLORS: Record<string, string> = {
  free: '#1a1a28',
  reserved: '#3d2a1a',
  owned: '#1a2a1a',
  listed: '#1a1a3d',
};

const BORDER_COLORS: Record<string, string> = {
  free: '#2a2a3d',
  reserved: '#ffaa00',
  owned: '#00ff88',
  listed: '#8b5cf6',
};

interface CanvasRendererProps {
  onBlockClick: (block: BlockBulk) => void;
}

export function CanvasRenderer({ onBlockClick }: CanvasRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const user = useAuthStore((s) => s.user);

  const [viewport, setViewport] = useState({ x: 0, y: 0, scale: 4 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, vx: 0, vy: 0 });
  const hasDraggedRef = useRef(false);
  const [hoverBlock, setHoverBlock] = useState<{ x: number; y: number } | null>(null);
  const drawBufferRef = useRef<{ local_x: number; local_y: number; color: string }[]>([]);
  const drawBlockRef = useRef<number | null>(null);
  const flushTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const animRef = useRef<number>();
  const lastLoadRef = useRef<string>('');
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;

  const config = useCanvasStore((s) => s.config);
  const tool = useCanvasStore((s) => s.tool);
  const drawColor = useCanvasStore((s) => s.drawColor);

  const blockSize = config?.block_size || 10;
  const canvasWidth = config?.canvas_width || 1000;
  const canvasHeight = config?.canvas_height || 1000;

  // Load ONLY visible blocks for current viewport
  const loadViewport = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const vp = viewportRef.current;
    const rect = canvas.getBoundingClientRect();

    const xMin = Math.max(0, Math.floor(-vp.x / vp.scale / blockSize) * blockSize - blockSize);
    const yMin = Math.max(0, Math.floor(-vp.y / vp.scale / blockSize) * blockSize - blockSize);
    const xMax = Math.min(canvasWidth, Math.ceil((rect.width - vp.x) / vp.scale / blockSize) * blockSize + blockSize * 2);
    const yMax = Math.min(canvasHeight, Math.ceil((rect.height - vp.y) / vp.scale / blockSize) * blockSize + blockSize * 2);

    const key = `${xMin},${yMin},${xMax},${yMax}`;
    if (key === lastLoadRef.current) return;
    lastLoadRef.current = key;

    const store = useCanvasStore.getState();
    store.loadCanvas(xMin, yMin, xMax, yMax);
    store.loadPixels(xMin, yMin, xMax, yMax);
  }, [blockSize, canvasWidth, canvasHeight]);

  // Debounced load on viewport change
  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
    loadTimeoutRef.current = setTimeout(loadViewport, 100);
  }, [viewport, loadViewport]);

  // Initial load
  useEffect(() => { loadViewport(); }, [loadViewport]);

  // Render loop - only draws visible blocks
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

      ctx.fillStyle = '#0a0a0f';
      ctx.fillRect(0, 0, rect.width, rect.height);

      ctx.save();
      ctx.translate(vp.x, vp.y);
      ctx.scale(vp.scale, vp.scale);

      // Calculate visible range only
      const xMin = Math.max(0, Math.floor(-vp.x / vp.scale / blockSize) * blockSize);
      const yMin = Math.max(0, Math.floor(-vp.y / vp.scale / blockSize) * blockSize);
      const xMax = Math.min(canvasWidth, xMin + Math.ceil(rect.width / vp.scale / blockSize) * blockSize + blockSize * 2);
      const yMax = Math.min(canvasHeight, yMin + Math.ceil(rect.height / vp.scale / blockSize) * blockSize + blockSize * 2);

      const currentBlocks = useCanvasStore.getState().blocks;
      const currentPixels = useCanvasStore.getState().pixels;
      const currentSelected = useCanvasStore.getState().selectedBlock;

      const showPixels = vp.scale >= 2;
      const showGrid = vp.scale >= 1;

      // Draw only visible blocks
      for (let bx = xMin; bx < xMax; bx += blockSize) {
        for (let by = yMin; by < yMax; by += blockSize) {
          const block = currentBlocks.get(`${bx},${by}`);
          const status = block?.status || 'free';

          ctx.fillStyle = COLORS[status] || COLORS.free;
          ctx.fillRect(bx, by, blockSize, blockSize);

          // Only draw individual pixels when zoomed in enough
          if (showPixels) {
            for (let px = 0; px < blockSize; px++) {
              for (let py = 0; py < blockSize; py++) {
                const color = currentPixels.get(`${bx + px},${by + py}`);
                if (color && color !== '#000000') {
                  ctx.fillStyle = color;
                  ctx.fillRect(bx + px, by + py, 1, 1);
                }
              }
            }
          }

          // Grid lines only when zoomed in
          if (showGrid) {
            ctx.strokeStyle = BORDER_COLORS[status] || BORDER_COLORS.free;
            ctx.lineWidth = 0.3 / vp.scale;
            ctx.strokeRect(bx, by, blockSize, blockSize);
          }
        }
      }

      // Hover
      if (hoverBlock) {
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 2 / vp.scale;
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 6 / vp.scale;
        ctx.strokeRect(hoverBlock.x, hoverBlock.y, blockSize, blockSize);
        ctx.shadowBlur = 0;
      }

      // Selected
      if (currentSelected) {
        ctx.strokeStyle = '#ff00aa';
        ctx.lineWidth = 2.5 / vp.scale;
        ctx.setLineDash([4 / vp.scale, 4 / vp.scale]);
        ctx.strokeRect(currentSelected.x, currentSelected.y, currentSelected.width, currentSelected.height);
        ctx.setLineDash([]);
      }

      ctx.restore();

      // HUD
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(8, rect.height - 34, 240, 26);
      ctx.fillStyle = '#6b6b8a';
      ctx.font = '12px JetBrains Mono, monospace';
      const wx = Math.floor(-vp.x / vp.scale);
      const wy = Math.floor(-vp.y / vp.scale);
      ctx.fillText(`pos: ${wx},${wy}  zoom: ${vp.scale.toFixed(1)}x  [scroll to zoom]`, 14, rect.height - 16);

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);
    return () => { running = false; if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [hoverBlock, blockSize, canvasWidth, canvasHeight]);

  // Center viewport on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scale = 4;
    setViewport({
      x: rect.width / 2 - (canvasWidth * scale) / 2,
      y: rect.height / 2 - (canvasHeight * scale) / 2,
      scale,
    });
  }, [canvasWidth, canvasHeight]);

  const screenToWorld = useCallback((sx: number, sy: number) => {
    const vp = viewportRef.current;
    return { x: (sx - vp.x) / vp.scale, y: (sy - vp.y) / vp.scale };
  }, []);

  const flushDrawBuffer = useCallback(() => {
    const blockId = drawBlockRef.current;
    const buffer = drawBufferRef.current;
    if (blockId && buffer.length > 0) {
      api.drawPixels(blockId, [...buffer]).catch(console.error);
      drawBufferRef.current = [];
    }
  }, []);

  const handleDraw = useCallback((wx: number, wy: number) => {
    const bx = Math.floor(wx / blockSize) * blockSize;
    const by = Math.floor(wy / blockSize) * blockSize;
    const block = useCanvasStore.getState().blocks.get(`${bx},${by}`);
    if (!block || block.owner_id !== user?.id) return;

    const localX = Math.floor(wx) - bx;
    const localY = Math.floor(wy) - by;
    if (localX < 0 || localX >= blockSize || localY < 0 || localY >= blockSize) return;

    const color = tool === 'eraser' ? '#000000' : drawColor;
    useCanvasStore.getState().updatePixels([{ x: bx + localX, y: by + localY, color }]);

    drawBlockRef.current = block.id;
    drawBufferRef.current.push({ local_x: localX, local_y: localY, color });

    if (flushTimeoutRef.current) clearTimeout(flushTimeoutRef.current);
    if (drawBufferRef.current.length >= 20) {
      flushDrawBuffer();
    } else {
      flushTimeoutRef.current = setTimeout(flushDrawBuffer, 200);
    }
  }, [blockSize, user, tool, drawColor, flushDrawBuffer]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    isDraggingRef.current = true;
    hasDraggedRef.current = false;
    const vp = viewportRef.current;
    dragStartRef.current = { x: e.clientX, y: e.clientY, vx: vp.x, vy: vp.y };

    if ((tool === 'pencil' || tool === 'eraser') && user) {
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const world = screenToWorld(sx, sy);
      handleDraw(world.x, world.y);
    }
  }, [tool, user, screenToWorld, handleDraw]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    if (isDraggingRef.current && (tool === 'select' || !user)) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasDraggedRef.current = true;
      setViewport(v => ({ ...v, x: dragStartRef.current.vx + dx, y: dragStartRef.current.vy + dy }));
      return;
    }

    if (isDraggingRef.current && (tool === 'pencil' || tool === 'eraser') && user) {
      hasDraggedRef.current = true;
      const world = screenToWorld(sx, sy);
      handleDraw(world.x, world.y);
      return;
    }

    const world = screenToWorld(sx, sy);
    const bx = Math.floor(world.x / blockSize) * blockSize;
    const by = Math.floor(world.y / blockSize) * blockSize;
    if (bx >= 0 && by >= 0 && bx < canvasWidth && by < canvasHeight) {
      setHoverBlock({ x: bx, y: by });
    } else {
      setHoverBlock(null);
    }
  }, [tool, user, screenToWorld, blockSize, canvasWidth, canvasHeight, handleDraw]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    const wasDragging = hasDraggedRef.current;
    isDraggingRef.current = false;

    if (!wasDragging) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const world = screenToWorld(sx, sy);
      const bx = Math.floor(world.x / blockSize) * blockSize;
      const by = Math.floor(world.y / blockSize) * blockSize;
      const block = useCanvasStore.getState().blocks.get(`${bx},${by}`);
      if (block) {
        api.getBlock(block.id).then((detail) => {
          useCanvasStore.getState().selectBlock(detail);
          onBlockClick(block);
        }).catch(console.error);
      }
    }

    flushDrawBuffer();
  }, [screenToWorld, blockSize, onBlockClick, flushDrawBuffer]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const vp = viewportRef.current;

    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    const newScale = Math.min(Math.max(vp.scale * zoomFactor, 0.3), 30);

    const wx = (sx - vp.x) / vp.scale;
    const wy = (sy - vp.y) / vp.scale;

    setViewport({ scale: newScale, x: sx - wx * newScale, y: sy - wy * newScale });
  }, []);

  return (
    <div className="w-full h-full relative">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ cursor: tool === 'select' ? 'grab' : 'crosshair', touchAction: 'none' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { isDraggingRef.current = false; setHoverBlock(null); flushDrawBuffer(); }}
        onWheel={handleWheel}
      />
    </div>
  );
}
