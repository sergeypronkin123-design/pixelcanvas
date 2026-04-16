import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { motion } from 'framer-motion';
import { Users, Crosshair, Crown, DollarSign, Swords } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || '';
async function adminFetch(path: string) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('Admin access denied');
  return res.json();
}

export function AdminPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [subs, setSubs] = useState<any[]>([]);
  const [battles, setBattles] = useState<any[]>([]);
  const [tab, setTab] = useState<'overview' | 'users' | 'subs' | 'battles'>('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.is_admin) { navigate('/'); return; }
    Promise.all([
      adminFetch('/api/admin/stats'),
      adminFetch('/api/admin/users'),
      adminFetch('/api/admin/subscriptions'),
      adminFetch('/api/admin/battles'),
    ]).then(([s, u, sub, b]) => {
      setStats(s); setUsers(u); setSubs(sub); setBattles(b);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [user]);

  if (!user?.is_admin) return null;

  return (
    <div className="min-h-screen bg-canvas-bg flex flex-col"><Navbar />
      <main className="flex-1">
      <div className="max-w-6xl mx-auto px-6 pt-24 pb-16">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <h1 className="font-display font-bold text-3xl text-canvas-bright mb-8">Админ-панель</h1>

          {loading ? (
            <div className="card text-center py-16 text-canvas-muted">Загрузка...</div>
          ) : (
            <>
              {/* Stats */}
              {stats && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  <div className="card !p-4">
                    <Users size={18} className="text-orange-400 mb-2" />
                    <div className="text-2xl font-display font-bold text-canvas-bright">{stats.total_users}</div>
                    <div className="text-xs text-canvas-muted">Пользователей</div>
                  </div>
                  <div className="card !p-4">
                    <Crosshair size={18} className="text-neon-green mb-2" />
                    <div className="text-2xl font-display font-bold text-canvas-bright">{stats.total_pixels?.toLocaleString()}</div>
                    <div className="text-xs text-canvas-muted">Пикселей</div>
                  </div>
                  <div className="card !p-4">
                    <Crown size={18} className="text-yellow-400 mb-2" />
                    <div className="text-2xl font-display font-bold text-canvas-bright">{stats.total_subscribers}</div>
                    <div className="text-xs text-canvas-muted">Подписчиков Pro</div>
                  </div>
                  <div className="card !p-4">
                    <DollarSign size={18} className="text-neon-cyan mb-2" />
                    <div className="text-lg font-display font-bold text-canvas-bright">
                      ${((stats.total_revenue_usd || 0) / 100).toFixed(2)} / {((stats.total_revenue_rub || 0) / 100).toFixed(0)}₽
                    </div>
                    <div className="text-xs text-canvas-muted">Доход</div>
                  </div>
                </div>
              )}

              {/* Tabs */}
              <div className="flex gap-1 mb-6 bg-canvas-surface rounded-xl p-1 border border-canvas-border w-fit">
                {([['overview', 'Обзор'], ['users', 'Пользователи'], ['subs', 'Подписки'], ['battles', 'Батлы']] as const).map(([t, label]) => (
                  <button key={t} onClick={() => setTab(t)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-display transition-all
                      ${tab === t ? 'bg-canvas-elevated text-canvas-bright' : 'text-canvas-muted hover:text-canvas-text'}`}>
                    {label}
                  </button>
                ))}
              </div>

              {tab === 'overview' && stats && (
                <div className="card text-center py-10">
                  <Swords size={36} className="text-canvas-muted mx-auto mb-3" />
                  <p className="text-canvas-muted">
                    {stats.total_users} пользователей, {stats.total_pixels?.toLocaleString()} пикселей, {stats.total_subscribers} подписчиков
                  </p>
                </div>
              )}

              {tab === 'users' && (
                <div className="card overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-canvas-border text-left">
                        <th className="pb-2 font-display text-canvas-muted">ID</th>
                        <th className="pb-2 font-display text-canvas-muted">Username</th>
                        <th className="pb-2 font-display text-canvas-muted">Email</th>
                        <th className="pb-2 font-display text-canvas-muted">Pro</th>
                        <th className="pb-2 font-display text-canvas-muted">Пикселей</th>
                        <th className="pb-2 font-display text-canvas-muted">Дата</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id} className="border-b border-canvas-border/30 hover:bg-canvas-elevated/30">
                          <td className="py-2 font-mono text-canvas-muted">{u.id}</td>
                          <td className="py-2 text-canvas-bright">{u.username}</td>
                          <td className="py-2 text-canvas-muted">{u.email}</td>
                          <td className="py-2">{u.is_subscriber ? <Crown size={13} className="text-yellow-400" /> : '—'}</td>
                          <td className="py-2 font-mono text-orange-400">{u.pixels_placed_total}</td>
                          <td className="py-2 text-canvas-muted text-xs">{u.created_at ? new Date(u.created_at).toLocaleDateString('ru') : ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {tab === 'subs' && (
                <div className="card overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-canvas-border text-left">
                        <th className="pb-2 font-display text-canvas-muted">ID</th>
                        <th className="pb-2 font-display text-canvas-muted">User</th>
                        <th className="pb-2 font-display text-canvas-muted">Провайдер</th>
                        <th className="pb-2 font-display text-canvas-muted">Сумма</th>
                        <th className="pb-2 font-display text-canvas-muted">Статус</th>
                        <th className="pb-2 font-display text-canvas-muted">Дата</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subs.map((s) => (
                        <tr key={s.id} className="border-b border-canvas-border/30 hover:bg-canvas-elevated/30">
                          <td className="py-2 font-mono text-canvas-muted">{s.id}</td>
                          <td className="py-2 text-canvas-bright">#{s.user_id}</td>
                          <td className="py-2 text-canvas-muted">{s.provider}</td>
                          <td className="py-2 font-mono text-neon-green">
                            {s.currency === 'usd' ? `$${(s.amount / 100).toFixed(2)}` : `${(s.amount / 100).toFixed(0)}₽`}
                          </td>
                          <td className="py-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${s.status === 'paid' ? 'bg-neon-green/10 text-neon-green' : 'bg-canvas-elevated text-canvas-muted'}`}>{s.status}</span>
                          </td>
                          <td className="py-2 text-canvas-muted text-xs">{s.created_at ? new Date(s.created_at).toLocaleDateString('ru') : ''}</td>
                        </tr>
                      ))}
                      {subs.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-canvas-muted">Пока нет подписок</td></tr>}
                    </tbody>
                  </table>
                </div>
              )}

              {tab === 'battles' && (
                <div className="card overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-canvas-border text-left">
                        <th className="pb-2 font-display text-canvas-muted">ID</th>
                        <th className="pb-2 font-display text-canvas-muted">Период</th>
                        <th className="pb-2 font-display text-canvas-muted">Статус</th>
                        <th className="pb-2 font-display text-canvas-muted">Пикселей</th>
                        <th className="pb-2 font-display text-canvas-muted">Участников</th>
                      </tr>
                    </thead>
                    <tbody>
                      {battles.map((b) => (
                        <tr key={b.id} className="border-b border-canvas-border/30 hover:bg-canvas-elevated/30">
                          <td className="py-2 font-mono text-canvas-muted">{b.id}</td>
                          <td className="py-2 text-canvas-bright">{b.month}/{b.year}</td>
                          <td className="py-2">{b.is_active ? <span className="text-xs text-red-400 font-bold">ACTIVE</span> : <span className="text-xs text-canvas-muted">ended</span>}</td>
                          <td className="py-2 font-mono text-orange-400">{b.total_pixels?.toLocaleString()}</td>
                          <td className="py-2 font-mono text-canvas-bright">{b.total_participants}</td>
                        </tr>
                      ))}
                      {battles.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-canvas-muted">Пока нет батлов</td></tr>}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </motion.div>
      </div>
      </main>
      <Footer />
    </div>
  );
}
