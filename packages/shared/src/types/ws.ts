export type WsChannel = 'session' | 'event' | 'agent' | 'stats' | 'alert' | 'task' | 'prd' | 'epic' | 'report' | 'github' | 'worktree' | 'context' | 'team' | 'persona' | 'pipeline';
export type WsAction = 'created' | 'updated' | 'completed' | 'batch_created' | 'alert_triggered' | 'spawned' | 'moved' | 'deleted' | 'synced' | 'assigned' | 'unassigned' | 'archived' | 'activated' | 'agent_added' | 'agent_removed' | 'team_assigned' | 'team_unassigned' | 'execution_started' | 'execution_progress' | 'execution_completed' | 'execution_failed';

export interface WsMessage {
  type: WsChannel;
  action: WsAction;
  data: Record<string, unknown>;
  timestamp: string;
}

export interface WsClientMessage {
  type: 'subscribe' | 'ping';
  channels?: WsChannel[];
}
