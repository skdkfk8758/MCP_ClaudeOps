const BASE_URL = process.env.CLAUDEOPS_BACKEND_URL || 'http://localhost:48390';

export async function serviceRequest<T>(method: string, path: string, data?: unknown): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: data ? JSON.stringify(data) : undefined,
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return await response.json() as T;
}
