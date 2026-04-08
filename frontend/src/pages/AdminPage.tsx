import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { Navbar } from '@/components/layout/Navbar';
import { motion } from 'framer-motion';
import { Users, ShoppingBag, DollarSign, Tag, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { User, Order } from '@/types';

export function AdminPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'orders' | 'transactions'>('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.is_admin) { navigate('/'); return; }
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [s, u, o, t] = await Promise.all([
        api.getAdminStats(),
        api.getAdminUsers(),
        api.getAdminOrders(),
        api.getAdminTransactions(),
      ]);
      setStats(s);
      setUsers(u);
      setOrders(o);
      setTransactions(t);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!user?.is_admin) return null;

  return (
    <div className="min-h-screen bg-canvas-bg">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 pt-24 pb-16">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <div className="mb-10">
            <h1 className="font-display font-bold text-3xl text-canvas-bright mb-2">Admin Panel</h1>
            <p className="text-canvas-muted">Platform management and analytics</p>
          </div>

          {loading ? (
            <div className="card text-center py-16 text-canvas-muted">Loading...</div>
          ) : (
            <>
              {/* Stats row */}
              {stats && (
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
                  {[
                    { icon: <Users size={18} />, label: 'Users', value: stats.total_users, color: 'neon-cyan' },
                    { icon: <BarChart3 size={18} />, label: 'Blocks Owned', value: stats.total_blocks_owned, color: 'neon-green' },
                    { icon: <ShoppingBag size={18} />, label: 'Orders', value: stats.total_orders, color: 'neon-magenta' },
                    { icon: <DollarSign size={18} />, label: 'Revenue', value: `$${(stats.total_revenue / 100).toFixed(2)}`, color: 'neon-amber' },
                    { icon: <Tag size={18} />, label: 'Listings', value: stats.active_listings, color: 'neon-violet' },
                  ].map((s, i) => (
                    <div key={i} className="card !p-4">
                      <div className={`text-${s.color} mb-2`}>{s.icon}</div>
                      <div className="text-xl font-display font-bold text-canvas-bright">{s.value}</div>
                      <div className="text-xs text-canvas-muted">{s.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Tabs */}
              <div className="flex gap-1 mb-6 bg-canvas-surface rounded-xl p-1 border border-canvas-border w-fit">
                {(['overview', 'users', 'orders', 'transactions'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-5 py-2 rounded-lg text-sm font-display font-medium transition-all capitalize
                      ${activeTab === tab ? 'bg-canvas-elevated text-canvas-bright' : 'text-canvas-muted hover:text-canvas-text'}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Tables */}
              {activeTab === 'users' && (
                <div className="card overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-canvas-border text-left">
                        <th className="pb-3 font-display font-medium text-canvas-muted">ID</th>
                        <th className="pb-3 font-display font-medium text-canvas-muted">Username</th>
                        <th className="pb-3 font-display font-medium text-canvas-muted">Email</th>
                        <th className="pb-3 font-display font-medium text-canvas-muted">Admin</th>
                        <th className="pb-3 font-display font-medium text-canvas-muted">Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id} className="border-b border-canvas-border/50 hover:bg-canvas-elevated/30">
                          <td className="py-3 font-mono text-canvas-muted">{u.id}</td>
                          <td className="py-3 text-canvas-bright">{u.username}</td>
                          <td className="py-3 text-canvas-muted">{u.email}</td>
                          <td className="py-3">{u.is_admin ? <span className="text-neon-amber text-xs">Admin</span> : '—'}</td>
                          <td className="py-3 text-canvas-muted text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'orders' && (
                <div className="card overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-canvas-border text-left">
                        <th className="pb-3 font-display font-medium text-canvas-muted">ID</th>
                        <th className="pb-3 font-display font-medium text-canvas-muted">Block</th>
                        <th className="pb-3 font-display font-medium text-canvas-muted">Amount</th>
                        <th className="pb-3 font-display font-medium text-canvas-muted">Type</th>
                        <th className="pb-3 font-display font-medium text-canvas-muted">Status</th>
                        <th className="pb-3 font-display font-medium text-canvas-muted">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((o) => (
                        <tr key={o.id} className="border-b border-canvas-border/50 hover:bg-canvas-elevated/30">
                          <td className="py-3 font-mono text-canvas-muted">{o.id}</td>
                          <td className="py-3 font-mono text-canvas-bright">#{o.block_id}</td>
                          <td className="py-3 font-mono text-neon-green">${(o.amount / 100).toFixed(2)}</td>
                          <td className="py-3 text-xs text-canvas-muted capitalize">{o.order_type.replace('_', ' ')}</td>
                          <td className="py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full
                              ${o.status === 'paid' ? 'bg-neon-green/10 text-neon-green' : ''}
                              ${o.status === 'pending' ? 'bg-neon-amber/10 text-neon-amber' : ''}
                              ${o.status === 'failed' || o.status === 'expired' ? 'bg-red-500/10 text-red-400' : ''}
                            `}>{o.status}</span>
                          </td>
                          <td className="py-3 text-canvas-muted text-xs">{new Date(o.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'transactions' && (
                <div className="card overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-canvas-border text-left">
                        <th className="pb-3 font-display font-medium text-canvas-muted">ID</th>
                        <th className="pb-3 font-display font-medium text-canvas-muted">Type</th>
                        <th className="pb-3 font-display font-medium text-canvas-muted">Amount</th>
                        <th className="pb-3 font-display font-medium text-canvas-muted">Fee</th>
                        <th className="pb-3 font-display font-medium text-canvas-muted">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((t) => (
                        <tr key={t.id} className="border-b border-canvas-border/50 hover:bg-canvas-elevated/30">
                          <td className="py-3 font-mono text-canvas-muted">{t.id}</td>
                          <td className="py-3 text-xs capitalize text-canvas-bright">{t.type.replace('_', ' ')}</td>
                          <td className="py-3 font-mono text-neon-green">${(t.amount / 100).toFixed(2)}</td>
                          <td className="py-3 font-mono text-neon-amber">${(t.fee_amount / 100).toFixed(2)}</td>
                          <td className="py-3 text-canvas-muted text-xs">{new Date(t.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'overview' && stats && (
                <div className="card py-12 text-center">
                  <BarChart3 size={40} className="text-canvas-muted mx-auto mb-4" />
                  <p className="text-canvas-muted">
                    Platform is running with {stats.total_users} users and {stats.total_blocks_owned} owned blocks.
                  </p>
                  <p className="text-canvas-muted/60 text-sm mt-2">
                    Total revenue: ${(stats.total_revenue / 100).toFixed(2)} | Active listings: {stats.active_listings}
                  </p>
                </div>
              )}
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
