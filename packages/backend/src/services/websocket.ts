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

  notifyTeamCreated(team: unknown): void {
    this.broadcast('team', 'created', team);
  }

  notifyTeamUpdated(team: unknown): void {
    this.broadcast('team', 'updated', team);
  }

  notifyTeamDeleted(id: unknown): void {
    this.broadcast('team', 'deleted', { id });
  }

  notifyMemberAdded(member: unknown): void {
    this.broadcast('member', 'added', member);
  }

  notifyMemberUpdated(member: unknown): void {
    this.broadcast('member', 'updated', member);
  }

  notifyMemberRemoved(id: unknown): void {
    this.broadcast('member', 'removed', { id });
  }

  notifyTaskAssigned(data: unknown): void {
    this.broadcast('task', 'assigned', data);
  }

  notifyPipelineCreated(pipeline: unknown): void {
    this.broadcast('pipeline', 'created', pipeline);
  }

  notifyPipelineUpdated(pipeline: unknown): void {
    this.broadcast('pipeline', 'updated', pipeline);
  }

  notifyPipelineDeleted(id: unknown): void {
    this.broadcast('pipeline', 'deleted', { id });
  }

  notifyPipelineExecutionStarted(execution: unknown): void {
    this.broadcast('pipeline', 'execution_started', execution);
  }

  notifyPipelineExecutionProgress(execution: unknown): void {
    this.broadcast('pipeline', 'execution_progress', execution);
  }

  notifyPipelineExecutionCompleted(execution: unknown): void {
    this.broadcast('pipeline', 'execution_completed', execution);
  }

  notifyPipelineExecutionFailed(execution: unknown): void {
    this.broadcast('pipeline', 'execution_failed', execution);
  }

  notifyTaskExecutionStarted(data: unknown): void {
    this.broadcast('task', 'execution_started', data);
  }

  notifyTaskExecutionCompleted(data: unknown): void {
    this.broadcast('task', 'execution_completed', data);
  }

  notifyTaskExecutionFailed(data: unknown): void {
    this.broadcast('task', 'execution_failed', data);
  }

  notifyDesignStarted(data: unknown): void {
    this.broadcast('task', 'design_started', data);
  }

  notifyDesignProgress(data: unknown): void {
    this.broadcast('task', 'design_progress', data);
  }

  notifyDesignCompleted(data: unknown): void {
    this.broadcast('task', 'design_completed', data);
  }

  notifyDesignFailed(data: unknown): void {
    this.broadcast('task', 'design_failed', data);
  }

  notifyImplementationProgress(data: unknown): void {
    this.broadcast('task', 'implementation_progress', data);
  }

  notifyImplementationStepCompleted(data: unknown): void {
    this.broadcast('task', 'implementation_step_completed', data);
  }

  notifyVerificationStarted(data: unknown): void {
    this.broadcast('task', 'verification_started', data);
  }

  notifyVerificationProgress(data: unknown): void {
    this.broadcast('task', 'verification_progress', data);
  }

  notifyVerificationCompleted(data: unknown): void {
    this.broadcast('task', 'verification_completed', data);
  }

  notifyVerificationFailed(data: unknown): void {
    this.broadcast('task', 'verification_failed', data);
  }

  notifyTaskStreamChunk(data: unknown): void {
    this.broadcast('task', 'stream_chunk', data);
  }

  notifyTaskExecutionCancelled(data: unknown): void {
    this.broadcast('task', 'execution_cancelled', data);
  }

  notifyCommitsScanned(data: unknown): void {
    this.broadcast('task', 'commits_scanned', data);
  }

  notifyScopeSplitProposed(data: unknown): void {
    this.broadcast('task', 'scope_split_proposed', data);
  }

  notifyScopeSplitCompleted(data: unknown): void {
    this.broadcast('task', 'scope_split_completed', data);
  }
}

export const wsManager = new WebSocketManager();
