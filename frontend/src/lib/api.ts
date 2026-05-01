/**
 * PixelStake API client.
 *
 * Provides BOTH:
 *   - Named methods (api.login, api.placePixel, ...) — used throughout codebase
 *   - Generic verbs (api.get, api.post, ...) — used by new hooks
 *
 * Plus connection waking logic (Render free tier sleeps after 15 min).
 */

const BASE_URL = (import.meta.env.VITE_API_URL || 'https://pixelcanvas-api.onrender.com').replace(/\/$/, '');

// ───────────────────────────────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────────────────────────────

export interface CanvasPixel {
  x: number;
  y: number;
  color: string;
  user_id: number | null;
  clan_id: number | null;
}

export interface CanvasResponse {
  pixels: CanvasPixel[];
}

export interface Viewport {
  x_min: number;
  y_min: number;
  x_max: number;
  y_max: number;
}

// ───────────────────────────────────────────────────────────────────────────
// Server waking state
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
// Overloaded function signatures — backward compatible with both:
//   api.getCanvas()
//   api.getCanvas(x_min, y_min, x_max, y_max)   ← OLD usage
//   api.getCanvas({ x_min, y_min, x_max, y_max }) ← NEW usage
// ───────────────────────────────────────────────────────────────────────────

async function getCanvasOverloaded(
  arg1?: Viewport | number,
  arg2?: number,
  arg3?: number,
  arg4?: number
): Promise<CanvasResponse> {
  let qs = '?x_min=0&y_min=0&x_max=1000&y_max=1000';

  if (typeof arg1 === 'object' && arg1 !== null) {
    qs = `?x_min=${arg1.x_min}&y_min=${arg1.y_min}&x_max=${arg1.x_max}&y_max=${arg1.y_max}`;
  } else if (typeof arg1 === 'number' && typeof arg2 === 'number' &&
             typeof arg3 === 'number' && typeof arg4 === 'number') {
    qs = `?x_min=${arg1}&y_min=${arg2}&x_max=${arg3}&y_max=${arg4}`;
  }

  return getJSON<CanvasResponse>(`/api/pixels/canvas${qs}`);
}

/**
 * Get canvas as PARSED PIXEL ARRAY (not raw bytes).
 *
 * Old name kept for compat. Returns array of pixels suitable for iteration.
 */
async function getCanvasBinary(): Promise<CanvasPixel[]> {
  // Backend has /api/pixels/canvas/binary that returns raw bytes —
  // but client code expects iterable list of pixels.
  // Use /api/pixels/canvas instead (full canvas), which returns JSON.
  const data = await getJSON<CanvasResponse | CanvasPixel[]>(
    '/api/pixels/canvas?x_min=0&y_min=0&x_max=1000&y_max=1000'
  );
  return Array.isArray(data) ? data : (data.pixels || []);
}

// ───────────────────────────────────────────────────────────────────────────
// Public API — preserves all named methods used in existing code
// ───────────────────────────────────────────────────────────────────────────

export const api = {
  // Generic verbs
  get: (path: string, init?: RequestInit) => request('GET', path, undefined, init),
  post: (path: string, body?: unknown, init?: RequestInit) => request('POST', path, body, init),
  put: (path: string, body?: unknown, init?: RequestInit) => request('PUT', path, body, init),
  patch: (path: string, body?: unknown, init?: RequestInit) => request('PATCH', path, body, init),
  delete: (path: string, init?: RequestInit) => request('DELETE', path, undefined, init),

  // Auth
  async login(email: string, password: string, captcha_token?: string): Promise<any> {
    const data = await postJSON<any>('/api/auth/login', { email, password, captcha_token });
    if (data.access_token) setToken(data.access_token);
    return data;
  },

  async register(
    email: string, password: string, username?: string,
    captcha_token?: string, ref?: string
  ): Promise<any> {
    const data = await postJSON<any>('/api/auth/register', {
      email, password, username, captcha_token, ref,
    });
    if (data.access_token) setToken(data.access_token);
    return data;
  },

  logout(): void { setToken(null); },

  getMe(): Promise<any> { return getJSON('/api/auth/me'); },

  // Public config
  getConfig(): Promise<any> { return getJSON('/api/auth/config'); },

  // Canvas — overloaded signatures for backward compat
  getCanvas: getCanvasOverloaded,

  // Returns ARRAY OF PIXELS (iterable)
  getCanvasBinary,

  placePixel(x: number, y: number, color: string): Promise<any> {
    return postJSON('/api/pixels/place', { x, y, color });
  },

  getCooldown(): Promise<any> { return getJSON('/api/pixels/cooldown'); },

  // Battle
  getBattleStatus(): Promise<any> { return getJSON('/api/pixels/status'); },

  // Subscriptions
  getSubStatus(): Promise<any> { return getJSON('/api/economy/balance'); },

  subscribeCheckout(plan?: string): Promise<any> {
    return postJSON('/api/subscriptions/checkout', { plan: plan || 'pro_monthly' });
  },

  // Economy
  getBalance(): Promise<any> { return getJSON('/api/economy/balance'); },
  getDailyStatus(): Promise<any> { return getJSON('/api/economy/daily-status'); },
  claimDaily(): Promise<any> { return postJSON('/api/economy/daily-claim'); },
  getPalettes(): Promise<any> { return getJSON('/api/economy/palettes'); },
  buyPalette(paletteId: string): Promise<any> {
    return postJSON('/api/economy/palette/buy', { palette_id: paletteId });
  },
  getAchievements(): Promise<any> { return getJSON('/api/economy/achievements'); },

  // Leaderboard
  getLeaderboard(type: string = 'pixels'): Promise<any> {
    return getJSON(`/api/leaderboard?type=${type}`);
  },

  // Clans
  getClans(): Promise<any> { return getJSON('/api/clans'); },
  getMyClan(): Promise<any> { return getJSON('/api/clans/my'); },
  createClan(data: { name: string; tag: string; description?: string }): Promise<any> {
    return postJSON('/api/clans/create', data);
  },
  getClan(id: number): Promise<any> { return getJSON(`/api/clans/${id}`); },
  joinClan(code: string): Promise<any> { return postJSON('/api/clans/join', { code }); },
  leaveClan(): Promise<any> { return postJSON('/api/clans/leave'); },

  // Referral
  getReferralStats(): Promise<any> { return getJSON('/api/auth/referral'); },
};

export type ApiClient = typeof api;
