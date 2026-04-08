export interface User {
  id: number;
  email: string;
  username: string;
  is_admin: boolean;
  created_at: string;
  block_count?: number;
}

export interface Block {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  owner_id: number | null;
  owner_username?: string;
  status: BlockStatus;
  base_price: number;
  current_price: number;
  created_at: string;
}

export type BlockStatus = 'free' | 'reserved' | 'owned' | 'listed';

export interface BlockBulk {
  id: number;
  x: number;
  y: number;
  status: BlockStatus;
  owner_id: number | null;
  current_price: number;
}

export interface CanvasState {
  blocks: BlockBulk[];
  canvas_width: number;
  canvas_height: number;
  block_size: number;
}

export interface Pixel {
  x: number;
  y: number;
  color: string;
}

export interface PixelLocal {
  block_id: number;
  local_x: number;
  local_y: number;
  color: string;
}

export interface Order {
  id: number;
  block_id: number;
  amount: number;
  currency: string;
  status: string;
  order_type: string;
  created_at: string;
}

export interface Listing {
  id: number;
  block_id: number;
  block_x: number;
  block_y: number;
  seller_id: number;
  seller_username: string;
  price: number;
  status: string;
  created_at: string;
}

export interface AppConfig {
  canvas_width: number;
  canvas_height: number;
  block_size: number;
  stripe_publishable_key: string;
  currency: string;
  resale_fee_percent: number;
}

export interface WSMessage {
  type: 'block_update' | 'pixel_update';
  block?: BlockBulk;
  pixels?: Pixel[];
}
