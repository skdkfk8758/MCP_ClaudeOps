#!/usr/bin/env node
'use strict';

const { readStdin, sendUpdate, respond } = require('./lib');

(async () => {
  const d = await readStdin();
  const sid = d.session_id || 'unknown';
  await sendUpdate(`/api/sessions/${sid}`, {
    end_time: new Date().toISOString(),
    status: 'completed',
  });
  respond();
})();
