/**
 * Кастомные иконки званий PixelStake
 * Пиксель-арт стиль с яркими градиентами
 */
import React from 'react';

interface RankIconProps {
  tier: number; // 0-8, соответствует индексу ранга
  size?: number;
  className?: string;
}

const GRADIENTS = [
  // 0: Новичок — серый
  { from: '#94a3b8', to: '#475569', id: 'rk-0' },
  // 1: Любитель — оранжевый
  { from: '#fb923c', to: '#c2410c', id: 'rk-1' },
  // 2: Мастер — зелёный
  { from: '#4ade80', to: '#15803d', id: 'rk-2' },
  // 3: Эксперт — циан
  { from: '#22d3ee', to: '#0e7490', id: 'rk-3' },
  // 4: Художник — фиолетовый
  { from: '#a78bfa', to: '#6d28d9', id: 'rk-4' },
  // 5: Легенда — розовый
  { from: '#f472b6', to: '#be185d', id: 'rk-5' },
  // 6: Ветеран — жёлтый
  { from: '#facc15', to: '#ca8a04', id: 'rk-6' },
  // 7: Чемпион — красно-фиолетовый
  { from: '#ef4444', to: '#7e22ce', id: 'rk-7' },
  // 8: Создатель — радужный
  { from: '#f97316', to: '#7c3aed', id: 'rk-8' },
];

// 10px = 1 пиксель в сетке 8x8 (viewBox 80x80)
function P({ x, y, fill, opacity = 1 }: { x: number; y: number; fill: string; opacity?: number }) {
  return <rect x={x * 10} y={y * 10} width="10" height="10" fill={fill} opacity={opacity} />;
}

