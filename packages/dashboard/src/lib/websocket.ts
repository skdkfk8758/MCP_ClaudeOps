import { WS_URL } from './constants';

type MessageHandler = (data: unknown) => void;

class WsClient {
  private ws: WebSocket | null = null;
  private handlers = new Map<string, Set<MessageHandler>>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  connect(): void {
    if (typeof window === 'undefined') return;
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.ws = new WebSocket(WS_URL);

    this.ws.onopen = () => {
      this.ws?.send(JSON.stringify({ type: 'subscribe', channels: ['session', 'event', 'agent', 'stats', 'alert', 'task'] }));
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string);
        const handlers = this.handlers.get(msg.type);
        if (handlers) {
          for (const handler of handlers) handler(msg.data);
        }
      } catch { /* ignore */ }
    };

    this.ws.onclose = () => {
      this.reconnectTimer = setTimeout(() => this.connect(), 3000);
    };
  }

  disconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }

  on(channel: string, handler: MessageHandler): () => void {
    if (!this.handlers.has(channel)) this.handlers.set(channel, new Set());
    this.handlers.get(channel)!.add(handler);
    return () => { this.handlers.get(channel)?.delete(handler); };
  }
}

export const wsClient = new WsClient();
