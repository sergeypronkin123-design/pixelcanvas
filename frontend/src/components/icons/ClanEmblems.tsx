/**
 * Эмблемы кланов — 18 вариантов в пиксель-арт стиле
 */
import React from 'react';

interface ClanEmblemProps {
  code: string;
  color?: string;
  size?: number;
  className?: string;
}

// Словарь: код -> набор пикселей (строки 5 пикселей в ширину)
// '#' = цвет клана, ' ' = пусто
export const CLAN_EMBLEMS: Record<string, { name: string; pixels: string[] }> = {
  sword: {
    name: 'Меч',
    pixels: [
      '  #  ',
      ' ### ',
      ' ### ',
      '  #  ',
      ' ### ',
      '  #  ',
      '  #  ',
    ],
  },
  shield: {
    name: 'Щит',
    pixels: [
      ' ### ',
      '#####',
      '#####',
      '#####',
      ' ### ',
      '  #  ',
      '     ',
    ],
  },
  star: {
    name: 'Звезда',
    pixels: [
      '  #  ',
      ' ### ',
      '#####',
      ' ### ',
      '# # #',
      '     ',
      '     ',
    ],
  },
  crown: {
    name: 'Корона',
    pixels: [
      '# # #',
      '#####',
      '#####',
      '#####',
      '#####',
      '     ',
      '     ',
    ],
  },
  diamond: {
    name: 'Алмаз',
    pixels: [
      '  #  ',
      ' ### ',
      '#####',
      ' ### ',
      '  #  ',
      '     ',
      '     ',
    ],
  },
  fire: {
    name: 'Огонь',
    pixels: [
      ' # # ',
      ' ### ',
      ' ### ',
      '#####',
      '#####',
      ' ### ',
      '     ',
    ],
  },
  lightning: {
    name: 'Молния',
    pixels: [
      '  ## ',
      ' ##  ',
      ' ### ',
      '####',
      '  ## ',
      ' ##  ',
      '#    ',
    ],
  },
  skull: {
    name: 'Череп',
    pixels: [
      ' ### ',
      '#####',
      '# # #',
      '#####',
      ' ### ',
      ' # # ',
      '     ',
    ],
  },
  heart: {
    name: 'Сердце',
    pixels: [
      '## ##',
      '#####',
      '#####',
      ' ### ',
      '  #  ',
      '     ',
      '     ',
    ],
  },
  eye: {
    name: 'Око',
    pixels: [
      ' ### ',
      '#####',
      '## ##',
      '#####',
      ' ### ',
      '     ',
      '     ',
    ],
  },
  wolf: {
    name: 'Волк',
    pixels: [
      '#   #',
      '## ##',
      '#####',
      ' ### ',
      ' # # ',
      '     ',
      '     ',
    ],
  },
  dragon: {
    name: 'Дракон',
    pixels: [
      ' # # ',
      '# # #',
      '#####',
      ' ### ',
      '# # #',
      ' # # ',
      '     ',
    ],
  },
  bow: {
    name: 'Лук',
    pixels: [
      '#    ',
      '##   ',
      '###  ',
      '####',
      '###  ',
      '##   ',
      '#    ',
    ],
  },
  axe: {
    name: 'Топор',
    pixels: [
      '### #',
      '#####',
      '### #',
      '  #  ',
      '  #  ',
      '  #  ',
      '  #  ',
    ],
  },
  moon: {
    name: 'Луна',
    pixels: [
      ' ### ',
      '###  ',
      '##   ',
      '##   ',
      '###  ',
      ' ### ',
      '     ',
    ],
  },
  sun: {
    name: 'Солнце',
    pixels: [
      '# # #',
      ' ### ',
      '#####',
      '#####',
      '#####',
      ' ### ',
      '# # #',
    ],
  },
  tower: {
    name: 'Башня',
    pixels: [
      '# # #',
      '#####',
      ' ### ',
      ' ### ',
      ' ### ',
      '#####',
      '#####',
    ],
  },
  snake: {
    name: 'Змей',
    pixels: [
      ' ##  ',
      '####',
      '#  #',
      '## ##',
      ' # ##',
      ' ####',
      '   ##',
    ],
  },
};

export const CLAN_EMBLEM_CODES = Object.keys(CLAN_EMBLEMS);

export function ClanEmblem({ code, color = '#f97316', size = 40, className = '' }: ClanEmblemProps) {
  const emblem = CLAN_EMBLEMS[code];
  if (!emblem) {
    // Fallback to shield
    return <ClanEmblem code="shield" color={color} size={size} className={className} />;
  }

  const pixelSize = 10; // 10px per pixel, 5 wide * 10 = 50, plus padding
  const viewBoxSize = 80;
  const offset = (viewBoxSize - emblem.pixels[0].length * pixelSize) / 2;
  const offsetY = (viewBoxSize - emblem.pixels.length * pixelSize) / 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
      className={className}
      style={{ imageRendering: 'pixelated' }}
    >
      {emblem.pixels.map((row, y) =>
        row.split('').map((cell, x) => {
          if (cell === '#') {
            return (
              <rect
                key={`${x}-${y}`}
                x={offset + x * pixelSize}
                y={offsetY + y * pixelSize}
                width={pixelSize}
                height={pixelSize}
                fill={color}
              />
            );
          }
          return null;
        })
      )}
    </svg>
  );
}
