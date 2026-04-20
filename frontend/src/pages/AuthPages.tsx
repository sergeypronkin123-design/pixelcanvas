import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { Navbar } from '@/components/layout/Navbar';
import { Turnstile } from '@/components/layout/Turnstile';
import { Crosshair, Gift } from 'lucide-react';
import { motion } from 'framer-motion';

function useTurnstileSiteKey() {
  const [siteKey, setSiteKey] = useState<string>('');
  useEffect(() => {
    api.getConfig()
      .then((cfg: any) => setSiteKey(cfg.turnstile_site_key || ''))
      .catch(() => setSiteKey(''));
  }, []);
  return siteKey;
}

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();
  const turnstileSiteKey = useTurnstileSiteKey();

  const onCaptcha = useCallback((token: string) => setCaptchaToken(token), []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (turnstileSiteKey && !captchaToken) {
      setError('Пожалуйста, дождитесь проверки защиты от ботов');
      return;
    }
    setLoading(true); setError('');
    try {
      const res = await api.login(email, password, captchaToken);
      setAuth(res.user, res.access_token);
      const pendingInvite = localStorage.getItem('pending_invite');
      if (pendingInvite) {
        localStorage.removeItem('pending_invite');
        navigate(`/clans/invite/${pendingInvite}`);
      } else {
        navigate('/canvas');
      }
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
            {turnstileSiteKey && <Turnstile siteKey={turnstileSiteKey} onSuccess={onCaptcha} />}
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
  const [captchaToken, setCaptchaToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const turnstileSiteKey = useTurnstileSiteKey();

  const onCaptcha = useCallback((token: string) => setCaptchaToken(token), []);

  const urlRef = searchParams.get('ref');
  const [refCode] = useState(() => {
    if (urlRef) {
      localStorage.setItem('pixelstake_ref', urlRef);
      return urlRef;
    }
    return localStorage.getItem('pixelstake_ref') || undefined;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (turnstileSiteKey && !captchaToken) {
      setError('Пожалуйста, дождитесь проверки защиты от ботов');
      return;
    }
    setLoading(true); setError('');
    try {
      const res = await api.register(email, username, password, refCode, captchaToken);
      setAuth(res.user, res.access_token);
      localStorage.removeItem('pixelstake_ref');
      const pendingInvite = localStorage.getItem('pending_invite');
      if (pendingInvite) {
        localStorage.removeItem('pending_invite');
        navigate(`/clans/invite/${pendingInvite}`);
      } else {
        navigate('/canvas');
      }
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

          {refCode && (
            <div className="mb-4 px-4 py-2.5 bg-neon-green/5 border border-neon-green/20 rounded-xl flex items-center gap-2">
              <Gift size={16} className="text-neon-green flex-shrink-0" />
              <p className="text-xs text-neon-green">Тебя пригласил друг! После регистрации он получит бонусные пиксели</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="card space-y-4">
            {error && <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</div>}
            <div><label className="label-text">Имя пользователя</label><input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="input-field" placeholder="латиница и цифры" required minLength={3} maxLength={30} /></div>
            <div><label className="label-text">Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" required /></div>
            <div><label className="label-text">Пароль</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input-field" placeholder="минимум 6 символов" required minLength={6} /></div>
            {turnstileSiteKey && <Turnstile siteKey={turnstileSiteKey} onSuccess={onCaptcha} />}
            <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Создаём...' : 'Создать аккаунт'}</button>
          </form>
          <p className="text-center text-sm text-canvas-muted mt-6">Уже есть аккаунт? <Link to="/login" className="text-orange-400 hover:underline">Войти</Link></p>
        </motion.div>
      </div>
    </div>
  );
}
