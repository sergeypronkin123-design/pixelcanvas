import { useCanvasStore } from '@/stores/canvasStore';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { X, MapPin, DollarSign, User, Tag, ShoppingCart } from 'lucide-react';
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

  const handleBuy = async () => {
    if (!user) { navigate('/login'); return; }
    setLoading(true);
    setError('');
    try {
      const result = await api.checkout(selectedBlock.id);
      window.location.href = result.checkout_url;
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBuyResale = async () => {
    if (!user) { navigate('/login'); return; }
    setLoading(true);
    setError('');
    try {
      // We need to find the listing for this block
      const listings = await api.getListings();
      const listing = listings.find((l) => l.block_id === selectedBlock.id && l.status === 'active');
      if (!listing) { setError('Listing not found'); return; }
      const result = await api.checkoutResale(listing.id);
      window.location.href = result.checkout_url;
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
      // Refresh block
      const updated = await api.getBlock(selectedBlock.id);
      selectBlock(updated);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

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
            <div className="p-2 rounded-lg bg-canvas-elevated">
              <MapPin size={16} className="text-neon-cyan" />
            </div>
            <div>
              <div className="text-xs text-canvas-muted font-display">Position</div>
              <div className="font-mono text-sm text-canvas-bright">({selectedBlock.x}, {selectedBlock.y})</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-canvas-elevated">
              <DollarSign size={16} className="text-neon-green" />
            </div>
            <div>
              <div className="text-xs text-canvas-muted font-display">Price</div>
              <div className="font-mono text-sm text-canvas-bright">${(selectedBlock.current_price / 100).toFixed(2)}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-canvas-elevated">
              <User size={16} className="text-neon-violet" />
            </div>
            <div>
              <div className="text-xs text-canvas-muted font-display">Owner</div>
              <div className="text-sm text-canvas-bright">
                {selectedBlock.owner_username || (isFree ? 'Available' : 'Unknown')}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-canvas-elevated">
              <Tag size={16} className="text-neon-amber" />
            </div>
            <div>
              <div className="text-xs text-canvas-muted font-display">Status</div>
              <div className={`text-sm font-medium capitalize
                ${selectedBlock.status === 'free' ? 'text-canvas-muted' : ''}
                ${selectedBlock.status === 'owned' ? 'text-neon-green' : ''}
                ${selectedBlock.status === 'listed' ? 'text-neon-violet' : ''}
                ${selectedBlock.status === 'reserved' ? 'text-neon-amber' : ''}
              `}>
                {selectedBlock.status}
              </div>
            </div>
          </div>

          {/* Actions */}
          {error && (
            <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {isFree && (
            <button onClick={handleBuy} disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
              <ShoppingCart size={16} />
              {loading ? 'Processing...' : `Buy for $${(selectedBlock.current_price / 100).toFixed(2)}`}
            </button>
          )}

          {isListed && !isOwner && (
            <button onClick={handleBuyResale} disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
              <ShoppingCart size={16} />
              {loading ? 'Processing...' : `Buy for $${(selectedBlock.current_price / 100).toFixed(2)}`}
            </button>
          )}

          {isOwner && selectedBlock.status === 'owned' && (
            <>
              {showListForm ? (
                <div className="space-y-2">
                  <input
                    type="number"
                    placeholder="Price in cents (e.g. 500)"
                    value={listPrice}
                    onChange={(e) => setListPrice(e.target.value)}
                    className="input-field text-sm"
                  />
                  <div className="flex gap-2">
                    <button onClick={handleList} disabled={loading} className="btn-primary flex-1 text-sm !py-2">
                      {loading ? '...' : 'List'}
                    </button>
                    <button onClick={() => setShowListForm(false)} className="btn-secondary flex-1 text-sm !py-2">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowListForm(true)} className="btn-secondary w-full">
                  List for Resale
                </button>
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
