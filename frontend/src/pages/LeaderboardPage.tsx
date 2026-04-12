import { useEffect, useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { useAuthStore } from '@/stores/authStore';
import { motion } from 'framer-motion';
import { Trophy, Crown, Crosshair, Medal } from 'lucide-react';
import { getRank } from '@/lib/ranks';

const API = import.meta.env.VITE_API_URL || '';
async function fetchApi(path: string) {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { headers });
  return res.json();
}

export function LeaderboardPage() {
  const user = useAuthStore((s) => s.user);
  const [players, setPlayers] = useState<any[]>([]);
  const [period, setPeriod] = useState<'all' | 'battle'>('battle');
  const [myRank, setMyRank] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchApi(`/api/leaderboard/top?period=${period}`).then((d) => {
      setPlayers(d.players || []);
    }).finally(() => setLoading(false));
  }, [period]);

  useEffect(() => {
    if (user) fetchApi('/api/leaderboard/my-rank').then(setMyRank).catch(() => {});
  }, [user]);

  const getMedalColor = (rank: number) => {
    if (rank === 1) return 'text-yellow-400';
    if (rank === 2) return 'text-gray-300';
    if (rank === 3) return 'text-amber-600';
    return 'text-canvas-muted';
  };

  return (
    <div className="min-h-screen bg-canvas-bg"><Navbar />
      <div className="max-w-3xl mx-auto px-6 pt-24 pb-16">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <div className="text-center mb-10">
            <Trophy size={40} className="text-yellow-400 mx-auto mb-4" />
            <h1 className="font-display font-black text-3xl text-canvas-bright mb-2">Лидерборд</h1>
            <p className="text-canvas-muted">Топ игроков по количеству поставленных пикселей</p>
          </div>

          {/* My rank card */}
          {myRank && (
            <div className="card mb-8 border-orange-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white font-display font-bold">
                    #{myRank.battle_rank || myRank.all_time_rank || '—'}
                  </div>
                  <div>
                    <div className="font-display font-semibold text-canvas-bright">{user?.username}</div>
                    <div className="text-xs text-canvas-muted">
                      {period === 'battle' ? `${myRank.battle_pixels} px в батле` : `${myRank.all_time_pixels} px всего`}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm" style={{ color: getRank(myRank.all_time_pixels).color }}>
                    {getRank(myRank.all_time_pixels).emoji} {getRank(myRank.all_time_pixels).nameRu}
                  </div>
                  <div className="text-xs text-canvas-muted">из {myRank.total_players} игроков</div>
                </div>
              </div>
            </div>
          )}

          {/* Period toggle */}
          <div className="flex gap-1 mb-6 bg-canvas-surface rounded-xl p-1 border border-canvas-border w-fit mx-auto">
            <button onClick={() => setPeriod('battle')}
              className={`px-5 py-2 rounded-lg text-sm font-display transition-all ${period === 'battle' ? 'bg-canvas-elevated text-canvas-bright' : 'text-canvas-muted'}`}>
              Текущий батл
            </button>
            <button onClick={() => setPeriod('all')}
              className={`px-5 py-2 rounded-lg text-sm font-display transition-all ${period === 'all' ? 'bg-canvas-elevated text-canvas-bright' : 'text-canvas-muted'}`}>
              Все время
            </button>
          </div>

          {/* Leaderboard */}
          {loading ? (
            <div className="card text-center py-12 text-canvas-muted">Загрузка...</div>
          ) : players.length === 0 ? (
            <div className="card text-center py-12">
              <Crosshair size={32} className="text-canvas-muted mx-auto mb-3" />
              <p className="text-canvas-muted">Пока нет игроков. Будь первым!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {players.map((p, i) => {
                const rank = getRank(p.pixels);
                const isMe = user?.id === p.user_id;
                return (
                  <motion.div
                    key={p.user_id}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className={`card !p-3 flex items-center gap-3 ${isMe ? 'border-orange-500/30 bg-orange-500/5' : ''}`}
                  >
                    {/* Rank number */}
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-display font-bold text-sm
                      ${p.rank <= 3 ? 'bg-canvas-elevated' : ''}`}>
                      {p.rank <= 3 ? (
                        <Medal size={18} className={getMedalColor(p.rank)} />
                      ) : (
                        <span className="text-canvas-muted">{p.rank}</span>
                      )}
                    </div>

                    {/* User info */}
                    <div className="flex-1 flex items-center gap-2">
                      <span className="text-sm">{rank.emoji}</span>
                      <span className="font-display font-semibold text-sm text-canvas-bright">{p.username}</span>
                      {p.is_subscriber && <Crown size={12} className="text-yellow-400" />}
                      {isMe && <span className="text-xs text-orange-400 font-display">(ты)</span>}
                    </div>

                    {/* Pixels count */}
                    <div className="text-right">
                      <span className="font-mono text-sm font-bold text-orange-400">{p.pixels.toLocaleString()}</span>
                      <span className="text-xs text-canvas-muted ml-1">px</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
