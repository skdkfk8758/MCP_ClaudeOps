import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { mkdirSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { seedPresetPersonas } from '../data/team-templates.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let db: Database.Database | null = null;

export function getDbPath(): string {
  const dataDir = process.env.CLAUDEOPS_DATA_DIR || join(homedir(), '.claudeops');
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }
  return process.env.CLAUDEOPS_DB_PATH || join(dataDir, 'claudeops.db');
}

export function getDb(): Database.Database {
  if (!db) {
    const dbPath = getDbPath();
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.pragma('busy_timeout = 5000');
    initializeSchema(db);
  }
  return db;
}

function initializeSchema(database: Database.Database): void {
  // Try to read schema.sql relative to this file
  // In production (dist/), it will be at a different location
  // So we inline the critical CREATE TABLE statements as a fallback
  let schemaLoaded = false;
  try {
    const schemaPath = join(__dirname, 'schema.sql');
    if (existsSync(schemaPath)) {
      const schema = readFileSync(schemaPath, 'utf-8');
      database.exec(schema);
      schemaLoaded = true;
    }
  } catch {
    // fallback to inline
  }

  if (!schemaLoaded) {

  // Inline schema as fallback
  database.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY, project_path TEXT, start_time TEXT NOT NULL DEFAULT (datetime('now')),
      end_time TEXT, status TEXT NOT NULL DEFAULT 'active', summary TEXT,
      token_input INTEGER DEFAULT 0, token_output INTEGER DEFAULT 0,
      cost_usd REAL DEFAULT 0.0, metadata TEXT
    );
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT, session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL, timestamp TEXT NOT NULL DEFAULT (datetime('now')), payload TEXT
    );
    CREATE TABLE IF NOT EXISTS agent_executions (
      id INTEGER PRIMARY KEY AUTOINCREMENT, session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      agent_type TEXT NOT NULL, model TEXT NOT NULL, task_description TEXT,
      start_time TEXT NOT NULL DEFAULT (datetime('now')), end_time TEXT,
      status TEXT NOT NULL DEFAULT 'running', token_input INTEGER DEFAULT 0,
      token_output INTEGER DEFAULT 0, cost_usd REAL DEFAULT 0.0, duration_ms INTEGER
    );
    CREATE TABLE IF NOT EXISTS tool_calls (
      id INTEGER PRIMARY KEY AUTOINCREMENT, session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      agent_execution_id INTEGER REFERENCES agent_executions(id) ON DELETE SET NULL,
      tool_name TEXT NOT NULL, parameters TEXT, duration_ms INTEGER,
      success INTEGER NOT NULL DEFAULT 1, timestamp TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS file_changes (
      id INTEGER PRIMARY KEY AUTOINCREMENT, session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      file_path TEXT NOT NULL, change_type TEXT NOT NULL, lines_added INTEGER DEFAULT 0,
      lines_removed INTEGER DEFAULT 0, timestamp TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS errors (
      id INTEGER PRIMARY KEY AUTOINCREMENT, session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      error_type TEXT NOT NULL, message TEXT NOT NULL, stack_trace TEXT, tool_name TEXT,
      resolved INTEGER NOT NULL DEFAULT 0, timestamp TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS skill_invocations (
      id INTEGER PRIMARY KEY AUTOINCREMENT, session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      skill_name TEXT NOT NULL, trigger TEXT NOT NULL,
      start_time TEXT NOT NULL DEFAULT (datetime('now')), end_time TEXT,
      status TEXT NOT NULL DEFAULT 'running'
    );
    CREATE TABLE IF NOT EXISTS user_prompts (
      id INTEGER PRIMARY KEY AUTOINCREMENT, session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      prompt_length INTEGER NOT NULL, token_count INTEGER,
      timestamp TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS daily_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL,
      session_count INTEGER DEFAULT 0, event_count INTEGER DEFAULT 0,
      agent_calls INTEGER DEFAULT 0, tool_calls INTEGER DEFAULT 0,
      token_input INTEGER DEFAULT 0, token_output INTEGER DEFAULT 0,
      cost_usd REAL DEFAULT 0.0, errors INTEGER DEFAULT 0, UNIQUE(date)
    );
    CREATE TABLE IF NOT EXISTS agent_usage_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT, agent_type TEXT NOT NULL, model TEXT NOT NULL,
      date TEXT NOT NULL, total_calls INTEGER DEFAULT 0, avg_duration_ms REAL DEFAULT 0.0,
      success_count INTEGER DEFAULT 0, failure_count INTEGER DEFAULT 0,
      total_tokens INTEGER DEFAULT 0, total_cost_usd REAL DEFAULT 0.0,
      UNIQUE(agent_type, model, date)
    );
    CREATE TABLE IF NOT EXISTS tool_usage_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT, tool_name TEXT NOT NULL, date TEXT NOT NULL,
      call_count INTEGER DEFAULT 0, avg_duration_ms REAL DEFAULT 0.0,
      success_count INTEGER DEFAULT 0, failure_count INTEGER DEFAULT 0,
      UNIQUE(tool_name, date)
    );
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY, value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    INSERT OR IGNORE INTO config (key, value) VALUES
      ('pricing.haiku.input', '0.80'), ('pricing.haiku.output', '4.00'),
      ('pricing.sonnet.input', '3.00'), ('pricing.sonnet.output', '15.00'),
      ('pricing.opus.input', '15.00'), ('pricing.opus.output', '75.00'),
      ('budget.daily_limit', '0'), ('budget.monthly_limit', '0');
    CREATE INDEX IF NOT EXISTS idx_events_session_id ON events(session_id);
    CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
    CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
    CREATE INDEX IF NOT EXISTS idx_agent_executions_session ON agent_executions(session_id);
    CREATE INDEX IF NOT EXISTS idx_agent_executions_type ON agent_executions(agent_type);
    CREATE INDEX IF NOT EXISTS idx_tool_calls_session ON tool_calls(session_id);
    CREATE INDEX IF NOT EXISTS idx_tool_calls_name ON tool_calls(tool_name);
    CREATE INDEX IF NOT EXISTS idx_file_changes_session ON file_changes(session_id);
    CREATE INDEX IF NOT EXISTS idx_errors_session ON errors(session_id);
    CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats(date);
    CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
    CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON sessions(start_time);
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'backlog',
      priority TEXT NOT NULL DEFAULT 'P2',
      assignee TEXT,
      due_date TEXT,
      estimated_effort TEXT,
      position INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT
    );
    CREATE TABLE IF NOT EXISTS task_labels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      UNIQUE(task_id, label)
    );
    CREATE TABLE IF NOT EXISTS task_dependencies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      blocks_task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      UNIQUE(task_id, blocks_task_id)
    );
    CREATE TABLE IF NOT EXISTS task_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      field_name TEXT NOT NULL,
      old_value TEXT,
      new_value TEXT,
      changed_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS task_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      linked_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(task_id, session_id)
    );
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
    CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee);
    CREATE INDEX IF NOT EXISTS idx_task_labels_task ON task_labels(task_id);
    CREATE INDEX IF NOT EXISTS idx_task_history_task ON task_history(task_id);
    CREATE INDEX IF NOT EXISTS idx_task_sessions_task ON task_sessions(task_id);

    CREATE TABLE IF NOT EXISTS prds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'backlog',
      vision TEXT,
      user_stories TEXT,
      success_criteria TEXT,
      constraints TEXT,
      out_of_scope TEXT,
      project_path TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS epics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prd_id INTEGER REFERENCES prds(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'backlog',
      progress INTEGER NOT NULL DEFAULT 0,
      architecture_notes TEXT,
      tech_approach TEXT,
      estimated_effort TEXT,
      github_issue_url TEXT,
      github_issue_number INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS session_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      report_type TEXT NOT NULL DEFAULT 'session',
      content TEXT NOT NULL,
      tools_used TEXT,
      files_changed TEXT,
      token_summary TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(session_id, report_type)
    );

    CREATE INDEX IF NOT EXISTS idx_epics_prd ON epics(prd_id);
    CREATE INDEX IF NOT EXISTS idx_epics_status ON epics(status);
    CREATE INDEX IF NOT EXISTS idx_reports_session ON session_reports(session_id);

    CREATE TABLE IF NOT EXISTS github_config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      repo_owner TEXT,
      repo_name TEXT,
      enabled INTEGER NOT NULL DEFAULT 0,
      auto_sync INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    INSERT OR IGNORE INTO github_config (id) VALUES (1);

    CREATE TABLE IF NOT EXISTS github_sync_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL,
      entity_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      github_url TEXT,
      synced_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_github_sync_entity ON github_sync_log(entity_type, entity_id);

    CREATE TABLE IF NOT EXISTS worktrees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      epic_id INTEGER REFERENCES epics(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      path TEXT NOT NULL,
      branch TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      merged_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_worktrees_epic ON worktrees(epic_id);
    CREATE INDEX IF NOT EXISTS idx_worktrees_status ON worktrees(status);

    CREATE TABLE IF NOT EXISTS agent_personas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_type TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      model TEXT NOT NULL DEFAULT 'sonnet',
      category TEXT NOT NULL DEFAULT 'custom',
      description TEXT,
      system_prompt TEXT,
      capabilities TEXT,
      tool_access TEXT,
      source TEXT NOT NULL DEFAULT 'custom',
      color TEXT DEFAULT '#6b7280',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      avatar_color TEXT DEFAULT '#6366f1',
      status TEXT NOT NULL DEFAULT 'active',
      default_pipeline_id INTEGER,
      template_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS team_agents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      persona_id INTEGER NOT NULL REFERENCES agent_personas(id) ON DELETE CASCADE,
      instance_label TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL DEFAULT 'worker',
      context_prompt TEXT,
      max_concurrent INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(team_id, persona_id, instance_label)
    );

    CREATE TABLE IF NOT EXISTS task_team_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      auto_execute INTEGER NOT NULL DEFAULT 0,
      assigned_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(task_id, team_id)
    );

    CREATE INDEX IF NOT EXISTS idx_personas_type ON agent_personas(agent_type);
    CREATE INDEX IF NOT EXISTS idx_personas_source ON agent_personas(source);
    CREATE INDEX IF NOT EXISTS idx_personas_category ON agent_personas(category);
    CREATE INDEX IF NOT EXISTS idx_team_agents_team ON team_agents(team_id);
    CREATE INDEX IF NOT EXISTS idx_team_agents_persona ON team_agents(persona_id);
    CREATE INDEX IF NOT EXISTS idx_task_team_assign_task ON task_team_assignments(task_id);
    CREATE INDEX IF NOT EXISTS idx_task_team_assign_team ON task_team_assignments(team_id);

    CREATE TABLE IF NOT EXISTS project_contexts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_path TEXT NOT NULL,
      context_type TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(project_path, context_type)
    );
    CREATE INDEX IF NOT EXISTS idx_contexts_project ON project_contexts(project_path);
  `);
  } // end if (!schemaLoaded)

  // Migrations: run regardless of schema source
  // Add task_id column to agent_executions if not exists
  try {
    database.exec(`ALTER TABLE agent_executions ADD COLUMN task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL`);
  } catch {
    // column already exists
  }

  // Add epic_id column to tasks if not exists
  try {
    database.exec(`ALTER TABLE tasks ADD COLUMN epic_id INTEGER REFERENCES epics(id) ON DELETE SET NULL`);
  } catch {
    // column already exists
  }
  try {
    database.exec(`CREATE INDEX IF NOT EXISTS idx_tasks_epic ON tasks(epic_id)`);
  } catch {
    // index already exists
  }

  // Add GitHub columns to tasks
  try {
    database.exec(`ALTER TABLE tasks ADD COLUMN github_issue_url TEXT`);
  } catch {
    // column already exists
  }
  try {
    database.exec(`ALTER TABLE tasks ADD COLUMN github_issue_number INTEGER`);
  } catch {
    // column already exists
  }

  // Add GitHub columns to prds
  try {
    database.exec(`ALTER TABLE prds ADD COLUMN github_issue_url TEXT`);
  } catch {
    // column already exists
  }
  try {
    database.exec(`ALTER TABLE prds ADD COLUMN github_issue_number INTEGER`);
  } catch {
    // column already exists
  }

  // Phase 1: Migrate in_progress → implementation (one-time)
  const migrationDone = database.prepare("SELECT value FROM config WHERE key = 'migration.status_v2'").get() as { value: string } | undefined;
  if (!migrationDone) {
    database.exec(`UPDATE tasks SET status = 'implementation' WHERE status = 'in_progress'`);
    database.exec(`UPDATE task_history SET old_value = 'implementation' WHERE field_name = 'status' AND old_value = 'in_progress'`);
    database.exec(`UPDATE task_history SET new_value = 'implementation' WHERE field_name = 'status' AND new_value = 'in_progress'`);
    database.exec(`INSERT OR REPLACE INTO config (key, value) VALUES ('migration.status_v2', '1')`);
  }

  // Phase 3: PRD-level GitHub config table
  database.exec(`
    CREATE TABLE IF NOT EXISTS prd_github_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prd_id INTEGER NOT NULL UNIQUE REFERENCES prds(id) ON DELETE CASCADE,
      repo_owner TEXT NOT NULL,
      repo_name TEXT NOT NULL,
      default_branch TEXT NOT NULL DEFAULT 'main',
      enabled INTEGER NOT NULL DEFAULT 1,
      auto_sync INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Phase 3: branch_name columns on epics and tasks
  try {
    database.exec(`ALTER TABLE epics ADD COLUMN branch_name TEXT`);
  } catch {
    // column already exists
  }
  try {
    database.exec(`ALTER TABLE tasks ADD COLUMN branch_name TEXT`);
  } catch {
    // column already exists
  }

  // Phase 5: Pipeline tables
  database.exec(`
    CREATE TABLE IF NOT EXISTS pipelines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      epic_id INTEGER REFERENCES epics(id) ON DELETE SET NULL,
      steps TEXT NOT NULL,
      graph_data TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS pipeline_executions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pipeline_id INTEGER NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'running',
      current_step INTEGER NOT NULL DEFAULT 0,
      total_steps INTEGER NOT NULL,
      results TEXT,
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_pipelines_epic ON pipelines(epic_id);
    CREATE INDEX IF NOT EXISTS idx_pipelines_status ON pipelines(status);
    CREATE INDEX IF NOT EXISTS idx_pipeline_executions_pipeline ON pipeline_executions(pipeline_id);
    CREATE INDEX IF NOT EXISTS idx_pipeline_executions_status ON pipeline_executions(status);
  `);

  // Phase 4: Task execution columns
  try {
    database.exec(`ALTER TABLE tasks ADD COLUMN execution_status TEXT`);
  } catch {
    // column already exists
  }
  try {
    database.exec(`ALTER TABLE tasks ADD COLUMN last_execution_at TEXT`);
  } catch {
    // column already exists
  }
  try {
    database.exec(`ALTER TABLE tasks ADD COLUMN execution_session_id TEXT`);
  } catch {
    // column already exists
  }

  // Phase 6: Task workflow columns
  try {
    database.exec(`ALTER TABLE tasks ADD COLUMN work_prompt TEXT`);
  } catch {
    // column already exists
  }
  try {
    database.exec(`ALTER TABLE tasks ADD COLUMN design_result TEXT`);
  } catch {
    // column already exists
  }
  try {
    database.exec(`ALTER TABLE tasks ADD COLUMN design_status TEXT`);
  } catch {
    // column already exists
  }
  try {
    database.exec(`ALTER TABLE tasks ADD COLUMN pipeline_id INTEGER REFERENCES pipelines(id) ON DELETE SET NULL`);
  } catch {
    // column already exists
  }

  // Verification columns on tasks
  try {
    database.exec(`ALTER TABLE tasks ADD COLUMN verification_result TEXT`);
  } catch {
    // column already exists
  }
  try {
    database.exec(`ALTER TABLE tasks ADD COLUMN verification_status TEXT`);
  } catch {
    // column already exists
  }

  // Commit tracking table
  database.exec(`
    CREATE TABLE IF NOT EXISTS task_commits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      commit_hash TEXT NOT NULL,
      commit_message TEXT NOT NULL,
      author TEXT,
      committed_at TEXT,
      files_changed INTEGER DEFAULT 0,
      insertions INTEGER DEFAULT 0,
      deletions INTEGER DEFAULT 0,
      branch_name TEXT,
      tracked_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(task_id, commit_hash)
    );
    CREATE INDEX IF NOT EXISTS idx_task_commits_task ON task_commits(task_id);
    CREATE INDEX IF NOT EXISTS idx_task_commits_hash ON task_commits(commit_hash);
  `);

  // Pipeline reverse reference to task
  try {
    database.exec(`ALTER TABLE pipelines ADD COLUMN task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL`);
  } catch {
    // column already exists
  }

  // Task execution logs table
  database.exec(`
    CREATE TABLE IF NOT EXISTS task_execution_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      execution_id INTEGER REFERENCES pipeline_executions(id),
      phase TEXT NOT NULL,
      step_number INTEGER,
      agent_type TEXT,
      model TEXT,
      input_prompt TEXT,
      output_summary TEXT,
      status TEXT NOT NULL DEFAULT 'running',
      duration_ms INTEGER,
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT,
      error TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_task_exec_logs_task ON task_execution_logs(task_id);
    CREATE INDEX IF NOT EXISTS idx_task_exec_logs_phase ON task_execution_logs(phase);
  `);

  // Phase 7: project_path column on prds
  try {
    database.exec(`ALTER TABLE prds ADD COLUMN project_path TEXT`);
  } catch {
    // column already exists
  }

  // Phase 8: Epic sessions table
  database.exec(`
    CREATE TABLE IF NOT EXISTS epic_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      epic_id INTEGER NOT NULL REFERENCES epics(id) ON DELETE CASCADE,
      session_id TEXT NOT NULL,
      task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
      linked_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(epic_id, session_id)
    );
    CREATE INDEX IF NOT EXISTS idx_epic_sessions_epic ON epic_sessions(epic_id);
    CREATE INDEX IF NOT EXISTS idx_epic_sessions_session ON epic_sessions(session_id);
  `);

  // Phase 9: 팀 관리 에이전트 페르소나 마이그레이션
  const teamMigrationDone = database.prepare("SELECT value FROM config WHERE key = 'migration.team_persona_v1'").get() as { value: string } | undefined;
  if (!teamMigrationDone) {
    // 기존 테이블 제거 (Clean Break)
    database.exec(`DROP TABLE IF EXISTS task_assignees`);
    database.exec(`DROP TABLE IF EXISTS team_members`);
    // teams 테이블에 새 컬럼 추가 (ALTER TABLE은 안전)
    try {
      database.exec(`ALTER TABLE teams ADD COLUMN status TEXT NOT NULL DEFAULT 'active'`);
    } catch {
      // 이미 존재
    }
    try {
      database.exec(`ALTER TABLE teams ADD COLUMN default_pipeline_id INTEGER REFERENCES pipelines(id) ON DELETE SET NULL`);
    } catch {
      // 이미 존재
    }
    try {
      database.exec(`ALTER TABLE teams ADD COLUMN template_id TEXT`);
    } catch {
      // 이미 존재
    }

    // 새 테이블 생성
    database.exec(`
      CREATE TABLE IF NOT EXISTS agent_personas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_type TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        model TEXT NOT NULL DEFAULT 'sonnet',
        category TEXT NOT NULL DEFAULT 'custom',
        description TEXT,
        system_prompt TEXT,
        capabilities TEXT,
        tool_access TEXT,
        source TEXT NOT NULL DEFAULT 'custom',
        color TEXT DEFAULT '#6b7280',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS team_agents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        persona_id INTEGER NOT NULL REFERENCES agent_personas(id) ON DELETE CASCADE,
        instance_label TEXT NOT NULL DEFAULT '',
        role TEXT NOT NULL DEFAULT 'worker',
        context_prompt TEXT,
        max_concurrent INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(team_id, persona_id, instance_label)
      );
      CREATE TABLE IF NOT EXISTS task_team_assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        auto_execute INTEGER NOT NULL DEFAULT 0,
        assigned_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(task_id, team_id)
      );
      CREATE INDEX IF NOT EXISTS idx_personas_type ON agent_personas(agent_type);
      CREATE INDEX IF NOT EXISTS idx_personas_source ON agent_personas(source);
      CREATE INDEX IF NOT EXISTS idx_personas_category ON agent_personas(category);
      CREATE INDEX IF NOT EXISTS idx_team_agents_team ON team_agents(team_id);
      CREATE INDEX IF NOT EXISTS idx_team_agents_persona ON team_agents(persona_id);
      CREATE INDEX IF NOT EXISTS idx_task_team_assign_task ON task_team_assignments(task_id);
      CREATE INDEX IF NOT EXISTS idx_task_team_assign_team ON task_team_assignments(team_id);
    `);

    database.exec(`INSERT OR REPLACE INTO config (key, value) VALUES ('migration.team_persona_v1', '1')`);
  }

  // 프리셋 페르소나 시드 (team-templates.ts에서 임포트) - 항상 실행 (INSERT OR IGNORE)
  seedPresetPersonas(database);
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
