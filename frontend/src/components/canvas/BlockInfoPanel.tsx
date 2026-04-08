import { useCanvasStore } from '@/stores/canvasStore';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { X, MapPin, DollarSign, User, Tag, ShoppingCart, CreditCard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function BlockInfoPanel() {
  const { selectedBlock, selectBlock } = useCanvasStore();
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [listPrice, setListPrice] = useState('');
  const [showListForm, setShowListForm] = useState(false);

  if (!selectedBlock) return null;

  const isOwner = user && selectedBlock.owner_id === user.id;
  const isFree = selectedBlock.status === 'free';
  const isListed = selectedBlock.status === 'listed';

  const handleBuy = async (provider: 'stripe' | 'yukassa') => {
    if (!user) { navigate('/login'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(
        `/api/purchase/checkout?provider=${provider}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({ block_id: selectedBlock.id }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Checkout failed');
      window.location.href = data.checkout_url;
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBuyResale = async (provider: 'stripe' | 'yukassa') => {
    if (!user) { navigate('/login'); return; }
    setLoading(true);
    setError('');
    try {
      const listings = await api.getListings();
      const listing = listings.find((l) => l.block_id === selectedBlock.id && l.status === 'active');
      if (!listing) { setError('Listing not found'); return; }
      const res = await fetch(
        `/api/purchase/checkout/resale?provider=${provider}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({ listing_id: listing.id }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Checkout failed');
      window.location.href = data.checkout_url;
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleList = async () => {
    const price = parseInt(listPrice);
    if (!price || price <= 0) { setError('Enter a valid price'); return; }
    setLoading(true);
    setError('');
    try {
      await api.createListing(selectedBlock.id, price);
      setShowListForm(false);
      const updated = await api.getBlock(selectedBlock.id);
      selectBlock(updated);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const priceUsd = (selectedBlock.current_price / 100).toFixed(2);
  const priceRub = (selectedBlock.current_price).toFixed(0);  // 1 cent ≈ 1 ruble for simplicity

  return (
    <AnimatePresence>
      <motion.div
        key="block-panel"
        initial={{ x: 400, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 400, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed right-4 top-20 z-40 w-80 glass rounded-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-canvas-border flex items-center justify-between">
          <h3 className="font-display font-semibold text-canvas-bright">Block Details</h3>
          <button onClick={() => selectBlock(null)} className="p-1 text-canvas-muted hover:text-canvas-bright rounded-lg hover:bg-canvas-elevated transition-all">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-canvas-elevated"><MapPin size={16} className="text-neon-cyan" /></div>
            <div>
              <div className="text-xs text-canvas-muted font-display">Position</div>
              <div className="font-mono text-sm text-canvas-bright">({selectedBlock.x}, {selectedBlock.y})</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-canvas-elevated"><DollarSign size={16} className="text-neon-green" /></div>
            <div>
              <div className="text-xs text-canvas-muted font-display">Price</div>
              <div className="font-mono text-sm text-canvas-bright">${priceUsd} / {priceRub}₽</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-canvas-elevated"><User size={16} className="text-neon-violet" /></div>
            <div>
              <div className="text-xs text-canvas-muted font-display">Owner</div>
              <div className="text-sm text-canvas-bright">
                {selectedBlock.owner_username || (isFree ? 'Available' : 'Unknown')}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-canvas-elevated"><Tag size={16} className="text-neon-amber" /></div>
            <div>
              <div className="text-xs text-canvas-muted font-display">Status</div>
              <div className={`text-sm font-medium capitalize
                ${selectedBlock.status === 'free' ? 'text-canvas-muted' : ''}
                ${selectedBlock.status === 'owned' ? 'text-neon-green' : ''}
                ${selectedBlock.status === 'listed' ? 'text-neon-violet' : ''}
                ${selectedBlock.status === 'reserved' ? 'text-neon-amber' : ''}
              `}>{selectedBlock.status}</div>
            </div>
          </div>

          {error && (
            <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>
          )}

          {/* Buy buttons for free blocks */}
          {isFree && (
            <div className="space-y-2">
              <p className="text-xs text-canvas-muted font-display">Choose payment method:</p>
              <button onClick={() => handleBuy('stripe')} disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2">
                <CreditCard size={16} />
                {loading ? '...' : `Pay $${priceUsd} (Card)`}
              </button>
              <button onClick={() => handleBuy('yukassa')} disabled={loading}
                className="w-full px-6 py-3 bg-neon-green/10 border border-neon-green/40 text-neon-green rounded-lg
                           font-display font-semibold tracking-wide hover:bg-neon-green/20 hover:border-neon-green/70
                           active:scale-[0.98] transition-all duration-200 cursor-pointer
                           disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                <ShoppingCart size={16} />
                {loading ? '...' : `Pay ${priceRub}₽ (ЮKassa)`}
              </button>
            </div>
          )}

          {/* Buy buttons for listed blocks */}
          {isListed && !isOwner && (
            <div className="space-y-2">
              <p className="text-xs text-canvas-muted font-display">Choose payment method:</p>
              <button onClick={() => handleBuyResale('stripe')} disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2">
                <CreditCard size={16} />
                {loading ? '...' : `Pay $${priceUsd} (Card)`}
              </button>
              <button onClick={() => handleBuyResale('yukassa')} disabled={loading}
                className="w-full px-6 py-3 bg-neon-green/10 border border-neon-green/40 text-neon-green rounded-lg
                           font-display font-semibold tracking-wide hover:bg-neon-green/20 hover:border-neon-green/70
                           active:scale-[0.98] transition-all duration-200 cursor-pointer
                           disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                <ShoppingCart size={16} />
                {loading ? '...' : `Pay ${priceRub}₽ (ЮKassa)`}
              </button>
            </div>
          )}

          {/* List for resale */}
          {isOwner && selectedBlock.status === 'owned' && (
            <>
              {showListForm ? (
                <div className="space-y-2">
                  <input type="number" placeholder="Price in kopecks (e.g. 500)" value={listPrice}
                    onChange={(e) => setListPrice(e.target.value)} className="input-field text-sm" />
                  <div className="flex gap-2">
                    <button onClick={handleList} disabled={loading} className="btn-primary flex-1 text-sm !py-2">
                      {loading ? '...' : 'List'}
                    </button>
                    <button onClick={() => setShowListForm(false)} className="btn-secondary flex-1 text-sm !py-2">Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowListForm(true)} className="btn-secondary w-full">List for Resale</button>
              )}
            </>
          )}

          {isOwner && (
            <p className="text-xs text-neon-green/70 text-center">You own this block — use the draw tools!</p>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
