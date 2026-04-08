import type { User, Block, CanvasState, Listing, Order, AppConfig, PixelLocal } from '@/types';

const API_BASE = import.meta.env.VITE_API_URL || '';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...headers, ...(options?.headers as Record<string, string>) },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }

  return res.json();
}

// Auth
export const api = {
  register: (email: string, username: string, password: string) =>
    request<{ access_token: string; user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, username, password }),
    }),

  login: (email: string, password: string) =>
    request<{ access_token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  getMe: () => request<User>('/api/auth/me'),

  // Config
  getConfig: () => request<AppConfig>('/api/config'),

  // Blocks
  getCanvasState: (xMin = 0, yMin = 0, xMax = 1000, yMax = 1000) =>
    request<CanvasState>(`/api/blocks/canvas?x_min=${xMin}&y_min=${yMin}&x_max=${xMax}&y_max=${yMax}`),

  getBlock: (id: number) => request<Block>(`/api/blocks/${id}`),

  getBlockAt: (x: number, y: number) => request<Block>(`/api/blocks/at/${x}/${y}`),

  getMyBlocks: () => request<Block[]>('/api/blocks/owned/me'),

  // Pixels
  getRegionPixels: (xMin: number, yMin: number, xMax: number, yMax: number) =>
    request<{ pixels: { x: number; y: number; color: string }[] }>(
      `/api/pixels/region?x_min=${xMin}&y_min=${yMin}&x_max=${xMax}&y_max=${yMax}`
    ),

  getBlockPixels: (blockId: number) =>
    request<{ block_id: number; pixels: PixelLocal[] }>(`/api/pixels/block/${blockId}`),

  drawPixels: (blockId: number, pixels: { local_x: number; local_y: number; color: string }[]) =>
    request<{ status: string; updated: number }>('/api/pixels/draw', {
      method: 'POST',
      body: JSON.stringify({ block_id: blockId, pixels }),
    }),

  // Purchase
  checkout: (blockId: number) =>
    request<{ checkout_url: string; session_id: string; order_id: number }>('/api/purchase/checkout', {
      method: 'POST',
      body: JSON.stringify({ block_id: blockId }),
    }),

  checkoutResale: (listingId: number) =>
    request<{ checkout_url: string; session_id: string; order_id: number }>('/api/purchase/checkout/resale', {
      method: 'POST',
      body: JSON.stringify({ listing_id: listingId }),
    }),

  getOrders: () => request<Order[]>('/api/purchase/orders'),

  // Marketplace
  getListings: (sort = 'recent', minPrice?: number, maxPrice?: number) => {
    let url = `/api/marketplace/listings?sort=${sort}`;
    if (minPrice !== undefined) url += `&min_price=${minPrice}`;
    if (maxPrice !== undefined) url += `&max_price=${maxPrice}`;
    return request<Listing[]>(url);
  },

  createListing: (blockId: number, price: number) =>
    request<Listing>('/api/marketplace/list', {
      method: 'POST',
      body: JSON.stringify({ block_id: blockId, price }),
    }),

  cancelListing: (listingId: number) =>
    request<{ status: string }>(`/api/marketplace/delist/${listingId}`, {
      method: 'DELETE',
    }),

  getMyListings: () => request<Listing[]>('/api/marketplace/my-listings'),

  // Admin
  getAdminStats: () => request<any>('/api/admin/stats'),
  getAdminUsers: () => request<User[]>('/api/admin/users'),
  getAdminOrders: () => request<Order[]>('/api/admin/orders'),
  getAdminTransactions: () => request<any[]>('/api/admin/transactions'),
};
