import { getDb } from '../database/index.js';
import type { Pipeline, PipelineCreate, PipelineUpdate, PipelineExecution, PipelineStep, PipelineStepResult } from '@claudeops/shared';

function parsePipeline(row: Record<string, unknown>): Pipeline {
  const pipeline = { ...row } as unknown as Pipeline;
  pipeline.steps = typeof row.steps === 'string' ? JSON.parse(row.steps as string) as PipelineStep[] : [];
  if (row.graph_data && typeof row.graph_data === 'string') {
    pipeline.graph_data = row.graph_data;
  }
  return pipeline;
}

function parseExecution(row: Record<string, unknown>): PipelineExecution {
  const execution = { ...row } as unknown as PipelineExecution;
  execution.results = typeof row.results === 'string' ? JSON.parse(row.results as string) as PipelineStepResult[] : [];
  return execution;
}

export function createPipeline(data: PipelineCreate): Pipeline {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO pipelines (name, description, epic_id, steps, graph_data, task_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    data.name,
    data.description ?? null,
    data.epic_id ?? null,
    JSON.stringify(data.steps),
    data.graph_data ?? null,
    data.task_id ?? null
  );
  return getPipeline(result.lastInsertRowid as number)!;
}

export function getPipeline(id: number): Pipeline | undefined {
  const db = getDb();
  const row = db.prepare('SELECT * FROM pipelines WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!row) return undefined;
  return parsePipeline(row);
}

export function listPipelines(options: { epic_id?: number; status?: string; page?: number; page_size?: number } = {}): { total: number; page: number; page_size: number; pages: number; items: Pipeline[] } {
  const db = getDb();
  const page = options.page ?? 1;
  const pageSize = options.page_size ?? 50;
  const offset = (page - 1) * pageSize;

  const conditions: string[] = [];
  const params: unknown[] = [];
  if (options.epic_id) { conditions.push('epic_id = ?'); params.push(options.epic_id); }
  if (options.status) { conditions.push('status = ?'); params.push(options.status); }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const total = (db.prepare(`SELECT COUNT(*) as count FROM pipelines ${whereClause}`).get(...params) as { count: number }).count;
  const rows = db.prepare(`SELECT * FROM pipelines ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...params, pageSize, offset) as Record<string, unknown>[];
  const items = rows.map(parsePipeline);

  return { total, page, page_size: pageSize, pages: Math.ceil(total / pageSize), items };
}

export function updatePipeline(id: number, data: PipelineUpdate): Pipeline | undefined {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM pipelines WHERE id = ?').get(id);
  if (!existing) return undefined;

  const fields: string[] = [];
  const values: unknown[] = [];

  const simpleFields = ['name', 'description', 'status', 'epic_id', 'graph_data'] as const;
  for (const field of simpleFields) {
    if ((data as Record<string, unknown>)[field] !== undefined) {
      fields.push(`${field} = ?`);
      values.push((data as Record<string, unknown>)[field]);
    }
  }

  if (data.steps !== undefined) {
    fields.push('steps = ?');
    values.push(JSON.stringify(data.steps));
  }

  if (fields.length > 0) {
    fields.push("updated_at = datetime('now')");
    values.push(id);
    db.prepare(`UPDATE pipelines SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }
  return getPipeline(id);
}

export function deletePipeline(id: number): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM pipelines WHERE id = ?').run(id);
  return result.changes > 0;
}

export function createExecution(pipelineId: number, totalSteps: number): PipelineExecution {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO pipeline_executions (pipeline_id, total_steps, results)
    VALUES (?, ?, ?)
  `);
  const result = stmt.run(pipelineId, totalSteps, JSON.stringify([]));
  return getExecution(result.lastInsertRowid as number)!;
}

export function updateExecution(id: number, data: { status?: string; current_step?: number; results?: PipelineStepResult[]; completed_at?: string }): PipelineExecution | undefined {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM pipeline_executions WHERE id = ?').get(id);
  if (!existing) return undefined;

  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }
  if (data.current_step !== undefined) { fields.push('current_step = ?'); values.push(data.current_step); }
  if (data.completed_at !== undefined) { fields.push('completed_at = ?'); values.push(data.completed_at); }
  if (data.results !== undefined) { fields.push('results = ?'); values.push(JSON.stringify(data.results)); }

  if (fields.length > 0) {
    values.push(id);
    db.prepare(`UPDATE pipeline_executions SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }
  return getExecution(id);
}

export function getExecution(id: number): PipelineExecution | undefined {
  const db = getDb();
  const row = db.prepare('SELECT * FROM pipeline_executions WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!row) return undefined;
  return parseExecution(row);
}

export function listExecutions(pipelineId: number): PipelineExecution[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM pipeline_executions WHERE pipeline_id = ? ORDER BY started_at DESC').all(pipelineId) as Record<string, unknown>[];
  return rows.map(parseExecution);
}
