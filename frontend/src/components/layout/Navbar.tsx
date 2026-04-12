import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Crosshair, User, ShoppingBag, LogOut, Shield, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function Navbar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center">
              <Crosshair size={18} className="text-white" />
            </div>
            <span className="font-display font-bold text-lg tracking-tight text-canvas-bright
                           group-hover:text-neon-amber transition-colors">
              Pixel<span className="text-neon-amber">Stake</span>
            </span>
          </Link>

          {/* Desktop */}
          <div className="hidden md:flex items-center gap-1">
            <Link to="/canvas" className="px-4 py-2 text-sm font-medium text-canvas-muted hover:text-canvas-bright
                                         hover:bg-canvas-elevated rounded-lg transition-all">
              Canvas
            </Link>
            <Link to="/marketplace" className="px-4 py-2 text-sm font-medium text-canvas-muted hover:text-canvas-bright
                                              hover:bg-canvas-elevated rounded-lg transition-all">
              Marketplace
            </Link>
            {user ? (
              <>
                <Link to="/dashboard" className="px-4 py-2 text-sm font-medium text-canvas-muted hover:text-canvas-bright
                                                hover:bg-canvas-elevated rounded-lg transition-all flex items-center gap-1.5">
                  <User size={14} />
                  {user.username}
                </Link>
                {user.is_admin && (
                  <Link to="/admin" className="px-4 py-2 text-sm font-medium text-neon-amber/70 hover:text-neon-amber
                                              hover:bg-canvas-elevated rounded-lg transition-all flex items-center gap-1.5">
                    <Shield size={14} />
                    Admin
                  </Link>
                )}
                <button onClick={handleLogout} className="px-4 py-2 text-sm font-medium text-canvas-muted hover:text-red-400
                                                         hover:bg-canvas-elevated rounded-lg transition-all">
                  <LogOut size={14} />
                </button>
              </>
            ) : (
              <Link to="/login" className="px-5 py-2 bg-neon-amber/10 border border-neon-amber/40 text-neon-amber rounded-lg
                           font-display font-semibold text-sm tracking-wide
                           hover:bg-neon-amber/20 hover:border-neon-amber/70
                           transition-all duration-200">
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile toggle */}
          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 text-canvas-muted">
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden overflow-hidden glass border-t border-canvas-border"
          >
            <div className="px-4 py-3 space-y-1">
              <Link to="/canvas" onClick={() => setMobileOpen(false)}
                    className="block px-4 py-2.5 text-sm text-canvas-muted hover:text-canvas-bright rounded-lg">Canvas</Link>
              <Link to="/marketplace" onClick={() => setMobileOpen(false)}
                    className="block px-4 py-2.5 text-sm text-canvas-muted hover:text-canvas-bright rounded-lg">Marketplace</Link>
              {user ? (
                <>
                  <Link to="/dashboard" onClick={() => setMobileOpen(false)}
                        className="block px-4 py-2.5 text-sm text-canvas-muted hover:text-canvas-bright rounded-lg">Dashboard</Link>
                  <button onClick={() => { handleLogout(); setMobileOpen(false); }}
                          className="block w-full text-left px-4 py-2.5 text-sm text-red-400 rounded-lg">Sign Out</button>
                </>
              ) : (
                <Link to="/login" onClick={() => setMobileOpen(false)}
                      className="block px-4 py-2.5 text-sm text-neon-amber rounded-lg">Sign In</Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
