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

  notifyPrdCreated(prd: unknown): void {
    this.broadcast('prd', 'created', prd);
  }

  notifyPrdUpdated(prd: unknown): void {
    this.broadcast('prd', 'updated', prd);
  }

  notifyPrdDeleted(prdId: unknown): void {
    this.broadcast('prd', 'deleted', { id: prdId });
  }

  notifyEpicCreated(epic: unknown): void {
    this.broadcast('epic', 'created', epic);
  }

  notifyEpicUpdated(epic: unknown): void {
    this.broadcast('epic', 'updated', epic);
  }

  notifyEpicDeleted(epicId: unknown): void {
    this.broadcast('epic', 'deleted', { id: epicId });
  }

  notifyReportCreated(report: unknown): void {
    this.broadcast('report', 'created', report);
  }

  notifyGitHubConfigUpdated(config: unknown): void {
    this.broadcast('github', 'config_updated', config);
  }

  notifyGitHubSynced(data: unknown): void {
    this.broadcast('github', 'synced', data);
  }

  notifyWorktreeCreated(worktree: unknown): void {
    this.broadcast('worktree', 'created', worktree);
  }

  notifyWorktreeUpdated(worktree: unknown): void {
    this.broadcast('worktree', 'updated', worktree);
  }

  notifyWorktreeDeleted(id: unknown): void {
    this.broadcast('worktree', 'deleted', { id });
  }

  notifyContextUpdated(context: unknown): void {
    this.broadcast('context', 'updated', context);
  }

  notifyContextDeleted(id: unknown): void {
    this.broadcast('context', 'deleted', { id });
  }
}

export const wsManager = new WebSocketManager();
