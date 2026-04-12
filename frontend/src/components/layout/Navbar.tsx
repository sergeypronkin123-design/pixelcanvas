import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Crosshair, User, LogOut, Crown, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function Navbar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
              <Crosshair size={15} className="text-white" />
            </div>
            <span className="font-display font-bold text-base text-canvas-bright">
              Pixel<span className="text-orange-400">Stake</span>
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-1">
            <Link to="/canvas" className="px-3 py-1.5 text-sm text-canvas-muted hover:text-canvas-bright hover:bg-canvas-elevated rounded-lg transition-all">Battle</Link>
            <Link to="/subscribe" className="px-3 py-1.5 text-sm text-orange-400/80 hover:text-orange-400 hover:bg-canvas-elevated rounded-lg transition-all flex items-center gap-1">
              <Crown size={13} /> Pro
            </Link>
            {user ? (
              <>
                <Link to="/profile" className="px-3 py-1.5 text-sm text-canvas-muted hover:text-canvas-bright hover:bg-canvas-elevated rounded-lg transition-all flex items-center gap-1">
                  <User size={13} /> {user.username}
                </Link>
                <button onClick={handleLogout} className="px-3 py-1.5 text-sm text-canvas-muted hover:text-red-400 hover:bg-canvas-elevated rounded-lg transition-all">
                  <LogOut size={13} />
                </button>
              </>
            ) : (
              <Link to="/login" className="px-4 py-1.5 bg-orange-500/10 border border-orange-500/30 text-orange-400 rounded-lg text-sm font-display font-semibold hover:bg-orange-500/20 transition-all">
                Войти
              </Link>
            )}
          </div>
          <button onClick={() => setOpen(!open)} className="md:hidden p-2 text-canvas-muted">{open ? <X size={18} /> : <Menu size={18} />}</button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="md:hidden overflow-hidden glass border-t border-canvas-border">
            <div className="px-4 py-2 space-y-1">
              <Link to="/canvas" onClick={() => setOpen(false)} className="block px-3 py-2 text-sm text-canvas-muted rounded-lg">Battle</Link>
              <Link to="/subscribe" onClick={() => setOpen(false)} className="block px-3 py-2 text-sm text-orange-400 rounded-lg">Pro</Link>
              {user ? (
                <>
                  <Link to="/profile" onClick={() => setOpen(false)} className="block px-3 py-2 text-sm text-canvas-muted rounded-lg">Профиль</Link>
                  <button onClick={() => { handleLogout(); setOpen(false); }} className="block w-full text-left px-3 py-2 text-sm text-red-400 rounded-lg">Выйти</button>
                </>
              ) : (
                <Link to="/login" onClick={() => setOpen(false)} className="block px-3 py-2 text-sm text-orange-400 rounded-lg">Войти</Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
