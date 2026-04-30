/**
 * PixelStake API client.
 *
 * Provides BOTH:
 *   - Named methods (api.login, api.placePixel, ...) — used throughout codebase
 *   - Generic verbs (api.get, api.post, ...) — used by new hooks
 *
 * Plus connection waking logic (Render free tier sleeps after 15 min):
 *   - isServerWaking() returns true while a request is in retry loop
 *   - onServerAwake(cb) subscribes to "server is back" events
 */

const BASE_URL = (import.meta.env.VITE_API_URL || 'https://pixelcanvas-api.onrender.com').replace(/\/$/, '');

// ───────────────────────────────────────────────────────────────────────────
// Server waking state — used by ServerWakingOverlay
// ───────────────────────────────────────────────────────────────────────────

let _serverWaking = false;
const _wakeListeners: Array<() => void> = [];

export function isServerWaking(): boolean {
  return _serverWaking;
}

export function onServerAwake(cb: () => void): () => void {
  _wakeListeners.push(cb);
  return () => {
    const i = _wakeListeners.indexOf(cb);
    if (i >= 0) _wakeListeners.splice(i, 1);
  };
}

function setServerWaking(waking: boolean) {
  const wasWaking = _serverWaking;
  _serverWaking = waking;
  if (wasWaking && !waking) {
    _wakeListeners.forEach((cb) => {
      try { cb(); } catch {}
    });
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Token management
// ───────────────────────────────────────────────────────────────────────────

function getToken(): string | null {
  try {
    return localStorage.getItem('access_token') || localStorage.getItem('token');
  } catch {
    return null;
  }
}

function setToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem('access_token', token);
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('access_token');
      localStorage.removeItem('token');
    }
  } catch {}
}

function buildHeaders(custom?: HeadersInit, json: boolean = true): Headers {
  const h = new Headers(custom);
  if (json && !h.has('Content-Type')) h.set('Content-Type', 'application/json');
  const tok = getToken();
  if (tok && !h.has('Authorization')) h.set('Authorization', `Bearer ${tok}`);
  return h;
}

// ───────────────────────────────────────────────────────────────────────────
// Generic verbs (low-level)
// ───────────────────────────────────────────────────────────────────────────

async function request(
  method: string,
  path: string,
  body?: unknown,
  init?: RequestInit
): Promise<Response> {
  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
  const headers = buildHeaders(init?.headers);

  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        ...init,
        method,
        headers,
        credentials: 'include',
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });

      if (res.status === 502 || res.status === 503) {
        if (attempt === 0) {
          setServerWaking(true);
          await new Promise((r) => setTimeout(r, 3000));
          continue;
        }
      }

      setServerWaking(false);
      return res;
    } catch (e) {
      lastErr = e;
      if (attempt === 0) {
        setServerWaking(true);
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
    }
  }

  setServerWaking(false);
  throw lastErr;
}

async function getJSON<T = any>(path: string): Promise<T> {
  const res = await request('GET', path);
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${path}`);
  return res.json() as Promise<T>;
}

async function postJSON<T = any>(path: string, body?: unknown): Promise<T> {
  const res = await request('POST', path, body);
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const err = await res.json();
      msg = err.detail || err.message || msg;
    } catch {}
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

// ───────────────────────────────────────────────────────────────────────────
// Named methods — preserves API used throughout the existing codebase
// ───────────────────────────────────────────────────────────────────────────

export const api = {
  get: (path: string, init?: RequestInit) => request('GET', path, undefined, init),
  post: (path: string, body?: unknown, init?: RequestInit) => request('POST', path, body, init),
  put: (path: string, body?: unknown, init?: RequestInit) => request('PUT', path, body, init),
  patch: (path: string, body?: unknown, init?: RequestInit) => request('PATCH', path, body, init),
  delete: (path: string, init?: RequestInit) => request('DELETE', path, undefined, init),

  async login(email: string, password: string, captcha_token?: string) {
    const data = await postJSON<any>('/api/auth/login', { email, password, captcha_token });
    if (data.access_token) setToken(data.access_token);
    return data;
  },

  async register(email: string, password: string, username?: string, captcha_token?: string, ref?: string) {
    const data = await postJSON<any>('/api/auth/register', { email, password, username, captcha_token, ref });
    if (data.access_token) setToken(data.access_token);
    return data;
  },

  logout() {
    setToken(null);
  },

  getMe() {
    return getJSON('/api/auth/me');
  },

  getConfig() {
    return getJSON('/api/auth/config');
  },

  async getCanvas(viewport?: { x_min: number; y_min: number; x_max: number; y_max: number }): Promise<any> {
    const qs = viewport
      ? `?x_min=${viewport.x_min}&y_min=${viewport.y_min}&x_max=${viewport.x_max}&y_max=${viewport.y_max}`
      : '?x_min=0&y_min=0&x_max=1000&y_max=1000';
    return getJSON(`/api/pixels/canvas${qs}`);
  },

  async getCanvasBinary(): Promise<ArrayBuffer> {
    const res = await request('GET', '/api/pixels/canvas/binary');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.arrayBuffer();
  },

  placePixel(x: number, y: number, color: string) {
    return postJSON('/api/pixels/place', { x, y, color });
  },

  getCooldown() {
    return getJSON('/api/pixels/cooldown');
  },

  getBattleStatus() {
    return getJSON('/api/pixels/status');
  },

  getSubStatus() {
    return getJSON('/api/economy/balance');
  },

  subscribeCheckout(plan?: string) {
    return postJSON('/api/subscriptions/checkout', { plan: plan || 'pro_monthly' });
  },

  getBalance() {
    return getJSON('/api/economy/balance');
  },

  getDailyStatus() {
    return getJSON('/api/economy/daily-status');
  },

  claimDaily() {
    return postJSON('/api/economy/daily-claim');
  },

  getPalettes() {
    return getJSON('/api/economy/palettes');
  },

  buyPalette(paletteId: string) {
    return postJSON('/api/economy/palette/buy', { palette_id: paletteId });
  },

  getAchievements() {
    return getJSON('/api/economy/achievements');
  },

  getLeaderboard(type: string = 'pixels') {
    return getJSON(`/api/leaderboard?type=${type}`);
  },

  getClans() {
    return getJSON('/api/clans');
  },

  getMyClan() {
    return getJSON('/api/clans/my');
  },

  createClan(data: { name: string; tag: string; description?: string }) {
    return postJSON('/api/clans/create', data);
  },

  getClan(id: number) {
    return getJSON(`/api/clans/${id}`);
  },

  joinClan(code: string) {
    return postJSON(`/api/clans/join`, { code });
  },

  leaveClan() {
    return postJSON('/api/clans/leave');
  },

  getReferralStats() {
    return getJSON('/api/auth/referral');
  },
};

export type ApiClient = typeof api;
