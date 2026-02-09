-- Core Tables
CREATE TABLE IF NOT EXISTS sessions (
    id          TEXT PRIMARY KEY,
    project_path TEXT,
    start_time  TEXT NOT NULL DEFAULT (datetime('now')),
    end_time    TEXT,
    status      TEXT NOT NULL DEFAULT 'active',
    summary     TEXT,
    token_input  INTEGER DEFAULT 0,
    token_output INTEGER DEFAULT 0,
    cost_usd    REAL DEFAULT 0.0,
    metadata    TEXT
);

CREATE TABLE IF NOT EXISTS events (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id  TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    event_type  TEXT NOT NULL,
    timestamp   TEXT NOT NULL DEFAULT (datetime('now')),
    payload     TEXT
);

CREATE TABLE IF NOT EXISTS agent_executions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id      TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    agent_type      TEXT NOT NULL,
    model           TEXT NOT NULL,
    task_description TEXT,
    start_time      TEXT NOT NULL DEFAULT (datetime('now')),
    end_time        TEXT,
    status          TEXT NOT NULL DEFAULT 'running',
    token_input     INTEGER DEFAULT 0,
    token_output    INTEGER DEFAULT 0,
    cost_usd        REAL DEFAULT 0.0,
    duration_ms     INTEGER
);

CREATE TABLE IF NOT EXISTS tool_calls (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id          TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    agent_execution_id  INTEGER REFERENCES agent_executions(id) ON DELETE SET NULL,
    tool_name           TEXT NOT NULL,
    parameters          TEXT,
    duration_ms         INTEGER,
    success             INTEGER NOT NULL DEFAULT 1,
    timestamp           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS file_changes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id  TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    file_path   TEXT NOT NULL,
    change_type TEXT NOT NULL,
    lines_added INTEGER DEFAULT 0,
    lines_removed INTEGER DEFAULT 0,
    timestamp   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS errors (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id  TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    error_type  TEXT NOT NULL,
    message     TEXT NOT NULL,
    stack_trace TEXT,
    tool_name   TEXT,
    resolved    INTEGER NOT NULL DEFAULT 0,
    timestamp   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS skill_invocations (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id  TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    skill_name  TEXT NOT NULL,
    trigger     TEXT NOT NULL,
    start_time  TEXT NOT NULL DEFAULT (datetime('now')),
    end_time    TEXT,
    status      TEXT NOT NULL DEFAULT 'running'
);

CREATE TABLE IF NOT EXISTS user_prompts (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id  TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    prompt_length INTEGER NOT NULL,
    token_count INTEGER,
    timestamp   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Analytics Tables
CREATE TABLE IF NOT EXISTS daily_stats (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    date            TEXT NOT NULL,
    session_count   INTEGER DEFAULT 0,
    event_count     INTEGER DEFAULT 0,
    agent_calls     INTEGER DEFAULT 0,
    tool_calls      INTEGER DEFAULT 0,
    token_input     INTEGER DEFAULT 0,
    token_output    INTEGER DEFAULT 0,
    cost_usd        REAL DEFAULT 0.0,
    errors          INTEGER DEFAULT 0,
    UNIQUE(date)
);

CREATE TABLE IF NOT EXISTS agent_usage_stats (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_type      TEXT NOT NULL,
    model           TEXT NOT NULL,
    date            TEXT NOT NULL,
    total_calls     INTEGER DEFAULT 0,
    avg_duration_ms REAL DEFAULT 0.0,
    success_count   INTEGER DEFAULT 0,
    failure_count   INTEGER DEFAULT 0,
    total_tokens    INTEGER DEFAULT 0,
    total_cost_usd  REAL DEFAULT 0.0,
    UNIQUE(agent_type, model, date)
);

CREATE TABLE IF NOT EXISTS tool_usage_stats (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    tool_name       TEXT NOT NULL,
    date            TEXT NOT NULL,
    call_count      INTEGER DEFAULT 0,
    avg_duration_ms REAL DEFAULT 0.0,
    success_count   INTEGER DEFAULT 0,
    failure_count   INTEGER DEFAULT 0,
    UNIQUE(tool_name, date)
);

-- Config Table
CREATE TABLE IF NOT EXISTS config (
    key         TEXT PRIMARY KEY,
    value       TEXT NOT NULL,
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Default pricing (USD per million tokens)
INSERT OR IGNORE INTO config (key, value) VALUES
    ('pricing.haiku.input', '0.80'),
    ('pricing.haiku.output', '4.00'),
    ('pricing.sonnet.input', '3.00'),
    ('pricing.sonnet.output', '15.00'),
    ('pricing.opus.input', '15.00'),
    ('pricing.opus.output', '75.00'),
    ('budget.daily_limit', '0'),
    ('budget.monthly_limit', '0');

-- Indexes
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
