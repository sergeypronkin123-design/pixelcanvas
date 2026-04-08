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
  const containerRef = useRef<HTMLDivElement>(null);
  const { blocks, pixels, config, tool, drawColor, selectedBlock } = useCanvasStore();
  const user = useAuthStore((s) => s.user);

  const [viewport, setViewport] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoverBlock, setHoverBlock] = useState<{ x: number; y: number } | null>(null);
  const drawBufferRef = useRef<{ local_x: number; local_y: number; color: string }[]>([]);
  const drawBlockRef = useRef<number | null>(null);
  const flushTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const animRef = useRef<number>();
  const lastLoadRef = useRef<string>('');

  const blockSize = config?.block_size || 10;
  const canvasWidth = config?.canvas_width || 1000;
  const canvasHeight = config?.canvas_height || 1000;

  // Load data for current viewport
  const loadViewport = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const xMin = Math.max(0, Math.floor(-viewport.x / viewport.scale / blockSize) * blockSize);
    const yMin = Math.max(0, Math.floor(-viewport.y / viewport.scale / blockSize) * blockSize);
    const xMax = Math.min(canvasWidth, Math.ceil((rect.width / viewport.scale - viewport.x / viewport.scale) / blockSize) * blockSize + blockSize);
    const yMax = Math.min(canvasHeight, Math.ceil((rect.height / viewport.scale - viewport.y / viewport.scale) / blockSize) * blockSize + blockSize);

    const key = `${xMin},${yMin},${xMax},${yMax}`;
    if (key === lastLoadRef.current) return;
    lastLoadRef.current = key;

    const store = useCanvasStore.getState();
    store.loadCanvas(xMin, yMin, xMax, yMax);
    store.loadPixels(xMin, yMin, xMax, yMax);
  }, [viewport, blockSize, canvasWidth, canvasHeight]);

  useEffect(() => {
    loadViewport();
  }, [loadViewport]);

  // Render loop
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, rect.width, rect.height);

    ctx.save();
    ctx.translate(viewport.x, viewport.y);
    ctx.scale(viewport.scale, viewport.scale);

    // Visible range
    const xMin = Math.max(0, Math.floor(-viewport.x / viewport.scale / blockSize) * blockSize);
    const yMin = Math.max(0, Math.floor(-viewport.y / viewport.scale / blockSize) * blockSize);
    const xMax = Math.min(canvasWidth, xMin + Math.ceil(rect.width / viewport.scale / blockSize) * blockSize + blockSize * 2);
    const yMax = Math.min(canvasHeight, yMin + Math.ceil(rect.height / viewport.scale / blockSize) * blockSize + blockSize * 2);

    const currentBlocks = useCanvasStore.getState().blocks;
    const currentPixels = useCanvasStore.getState().pixels;

    // Draw blocks
    for (let bx = xMin; bx < xMax; bx += blockSize) {
      for (let by = yMin; by < yMax; by += blockSize) {
        const block = currentBlocks.get(`${bx},${by}`);
        const status = block?.status || 'free';

        // Block fill
        ctx.fillStyle = COLORS[status] || COLORS.free;
        ctx.fillRect(bx, by, blockSize, blockSize);

        // Pixel data
        for (let px = 0; px < blockSize; px++) {
          for (let py = 0; py < blockSize; py++) {
            const color = currentPixels.get(`${bx + px},${by + py}`);
            if (color) {
              ctx.fillStyle = color;
              ctx.fillRect(bx + px, by + py, 1, 1);
            }
          }
        }

        // Grid border (only if zoomed enough)
        if (viewport.scale > 0.5) {
          ctx.strokeStyle = BORDER_COLORS[status] || BORDER_COLORS.free;
          ctx.lineWidth = 0.5 / viewport.scale;
          ctx.strokeRect(bx, by, blockSize, blockSize);
        }
      }
    }

    // Hover highlight
    if (hoverBlock) {
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2 / viewport.scale;
      ctx.strokeRect(hoverBlock.x, hoverBlock.y, blockSize, blockSize);

      // Glow effect
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 8 / viewport.scale;
      ctx.strokeRect(hoverBlock.x, hoverBlock.y, blockSize, blockSize);
      ctx.shadowBlur = 0;
    }

    // Selected block highlight
    if (selectedBlock) {
      ctx.strokeStyle = '#ff00aa';
      ctx.lineWidth = 2.5 / viewport.scale;
      ctx.setLineDash([4 / viewport.scale, 4 / viewport.scale]);
      ctx.strokeRect(selectedBlock.x, selectedBlock.y, selectedBlock.width, selectedBlock.height);
      ctx.setLineDash([]);
    }

    ctx.restore();

    // HUD - coordinates
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(8, rect.height - 32, 200, 24);
    ctx.fillStyle = '#6b6b8a';
    ctx.font = '11px JetBrains Mono, monospace';
    const wx = Math.floor(-viewport.x / viewport.scale);
    const wy = Math.floor(-viewport.y / viewport.scale);
    ctx.fillText(`pos: ${wx},${wy}  zoom: ${viewport.scale.toFixed(2)}x`, 14, rect.height - 16);

    animRef.current = requestAnimationFrame(render);
  }, [viewport, hoverBlock, selectedBlock, blockSize, canvasWidth, canvasHeight]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(render);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [render]);

  // Center viewport on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    setViewport({
      x: rect.width / 2 - (canvasWidth * 0.8) / 2,
      y: rect.height / 2 - (canvasHeight * 0.8) / 2,
      scale: 0.8,
    });
  }, [canvasWidth, canvasHeight]);

  // Convert screen to world coordinates
  const screenToWorld = useCallback((sx: number, sy: number) => {
    return {
      x: (sx - viewport.x) / viewport.scale,
      y: (sy - viewport.y) / viewport.scale,
    };
  }, [viewport]);

  // Flush draw buffer
  const flushDrawBuffer = useCallback(() => {
    const blockId = drawBlockRef.current;
    const buffer = drawBufferRef.current;
    if (blockId && buffer.length > 0) {
      api.drawPixels(blockId, [...buffer]).catch(console.error);
      drawBufferRef.current = [];
    }
  }, []);

  // Mouse handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    if (tool === 'select' || e.button === 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - viewport.x, y: e.clientY - viewport.y });
      return;
    }

    if ((tool === 'pencil' || tool === 'eraser') && user) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      const world = screenToWorld(sx, sy);
      handleDraw(world.x, world.y);
    }
  }, [tool, user, viewport, screenToWorld]);

  const handleDraw = useCallback((wx: number, wy: number) => {
    const bx = Math.floor(wx / blockSize) * blockSize;
    const by = Math.floor(wy / blockSize) * blockSize;
    const block = useCanvasStore.getState().blocks.get(`${bx},${by}`);

    if (!block || block.owner_id !== user?.id) return;

    const localX = Math.floor(wx) - bx;
    const localY = Math.floor(wy) - by;
    if (localX < 0 || localX >= blockSize || localY < 0 || localY >= blockSize) return;

    const color = tool === 'eraser' ? '#000000' : drawColor;

    // Update local pixels immediately
    useCanvasStore.getState().updatePixels([{ x: bx + localX, y: by + localY, color }]);

    // Buffer for batch send
    drawBlockRef.current = block.id;
    drawBufferRef.current.push({ local_x: localX, local_y: localY, color });

    if (flushTimeoutRef.current) clearTimeout(flushTimeoutRef.current);
    if (drawBufferRef.current.length >= 20) {
      flushDrawBuffer();
    } else {
      flushTimeoutRef.current = setTimeout(flushDrawBuffer, 200);
    }
  }, [blockSize, user, tool, drawColor, flushDrawBuffer]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    if (isDragging && tool === 'select') {
      setViewport((v) => ({
        ...v,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      }));
      return;
    }

    if (isDragging && (tool === 'pencil' || tool === 'eraser') && user) {
      const world = screenToWorld(sx, sy);
      handleDraw(world.x, world.y);
      return;
    }

    // Hover
    const world = screenToWorld(sx, sy);
    const bx = Math.floor(world.x / blockSize) * blockSize;
    const by = Math.floor(world.y / blockSize) * blockSize;
    if (bx >= 0 && by >= 0 && bx < canvasWidth && by < canvasHeight) {
      setHoverBlock({ x: bx, y: by });
    } else {
      setHoverBlock(null);
    }
  }, [isDragging, tool, dragStart, user, screenToWorld, blockSize, canvasWidth, canvasHeight, handleDraw]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (!isDragging && tool === 'select') {
      // Click to select block
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

    setIsDragging(false);
    flushDrawBuffer();
  }, [isDragging, tool, screenToWorld, blockSize, onBlockClick, flushDrawBuffer]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newScale = Math.min(Math.max(viewport.scale * zoomFactor, 0.1), 20);

    const wx = (sx - viewport.x) / viewport.scale;
    const wy = (sy - viewport.y) / viewport.scale;

    setViewport({
      scale: newScale,
      x: sx - wx * newScale,
      y: sy - wy * newScale,
    });
  }, [viewport]);

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { setIsDragging(false); setHoverBlock(null); flushDrawBuffer(); }}
        onWheel={handleWheel}
        style={{ touchAction: 'none' }}
      />
    </div>
  );
}
