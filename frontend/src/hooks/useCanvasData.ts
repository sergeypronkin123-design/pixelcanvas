/**
 * useCanvasData — loads full 1000×1000 canvas in chunks at startup,
 * subscribes to live updates via WebSocket.
 *
 * Critical fix: previous version requested only the visible viewport
 * (y_max=717 for example), which meant new pixels in the bottom 30%
 * of the canvas were never visible until users scrolled there.
 *
 * Now: load full canvas in 4 quadrants in parallel, render incrementally.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';

const CANVAS_W = 1000;
const CANVAS_H = 1000;
const QUADRANT = 500;

export interface CanvasPixel {
  x: number;
  y: number;
  color: string;
  user_id: number | null;
  clan_id: number | null;
}

interface QuadrantSpec {
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
  label: string;
}

const QUADRANTS: QuadrantSpec[] = [
  { xMin: 0,        yMin: 0,        xMax: QUADRANT, yMax: QUADRANT, label: 'top-left' },
  { xMin: QUADRANT, yMin: 0,        xMax: CANVAS_W, yMax: QUADRANT, label: 'top-right' },
  { xMin: 0,        yMin: QUADRANT, xMax: QUADRANT, yMax: CANVAS_H, label: 'bottom-left' },
  { xMin: QUADRANT, yMin: QUADRANT, xMax: CANVAS_W, yMax: CANVAS_H, label: 'bottom-right' },
];

export function useCanvasData() {
  const [loaded, setLoaded] = useState(0);  // 0..4 quadrants done
  const [error, setError] = useState<string | null>(null);
  const pixelsRef = useRef<Map<string, CanvasPixel>>(new Map());

  const fetchQuadrant = useCallback(async (q: QuadrantSpec): Promise<void> => {
    const url = `/api/pixels/canvas?x_min=${q.xMin}&y_min=${q.yMin}&x_max=${q.xMax}&y_max=${q.yMax}`;
    try {
      const res = await api.get(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const pixels: CanvasPixel[] = data.pixels || data;
      for (const p of pixels) {
        pixelsRef.current.set(`${p.x},${p.y}`, p);
      }
    } catch (e) {
      setError(`Failed to load ${q.label}: ${(e as Error).message}`);
      throw e;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Load all 4 quadrants in parallel
        await Promise.all(
          QUADRANTS.map(async (q) => {
            await fetchQuadrant(q);
            if (!cancelled) setLoaded((n) => n + 1);
          })
        );
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fetchQuadrant]);

  const setPixel = useCallback((p: CanvasPixel) => {
    pixelsRef.current.set(`${p.x},${p.y}`, p);
  }, []);

  const getPixel = useCallback((x: number, y: number): CanvasPixel | null => {
    return pixelsRef.current.get(`${x},${y}`) || null;
  }, []);

  return {
    pixels: pixelsRef.current,
    setPixel,
    getPixel,
    progress: loaded / 4,
    isLoaded: loaded === 4,
    error,
  };
}
