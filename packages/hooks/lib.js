'use strict';

const BACKEND_URL = process.env.CLAUDEOPS_BACKEND_URL || 'http://localhost:48390';

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => {
      try { resolve(JSON.parse(data)); }
      catch (e) { reject(e); }
    });
    process.stdin.on('error', reject);
  });
}

async function sendEvent(path, data) {
  try {
    await fetch(`${BACKEND_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(3000),
    });
  } catch { /* ignore - backend may be down */ }
}

async function sendUpdate(path, data) {
  try {
    await fetch(`${BACKEND_URL}${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(3000),
    });
  } catch { /* ignore */ }
}

function respond() {
  console.log(JSON.stringify({ continue: true }));
}

module.exports = { BACKEND_URL, readStdin, sendEvent, sendUpdate, respond };
