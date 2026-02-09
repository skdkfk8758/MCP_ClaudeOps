export type SessionStatus = 'active' | 'completed' | 'interrupted';

export interface Session {
  id: string;
  project_path: string | null;
  start_time: string;
  end_time: string | null;
  status: SessionStatus;
  summary: string | null;
  token_input: number;
  token_output: number;
  cost_usd: number;
  metadata: string | null;
}

export interface SessionCreate {
  id: string;
  project_path?: string;
}

export interface SessionUpdate {
  end_time?: string;
  status?: SessionStatus;
  summary?: string;
  token_input?: number;
  token_output?: number;
  cost_usd?: number;
}
