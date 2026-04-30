/**
 * Thin API client. Wraps fetch with:
 *   - Base URL from env
 *   - Bearer token auto-injection from localStorage
 *   - JSON content type by default
 *   - Same-origin credentials so cookies pass on auth endpoints
 *
 * Drop-in compatible with `fetch` Response (caller does .json(), .ok, etc.)
 */

const BASE_URL = (import.meta.env.VITE_API_URL || 'https://pixelcanvas-api.onrender.com').replace(/\/$/, '');

function getToken(): string | null {
  try {
    return localStorage.getItem('access_token') || localStorage.getItem('token');
  } catch {
    return null;
  }
}

function buildHeaders(custom?: HeadersInit): Headers {
  const h = new Headers(custom);
  if (!h.has('Content-Type')) h.set('Content-Type', 'application/json');

  const tok = getToken();
  if (tok && !h.has('Authorization')) {
    h.set('Authorization', `Bearer ${tok}`);
  }
  return h;
}

async function request(
  method: string,
  path: string,
  body?: unknown,
  init?: RequestInit
): Promise<Response> {
  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
  const headers = buildHeaders(init?.headers);

  return fetch(url, {
    ...init,
    method,
    headers,
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export const api = {
  get: (path: string, init?: RequestInit) => request('GET', path, undefined, init),
  post: (path: string, body?: unknown, init?: RequestInit) => request('POST', path, body, init),
  put: (path: string, body?: unknown, init?: RequestInit) => request('PUT', path, body, init),
  patch: (path: string, body?: unknown, init?: RequestInit) => request('PATCH', path, body, init),
  delete: (path: string, init?: RequestInit) => request('DELETE', path, undefined, init),
};
