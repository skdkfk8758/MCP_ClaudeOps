#!/usr/bin/env node
'use strict';

const { readStdin, sendEvent, respond } = require('./lib');

(async () => {
  const d = await readStdin();
  const sid = d.session_id || 'unknown';
  await sendEvent('/api/agents/executions', {
    session_id: sid,
    agent_type: d.agent_type || 'unknown',
    model: d.model || 'unknown',
    task_description: d.task_description,
  });
  respond();
})();
