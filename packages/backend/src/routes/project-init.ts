import type { FastifyInstance } from 'fastify';
import type { ProjectInitConfig, ProjectInitResult } from '@claudeops/shared';
import { getDb } from '../database/index.js';
import { createTeam, addMember } from '../models/team.js';
import { createPrd, updatePrd } from '../models/prd.js';
import { createEpic, updateEpic } from '../models/epic.js';
import { createTask } from '../models/task.js';
import { wsManager } from '../services/websocket.js';

export async function registerProjectInitRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/projects/init', async (request, reply) => {
    const config = request.body as ProjectInitConfig;

    if (!config || (!config.team && !config.prd && !config.epics)) {
      return reply.status(400).send({
        error: 'bad_request',
        message: 'At least one of team, prd, or epics is required',
      });
    }

    const db = getDb();
    const result: ProjectInitResult = { epics: [], total_tasks: 0 };

    const tx = db.transaction(() => {
      // 1. Team + Members
      if (config.team) {
        if (!config.team.name) throw new Error('team.name is required');
        const team = createTeam({
          name: config.team.name,
          description: config.team.description,
          avatar_color: config.team.avatar_color,
        });
        result.team = { id: team.id, name: team.name, member_count: 0 };

        if (config.team.members) {
          for (const m of config.team.members) {
            addMember({
              team_id: team.id,
              name: m.name,
              role: m.role,
              email: m.email,
              specialties: m.specialties,
            });
            result.team.member_count++;
          }
        }
      }

      // 2. PRD
      let prdId: number | undefined;
      if (config.prd) {
        if (!config.prd.title) throw new Error('prd.title is required');
        const prd = createPrd({
          title: config.prd.title,
          description: config.prd.description,
          vision: config.prd.vision,
          user_stories: config.prd.user_stories,
          success_criteria: config.prd.success_criteria,
          constraints: config.prd.constraints,
          out_of_scope: config.prd.out_of_scope,
          project_path: config.prd.project_path,
        });
        if (config.prd.status && config.prd.status !== 'backlog') {
          updatePrd(prd.id, { status: config.prd.status });
        }
        prdId = prd.id;
        result.prd = { id: prd.id, title: prd.title };
      }

      // 3. Epics + Tasks
      if (config.epics) {
        for (const epicDef of config.epics) {
          if (!epicDef.title) throw new Error('epic.title is required');
          const epic = createEpic({
            prd_id: prdId,
            title: epicDef.title,
            description: epicDef.description,
            tech_approach: epicDef.tech_approach,
            estimated_effort: epicDef.estimated_effort,
          });
          if (epicDef.status && epicDef.status !== 'backlog') {
            updateEpic(epic.id, { status: epicDef.status });
          }

          let taskCount = 0;
          if (epicDef.tasks) {
            for (const taskDef of epicDef.tasks) {
              if (!taskDef.title) throw new Error('task.title is required');
              createTask({
                title: taskDef.title,
                description: taskDef.description,
                status: taskDef.status,
                priority: taskDef.priority,
                estimated_effort: taskDef.estimated_effort,
                labels: taskDef.labels,
                assignee: taskDef.assignee,
                epic_id: epic.id,
              });
              taskCount++;
              result.total_tasks++;
            }
          }
          result.epics.push({ id: epic.id, title: epic.title, task_count: taskCount });
        }
      }
    });

    try {
      tx();
    } catch (e) {
      return reply.status(400).send({
        error: 'init_failed',
        message: e instanceof Error ? e.message : String(e),
      });
    }

    // WebSocket notification after successful transaction
    wsManager.broadcast('project', 'initialized', result);

    return reply.status(201).send(result);
  });
}
