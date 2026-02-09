import { broadcast } from '../routes/ws.js';

export class WebSocketManager {
  broadcast(channel: string, action: string, data: unknown): void {
    broadcast(channel, action, data);
  }

  notifySessionCreated(session: unknown): void {
    this.broadcast('session', 'created', session);
  }

  notifySessionUpdated(session: unknown): void {
    this.broadcast('session', 'updated', session);
  }

  notifyEventCreated(event: unknown): void {
    this.broadcast('event', 'created', event);
  }

  notifyAgentSpawned(agent: unknown): void {
    this.broadcast('agent', 'spawned', agent);
  }

  notifyAgentCompleted(agent: unknown): void {
    this.broadcast('agent', 'completed', agent);
  }

  notifyStatsUpdated(stats: unknown): void {
    this.broadcast('stats', 'updated', stats);
  }

  notifyBudgetAlert(alert: unknown): void {
    this.broadcast('alert', 'budget_warning', alert);
  }

  notifyTaskCreated(task: unknown): void {
    this.broadcast('task', 'created', task);
  }

  notifyTaskUpdated(task: unknown): void {
    this.broadcast('task', 'updated', task);
  }

  notifyTaskMoved(task: unknown): void {
    this.broadcast('task', 'moved', task);
  }

  notifyTaskDeleted(taskId: unknown): void {
    this.broadcast('task', 'deleted', { id: taskId });
  }
}

export const wsManager = new WebSocketManager();
