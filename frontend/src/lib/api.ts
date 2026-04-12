const API = import.meta.env.VITE_API_URL || '';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const res = await fetch(`${API}${path}`, { ...options, headers: { ...headers, ...(options?.headers as Record<string, string>) } });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }));
    // Handle different error formats
    let message = 'Request failed';
    if (typeof err.detail === 'string') {
      message = err.detail;
    } else if (Array.isArray(err.detail)) {
      message = err.detail.map((e: any) => e.msg || e.message || String(e)).join(', ');
    } else if (typeof err.detail === 'object' && err.detail !== null) {
      message = err.detail.msg || err.detail.message || JSON.stringify(err.detail);
    } else if (typeof err.message === 'string') {
      message = err.message;
    }
    throw new Error(message);
  }
  return res.json();
}

export const api = {
  register: (email: string, username: string, password: string, ref?: string) =>
    request<any>('/api/auth/register', { method: 'POST', body: JSON.stringify({ email, username, password, ref: ref || null }) }),
  login: (email: string, password: string) =>
    request<any>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  getMe: () => request<any>('/api/auth/me'),
  getConfig: () => request<any>('/api/config'),
  getBattleStatus: () => request<any>('/api/pixels/status'),
  getCanvas: (xMin: number, yMin: number, xMax: number, yMax: number) =>
    request<any>(`/api/pixels/canvas?x_min=${xMin}&y_min=${yMin}&x_max=${xMax}&y_max=${yMax}`),
  placePixel: (x: number, y: number, color: string) =>
    request<any>('/api/pixels/place', { method: 'POST', body: JSON.stringify({ x, y, color }) }),
  getCooldown: () => request<any>('/api/pixels/cooldown'),
  getSubStatus: () => request<any>('/api/subscribe/status'),
  subscribeCheckout: (provider: string) =>
    request<any>(`/api/subscribe/checkout?provider=${provider}`, { method: 'POST' }),
};
