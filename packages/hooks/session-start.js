#!/usr/bin/env node
'use strict';

const { readStdin, sendEvent, respond } = require('./lib');

(async () => {
  const d = await readStdin();
  const sid = d.session_id || require('crypto').randomUUID();
  await sendEvent('/api/sessions', {
    id: sid,
    project_path: d.cwd || process.cwd(),
  });
  respond();
})();
