import { useEffect } from 'react';
import { useCanvasStore } from '@/stores/canvasStore';
import { useWebSocket } from '@/hooks/useWebSocket';
import { CanvasRenderer } from '@/components/canvas/CanvasRenderer';
import { DrawToolbar } from '@/components/canvas/DrawToolbar';
import { BlockInfoPanel } from '@/components/canvas/BlockInfoPanel';
import { Navbar } from '@/components/layout/Navbar';
import { useAuthStore } from '@/stores/authStore';
import type { BlockBulk } from '@/types';

export function CanvasPage() {
  const loadConfig = useCanvasStore((s) => s.loadConfig);
  const user = useAuthStore((s) => s.user);

  useWebSocket();

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleBlockClick = (block: BlockBulk) => {
    // Block selection is handled in CanvasRenderer + BlockInfoPanel
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-canvas-bg">
      <Navbar />
      <div className="pt-16 h-full">
        <CanvasRenderer onBlockClick={handleBlockClick} />
      </div>
      <BlockInfoPanel />
      {user && <DrawToolbar />}
    </div>
  );
}
