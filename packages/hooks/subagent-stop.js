#!/usr/bin/env node
'use strict';

const { readStdin, sendEvent, respond } = require('./lib');

(async () => {
  const d = await readStdin();
  const sid = d.session_id || 'unknown';
  await sendEvent('/api/events', {
    session_id: sid,
    event_type: 'subagent_stop',
    payload: d,
  });
  respond();
})();
