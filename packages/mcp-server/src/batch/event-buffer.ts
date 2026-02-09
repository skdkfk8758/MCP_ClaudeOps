import { apiPost } from '../client/api-client.js';

interface BufferedEvent {
  session_id: string;
  event_type: string;
  payload: Record<string, unknown>;
}

const MAX_BUFFER_SIZE = 50;
const FLUSH_INTERVAL_MS = 2000;
const MAX_RETRY_BUFFER = 200;

let buffer: BufferedEvent[] = [];
let retryBuffer: BufferedEvent[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;

export function addEvent(event: BufferedEvent): void {
  buffer.push(event);
  if (buffer.length >= MAX_BUFFER_SIZE) {
    void flush();
  }
}

export function startAutoFlush(): void {
  if (flushTimer) return;
  flushTimer = setInterval(() => void flush(), FLUSH_INTERVAL_MS);
}

export function stopAutoFlush(): void {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  if (buffer.length > 0) void flush();
}

async function flush(): Promise<void> {
  if (buffer.length === 0 && retryBuffer.length === 0) return;
  const eventsToSend = [...retryBuffer, ...buffer];
  buffer = [];
  retryBuffer = [];

  try {
    await apiPost('/api/events/batch', { events: eventsToSend });
  } catch {
    retryBuffer = eventsToSend.slice(-MAX_RETRY_BUFFER);
  }
}
