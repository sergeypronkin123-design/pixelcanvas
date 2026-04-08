import { useEffect, useRef } from 'react';
import { useCanvasStore } from '@/stores/canvasStore';
import type { WSMessage } from '@/types';

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const updateBlock = useCanvasStore((s) => s.updateBlock);
  const updatePixels = useCanvasStore((s) => s.updatePixels);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    function connect() {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = import.meta.env.VITE_WS_URL || `${proto}//${window.location.host}/ws`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
      };

      ws.onmessage = (event) => {
        try {
          const msg: WSMessage = JSON.parse(event.data);
          if (msg.type === 'block_update' && msg.block) {
            updateBlock(msg.block);
          } else if (msg.type === 'pixel_update' && msg.pixels) {
            updatePixels(msg.pixels);
          }
        } catch (e) {
          console.error('WS parse error', e);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected, reconnecting...');
        reconnectTimeout.current = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };

      // Keep alive
      const ping = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send('ping');
        }
      }, 30000);

      return () => clearInterval(ping);
    }

    connect();

    return () => {
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      wsRef.current?.close();
    };
  }, [updateBlock, updatePixels]);
}
