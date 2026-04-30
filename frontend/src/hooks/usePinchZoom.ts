/**
 * usePinchZoom — multi-touch pinch zoom + pan for canvas.
 *
 * Uses native pointer events instead of @use-gesture to avoid extra deps.
 * Handles:
 *   - 1 finger drag → pan
 *   - 2 finger pinch → zoom around midpoint
 *   - mouse wheel → zoom around cursor
 *   - mouse drag → pan
 */
import { useEffect, useRef, useState } from 'react';

interface ViewState {
  scale: number;
  offsetX: number;
  offsetY: number;
}

interface PinchZoomOptions {
  minScale?: number;
  maxScale?: number;
  initialScale?: number;
  onChange?: (view: ViewState) => void;
}

export function usePinchZoom<T extends HTMLElement>(
  options: PinchZoomOptions = {}
) {
  const {
    minScale = 0.5,
    maxScale = 32,
    initialScale = 1,
    onChange,
  } = options;

  const ref = useRef<T | null>(null);
  const [view, setView] = useState<ViewState>({
    scale: initialScale,
    offsetX: 0,
    offsetY: 0,
  });

  const stateRef = useRef({
    pointers: new Map<number, { x: number; y: number }>(),
    lastDistance: 0,
    lastMidpoint: { x: 0, y: 0 },
    lastSinglePoint: { x: 0, y: 0 },
  });

  // Sync view back to caller on every change
  useEffect(() => {
    onChange?.(view);
  }, [view, onChange]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const updateView = (updater: (prev: ViewState) => ViewState) => {
      setView((prev) => {
        const next = updater(prev);
        // Clamp scale
        next.scale = Math.max(minScale, Math.min(maxScale, next.scale));
        return next;
      });
    };

    const onPointerDown = (e: PointerEvent) => {
      el.setPointerCapture(e.pointerId);
      stateRef.current.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (stateRef.current.pointers.size === 1) {
        stateRef.current.lastSinglePoint = { x: e.clientX, y: e.clientY };
      } else if (stateRef.current.pointers.size === 2) {
        const points = [...stateRef.current.pointers.values()];
        stateRef.current.lastDistance = distance(points[0], points[1]);
        stateRef.current.lastMidpoint = midpoint(points[0], points[1]);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!stateRef.current.pointers.has(e.pointerId)) return;
      stateRef.current.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      const points = [...stateRef.current.pointers.values()];

      if (points.length === 1) {
        // Pan
        const dx = e.clientX - stateRef.current.lastSinglePoint.x;
        const dy = e.clientY - stateRef.current.lastSinglePoint.y;
        stateRef.current.lastSinglePoint = { x: e.clientX, y: e.clientY };
        updateView((prev) => ({
          ...prev,
          offsetX: prev.offsetX + dx,
          offsetY: prev.offsetY + dy,
        }));
      } else if (points.length >= 2) {
        // Pinch zoom around midpoint
        const newDistance = distance(points[0], points[1]);
        const newMidpoint = midpoint(points[0], points[1]);
        if (stateRef.current.lastDistance > 0) {
          const scaleDelta = newDistance / stateRef.current.lastDistance;
          updateView((prev) => {
            const newScale = prev.scale * scaleDelta;
            return {
              scale: newScale,
              offsetX: prev.offsetX + (newMidpoint.x - stateRef.current.lastMidpoint.x),
              offsetY: prev.offsetY + (newMidpoint.y - stateRef.current.lastMidpoint.y),
            };
          });
        }
        stateRef.current.lastDistance = newDistance;
        stateRef.current.lastMidpoint = newMidpoint;
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      stateRef.current.pointers.delete(e.pointerId);
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {}
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Zoom factor — small wheel = small zoom
      const factor = e.deltaY > 0 ? 0.9 : 1.1;

      updateView((prev) => {
        const newScale = prev.scale * factor;
        // Zoom around mouse cursor
        const dx = mouseX - prev.offsetX;
        const dy = mouseY - prev.offsetY;
        return {
          scale: newScale,
          offsetX: mouseX - dx * factor,
          offsetY: mouseY - dy * factor,
        };
      });
    };

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointercancel', onPointerUp);
    el.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointercancel', onPointerUp);
      el.removeEventListener('wheel', onWheel);
    };
  }, [minScale, maxScale]);

  return { ref, view, setView };
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function midpoint(a: { x: number; y: number }, b: { x: number; y: number }): { x: number; y: number } {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}
