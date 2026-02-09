import type { FastifyInstance } from 'fastify';
import type { WebSocket } from '@fastify/websocket';

interface WsClient {
  socket: WebSocket;
  channels: Set<string>;
}

const clients = new Map<string, WsClient>();
let clientIdCounter = 0;

export async function registerWsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/ws', { websocket: true }, (socket) => {
    const clientId = String(++clientIdCounter);
    clients.set(clientId, { socket, channels: new Set(['session', 'event', 'agent', 'stats', 'alert', 'task']) });

    socket.on('message', (raw: Buffer) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'subscribe' && Array.isArray(msg.channels)) {
          const client = clients.get(clientId);
          if (client) {
            client.channels = new Set(msg.channels);
          }
        }
        if (msg.type === 'ping') {
          socket.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
        }
      } catch { /* ignore */ }
    });

    socket.on('close', () => {
      clients.delete(clientId);
    });
  });
}

export function broadcast(channel: string, action: string, data: unknown): void {
  const message = JSON.stringify({ type: channel, action, data, timestamp: new Date().toISOString() });
  for (const client of clients.values()) {
    if (client.channels.has(channel) && client.socket.readyState === 1) {
      try { client.socket.send(message); } catch { /* ignore */ }
    }
  }
}
