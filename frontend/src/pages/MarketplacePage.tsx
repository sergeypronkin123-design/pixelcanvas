import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Navbar } from '@/components/layout/Navbar';
import { motion } from 'framer-motion';
import { Tag, MapPin, DollarSign, ArrowUpDown, ShoppingCart } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useNavigate } from 'react-router-dom';
import type { Listing } from '@/types';

export function MarketplacePage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('recent');
  const [buyingId, setBuyingId] = useState<number | null>(null);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  useEffect(() => {
    loadListings();
  }, [sort]);

  const loadListings = async () => {
    setLoading(true);
    try {
      const data = await api.getListings(sort);
      setListings(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = async (listing: Listing) => {
    if (!user) { navigate('/login'); return; }
    setBuyingId(listing.id);
    try {
      const result = await api.checkoutResale(listing.id);
      window.location.href = result.checkout_url;
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBuyingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-canvas-bg">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 pt-24 pb-16">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <div className="flex items-end justify-between mb-10">
            <div>
              <h1 className="font-display font-bold text-3xl text-canvas-bright mb-2">Marketplace</h1>
              <p className="text-canvas-muted">Browse and buy blocks listed by other owners</p>
            </div>
            <div className="flex items-center gap-2">
              <ArrowUpDown size={14} className="text-canvas-muted" />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="input-field !w-auto !py-2 text-sm"
              >
                <option value="recent">Most Recent</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="card text-center py-16 text-canvas-muted">
              <div className="w-8 h-8 border-2 border-neon-cyan/30 border-t-neon-cyan rounded-full animate-spin mx-auto mb-4" />
              Loading listings...
            </div>
          ) : listings.length === 0 ? (
            <div className="card text-center py-16">
              <Tag size={40} className="text-canvas-muted mx-auto mb-4" />
              <p className="text-canvas-muted text-lg mb-2">No listings yet</p>
              <p className="text-canvas-muted/60 text-sm">Be the first to list a block for sale</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {listings.map((listing, i) => (
                <motion.div
                  key={listing.id}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="card-hover group"
                >
                  {/* Preview area */}
                  <div className="w-full aspect-square rounded-lg bg-canvas-bg mb-4 relative overflow-hidden border border-canvas-border">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="grid grid-cols-10 grid-rows-10 w-full h-full opacity-30">
                        {Array.from({ length: 100 }).map((_, j) => (
                          <div key={j} className="border border-canvas-border/30" style={{
                            backgroundColor: `hsl(${(listing.block_x * 3 + listing.block_y * 7 + j * 13) % 360}, 60%, ${20 + (j % 15)}%)`
                          }} />
                        ))}
                      </div>
                    </div>
                    <div className="absolute top-2 right-2 px-2 py-1 rounded-md bg-canvas-bg/80 backdrop-blur-sm border border-canvas-border">
                      <span className="text-xs font-mono text-neon-violet">For Sale</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-canvas-muted">
                        <MapPin size={13} />
                        <span className="font-mono text-xs">({listing.block_x}, {listing.block_y})</span>
                      </div>
                      <span className="text-xs text-canvas-muted">by {listing.seller_username}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <DollarSign size={16} className="text-neon-green" />
                        <span className="font-display font-bold text-lg text-canvas-bright">
                          {(listing.price / 100).toFixed(2)}
                        </span>
                      </div>

                      {user?.id !== listing.seller_id && (
                        <button
                          onClick={() => handleBuy(listing)}
                          disabled={buyingId === listing.id}
                          className="btn-primary text-xs !px-4 !py-2 flex items-center gap-1.5"
                        >
                          <ShoppingCart size={13} />
                          {buyingId === listing.id ? '...' : 'Buy'}
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
