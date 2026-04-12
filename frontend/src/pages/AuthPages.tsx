import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { Navbar } from '@/components/layout/Navbar';
import { Crosshair } from 'lucide-react';
import { motion } from 'framer-motion';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.login(email, password);
      setAuth(res.user, res.access_token);
      navigate('/canvas');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas-bg">
      <Navbar />
      <div className="flex items-center justify-center min-h-screen px-4 pt-16">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="w-full max-w-sm"
        >
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center mx-auto mb-4">
              <Crosshair size={24} className="text-white" />
            </div>
            <h1 className="font-display font-bold text-2xl text-canvas-bright">Welcome back</h1>
            <p className="text-canvas-muted text-sm mt-1">Sign in to your PixelStake account</p>
          </div>

          <form onSubmit={handleSubmit} className="card space-y-4">
            {error && (
              <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>
            )}
            <div>
              <label className="label-text">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                     className="input-field" placeholder="you@example.com" required />
            </div>
            <div>
              <label className="label-text">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                     className="input-field" placeholder="••••••••" required />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-canvas-muted mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-neon-amber hover:underline">Create one</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

export function RegisterPage() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.register(email, username, password);
      setAuth(res.user, res.access_token);
      navigate('/canvas');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas-bg">
      <Navbar />
      <div className="flex items-center justify-center min-h-screen px-4 pt-16">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="w-full max-w-sm"
        >
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center mx-auto mb-4">
              <Crosshair size={24} className="text-white" />
            </div>
            <h1 className="font-display font-bold text-2xl text-canvas-bright">Create Account</h1>
            <p className="text-canvas-muted text-sm mt-1">Join PixelStake and own the grid</p>
          </div>

          <form onSubmit={handleSubmit} className="card space-y-4">
            {error && (
              <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>
            )}
            <div>
              <label className="label-text">Username</label>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                     className="input-field" placeholder="pixelmaster" required minLength={3} maxLength={30} />
            </div>
            <div>
              <label className="label-text">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                     className="input-field" placeholder="you@example.com" required />
            </div>
            <div>
              <label className="label-text">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                     className="input-field" placeholder="Min 6 characters" required minLength={6} />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Creating...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-canvas-muted mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-neon-amber hover:underline">Sign in</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
