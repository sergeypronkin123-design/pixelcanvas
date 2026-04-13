import { create } from 'zustand';
import { api } from '@/lib/api';

interface User {
  id: number; email: string; username: string; is_admin: boolean;
  is_subscriber: boolean; subscription_until: string | null;
  pixels_placed_total: number; referral_code: string | null;
  bonus_pixels: number; created_at: string;
}

interface AuthState {
  user: User | null; token: string | null; loading: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null, token: localStorage.getItem('token'), loading: true,
  setAuth: (user, token) => { localStorage.setItem('token', token); set({ user, token, loading: false }); },
  logout: () => { localStorage.removeItem('token'); set({ user: null, token: null, loading: false }); },
  loadUser: async () => {
    const token = localStorage.getItem('token');
    if (!token) { set({ loading: false }); return; }
    try {
      const user = await api.getMe();
      set({ user, token, loading: false });
    } catch {
      localStorage.removeItem('token');
      set({ user: null, token: null, loading: false });
    }
  },
}));
