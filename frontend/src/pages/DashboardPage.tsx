import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { Navbar } from '@/components/layout/Navbar';
import { motion } from 'framer-motion';
import { Grid3X3, ShoppingBag, Tag, Clock } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import type { Block, Order, Listing } from '@/types';

export function DashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'blocks' | 'orders' | 'listings'>('blocks');

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [b, o, l] = await Promise.all([
        api.getMyBlocks(),
        api.getOrders(),
        api.getMyListings(),
      ]);
      setBlocks(b);
      setOrders(o);
      setListings(l);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelListing = async (id: number) => {
    try {
      await api.cancelListing(id);
      loadData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-canvas-bg">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 pt-24 pb-16">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          {/* Header */}
          <div className="mb-10">
            <h1 className="font-display font-bold text-3xl text-canvas-bright mb-2">
              Dashboard
            </h1>
            <p className="text-canvas-muted">
              Welcome, <span className="text-neon-cyan">{user.username}</span>
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-10">
            <div className="card flex items-center gap-4">
              <div className="p-3 rounded-xl bg-neon-cyan/10"><Grid3X3 className="text-neon-cyan" size={22} /></div>
              <div>
                <div className="text-2xl font-display font-bold text-canvas-bright">{blocks.length}</div>
                <div className="text-xs text-canvas-muted">Blocks Owned</div>
              </div>
            </div>
            <div className="card flex items-center gap-4">
              <div className="p-3 rounded-xl bg-neon-green/10"><ShoppingBag className="text-neon-green" size={22} /></div>
              <div>
                <div className="text-2xl font-display font-bold text-canvas-bright">{orders.filter(o => o.status === 'paid').length}</div>
                <div className="text-xs text-canvas-muted">Purchases</div>
              </div>
            </div>
            <div className="card flex items-center gap-4">
              <div className="p-3 rounded-xl bg-neon-violet/10"><Tag className="text-neon-violet" size={22} /></div>
              <div>
                <div className="text-2xl font-display font-bold text-canvas-bright">{listings.filter(l => l.status === 'active').length}</div>
                <div className="text-xs text-canvas-muted">Active Listings</div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 bg-canvas-surface rounded-xl p-1 border border-canvas-border w-fit">
            {(['blocks', 'orders', 'listings'] as const).map((tab) => (
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

          {/* Content */}
          {loading ? (
            <div className="card text-center py-12 text-canvas-muted">Loading...</div>
          ) : (
            <>
              {activeTab === 'blocks' && (
                <div className="space-y-3">
                  {blocks.length === 0 ? (
                    <div className="card text-center py-12">
                      <p className="text-canvas-muted mb-4">You don't own any blocks yet</p>
                      <Link to="/canvas" className="btn-primary">Explore Canvas</Link>
                    </div>
                  ) : (
                    blocks.map((b) => (
                      <div key={b.id} className="card-hover flex items-center justify-between !p-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-neon-green/10 flex items-center justify-center">
                            <Grid3X3 size={16} className="text-neon-green" />
                          </div>
                          <div>
                            <div className="font-mono text-sm text-canvas-bright">Block ({b.x}, {b.y})</div>
                            <div className="text-xs text-canvas-muted capitalize">{b.status}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-canvas-bright font-mono">${(b.current_price / 100).toFixed(2)}</div>
                          <Link to="/canvas" className="text-xs text-neon-cyan hover:underline">View</Link>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'orders' && (
                <div className="space-y-3">
                  {orders.length === 0 ? (
                    <div className="card text-center py-12 text-canvas-muted">No orders yet</div>
                  ) : (
                    orders.map((o) => (
                      <div key={o.id} className="card flex items-center justify-between !p-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-canvas-elevated flex items-center justify-center">
                            <Clock size={16} className="text-canvas-muted" />
                          </div>
                          <div>
                            <div className="text-sm text-canvas-bright">Order #{o.id}</div>
                            <div className="text-xs text-canvas-muted">{new Date(o.created_at).toLocaleDateString()}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-mono text-canvas-bright">${(o.amount / 100).toFixed(2)}</div>
                          <div className={`text-xs capitalize font-medium
                            ${o.status === 'paid' ? 'text-neon-green' : ''}
                            ${o.status === 'pending' ? 'text-neon-amber' : ''}
                            ${o.status === 'failed' || o.status === 'expired' ? 'text-red-400' : ''}
                          `}>{o.status}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'listings' && (
                <div className="space-y-3">
                  {listings.length === 0 ? (
                    <div className="card text-center py-12 text-canvas-muted">No listings</div>
                  ) : (
                    listings.filter(l => l.status === 'active').map((l) => (
                      <div key={l.id} className="card-hover flex items-center justify-between !p-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-neon-violet/10 flex items-center justify-center">
                            <Tag size={16} className="text-neon-violet" />
                          </div>
                          <div>
                            <div className="font-mono text-sm text-canvas-bright">Block ({l.block_x}, {l.block_y})</div>
                            <div className="text-xs text-canvas-muted">Listed for ${(l.price / 100).toFixed(2)}</div>
                          </div>
                        </div>
                        <button onClick={() => handleCancelListing(l.id)} className="btn-danger text-xs !px-4 !py-1.5">
                          Delist
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
