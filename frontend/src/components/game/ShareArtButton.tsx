import { useState } from 'react';
import { Share2, Download, Copy, Check } from 'lucide-react';

interface ShareArtProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

export function ShareArtButton({ canvasRef }: ShareArtProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const captureCanvas = (): string | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.toDataURL('image/png');
  };

  const handleDownload = () => {
    const dataUrl = captureCanvas();
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.download = `pixelstake-art-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
    setOpen(false);
  };

  const handleShare = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) return;

      if (navigator.share && navigator.canShare) {
        const file = new File([blob], 'pixelstake-art.png', { type: 'image/png' });
        const shareData = {
          title: 'Мой арт на PixelStake',
          text: 'Рисую пиксели и зарабатываю! Присоединяйся: pixelstake.ru',
          files: [file],
        };
        if (navigator.canShare(shareData)) {
          await navigator.share(shareData);
          setOpen(false);
          return;
        }
      }
      // Fallback — скачать
      handleDownload();
    } catch {
      handleDownload();
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText('https://pixelstake.ru').then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-8 h-8 rounded-lg bg-canvas-elevated border border-canvas-border flex items-center justify-center text-canvas-muted hover:text-neon-green hover:border-neon-green/30 transition-all"
        title="Поделиться артом"
      >
        <Share2 size={14} />
      </button>

      {open && (
        <div className="absolute bottom-10 right-0 glass rounded-xl p-2 min-w-[180px] space-y-1 z-50">
          <button onClick={handleShare} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-canvas-bright hover:bg-canvas-elevated transition-all">
            <Share2 size={14} className="text-neon-green" /> Поделиться
          </button>
          <button onClick={handleDownload} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-canvas-bright hover:bg-canvas-elevated transition-all">
            <Download size={14} className="text-orange-400" /> Скачать PNG
          </button>
          <button onClick={handleCopyLink} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-canvas-bright hover:bg-canvas-elevated transition-all">
            {copied ? <Check size={14} className="text-neon-green" /> : <Copy size={14} className="text-canvas-muted" />}
            {copied ? 'Скопировано!' : 'Скопировать ссылку'}
          </button>
        </div>
      )}
    </div>
  );
}
