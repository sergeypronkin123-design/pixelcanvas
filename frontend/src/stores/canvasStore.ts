import { create } from 'zustand';
import type { BlockBulk, Block, AppConfig, Pixel } from '@/types';
import { api } from '@/lib/api';

interface CanvasStore {
  blocks: Map<string, BlockBulk>;
  pixels: Map<string, string>; // "x,y" -> color
  config: AppConfig | null;
  selectedBlock: Block | null;
  drawColor: string;
  tool: 'select' | 'pencil' | 'eraser';
  loading: boolean;

  loadConfig: () => Promise<void>;
  loadCanvas: (xMin: number, yMin: number, xMax: number, yMax: number) => Promise<void>;
  loadPixels: (xMin: number, yMin: number, xMax: number, yMax: number) => Promise<void>;
  selectBlock: (block: Block | null) => void;
  setDrawColor: (color: string) => void;
  setTool: (tool: 'select' | 'pencil' | 'eraser') => void;
  updateBlock: (block: BlockBulk) => void;
  updatePixels: (pixels: Pixel[]) => void;
}

const blockKey = (x: number, y: number) => `${x},${y}`;

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  blocks: new Map(),
  pixels: new Map(),
  config: null,
  selectedBlock: null,
  drawColor: '#00f0ff',
  tool: 'select',
  loading: false,

  loadConfig: async () => {
    try {
      const config = await api.getConfig();
      set({ config });
    } catch (e) {
      console.error('Failed to load config', e);
    }
  },

  loadCanvas: async (xMin, yMin, xMax, yMax) => {
    try {
      const data = await api.getCanvasState(xMin, yMin, xMax, yMax);
      const blocks = new Map(get().blocks);
      for (const b of data.blocks) {
        blocks.set(blockKey(b.x, b.y), b);
      }
      set({ blocks, config: get().config || { canvas_width: data.canvas_width, canvas_height: data.canvas_height, block_size: data.block_size, stripe_publishable_key: '', currency: 'usd', resale_fee_percent: 5 } });
    } catch (e) {
      console.error('Failed to load canvas', e);
    }
  },

  loadPixels: async (xMin, yMin, xMax, yMax) => {
    try {
      const data = await api.getRegionPixels(xMin, yMin, xMax, yMax);
      const pixels = new Map(get().pixels);
      for (const p of data.pixels) {
        pixels.set(`${p.x},${p.y}`, p.color);
      }
      set({ pixels });
    } catch (e) {
      console.error('Failed to load pixels', e);
    }
  },

  selectBlock: (block) => set({ selectedBlock: block }),
  setDrawColor: (color) => set({ drawColor: color }),
  setTool: (tool) => set({ tool }),

  updateBlock: (block) => {
    const blocks = new Map(get().blocks);
    blocks.set(blockKey(block.x, block.y), block);
    set({ blocks });
  },

  updatePixels: (newPixels) => {
    const pixels = new Map(get().pixels);
    for (const p of newPixels) {
      pixels.set(`${p.x},${p.y}`, p.color);
    }
    set({ pixels });
  },
}));
