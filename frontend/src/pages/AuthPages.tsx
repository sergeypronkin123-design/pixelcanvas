import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
    e.preventDefault(); setLoading(true); setError('');
    try {
      const res = await api.login(email, password);
      setAuth(res.user, res.access_token);
      navigate('/canvas');
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-canvas-bg"><Navbar />
      <div className="flex items-center justify-center min-h-screen px-4 pt-14">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center mx-auto mb-4">
              <Crosshair size={24} className="text-white" />
            </div>
            <h1 className="font-display font-bold text-2xl text-canvas-bright">Вход</h1>
            <p className="text-canvas-muted text-sm mt-1">Войди в PixelStake</p>
          </div>
          <form onSubmit={handleSubmit} className="card space-y-4">
            {error && <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</div>}
            <div><label className="label-text">Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" required /></div>
            <div><label className="label-text">Пароль</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input-field" required /></div>
            <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Входим...' : 'Войти'}</button>
          </form>
          <p className="text-center text-sm text-canvas-muted mt-6">Нет аккаунта? <Link to="/register" className="text-orange-400 hover:underline">Создать</Link></p>
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
    e.preventDefault(); setLoading(true); setError('');
    try {
      const res = await api.register(email, username, password);
      setAuth(res.user, res.access_token);
      navigate('/canvas');
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-canvas-bg"><Navbar />
      <div className="flex items-center justify-center min-h-screen px-4 pt-14">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center mx-auto mb-4">
              <Crosshair size={24} className="text-white" />
            </div>
            <h1 className="font-display font-bold text-2xl text-canvas-bright">Регистрация</h1>
            <p className="text-canvas-muted text-sm mt-1">Присоединяйся к битве</p>
          </div>
          <form onSubmit={handleSubmit} className="card space-y-4">
            {error && <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</div>}
            <div><label className="label-text">Имя пользователя</label><input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="input-field" required minLength={3} maxLength={30} /></div>
            <div><label className="label-text">Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" required /></div>
            <div><label className="label-text">Пароль</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input-field" required minLength={6} /></div>
            <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Создаём...' : 'Создать аккаунт'}</button>
          </form>
          <p className="text-center text-sm text-canvas-muted mt-6">Уже есть аккаунт? <Link to="/login" className="text-orange-400 hover:underline">Войти</Link></p>
        </motion.div>
      </div>
    </div>
  );
}
