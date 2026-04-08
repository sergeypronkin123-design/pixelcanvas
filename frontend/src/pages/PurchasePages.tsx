import { Link, useSearchParams } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, ArrowRight } from 'lucide-react';

export function PurchaseSuccessPage() {
  const [params] = useSearchParams();
  const sessionId = params.get('session_id');

  return (
    <div className="min-h-screen bg-canvas-bg">
      <Navbar />
      <div className="flex items-center justify-center min-h-screen px-4 pt-16">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center max-w-md"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2, damping: 10 }}
          >
            <CheckCircle2 size={80} className="text-neon-green mx-auto mb-6" />
          </motion.div>
          <h1 className="font-display font-bold text-3xl text-canvas-bright mb-3">
            Purchase Complete!
          </h1>
          <p className="text-canvas-muted mb-8 leading-relaxed">
            Your block has been assigned to your account. Head to the canvas to start drawing
            on your new territory!
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/canvas" className="btn-primary flex items-center justify-center gap-2">
              Go to Canvas <ArrowRight size={16} />
            </Link>
            <Link to="/dashboard" className="btn-secondary">
              View Dashboard
            </Link>
          </div>
          {sessionId && (
            <p className="text-xs text-canvas-muted/50 mt-8 font-mono">
              Session: {sessionId.slice(0, 20)}...
            </p>
          )}
        </motion.div>
      </div>
    </div>
  );
}

export function PurchaseCancelPage() {
  return (
    <div className="min-h-screen bg-canvas-bg">
      <Navbar />
      <div className="flex items-center justify-center min-h-screen px-4 pt-16">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center max-w-md"
        >
          <XCircle size={80} className="text-canvas-muted mx-auto mb-6" />
          <h1 className="font-display font-bold text-3xl text-canvas-bright mb-3">
            Purchase Canceled
          </h1>
          <p className="text-canvas-muted mb-8 leading-relaxed">
            Your purchase was canceled. The block reservation will be released shortly.
            You can try again anytime.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/canvas" className="btn-primary flex items-center justify-center gap-2">
              Back to Canvas <ArrowRight size={16} />
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
