import { describe, it, expect, beforeEach, vi, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';

// Create in-memory DB before mocking
let memDb: Database.Database;

vi.mock('../database/index.js', () => ({
  getDb: () => memDb,
}));

import {
  createPipeline,
  getPipeline,
  listPipelines,
  updatePipeline,
  deletePipeline,
  createExecution,
  updateExecution,
  getExecution,
  listExecutions,
} from './pipeline.js';

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS pipelines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      epic_id INTEGER,
      steps TEXT NOT NULL,
      graph_data TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      task_id INTEGER,
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
  `);
}

describe('pipeline model', () => {
  beforeEach(() => {
    memDb = new Database(':memory:');
    memDb.pragma('foreign_keys = ON');
    initSchema(memDb);
  });

  const sampleSteps = [
    { step: 1, parallel: false, agents: [{ type: 'executor', model: 'sonnet' as const, prompt: 'Do the thing' }] },
  ];

  describe('createPipeline', () => {
    it('should create a pipeline and return it with an id', () => {
      const pipeline = createPipeline({ name: 'Test Pipeline', steps: sampleSteps });
      expect(pipeline.id).toBe(1);
      expect(pipeline.name).toBe('Test Pipeline');
      expect(pipeline.steps).toEqual(sampleSteps);
      expect(pipeline.status).toBe('draft');
      expect(pipeline.description).toBeNull();
      expect(pipeline.epic_id).toBeNull();
    });

    it('should create a pipeline with optional fields', () => {
      const pipeline = createPipeline({
        name: 'Full Pipeline',
        description: 'A full description',
        epic_id: 42,
        steps: sampleSteps,
        graph_data: '{"nodes":[]}',
      });
      expect(pipeline.description).toBe('A full description');
      expect(pipeline.epic_id).toBe(42);
      expect(pipeline.graph_data).toBe('{"nodes":[]}');
    });

    it('should auto-increment ids', () => {
      const p1 = createPipeline({ name: 'P1', steps: sampleSteps });
      const p2 = createPipeline({ name: 'P2', steps: sampleSteps });
      expect(p2.id).toBe(p1.id + 1);
    });
  });

  describe('getPipeline', () => {
    it('should return a pipeline by id', () => {
      const created = createPipeline({ name: 'Get Test', steps: sampleSteps });
      const fetched = getPipeline(created.id);
      expect(fetched).toBeDefined();
      expect(fetched!.name).toBe('Get Test');
      expect(fetched!.steps).toEqual(sampleSteps);
    });

    it('should return undefined for non-existent id', () => {
      const result = getPipeline(999);
      expect(result).toBeUndefined();
    });
  });

  describe('listPipelines', () => {
    it('should return empty list when no pipelines exist', () => {
      const result = listPipelines();
      expect(result.total).toBe(0);
      expect(result.items).toEqual([]);
      expect(result.page).toBe(1);
      expect(result.pages).toBe(0);
    });

    it('should return all pipelines', () => {
      createPipeline({ name: 'P1', steps: sampleSteps });
      createPipeline({ name: 'P2', steps: sampleSteps });
      createPipeline({ name: 'P3', steps: sampleSteps });

      const result = listPipelines();
      expect(result.total).toBe(3);
      expect(result.items).toHaveLength(3);
    });

    it('should filter by epic_id', () => {
      createPipeline({ name: 'P1', steps: sampleSteps, epic_id: 1 });
      createPipeline({ name: 'P2', steps: sampleSteps, epic_id: 2 });
      createPipeline({ name: 'P3', steps: sampleSteps, epic_id: 1 });

      const result = listPipelines({ epic_id: 1 });
      expect(result.total).toBe(2);
      expect(result.items.every((p) => p.epic_id === 1)).toBe(true);
    });

    it('should filter by status', () => {
      createPipeline({ name: 'P1', steps: sampleSteps });
      const p2 = createPipeline({ name: 'P2', steps: sampleSteps });
      updatePipeline(p2.id, { status: 'ready' });

      const result = listPipelines({ status: 'ready' });
      expect(result.total).toBe(1);
      expect(result.items[0].name).toBe('P2');
    });

    it('should paginate results', () => {
      for (let i = 0; i < 5; i++) {
        createPipeline({ name: `P${i}`, steps: sampleSteps });
      }

      const page1 = listPipelines({ page: 1, page_size: 2 });
      expect(page1.items).toHaveLength(2);
      expect(page1.total).toBe(5);
      expect(page1.pages).toBe(3);
      expect(page1.page).toBe(1);

      const page3 = listPipelines({ page: 3, page_size: 2 });
      expect(page3.items).toHaveLength(1);
    });
  });

  describe('updatePipeline', () => {
    it('should update name', () => {
      const p = createPipeline({ name: 'Original', steps: sampleSteps });
      const updated = updatePipeline(p.id, { name: 'Updated' });
      expect(updated).toBeDefined();
      expect(updated!.name).toBe('Updated');
    });

    it('should update multiple fields', () => {
      const p = createPipeline({ name: 'P', steps: sampleSteps });
      const newSteps = [
        { step: 1, parallel: true, agents: [{ type: 'analyst', model: 'haiku' as const, prompt: 'Analyze' }] },
      ];
      const updated = updatePipeline(p.id, {
        description: 'New description',
        status: 'ready',
        steps: newSteps,
      });
      expect(updated!.description).toBe('New description');
      expect(updated!.status).toBe('ready');
      expect(updated!.steps).toEqual(newSteps);
    });

    it('should return undefined for non-existent id', () => {
      const result = updatePipeline(999, { name: 'Nope' });
      expect(result).toBeUndefined();
    });

    it('should not change fields that are not specified', () => {
      const p = createPipeline({ name: 'Keep', description: 'Keep this', steps: sampleSteps });
      const updated = updatePipeline(p.id, { name: 'Changed' });
      expect(updated!.name).toBe('Changed');
      expect(updated!.description).toBe('Keep this');
    });
  });

  describe('deletePipeline', () => {
    it('should delete an existing pipeline', () => {
      const p = createPipeline({ name: 'Delete Me', steps: sampleSteps });
      const result = deletePipeline(p.id);
      expect(result).toBe(true);
      expect(getPipeline(p.id)).toBeUndefined();
    });

    it('should return false for non-existent id', () => {
      expect(deletePipeline(999)).toBe(false);
    });
  });

  describe('createExecution', () => {
    it('should create an execution for a pipeline', () => {
      const p = createPipeline({ name: 'Exec Pipeline', steps: sampleSteps });
      const exec = createExecution(p.id, 3);
      expect(exec.id).toBe(1);
      expect(exec.pipeline_id).toBe(p.id);
      expect(exec.status).toBe('running');
      expect(exec.current_step).toBe(0);
      expect(exec.total_steps).toBe(3);
      expect(exec.results).toEqual([]);
    });
  });

  describe('updateExecution', () => {
    it('should update execution status', () => {
      const p = createPipeline({ name: 'P', steps: sampleSteps });
      const exec = createExecution(p.id, 2);
      const updated = updateExecution(exec.id, { status: 'completed', current_step: 2 });
      expect(updated).toBeDefined();
      expect(updated!.status).toBe('completed');
      expect(updated!.current_step).toBe(2);
    });

    it('should update results', () => {
      const p = createPipeline({ name: 'P', steps: sampleSteps });
      const exec = createExecution(p.id, 1);
      const results = [{ step: 1, status: 'completed' as const, agents: [{ type: 'executor', status: 'completed' as const }] }];
      const updated = updateExecution(exec.id, { results });
      expect(updated!.results).toEqual(results);
    });

    it('should return undefined for non-existent id', () => {
      expect(updateExecution(999, { status: 'failed' })).toBeUndefined();
    });
  });

  describe('getExecution', () => {
    it('should return execution by id', () => {
      const p = createPipeline({ name: 'P', steps: sampleSteps });
      const exec = createExecution(p.id, 1);
      const fetched = getExecution(exec.id);
      expect(fetched).toBeDefined();
      expect(fetched!.id).toBe(exec.id);
    });

    it('should return undefined for non-existent id', () => {
      expect(getExecution(999)).toBeUndefined();
    });
  });

  describe('listExecutions', () => {
    it('should return executions for a pipeline', () => {
      const p = createPipeline({ name: 'P', steps: sampleSteps });
      createExecution(p.id, 1);
      createExecution(p.id, 2);

      const execs = listExecutions(p.id);
      expect(execs).toHaveLength(2);
      expect(execs.every((e) => e.pipeline_id === p.id)).toBe(true);
    });

    it('should return empty array for pipeline with no executions', () => {
      const p = createPipeline({ name: 'P', steps: sampleSteps });
      expect(listExecutions(p.id)).toEqual([]);
    });

    it('should not return executions from other pipelines', () => {
      const p1 = createPipeline({ name: 'P1', steps: sampleSteps });
      const p2 = createPipeline({ name: 'P2', steps: sampleSteps });
      createExecution(p1.id, 1);
      createExecution(p2.id, 1);

      const execs = listExecutions(p1.id);
      expect(execs).toHaveLength(1);
      expect(execs[0].pipeline_id).toBe(p1.id);
    });
  });
});
