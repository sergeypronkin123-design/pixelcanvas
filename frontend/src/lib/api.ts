const API = import.meta.env.VITE_API_URL || '';

// Глобальное состояние "разогрева" сервера
let _serverWaking = false;
let _wakeListeners: (() => void)[] = [];

export function isServerWaking() { return _serverWaking; }
export function onServerAwake(cb: () => void) {
  if (!_serverWaking) { cb(); return; }
  _wakeListeners.push(cb);
}

async function request<T>(path: string, options?: RequestInit, retries = 3): Promise<T> {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), attempt === 0 ? 10000 : 30000);

      const res = await fetch(`${API}${path}`, {
        ...options,
        headers: { ...headers, ...(options?.headers as Record<string, string>) },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      // Сервер проснулся
      if (_serverWaking) {
        _serverWaking = false;
        _wakeListeners.forEach((cb) => cb());
        _wakeListeners = [];
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Request failed' }));
        let message = 'Request failed';
        if (typeof err.detail === 'string') message = err.detail;
        else if (Array.isArray(err.detail)) message = err.detail.map((e: any) => e.msg || e.message || String(e)).join(', ');
        else if (typeof err.detail === 'object' && err.detail !== null) message = err.detail.msg || err.detail.message || JSON.stringify(err.detail);
        else if (typeof err.message === 'string') message = err.message;
        throw new Error(message);
      }
      return res.json();
    } catch (e: any) {
      const isNetworkError = e.name === 'AbortError' || e.message === 'Failed to fetch' || e.name === 'TypeError';

      if (isNetworkError && attempt < retries) {
        _serverWaking = true;
        // Экспоненциальная задержка: 2s, 5s, 10s
        await new Promise((r) => setTimeout(r, (attempt + 1) * 2500));
        continue;
      }

      if (isNetworkError) {
        throw new Error('Сервер не отвечает. Попробуйте через 30 секунд.');
      }
      throw e;
    }
  }
  throw new Error('Сервер недоступен');
}

export const api = {
  register: (email: string, username: string, password: string, ref?: string, captcha_token?: string) =>
    request<any>('/api/auth/register', { method: 'POST', body: JSON.stringify({ email, username, password, ref: ref || null, captcha_token: captcha_token || null }) }),
  login: (email: string, password: string, captcha_token?: string) =>
    request<any>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password, captcha_token: captcha_token || null }) }),
  getMe: () => request<any>('/api/auth/me'),
  getConfig: () => request<any>('/api/config'),
  getBattleStatus: () => request<any>('/api/pixels/status'),
  getCanvas: (xMin: number, yMin: number, xMax: number, yMax: number) =>
    request<any>(`/api/pixels/canvas?x_min=${xMin}&y_min=${yMin}&x_max=${xMax}&y_max=${yMax}`),
  getCanvasBinary: async (): Promise<{ x: number; y: number; color: string }[]> => {
    const res = await fetch(`${API}/api/pixels/canvas/binary`);
    if (!res.ok) throw new Error('Failed to load canvas');
    const buf = await res.arrayBuffer();
    const view = new DataView(buf);
    const count = view.getUint32(0, true);
    const pixels: { x: number; y: number; color: string }[] = [];
    let offset = 4;
    for (let i = 0; i < count; i++) {
      const x = view.getUint16(offset, true);
      const y = view.getUint16(offset + 2, true);
      const r = view.getUint8(offset + 4);
      const g = view.getUint8(offset + 5);
      const b = view.getUint8(offset + 6);
      const color = '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
      pixels.push({ x, y, color });
      offset += 7;
    }
    return pixels;
  },
  placePixel: (x: number, y: number, color: string) =>
    request<any>('/api/pixels/place', { method: 'POST', body: JSON.stringify({ x, y, color }) }),
  getCooldown: () => request<any>('/api/pixels/cooldown'),
  getSubStatus: () => request<any>('/api/subscribe/status'),
  subscribeCheckout: (provider: string) =>
    request<any>(`/api/subscribe/checkout?provider=${provider}`, { method: 'POST' }),
};
