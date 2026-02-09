#!/usr/bin/env node
'use strict';

const { readStdin, sendEvent, respond } = require('./lib');

(async () => {
  const d = await readStdin();
  const sid = d.session_id || 'unknown';
  await sendEvent('/api/events', {
    session_id: sid,
    event_type: 'user_prompt',
    payload: { prompt_length: d.prompt ? d.prompt.length : 0 },
  });
  respond();
})();
