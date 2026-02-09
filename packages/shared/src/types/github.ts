export interface GitHubConfig {
  id: number;
  repo_owner: string | null;
  repo_name: string | null;
  enabled: boolean;
  auto_sync: boolean;
  updated_at: string;
}

export interface GitHubConfigUpdate {
  repo_owner?: string;
  repo_name?: string;
  enabled?: boolean;
  auto_sync?: boolean;
}

export type GitHubSyncAction = 'created' | 'updated' | 'commented' | 'closed';
export type GitHubEntityType = 'prd' | 'epic' | 'task';

export interface GitHubSyncLog {
  id: number;
  entity_type: GitHubEntityType;
  entity_id: number;
  action: GitHubSyncAction;
  github_url: string | null;
  synced_at: string;
}
