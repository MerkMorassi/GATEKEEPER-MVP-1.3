export function getAuthToken(): string | null {
  return localStorage.getItem('gk_auth_token');
}

export function setAuthToken(token: string | null): void {
  if (token) {
    localStorage.setItem('gk_auth_token', token);
  } else {
    localStorage.removeItem('gk_auth_token');
  }
}

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const token = getAuthToken();
  const headers = new Headers(init?.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(input, {
    ...init,
    headers,
  });
}
