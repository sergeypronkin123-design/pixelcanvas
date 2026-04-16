export interface Rank {
  name: string;
  nameRu: string;
  minPixels: number;
  color: string;
  emoji: string;
  tier: number; // 0-8 для RankIcon
}

export const RANKS: Rank[] = [
  { name: 'Newbie', nameRu: 'Новичок', minPixels: 0, color: '#94a3b8', emoji: '🔰', tier: 0 },
  { name: 'Pixel Fighter', nameRu: 'Пиксельный боец', minPixels: 10, color: '#fb923c', emoji: '⚔️', tier: 1 },
  { name: 'Artist', nameRu: 'Художник', minPixels: 50, color: '#4ade80', emoji: '🎨', tier: 2 },
  { name: 'Brush Master', nameRu: 'Мастер кисти', minPixels: 100, color: '#22d3ee', emoji: '🖌️', tier: 3 },
  { name: 'Pixel Warrior', nameRu: 'Пиксельный воин', minPixels: 250, color: '#a78bfa', emoji: '🛡️', tier: 4 },
  { name: 'Canvas Legend', nameRu: 'Легенда холста', minPixels: 500, color: '#f472b6', emoji: '🏆', tier: 5 },
  { name: 'Pixel God', nameRu: 'Пиксельный бог', minPixels: 1000, color: '#facc15', emoji: '👑', tier: 6 },
  { name: 'Pixel Emperor', nameRu: 'Император пикселей', minPixels: 5000, color: '#ef4444', emoji: '🔥', tier: 7 },
  { name: 'World Creator', nameRu: 'Создатель миров', minPixels: 10000, color: '#f97316', emoji: '🌍', tier: 8 },
];

export function getRank(pixels: number): Rank {
  let rank = RANKS[0];
  for (const r of RANKS) {
    if (pixels >= r.minPixels) rank = r;
  }
  return rank;
}

export function getNextRank(pixels: number): Rank | null {
  for (const r of RANKS) {
    if (r.minPixels > pixels) return r;
  }
  return null;
}

export function getProgress(pixels: number): number {
  const current = getRank(pixels);
  const next = getNextRank(pixels);
  if (!next) return 100;
  const range = next.minPixels - current.minPixels;
  const progress = pixels - current.minPixels;
  return Math.min(100, Math.floor((progress / range) * 100));
}
