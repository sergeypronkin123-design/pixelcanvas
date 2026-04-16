import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { User, LogOut, Crown, Menu, X, Trophy, Share2, Shield, ShoppingBag } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogoIcon, CoinIcon } from '@/components/icons/RankIcons';

export function Navbar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const handleLogout = () => { logout(); navigate('/'); };

  useEffect(() => {
    if (!user) { setBalance(null); return; }
    const token = localStorage.getItem('token');
    if (!token) return;
    const API = import.meta.env.VITE_API_URL || '';
    fetch(`${API}/api/economy/balance`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setBalance(d.balance); })
      .catch(() => {});
  }, [user]);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          <Link to="/" className="flex items-center gap-2 group">
            <LogoIcon size={28} className="rounded-lg" />
            <span className="font-display font-bold text-base text-canvas-bright">
              Pixel<span className="text-orange-400">Stake</span>
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-1">
            <Link to="/canvas" className="px-3 py-1.5 text-sm text-canvas-muted hover:text-canvas-bright hover:bg-canvas-elevated rounded-lg transition-all">Battle</Link>
            <Link to="/leaderboard" className="px-3 py-1.5 text-sm text-canvas-muted hover:text-canvas-bright hover:bg-canvas-elevated rounded-lg transition-all flex items-center gap-1">
              <Trophy size={13} /> Топ
            </Link>
            <Link to="/clans" className="px-3 py-1.5 text-sm text-canvas-muted hover:text-canvas-bright hover:bg-canvas-elevated rounded-lg transition-all flex items-center gap-1">
              <Shield size={13} /> Кланы
            </Link>
            {user && (
              <Link to="/shop" className="px-3 py-1.5 text-sm text-canvas-muted hover:text-canvas-bright hover:bg-canvas-elevated rounded-lg transition-all flex items-center gap-1">
                <ShoppingBag size={13} /> Магазин
              </Link>
            )}
            <Link to="/subscribe" className="px-3 py-1.5 text-sm text-orange-400/80 hover:text-orange-400 hover:bg-canvas-elevated rounded-lg transition-all flex items-center gap-1">
              <Crown size={13} /> Pro
            </Link>
            {user ? (
              <>
                {balance !== null && (
                  <Link to="/shop" className="px-2.5 py-1.5 text-sm bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 rounded-lg hover:bg-yellow-500/20 transition-all flex items-center gap-1">
                    <CoinIcon size={14} /> <span className="font-mono">{balance.toLocaleString()}</span>
                  </Link>
                )}
                <Link to="/referral" className="px-3 py-1.5 text-sm text-neon-green/80 hover:text-neon-green hover:bg-canvas-elevated rounded-lg transition-all flex items-center gap-1">
                  <Share2 size={13} /> Друзья
                </Link>
                <Link to="/profile" className="px-3 py-1.5 text-sm text-canvas-muted hover:text-canvas-bright hover:bg-canvas-elevated rounded-lg transition-all flex items-center gap-1">
                  <User size={13} /> {user.username}
                </Link>
                {user.is_admin && (
                  <Link to="/admin" className="px-3 py-1.5 text-sm text-neon-amber/70 hover:text-neon-amber hover:bg-canvas-elevated rounded-lg transition-all">
                    Admin
                  </Link>
                )}
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
              <Link to="/leaderboard" onClick={() => setOpen(false)} className="block px-3 py-2 text-sm text-canvas-muted rounded-lg">Топ игроков</Link>
              <Link to="/clans" onClick={() => setOpen(false)} className="block px-3 py-2 text-sm text-canvas-muted rounded-lg">Кланы</Link>
              {user && (
                <>
                  <Link to="/shop" onClick={() => setOpen(false)} className="flex items-center justify-between px-3 py-2 text-sm text-canvas-bright rounded-lg">
                    <span>Магазин</span>
                    {balance !== null && (
                      <span className="flex items-center gap-1 text-yellow-400 font-mono text-xs">
                        <CoinIcon size={12} /> {balance.toLocaleString()}
                      </span>
                    )}
                  </Link>
                  <Link to="/achievements" onClick={() => setOpen(false)} className="block px-3 py-2 text-sm text-canvas-muted rounded-lg">Достижения</Link>
                </>
              )}
              <Link to="/subscribe" onClick={() => setOpen(false)} className="block px-3 py-2 text-sm text-orange-400 rounded-lg">Pro</Link>
              {user ? (
                <>
                  <Link to="/referral" onClick={() => setOpen(false)} className="block px-3 py-2 text-sm text-neon-green rounded-lg">Пригласить друзей</Link>
                  <Link to="/profile" onClick={() => setOpen(false)} className="block px-3 py-2 text-sm text-canvas-muted rounded-lg">Профиль</Link>
                  {user.is_admin && (
                    <Link to="/admin" onClick={() => setOpen(false)} className="block px-3 py-2 text-sm text-neon-amber rounded-lg">Админ</Link>
                  )}
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
