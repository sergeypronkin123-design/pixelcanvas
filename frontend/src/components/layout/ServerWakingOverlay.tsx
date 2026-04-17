import { useEffect, useState } from 'react';
import { isServerWaking, onServerAwake } from '@/lib/api';

export function ServerWakingOverlay() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      if (isServerWaking() && !show) setShow(true);
    }, 500);
    return () => clearInterval(interval);
  }, [show]);

  useEffect(() => {
    if (show) {
      onServerAwake(() => setShow(false));
    }
  }, [show]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-canvas-bg/90 backdrop-blur-sm flex items-center justify-center">
      <div className="text-center px-6">
        <div className="w-12 h-12 mx-auto mb-4 border-3 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
        <h2 className="font-display font-bold text-lg text-canvas-bright mb-2">
          Сервер просыпается...
        </h2>
        <p className="text-canvas-muted text-sm max-w-xs mx-auto">
          Бесплатный сервер засыпает после неактивности. Подождите 10-15 секунд, подключаемся.
        </p>
        <div className="mt-4 flex justify-center gap-1">
          <div className="w-2 h-2 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: '0s' }} />
          <div className="w-2 h-2 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: '0.15s' }} />
          <div className="w-2 h-2 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: '0.3s' }} />
        </div>
      </div>
    </div>
  );
}
