export type WsChannel = 'session' | 'event' | 'agent' | 'stats' | 'alert' | 'task' | 'prd' | 'epic' | 'report' | 'github' | 'worktree' | 'context';
export type WsAction = 'created' | 'updated' | 'completed' | 'batch_created' | 'alert_triggered' | 'spawned' | 'moved' | 'deleted' | 'synced';

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
