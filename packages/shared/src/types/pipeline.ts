export type AgentTier = 'haiku' | 'sonnet' | 'opus';

export interface AgentDefinition {
  id: string;
  label: string;
  category: string;
  defaultModel: AgentTier;
  color: string;
  description: string;
}

export interface PipelineNodeData {
  agentType: string;
  label: string;
  model: AgentTier;
  prompt: string;
  category: string;
  color: string;
  task_id?: number;
}

export interface PipelineStep {
  step: number;
  parallel: boolean;
  agents: {
    type: string;
    model: AgentTier;
    prompt: string;
    task_id?: number;
  }[];
}

export type PipelineStatus = 'draft' | 'ready' | 'running' | 'completed' | 'failed';

export interface Pipeline {
  id: number;
  name: string;
  description: string | null;
  epic_id: number | null;
  steps: PipelineStep[];
  graph_data: string | null;
  status: PipelineStatus;
  created_at: string;
  updated_at: string;
  task_id: number | null;
}

export interface PipelineCreate {
  name: string;
  description?: string;
  epic_id?: number;
  steps: PipelineStep[];
  graph_data?: string;
  task_id?: number;
}

export interface PipelineUpdate {
  name?: string;
  description?: string;
  epic_id?: number | null;
  steps?: PipelineStep[];
  graph_data?: string;
  status?: PipelineStatus;
}

export type ExecutionStatus = 'running' | 'completed' | 'failed' | 'cancelled';
export type StepStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface PipelineStepResult {
  step: number;
  status: StepStatus;
  agents: {
    type: string;
    status: StepStatus;
    session_id?: string;
    started_at?: string;
    completed_at?: string;
    error?: string;
  }[];
}

export interface PipelineExecution {
  id: number;
  pipeline_id: number;
  status: ExecutionStatus;
  current_step: number;
  total_steps: number;
  started_at: string;
  completed_at: string | null;
  results: PipelineStepResult[];
}

export interface PipelineExecuteRequest {
  project_path: string;
  simulate?: boolean;
}

export interface PipelinePreset {
  id: string;
  name: string;
  description: string;
  category: string;
  steps: PipelineStep[];
  graph_data?: string;
}
