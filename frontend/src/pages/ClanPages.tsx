import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { useAuthStore } from '@/stores/authStore';
import { motion } from 'framer-motion';
import {
  Shield, Users, Crown, Search, Plus, Lock, Unlock,
  LogOut, UserPlus, UserX, Mail, CheckCircle, XCircle, Trophy, Crosshair
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || '';

async function fetchApi(path: string, options?: RequestInit) {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const res = await fetch(`${API}${path}`, { ...options, headers: { ...headers, ...(options?.headers as Record<string, string>) } });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(err.detail || 'Error');
  }
  return res.json();
}

// ============ LIST PAGE ============
export function ClansListPage() {
  const [clans, setClans] = useState<any[]>([]);
  const [territoryRanking, setTerritoryRanking] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    const s = search ? `?search=${encodeURIComponent(search)}` : '';
    fetchApi(`/api/clans/list${s}`).then(setClans).finally(() => setLoading(false));
    fetchApi('/api/clans/leaderboard/territory').then((d) => setTerritoryRanking(d.clans || [])).catch(() => {});
  }, [search]);

  return (
    <div className="min-h-screen bg-canvas-bg flex flex-col"><Navbar />
      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-20 sm:pt-24 pb-12">
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
              <div>
                <h1 className="font-display font-black text-2xl sm:text-3xl text-canvas-bright flex items-center gap-2">
                  <Shield size={26} className="text-orange-400" /> Кланы
                </h1>
                <p className="text-canvas-muted text-sm mt-1">Объединяйся с друзьями, захватывай территорию</p>
              </div>
              <div className="flex gap-2">
                {user?.clan_id ? (
                  <Link to="/clans/my" className="btn-primary !px-5 !py-2.5 text-sm">Мой клан</Link>
                ) : (
                  <Link to="/clans/create" className="btn-primary !px-5 !py-2.5 text-sm flex items-center gap-1.5">
                    <Plus size={14} /> Создать клан
                  </Link>
                )}
              </div>
            </div>

            {/* Territory leaderboard */}
            {territoryRanking.length > 0 && (
              <div className="card mb-6">
                <h2 className="font-display font-semibold text-base text-canvas-bright mb-3 flex items-center gap-2">
                  <Trophy size={16} className="text-yellow-400" /> Топ кланов по территории
                </h2>
                <div className="space-y-1.5">
                  {territoryRanking.slice(0, 5).map((c) => (
                    <Link key={c.clan_id} to={`/clans/${c.clan_id}`}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl bg-canvas-elevated hover:bg-canvas-elevated/70 transition-all">
                      <span className="w-6 text-center text-sm font-display font-bold text-canvas-muted">{c.rank}</span>
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs" style={{ backgroundColor: c.color }}>
                        {c.emoji || '⚔'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-display font-semibold text-canvas-bright truncate">
                          [{c.tag}] {c.name}
                        </div>
                      </div>
                      <div className="text-right text-xs">
                        <div className="font-mono text-orange-400 font-bold">{c.territory_pixels.toLocaleString()} px</div>
                        <div className="text-canvas-muted">{c.members_count} чел.</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Search */}
            <div className="mb-4 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-canvas-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск по названию или тегу"
                className="input-field pl-10"
              />
            </div>

            {/* List */}
            {loading ? (
              <div className="card text-center py-10 text-canvas-muted">Загрузка...</div>
            ) : clans.length === 0 ? (
              <div className="card text-center py-10">
                <Shield size={32} className="text-canvas-muted mx-auto mb-3" />
                <p className="text-canvas-muted">Пока нет кланов. Создай первый!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {clans.map((c) => (
                  <Link key={c.id} to={`/clans/${c.id}`}
                    className="card !p-3 flex items-center gap-3 hover:border-orange-500/30 transition-all">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                      style={{ backgroundColor: c.color }}>
                      {c.emoji || '⚔'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-display font-semibold text-canvas-bright truncate flex items-center gap-2">
                        <span className="text-orange-400 font-mono text-sm">[{c.tag}]</span>
                        {c.name}
                        {!c.is_open && <Lock size={12} className="text-canvas-muted" />}
                      </div>
                      {c.description && <p className="text-xs text-canvas-muted truncate mt-0.5">{c.description}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-mono text-canvas-bright">{c.members_count}/{c.max_members}</div>
                      <div className="text-[10px] text-canvas-muted">{c.total_pixels_placed.toLocaleString()} px</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

// ============ CREATE CLAN ============
export function CreateClanPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const paid = searchParams.get('paid') === '1';
  const [eligibility, setEligibility] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#f97316');
  const [emoji, setEmoji] = useState('⚔️');
  const [isOpen, setIsOpen] = useState(true);
  const [maxMembers, setMaxMembers] = useState(50);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    fetchApi('/api/clans/can-create').then(setEligibility).catch(() => {});
  }, [user, paid]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      await fetchApi('/api/clans/create', {
        method: 'POST',
        body: JSON.stringify({ name, tag, description, color, emoji, is_open: isOpen, max_members: maxMembers }),
      });
      navigate('/clans/my');
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  const handleDonate = async (provider: 'stripe' | 'robokassa') => {
    setLoading(true);
    try {
      const res = await fetchApi(`/api/clans/donate/checkout?provider=${provider}`, { method: 'POST' });
      window.location.href = res.checkout_url;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-canvas-bg flex flex-col"><Navbar />
      <main className="flex-1">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-20 sm:pt-24 pb-12">
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
            <div className="flex items-center gap-3 mb-6">
              <Shield size={26} className="text-orange-400" />
              <h1 className="font-display font-black text-2xl sm:text-3xl text-canvas-bright">Создать клан</h1>
            </div>

            {!eligibility?.can_create ? (
              <div className="card mb-6 border-orange-500/20">
                <h2 className="font-display font-semibold text-lg text-canvas-bright mb-3">
                  Условия создания клана
                </h2>
                <p className="text-canvas-muted text-sm mb-4">Нужно выполнить одно из условий:</p>

                <div className="space-y-3">
                  <div className={`p-3 rounded-xl border ${eligibility?.has_pixels ? 'border-neon-green/40 bg-neon-green/5' : 'border-canvas-border bg-canvas-bg'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-display font-semibold text-sm text-canvas-bright flex items-center gap-2">
                        <Crosshair size={14} className="text-orange-400" /> Закрасить 10 000 пикселей
                      </span>
                      {eligibility?.has_pixels && <CheckCircle size={14} className="text-neon-green" />}
                    </div>
                    <div className="text-xs text-canvas-muted">
                      Прогресс: <span className="font-mono text-orange-400">{eligibility?.pixels_placed?.toLocaleString() || 0}</span> / {eligibility?.pixels_needed?.toLocaleString() || '10 000'}
                    </div>
                    <div className="mt-2 h-1.5 bg-canvas-bg rounded-full overflow-hidden">
                      <div className="h-full bg-orange-500 rounded-full" style={{ width: `${Math.min(100, ((eligibility?.pixels_placed || 0) / (eligibility?.pixels_needed || 1)) * 100)}%` }} />
                    </div>
                  </div>

                  <div className="text-center text-xs text-canvas-muted">— ИЛИ —</div>

                  <div className={`p-3 rounded-xl border ${eligibility?.has_donation ? 'border-neon-green/40 bg-neon-green/5' : 'border-canvas-border bg-canvas-bg'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-display font-semibold text-sm text-canvas-bright flex items-center gap-2">
                        💝 Задонатить 100 ₽
                      </span>
                      {eligibility?.has_donation && <CheckCircle size={14} className="text-neon-green" />}
                    </div>
                    {!eligibility?.has_donation && (
                      <div className="space-y-2 mt-3">
                        <button onClick={() => handleDonate('robokassa')} disabled={loading}
                          className="btn-primary w-full !py-2 text-sm">
                          Оплатить 100 ₽
                        </button>
                        <button onClick={() => handleDonate('stripe')} disabled={loading}
                          className="w-full px-4 py-2 bg-canvas-elevated border border-canvas-border text-canvas-muted rounded-xl text-sm hover:border-orange-500/30 transition-all">
                          $1.99 international card
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {/* Form */}
            <form onSubmit={handleCreate} className={`card space-y-4 ${!eligibility?.can_create ? 'opacity-50 pointer-events-none' : ''}`}>
              {error && <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</div>}

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="label-text">Название клана</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                    className="input-field" required minLength={3} maxLength={30} placeholder="Например, Красные тигры" />
                </div>
                <div>
                  <label className="label-text">Тег (2-5 символов)</label>
                  <input type="text" value={tag} onChange={(e) => setTag(e.target.value.toUpperCase())}
                    className="input-field font-mono" required minLength={2} maxLength={5} placeholder="TIGER" />
                </div>
              </div>

              <div>
                <label className="label-text">Описание (необязательно)</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                  className="input-field min-h-[80px]" maxLength={500} placeholder="О чём ваш клан..." />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-text">Цвет клана</label>
                  <div className="flex gap-2">
                    <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
                      className="w-12 h-10 rounded-xl border border-canvas-border cursor-pointer" />
                    <input type="text" value={color} onChange={(e) => setColor(e.target.value)}
                      className="input-field font-mono flex-1" maxLength={7} />
                  </div>
                </div>
                <div>
                  <label className="label-text">Эмодзи</label>
                  <input type="text" value={emoji} onChange={(e) => setEmoji(e.target.value)}
                    className="input-field text-2xl" maxLength={4} placeholder="⚔️" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-text">Макс. участников</label>
                  <input type="number" value={maxMembers} onChange={(e) => setMaxMembers(parseInt(e.target.value) || 50)}
                    className="input-field" min={2} max={500} />
                </div>
                <div>
                  <label className="label-text">Тип клана</label>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => setIsOpen(true)}
                      className={`flex-1 px-3 py-2.5 rounded-xl text-sm font-display flex items-center justify-center gap-1.5 border transition-all ${isOpen ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' : 'bg-canvas-bg border-canvas-border text-canvas-muted'}`}>
                      <Unlock size={12} /> Открытый
                    </button>
                    <button type="button" onClick={() => setIsOpen(false)}
                      className={`flex-1 px-3 py-2.5 rounded-xl text-sm font-display flex items-center justify-center gap-1.5 border transition-all ${!isOpen ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' : 'bg-canvas-bg border-canvas-border text-canvas-muted'}`}>
                      <Lock size={12} /> Закрытый
                    </button>
                  </div>
                </div>
              </div>

              <button type="submit" disabled={loading || !eligibility?.can_create}
                className="btn-primary w-full">
                {loading ? 'Создаём...' : 'Создать клан'}
              </button>
            </form>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

// ============ MY CLAN ============
export function MyClanPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [invites, setInvites] = useState<any[]>([]);
  const [inviteUsername, setInviteUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    fetchApi('/api/clans/my').then(setData).catch(() => {}).finally(() => setLoading(false));
    fetchApi('/api/clans/invites/my').then(setInvites).catch(() => {});
  };

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    load();
  }, [user]);

  const handleInvite = async () => {
    setError('');
    try {
      await fetchApi(`/api/clans/${data.clan.id}/invite?username=${encodeURIComponent(inviteUsername)}`, { method: 'POST' });
      setInviteUsername('');
      alert('Приглашение отправлено!');
    } catch (err: any) { setError(err.message); }
  };

  const handleLeave = async () => {
    if (!confirm('Точно покинуть клан?')) return;
    try {
      await fetchApi('/api/clans/leave', { method: 'POST' });
      navigate('/clans');
    } catch (err: any) { alert(err.message); }
  };

  const handleKick = async (userId: number) => {
    if (!confirm('Исключить участника?')) return;
    try {
      await fetchApi(`/api/clans/${data.clan.id}/kick?target_user_id=${userId}`, { method: 'POST' });
      load();
    } catch (err: any) { alert(err.message); }
  };

  const handleAcceptInvite = async (inviteId: number) => {
    try {
      await fetchApi(`/api/clans/invites/${inviteId}/accept`, { method: 'POST' });
      load();
    } catch (err: any) { alert(err.message); }
  };

  const handleRejectInvite = async (inviteId: number) => {
    try {
      await fetchApi(`/api/clans/invites/${inviteId}/reject`, { method: 'POST' });
      load();
    } catch {}
  };

  if (!user) return null;

  if (loading) {
    return <div className="min-h-screen bg-canvas-bg flex items-center justify-center"><Navbar /><div className="text-canvas-muted">Загрузка...</div></div>;
  }

  // No clan — show invites + CTA to create
  if (!data?.clan) {
    return (
      <div className="min-h-screen bg-canvas-bg flex flex-col"><Navbar />
        <main className="flex-1">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-20 sm:pt-24 pb-12">
            <div className="card text-center py-10">
              <Shield size={40} className="text-canvas-muted mx-auto mb-4" />
              <h1 className="font-display font-bold text-2xl text-canvas-bright mb-2">Вы не в клане</h1>
              <p className="text-canvas-muted text-sm mb-6">Создайте свой клан или вступите в существующий</p>
              <div className="flex gap-2 justify-center">
                <Link to="/clans" className="btn-secondary">Найти клан</Link>
                <Link to="/clans/create" className="btn-primary">Создать клан</Link>
              </div>
            </div>

            {invites.length > 0 && (
              <div className="card mt-6">
                <h2 className="font-display font-semibold text-base text-canvas-bright mb-3 flex items-center gap-2">
                  <Mail size={16} className="text-orange-400" /> Приглашения ({invites.length})
                </h2>
                <div className="space-y-2">
                  {invites.map((i) => (
                    <div key={i.invite_id} className="flex items-center gap-3 p-3 rounded-xl bg-canvas-elevated">
                      <span className="text-lg">{i.clan_emoji || '⚔'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-display font-semibold text-sm text-canvas-bright truncate">
                          [{i.clan_tag}] {i.clan_name}
                        </div>
                        <div className="text-xs text-canvas-muted">от {i.from_username}</div>
                      </div>
                      <button onClick={() => handleAcceptInvite(i.invite_id)}
                        className="p-2 text-neon-green hover:bg-neon-green/10 rounded-lg">
                        <CheckCircle size={16} />
                      </button>
                      <button onClick={() => handleRejectInvite(i.invite_id)}
                        className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg">
                        <XCircle size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const c = data.clan;
  const isLeader = data.my_role === 'leader';

  return (
    <div className="min-h-screen bg-canvas-bg flex flex-col"><Navbar />
      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-20 sm:pt-24 pb-12">
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
            {/* Header */}
            <div className="card mb-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
                  style={{ backgroundColor: c.color }}>
                  {c.emoji || '⚔'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-orange-400 font-mono font-bold">[{c.tag}]</span>
                    <h1 className="font-display font-bold text-xl sm:text-2xl text-canvas-bright truncate">{c.name}</h1>
                    {!c.is_open && <Lock size={14} className="text-canvas-muted" />}
                  </div>
                  {c.description && <p className="text-canvas-muted text-sm mt-1">{c.description}</p>}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
              <div className="card !p-3 text-center">
                <Users size={16} className="text-orange-400 mx-auto mb-1" />
                <div className="text-xl font-display font-bold text-canvas-bright">{c.members_count}/{c.max_members}</div>
                <div className="text-[10px] text-canvas-muted">Участников</div>
              </div>
              <div className="card !p-3 text-center">
                <Crosshair size={16} className="text-neon-green mx-auto mb-1" />
                <div className="text-xl font-display font-bold text-canvas-bright">{data.territory_pixels?.toLocaleString() || 0}</div>
                <div className="text-[10px] text-canvas-muted">Территория</div>
              </div>
              <div className="card !p-3 text-center">
                <Trophy size={16} className="text-yellow-400 mx-auto mb-1" />
                <div className="text-xl font-display font-bold text-canvas-bright">{c.battles_won}</div>
                <div className="text-[10px] text-canvas-muted">Побед</div>
              </div>
            </div>

            {/* Invite box */}
            <div className="card mb-4">
              <h3 className="font-display font-semibold text-sm text-canvas-bright mb-2 flex items-center gap-2">
                <UserPlus size={14} className="text-neon-green" /> Пригласить игрока
              </h3>
              <div className="flex gap-2">
                <input type="text" value={inviteUsername} onChange={(e) => setInviteUsername(e.target.value)}
                  className="input-field" placeholder="username" />
                <button onClick={handleInvite} disabled={!inviteUsername}
                  className="btn-primary !px-4 !py-2 text-sm flex-shrink-0">Пригласить</button>
              </div>
              {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
            </div>

            {/* Members */}
            <div className="card mb-4">
              <h3 className="font-display font-semibold text-sm text-canvas-bright mb-3">Участники</h3>
              <div className="space-y-1.5">
                {data.members.map((m: any) => (
                  <div key={m.user_id} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-canvas-elevated">
                    {m.role === 'leader' && <Crown size={14} className="text-yellow-400 flex-shrink-0" />}
                    <span className="font-display text-sm text-canvas-bright flex-1 truncate">
                      {m.username}
                      {m.user_id === user.id && <span className="text-orange-400 text-xs ml-2">(вы)</span>}
                    </span>
                    {m.is_subscriber && <Crown size={12} className="text-yellow-400" />}
                    <span className="text-xs font-mono text-canvas-muted flex-shrink-0">{m.pixels_placed_in_clan} px</span>
                    {isLeader && m.role !== 'leader' && (
                      <button onClick={() => handleKick(m.user_id)}
                        className="p-1 text-red-400 hover:bg-red-500/10 rounded-lg">
                        <UserX size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Leave */}
            <button onClick={handleLeave}
              className="w-full px-4 py-2.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl font-display text-sm hover:bg-red-500/20 transition-all flex items-center justify-center gap-2">
              <LogOut size={14} /> Покинуть клан
            </button>
            {data.can_change_clan_at && (
              <p className="text-center text-xs text-canvas-muted mt-2">
                Сменить клан можно будет: {new Date(data.can_change_clan_at).toLocaleDateString('ru')}
              </p>
            )}
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

// ============ CLAN DETAIL ============
export function ClanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    fetchApi(`/api/clans/${id}`).then(setData).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  const handleJoin = async () => {
    setJoining(true);
    try {
      await fetchApi(`/api/clans/${id}/join`, { method: 'POST' });
      window.location.href = '/clans/my';
    } catch (err: any) {
      alert(err.message);
      setJoining(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-canvas-bg"><Navbar /></div>;
  if (!data) return <div className="min-h-screen bg-canvas-bg"><Navbar /><div className="text-center mt-20 text-canvas-muted">Клан не найден</div></div>;

  const c = data.clan;
  const isMember = user?.clan_id === c.id;

  return (
    <div className="min-h-screen bg-canvas-bg flex flex-col"><Navbar />
      <main className="flex-1">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-20 sm:pt-24 pb-12">
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
            <div className="card">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                  style={{ backgroundColor: c.color }}>
                  {c.emoji || '⚔'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-orange-400 font-mono font-bold">[{c.tag}]</span>
                    <h1 className="font-display font-bold text-2xl text-canvas-bright">{c.name}</h1>
                  </div>
                  <p className="text-xs text-canvas-muted mt-1">Лидер: {data.leader_username}</p>
                </div>
              </div>

              {c.description && <p className="text-sm text-canvas-muted mb-4 bg-canvas-bg p-3 rounded-xl">{c.description}</p>}

              <div className="grid grid-cols-3 gap-2 text-center mb-4">
                <div>
                  <div className="text-lg font-display font-bold text-canvas-bright">{c.members_count}/{c.max_members}</div>
                  <div className="text-[10px] text-canvas-muted">Участников</div>
                </div>
                <div>
                  <div className="text-lg font-display font-bold text-canvas-bright">{data.territory_pixels?.toLocaleString() || 0}</div>
                  <div className="text-[10px] text-canvas-muted">Территория</div>
                </div>
                <div>
                  <div className="text-lg font-display font-bold text-canvas-bright">{c.total_pixels_placed.toLocaleString()}</div>
                  <div className="text-[10px] text-canvas-muted">Всего px</div>
                </div>
              </div>

              {!isMember && user && (
                c.is_open ? (
                  <button onClick={handleJoin} disabled={joining || c.members_count >= c.max_members}
                    className="btn-primary w-full">
                    {c.members_count >= c.max_members ? 'Клан переполнен' : joining ? 'Вступаем...' : 'Вступить в клан'}
                  </button>
                ) : (
                  <div className="p-3 rounded-xl bg-canvas-elevated text-center">
                    <Lock size={14} className="inline text-canvas-muted mr-1" />
                    <span className="text-sm text-canvas-muted">Клан закрытый — вступление только по приглашению</span>
                  </div>
                )
              )}

              {isMember && (
                <Link to="/clans/my" className="btn-secondary w-full text-center block">Открыть мой клан</Link>
              )}

              {!user && (
                <Link to="/login" className="btn-primary w-full text-center block">Войти, чтобы вступить</Link>
              )}
            </div>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
