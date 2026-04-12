export interface Rank {
  name: string;
  nameRu: string;
  minPixels: number;
  color: string;
  emoji: string;
}

export const RANKS: Rank[] = [
  { name: 'Newbie', nameRu: 'Новичок', minPixels: 0, color: '#6b6b8a', emoji: '🔰' },
  { name: 'Pixel Fighter', nameRu: 'Пиксельный боец', minPixels: 10, color: '#00ff88', emoji: '⚔️' },
  { name: 'Artist', nameRu: 'Художник', minPixels: 50, color: '#00bfff', emoji: '🎨' },
  { name: 'Brush Master', nameRu: 'Мастер кисти', minPixels: 100, color: '#8b5cf6', emoji: '🖌️' },
  { name: 'Pixel Warrior', nameRu: 'Пиксельный воин', minPixels: 250, color: '#ff6600', emoji: '🛡️' },
  { name: 'Canvas Legend', nameRu: 'Легенда холста', minPixels: 500, color: '#ff00aa', emoji: '🏆' },
  { name: 'Pixel God', nameRu: 'Пиксельный бог', minPixels: 1000, color: '#ffaa00', emoji: '👑' },
  { name: 'Pixel Emperor', nameRu: 'Император пикселей', minPixels: 5000, color: '#ff4444', emoji: '🔥' },
  { name: 'World Creator', nameRu: 'Создатель миров', minPixels: 10000, color: '#00f0ff', emoji: '🌍' },
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
