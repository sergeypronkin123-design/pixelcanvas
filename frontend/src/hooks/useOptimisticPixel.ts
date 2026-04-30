/**
 * useOptimisticPixel — instant pixel placement with server reconciliation.
 *
 * Flow:
 *   1. Click canvas → render pixel locally (optimistic), trigger haptic
 *   2. Send to API in parallel
 *   3. If API fails → roll back to previous color, show toast
 *   4. If API succeeds → cooldown UI updates
 *
 * Reduces perceived latency from ~300ms (network round-trip) to ~16ms (one frame).
 */
import { useCallback, useRef } from 'react';
import { haptic } from '../lib/motion';
import { api } from '../lib/api';

interface PixelState {
  x: number;
  y: number;
  color: string;
  // Snapshot of previous pixel for rollback
  previous?: { color: string; userId: number | null };
}

export interface UseOptimisticPixelOptions {
  /** Called immediately when click happens (sync paint) */
  onLocalPaint: (x: number, y: number, color: string) => void;
  /** Called to revert on API error */
  onRollback: (x: number, y: number, prevColor: string, prevUserId: number | null) => void;
  /** Called when server confirms */
  onConfirm: (x: number, y: number) => void;
  /** Called on error to show toast */
  onError: (msg: string, retryAfterMs?: number) => void;
  /** Reads current state of pixel for snapshot */
  getCurrentPixel: (x: number, y: number) => { color: string; userId: number | null } | null;
}

export function useOptimisticPixel(opts: UseOptimisticPixelOptions) {
  const pendingRef = useRef<Map<string, PixelState>>(new Map());

  const placePixel = useCallback(
    async (x: number, y: number, color: string) => {
      const key = `${x},${y}`;
      if (pendingRef.current.has(key)) {
        // Same coord already pending — coalesce, latest wins
        pendingRef.current.delete(key);
      }

      // Snapshot current state for rollback
      const previous = opts.getCurrentPixel(x, y);
      const state: PixelState = {
        x, y, color,
        previous: previous || undefined,
      };
      pendingRef.current.set(key, state);

      // 1. Optimistic paint — instant visual feedback
      opts.onLocalPaint(x, y, color);
      haptic('light');

      // 2. API call
      try {
        const res = await api.post('/api/pixels/place', { x, y, color });

        if (!res.ok) {
          let msg = 'Failed to place pixel';
          let retryAfter: number | undefined;
          try {
            const err = await res.json();
            msg = err.detail || err.error || msg;
            retryAfter = err.retry_in;
          } catch {}

          // Rollback
          if (previous) {
            opts.onRollback(x, y, previous.color, previous.userId);
          }
          opts.onError(msg, retryAfter ? retryAfter * 1000 : undefined);
          pendingRef.current.delete(key);
          return false;
        }

        // 3. Confirmed
        opts.onConfirm(x, y);
        pendingRef.current.delete(key);
        return true;
      } catch (e) {
        // Network error — rollback
        if (previous) {
          opts.onRollback(x, y, previous.color, previous.userId);
        }
        opts.onError('Network error');
        pendingRef.current.delete(key);
        return false;
      }
    },
    [opts]
  );

  return { placePixel, pending: pendingRef.current };
}
