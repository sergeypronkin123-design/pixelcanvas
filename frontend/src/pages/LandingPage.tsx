import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Crosshair, Paintbrush, ShoppingBag, Zap, ArrowRight, Globe, Shield, TrendingUp, Image, Pencil } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-canvas-bg">
      <Navbar />

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        <div className="absolute inset-0 opacity-15">
          <div className="absolute inset-0" style={{
            backgroundImage: `
              linear-gradient(rgba(255,170,0,0.15) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,170,0,0.15) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }} />
        </div>

        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-[120px] animate-glow-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-[120px] animate-glow-pulse" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-orange-500/5 rounded-full blur-[100px] animate-glow-pulse" style={{ animationDelay: '0.7s' }} />

        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8 }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-neon-amber/5 border border-neon-amber/20 text-neon-amber text-xs font-display font-medium tracking-wider uppercase mb-8">
              <Zap size={12} />
              Live Shared Canvas
            </div>

            <h1 className="font-display font-black text-5xl sm:text-7xl lg:text-8xl tracking-tight leading-[0.9] mb-6">
              <span className="text-canvas-bright">Stake Your</span>
              <br />
              <span className="bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
                Pixel Claim
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-canvas-muted max-w-2xl mx-auto mb-10 leading-relaxed font-light">
              Claim territory on a massive shared canvas. Buy pixel blocks, draw pixel art,
              upload images, trade with others — all in real time.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/canvas" className="px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl
                           font-display font-bold text-base tracking-wide
                           hover:from-amber-400 hover:to-orange-500 hover:shadow-[0_0_30px_rgba(255,170,0,0.2)]
                           active:scale-[0.98] transition-all duration-200 flex items-center gap-2 group">
                Explore Canvas
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link to="/register" className="btn-secondary text-base !px-8 !py-4">
                Create Account
              </Link>
            </div>
          </motion.div>
        </div>

        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 w-6 h-10 rounded-full border-2 border-canvas-border flex items-start justify-center pt-2"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-neon-amber" />
        </motion.div>
      </section>

      {/* How it works */}
      <section className="py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }}
                      className="text-center mb-20">
            <h2 className="font-display font-bold text-4xl sm:text-5xl text-canvas-bright mb-4">
              How It Works
            </h2>
            <p className="text-canvas-muted text-lg max-w-xl mx-auto">
              Three steps to owning your piece of the digital canvas
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <ShoppingBag className="text-neon-amber" size={28} />,
                title: 'Stake a Claim',
                desc: 'Browse the canvas and purchase available 10×10 pixel blocks. Prices vary by location and scarcity — prime territory costs more.',
              },
              {
                icon: <Pencil className="text-orange-400" size={28} />,
                title: 'Create & Draw',
                desc: 'Use pixel-level drawing tools inside your blocks. Paint each pixel individually, or upload an image to fill your territory instantly.',
              },
              {
                icon: <TrendingUp className="text-red-400" size={28} />,
                title: 'Trade & Profit',
                desc: 'List your blocks on the marketplace. Prime locations with great art can command premium resale prices. Build your empire.',
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ y: 30, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="card-hover group"
              >
                <div className="w-14 h-14 rounded-2xl bg-canvas-elevated flex items-center justify-center mb-5
                              group-hover:shadow-[0_0_20px_rgba(255,170,0,0.1)] transition-all">
                  {item.icon}
                </div>
                <div className="text-xs font-display font-semibold text-canvas-muted uppercase tracking-widest mb-2">
                  Step {i + 1}
                </div>
                <h3 className="font-display font-bold text-xl text-canvas-bright mb-3">{item.title}</h3>
                <p className="text-canvas-muted leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6 bg-canvas-surface/30">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }}
                      className="text-center mb-16">
            <h2 className="font-display font-bold text-4xl text-canvas-bright mb-4">Built for Creators</h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: <Globe size={20} />, title: 'Live Canvas', desc: 'See changes from all users in real time' },
              { icon: <Pencil size={20} />, title: 'Pixel Drawing', desc: 'Draw pixel-by-pixel inside your blocks' },
              { icon: <Image size={20} />, title: 'Image Upload', desc: 'Upload images directly into your blocks' },
              { icon: <Zap size={20} />, title: 'Instant Payments', desc: 'Stripe & ЮKassa secure checkout' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-5 rounded-xl bg-canvas-surface border border-canvas-border"
              >
                <div className="text-neon-amber mb-3">{item.icon}</div>
                <h4 className="font-display font-semibold text-canvas-bright mb-1">{item.title}</h4>
                <p className="text-sm text-canvas-muted">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-canvas-bg via-canvas-surface/20 to-canvas-bg" />
        <div className="relative z-10">
          <h2 className="font-display font-black text-4xl sm:text-6xl text-canvas-bright mb-6">
            Stake Your Territory
          </h2>
          <p className="text-canvas-muted text-lg mb-10 max-w-lg mx-auto">
            The canvas is filling up. Every block you don't claim is a block someone else will.
          </p>
          <Link to="/canvas" className="px-10 py-5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl
                       font-display font-bold text-lg tracking-wide
                       hover:from-amber-400 hover:to-orange-500 hover:shadow-[0_0_30px_rgba(255,170,0,0.2)]
                       active:scale-[0.98] transition-all duration-200 inline-flex items-center gap-2">
            Launch Canvas <ArrowRight size={20} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-canvas-border py-10 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-8 mb-8">
            <div className="flex items-center gap-2 text-canvas-muted">
              <Crosshair size={16} className="text-neon-amber" />
              <span className="font-display font-semibold text-sm">Pixel<span className="text-neon-amber">Stake</span></span>
            </div>
            <div className="flex flex-wrap gap-6 text-xs text-canvas-muted">
              <Link to="/offer" className="hover:text-canvas-bright transition-colors">Публичная оферта</Link>
              <Link to="/refund" className="hover:text-canvas-bright transition-colors">Возврат</Link>
              <Link to="/privacy" className="hover:text-canvas-bright transition-colors">Конфиденциальность</Link>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-canvas-border/50">
            <div className="text-xs text-canvas-muted">
              &copy; {new Date().getFullYear()} PixelStake. All rights reserved.
            </div>
            <div className="text-xs text-canvas-muted">
              support@pixelstake.ru
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
