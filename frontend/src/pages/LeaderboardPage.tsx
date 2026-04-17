import { useEffect, useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { useAuthStore } from '@/stores/authStore';
import { motion } from 'framer-motion';
import { Trophy, Crown, Crosshair } from 'lucide-react';
import { getRank } from '@/lib/ranks';
import { RankIcon, MedalIcon } from '@/components/icons/RankIcons';

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
  const [period, setPeriod] = useState<'all' | 'battle' | 'clan'>('battle');
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

  return (
    <div className="min-h-screen bg-canvas-bg flex flex-col"><Navbar />
      <main className="flex-1">
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
                  <div className="text-sm flex items-center gap-1" style={{ color: getRank(myRank.all_time_pixels).color }}>
                    <RankIcon tier={getRank(myRank.all_time_pixels).tier} size={14} /> {getRank(myRank.all_time_pixels).nameRu}
                  </div>
                  <div className="text-xs text-canvas-muted">из {myRank.total_players} игроков</div>
                </div>
              </div>
            </div>
          )}

          {/* Period toggle */}
          <div className="flex gap-1 mb-6 bg-canvas-surface rounded-xl p-1 border border-canvas-border w-fit mx-auto">
            <button onClick={() => setPeriod('battle')}
              className={`px-4 py-2 rounded-lg text-sm font-display transition-all ${period === 'battle' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'text-canvas-muted'}`}>
              Соло батл
            </button>
            <button onClick={() => setPeriod('clan')}
              className={`px-4 py-2 rounded-lg text-sm font-display transition-all ${period === 'clan' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'text-canvas-muted'}`}>
              Клановые
            </button>
            <button onClick={() => setPeriod('all')}
              className={`px-4 py-2 rounded-lg text-sm font-display transition-all ${period === 'all' ? 'bg-canvas-elevated text-canvas-bright' : 'text-canvas-muted'}`}>
              Все время
            </button>
          </div>

          {/* Phase info */}
          <div className="text-center mb-4 text-xs text-canvas-muted">
            1-10 числа: Соло батл (кто поставит больше пикселей) · 11-20: Клановые войны (территория)
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
            <div className="bg-canvas-surface border border-canvas-border rounded-2xl divide-y divide-canvas-border overflow-hidden">
              {players.map((p, i) => {
                const rank = getRank(p.pixels);
                const isMe = user?.id === p.user_id;
                const isClan = p.is_clan;
                return (
                  <motion.div
                    key={isClan ? `clan-${p.clan_id}` : `user-${p.user_id}`}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className={`px-3 sm:px-4 py-2.5 flex items-center gap-2 sm:gap-3 transition-colors
                      ${isMe ? 'bg-orange-500/5' : 'hover:bg-canvas-elevated/50'}
                      ${p.rank <= 3 ? 'bg-canvas-elevated/30' : ''}`}
                  >
                    <div className="w-8 h-8 flex items-center justify-center font-display font-bold text-sm flex-shrink-0">
                      {p.rank <= 3 ? (
                        <MedalIcon place={p.rank as 1 | 2 | 3} size={26} />
                      ) : (
                        <span className="text-canvas-muted">{p.rank}</span>
                      )}
                    </div>
                    <div className="flex-1 flex items-center gap-2 min-w-0">
                      {isClan ? (
                        <>
                          <div className="w-5 h-5 rounded flex items-center justify-center text-[8px]" style={{ backgroundColor: p.clan_color || '#f97316' }}>
                            {p.clan_tag?.[0] || '?'}
                          </div>
                          <span className="text-orange-400 font-mono text-xs">[{p.clan_tag}]</span>
                          <span className="font-display text-sm text-canvas-bright truncate">{p.clan_name}</span>
                          <span className="text-[10px] text-canvas-muted flex-shrink-0">{p.members_count} чел.</span>
                        </>
                      ) : (
                        <>
                          <RankIcon tier={rank.tier} size={16} />
                          <span className="font-display text-sm text-canvas-bright truncate">{p.username}</span>
                          {p.is_subscriber && <Crown size={11} className="text-yellow-400 flex-shrink-0" />}
                          {isMe && <span className="text-[10px] text-orange-400 font-display flex-shrink-0">(ты)</span>}
                        </>
                      )}
                    </div>
                    <span className="font-mono text-sm text-orange-400 flex-shrink-0">
                      {p.pixels.toLocaleString()} {isClan ? 'тер.' : 'px'}
                    </span>
                  </motion.div>
                );
              })}
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
      </main>
      <Footer />
    </div>
  );
}
