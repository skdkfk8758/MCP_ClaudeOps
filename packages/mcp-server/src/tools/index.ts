import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerSessionTools } from './session.js';
import { registerAgentTools } from './agent.js';
import { registerEventTools } from './event.js';
import { registerAnalyticsTools } from './analytics.js';
import { registerConfigTools } from './config.js';
import { registerTaskTools } from './task.js';

export function registerAllTools(server: McpServer): void {
  registerSessionTools(server);
  registerAgentTools(server);
  registerEventTools(server);
  registerAnalyticsTools(server);
  registerConfigTools(server);
  registerTaskTools(server);
}
