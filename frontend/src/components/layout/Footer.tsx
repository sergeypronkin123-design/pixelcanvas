import { Link } from 'react-router-dom';
import { Crosshair, Mail } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-canvas-border mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Top row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
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
            <Link to="/contacts" className="hover:text-canvas-bright transition-colors">Контакты</Link>
          </div>
        </div>

        {/* Legal info — required by payment systems */}
        <div className="border-t border-canvas-border pt-4 text-xs text-canvas-muted space-y-1">
          <p>
            Самозанятый <span className="text-canvas-text">Пронкин Сергей Александрович</span>
          </p>
          <p>
            ИНН: <span className="font-mono text-canvas-text">250202459700</span> · г. Владивосток
          </p>
          <p className="flex items-center gap-1.5">
            <Mail size={11} />
            <a href="mailto:support@pixelstake.ru" className="hover:text-orange-400 transition-colors">support@pixelstake.ru</a>
          </p>
          <p className="pt-2 text-canvas-muted/70">
            &copy; {new Date().getFullYear()} PixelStake. Все права защищены.
          </p>
        </div>
      </div>
    </footer>
  );
}