export function RankIcon({ tier, size = 40, className = '' }: RankIconProps) {
  const safeTier = Math.max(0, Math.min(8, tier));
  const g = GRADIENTS[safeTier];
  const url = `url(#${g.id})`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      className={className}
      style={{ imageRendering: 'pixelated' }}
    >
      <defs>
        <linearGradient id={g.id} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={g.from} />
          <stop offset="100%" stopColor={g.to} />
        </linearGradient>
      </defs>

      {safeTier === 0 && (
        <>
          <P x={2} y={2} fill={url} />
          <P x={3} y={2} fill={url} opacity={0.8} />
          <P x={4} y={2} fill={url} opacity={0.6} />
          <P x={2} y={3} fill={url} opacity={0.8} />
          <P x={3} y={3} fill={url} />
          <P x={4} y={3} fill={url} opacity={0.8} />
          <P x={2} y={4} fill={url} opacity={0.6} />
          <P x={3} y={4} fill={url} opacity={0.8} />
          <P x={4} y={4} fill={url} />
          <P x={5} y={4} fill={url} opacity={0.8} />
          <P x={5} y={5} fill={url} />
        </>
      )}

      {safeTier === 1 && (
        <>
          <P x={3} y={2} fill={url} />
          <P x={4} y={2} fill={url} />
          <P x={2} y={3} fill={url} />
          <P x={3} y={3} fill={url} />
          <P x={4} y={3} fill={url} />
          <P x={5} y={3} fill={url} />
          <P x={2} y={4} fill={url} />
          <P x={3} y={4} fill={url} />
          <P x={4} y={4} fill={url} />
          <P x={5} y={4} fill={url} />
          <P x={3} y={5} fill={url} />
          <P x={4} y={5} fill={url} />
        </>
      )}

      {safeTier === 2 && (
        <>
          <P x={2} y={2} fill={url} />
          <P x={3} y={2} fill={url} />
          <P x={4} y={2} fill={url} />
          <P x={5} y={2} fill={url} />
          <P x={2} y={3} fill={url} />
          <P x={5} y={3} fill={url} />
          <P x={2} y={4} fill={url} />
          <P x={5} y={4} fill={url} />
          <P x={2} y={5} fill={url} />
          <P x={3} y={5} fill={url} />
          <P x={4} y={5} fill={url} />
          <P x={5} y={5} fill={url} />
        </>
      )}

      {safeTier === 3 && (
        <>
          <P x={3.5} y={1.5} fill={url} />
          <P x={2.5} y={2.5} fill={url} />
          <P x={3.5} y={2.5} fill={url} />
          <P x={4.5} y={2.5} fill={url} />
          <P x={1.5} y={3.5} fill={url} />
          <P x={2.5} y={3.5} fill={url} />
          <P x={3.5} y={3.5} fill={url} />
          <P x={4.5} y={3.5} fill={url} />
          <P x={5.5} y={3.5} fill={url} />
          <P x={2.5} y={4.5} fill={url} />
          <P x={3.5} y={4.5} fill={url} />
          <P x={4.5} y={4.5} fill={url} />
          <P x={3.5} y={5.5} fill={url} />
        </>
      )}

      {safeTier === 4 && (
        <>
          <P x={2} y={2} fill="#ef4444" />
          <P x={3} y={2} fill="#f97316" />
          <P x={4} y={2} fill="#eab308" />
          <P x={5} y={2} fill="#22c55e" />
          <P x={2} y={3} fill={url} />
          <P x={3} y={3} fill="#ffffff" />
          <P x={4} y={3} fill="#ffffff" />
          <P x={5} y={3} fill="#3b82f6" />
          <P x={2} y={4} fill={url} />
          <P x={3} y={4} fill="#ffffff" />
          <P x={4} y={4} fill="#ffffff" />
          <P x={5} y={4} fill={url} />
          <P x={2} y={5} fill={url} />
          <P x={3} y={5} fill={url} />
          <P x={4} y={5} fill={url} />
          <P x={5} y={5} fill={url} />
        </>
      )}

      {safeTier === 5 && (
        <>
          <P x={3.5} y={1.5} fill={url} />
          <P x={3.5} y={2.5} fill={url} />
          <P x={1.5} y={3.5} fill={url} />
          <P x={2.5} y={3.5} fill={url} />
          <P x={3.5} y={3.5} fill={url} />
          <P x={4.5} y={3.5} fill={url} />
          <P x={5.5} y={3.5} fill={url} />
          <P x={2.5} y={4.5} fill={url} />
          <P x={3.5} y={4.5} fill={url} />
          <P x={4.5} y={4.5} fill={url} />
          <P x={1.5} y={5.5} fill={url} />
          <P x={2.5} y={5.5} fill={url} />
          <P x={4.5} y={5.5} fill={url} />
          <P x={5.5} y={5.5} fill={url} />
        </>
      )}

      {safeTier === 6 && (
        <>
          <P x={2} y={2} fill={url} />
          <P x={4} y={2} fill={url} />
          <P x={6} y={2} fill={url} />
          <P x={2} y={3} fill={url} />
          <P x={3} y={3} fill={url} />
          <P x={4} y={3} fill={url} />
          <P x={5} y={3} fill={url} />
          <P x={6} y={3} fill={url} />
          <P x={2} y={4} fill={url} />
          <P x={3} y={4} fill={url} />
          <P x={4} y={4} fill="#ef4444" />
          <P x={5} y={4} fill={url} />
          <P x={6} y={4} fill={url} />
          <P x={2} y={5} fill={url} />
          <P x={3} y={5} fill={url} />
          <P x={4} y={5} fill={url} />
          <P x={5} y={5} fill={url} />
          <P x={6} y={5} fill={url} />
        </>
      )}

      {safeTier === 7 && (
        <>
          <P x={2.5} y={1.5} fill={url} />
          <P x={3.5} y={1.5} fill={url} />
          <P x={4.5} y={1.5} fill={url} />
          <P x={1.5} y={2.5} fill={url} />
          <P x={2.5} y={2.5} fill={url} />
          <P x={3.5} y={2.5} fill={url} />
          <P x={4.5} y={2.5} fill={url} />
          <P x={5.5} y={2.5} fill={url} />
          <P x={2.5} y={3.5} fill={url} />
          <P x={3.5} y={3.5} fill={url} />
          <P x={4.5} y={3.5} fill={url} />
          <P x={3.5} y={4.5} fill={url} />
          <P x={2.5} y={5.5} fill={url} />
          <P x={3.5} y={5.5} fill={url} />
          <P x={4.5} y={5.5} fill={url} />
        </>
      )}

      {safeTier === 8 && (
        <>
          <P x={1.5} y={1.5} fill="#fde047" />
          <P x={5.5} y={1.5} fill="#a78bfa" />
          <P x={2.5} y={2.5} fill={url} />
          <P x={3.5} y={2.5} fill={url} />
          <P x={4.5} y={2.5} fill={url} />
          <P x={1.5} y={3.5} fill={url} />
          <P x={2.5} y={3.5} fill={url} />
          <P x={3.5} y={3.5} fill={url} />
          <P x={4.5} y={3.5} fill={url} />
          <P x={5.5} y={3.5} fill={url} />
          <P x={1.5} y={4.5} fill={url} />
          <P x={2.5} y={4.5} fill={url} />
          <P x={3.5} y={4.5} fill={url} />
          <P x={4.5} y={4.5} fill={url} />
          <P x={5.5} y={4.5} fill={url} />
          <P x={2.5} y={5.5} fill={url} />
          <P x={3.5} y={5.5} fill={url} />
          <P x={4.5} y={5.5} fill={url} />
          <P x={1.5} y={6.5} fill="#22d3ee" />
          <P x={5.5} y={6.5} fill="#f472b6" />
        </>
      )}
    </svg>
  );
}

