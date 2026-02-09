import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { mkdirSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

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
  try {
    const schemaPath = join(__dirname, 'schema.sql');
    if (existsSync(schemaPath)) {
      const schema = readFileSync(schemaPath, 'utf-8');
      database.exec(schema);
      return;
    }
  } catch {
    // fallback to inline
  }

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
  `);

  // Add task_id column to agent_executions if not exists
  try {
    database.exec(`ALTER TABLE agent_executions ADD COLUMN task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL`);
  } catch {
    // column already exists
  }
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
