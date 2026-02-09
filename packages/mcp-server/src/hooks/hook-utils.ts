import { readFileSync } from 'node:fs';

export interface HookInput {
  hook_type: string;
  session_id?: string;
  [key: string]: unknown;
}

export function readStdin(): HookInput {
  try {
    const input = readFileSync('/dev/stdin', 'utf-8');
    return JSON.parse(input) as HookInput;
  } catch {
    return { hook_type: 'unknown' };
  }
}

export async function sendEvent(path: string, data: unknown): Promise<void> {
  const baseUrl = process.env.CLAUDEOPS_BACKEND_URL || 'http://localhost:48390';
  try {
    await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    // Fire and forget - never block Claude
  }
}

export function respond(allow: boolean = true): void {
  console.log(JSON.stringify({ continue: allow }));
}

export function getSessionId(input: HookInput): string {
  return (input.session_id as string) || process.env.CLAUDE_SESSION_ID || 'unknown';
}
