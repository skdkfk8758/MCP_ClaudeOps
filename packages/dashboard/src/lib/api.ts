import { API_URL } from './constants';

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: HeadersInit = {};
  if (options?.body) {
    headers['Content-Type'] = 'application/json';
  }
  const response = await fetch(`${API_URL}${path}`, {
    headers,
    ...options,
  });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json() as Promise<T>;
}
