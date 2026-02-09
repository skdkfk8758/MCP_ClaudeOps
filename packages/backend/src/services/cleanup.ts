import { getDb } from '../database/index.js';

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

export function startCleanup(retentionDays: number = 90): void {
  if (cleanupTimer) return;
  // Run cleanup every 24 hours
  cleanupTimer = setInterval(() => cleanup(retentionDays), 24 * 60 * 60 * 1000);
}

export function stopCleanup(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}

function cleanup(retentionDays: number): void {
  try {
    const db = getDb();
    const cutoff = `datetime('now', '-${retentionDays} days')`;

    db.prepare(`DELETE FROM events WHERE timestamp < ${cutoff}`).run();
    db.prepare(`DELETE FROM tool_calls WHERE timestamp < ${cutoff}`).run();
    db.prepare(`DELETE FROM file_changes WHERE timestamp < ${cutoff}`).run();
    db.prepare(`DELETE FROM errors WHERE timestamp < ${cutoff}`).run();
    db.prepare(`DELETE FROM daily_stats WHERE date < date('now', '-${retentionDays} days')`).run();

    // Vacuum to reclaim space
    db.pragma('wal_checkpoint(TRUNCATE)');
  } catch {
    // Cleanup errors are non-fatal
  }
}
