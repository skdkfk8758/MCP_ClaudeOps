export type ContextType = 'brief' | 'tech' | 'architecture' | 'rules';

export interface ProjectContext {
  id: number;
  project_path: string;
  context_type: ContextType;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectContextSet {
  project_path: string;
  context_type: ContextType;
  title: string;
  content: string;
}

export interface ProjectContextQuery {
  project_path: string;
  context_type?: ContextType;
}