// Логотип PixelStake
export function LogoIcon({ size = 40, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" className={className} style={{ imageRendering: 'pixelated' }}>
      <rect x="20" y="20" width="10" height="10" fill="#f97316" />
      <rect x="30" y="20" width="10" height="10" fill="#fb923c" />
      <rect x="40" y="20" width="10" height="10" fill="#ef4444" />
      <rect x="20" y="30" width="10" height="10" fill="#f97316" />
      <rect x="40" y="30" width="10" height="10" fill="#dc2626" />
      <rect x="50" y="30" width="10" height="10" fill="#dc2626" />
      <rect x="20" y="40" width="10" height="10" fill="#fb923c" />
      <rect x="30" y="40" width="10" height="10" fill="#fde047" />
      <rect x="40" y="40" width="10" height="10" fill="#f97316" />
      <rect x="30" y="50" width="10" height="10" fill="#ef4444" />
      <rect x="40" y="50" width="10" height="10" fill="#f97316" />
      <rect x="50" y="50" width="10" height="10" fill="#dc2626" />
    </svg>
  );
}

// PixelCoin иконка
export function CoinIcon({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" className={className}>
      <defs>
        <linearGradient id="coin-g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fde047" />
          <stop offset="100%" stopColor="#ca8a04" />
        </linearGradient>
      </defs>
      <circle cx="40" cy="40" r="32" fill="url(#coin-g)" stroke="#854d0e" strokeWidth="2" />
      <text x="40" y="52" textAnchor="middle" fontFamily="monospace" fontSize="32" fontWeight="bold" fill="#854d0e">P</text>
    </svg>
  );
}

// Медаль (1, 2, 3 место)
export function MedalIcon({ place, size = 32, className = '' }: { place: 1 | 2 | 3; size?: number; className?: string }) {
  const configs = {
    1: { from: '#fde047', to: '#ca8a04', stroke: '#854d0e', text: '#854d0e', ribbon1: '#ef4444', ribbon2: '#3b82f6', label: '1' },
    2: { from: '#cbd5e1', to: '#64748b', stroke: '#334155', text: '#334155', ribbon1: '#3b82f6', ribbon2: '#ef4444', label: '2' },
    3: { from: '#fb923c', to: '#c2410c', stroke: '#7c2d12', text: '#7c2d12', ribbon1: '#22c55e', ribbon2: '#eab308', label: '3' },
  };
  const c = configs[place];
  const id = `medal-${place}`;

  return (
    <svg width={size} height={size} viewBox="0 0 80 80" className={className}>
      <defs>
        <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={c.from} />
          <stop offset="100%" stopColor={c.to} />
        </linearGradient>
      </defs>
      <rect x="35" y="8" width="4" height="16" fill={c.ribbon1} />
      <rect x="41" y="8" width="4" height="16" fill={c.ribbon2} />
      <circle cx="40" cy="48" r="22" fill={`url(#${id})`} stroke={c.stroke} strokeWidth="2" />
      <text x="40" y="56" textAnchor="middle" fontFamily="monospace" fontSize="22" fontWeight="bold" fill={c.text}>
        {c.label}
      </text>
    </svg>
  );
}
