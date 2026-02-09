#!/usr/bin/env node
'use strict';

const { readStdin, sendEvent, respond } = require('./lib');

(async () => {
  const d = await readStdin();
  const sid = d.session_id || 'unknown';
  await sendEvent('/api/events', {
    session_id: sid,
    event_type: 'tool_call_end',
    payload: { tool_name: d.tool_name, duration_ms: d.duration_ms, success: true },
  });
  respond();
})();
