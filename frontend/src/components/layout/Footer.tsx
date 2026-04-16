import { Link } from 'react-router-dom';
import { Crosshair, Mail } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-canvas-border mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Crosshair size={14} className="text-orange-400" />
            <span className="font-display font-semibold text-sm text-canvas-muted">
              Pixel<span className="text-orange-400">Stake</span>
            </span>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-canvas-muted">
            <Link to="/offer" className="hover:text-canvas-bright transition-colors">Оферта</Link>
            <Link to="/refund" className="hover:text-canvas-bright transition-colors">Возврат</Link>
            <Link to="/privacy" className="hover:text-canvas-bright transition-colors">Конфиденциальность</Link>
            <Link to="/contacts" className="hover:text-canvas-bright transition-colors font-semibold">Контакты и реквизиты</Link>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-canvas-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-canvas-muted/70">
          <p>&copy; {new Date().getFullYear()} PixelStake. Все права защищены.</p>
          <a href="mailto:support@pixelstake.ru" className="flex items-center gap-1 hover:text-orange-400 transition-colors">
            <Mail size={11} /> support@pixelstake.ru
          </a>
        </div>
      </div>
    </footer>
  );
}
