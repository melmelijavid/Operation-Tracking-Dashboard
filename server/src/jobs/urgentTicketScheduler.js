// In-process scheduler that periodically scans for tickets whose SLA has
// crossed the "urgent" threshold (≤ 8 hours remaining) and fires the
// assignee-notification email for any that haven't been notified yet.
//
// In-process means it dies with the server. Acceptable for a single-node
// deployment; for HA you'd run a single dedicated worker process (or a
// cron in the container orchestrator) so multiple replicas don't all send
// the same email.

import { query } from '../db.js';
import { notifyUrgentTicketIfNeeded } from '../utils/urgentNotifier.js';

const INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

let timerHandle = null;

async function tick() {
  const result = await query(
    `SELECT id FROM tickets
     WHERE status NOT IN ('Resolved', 'Closed')
       AND sla_deadline IS NOT NULL
       AND sla_deadline <= NOW() + INTERVAL '8 hours'
       AND urgent_notified_at IS NULL
       AND assigned_person_user_id IS NOT NULL`
  );
  if (result.rowCount === 0) return;
  for (const row of result.rows) {
    // Run sequentially so we don't open dozens of SMTP connections at once.
    await notifyUrgentTicketIfNeeded(row.id);
  }
}

export function startUrgentTicketScheduler() {
  if (timerHandle) return;
  // Initial scan shortly after boot so we catch anything that became urgent
  // while the server was down.
  setTimeout(() => {
    tick().catch((err) => console.error('[urgent-scheduler] initial tick failed:', err));
  }, 10 * 1000);
  timerHandle = setInterval(() => {
    tick().catch((err) => console.error('[urgent-scheduler] tick failed:', err));
  }, INTERVAL_MS);
  // Don't keep the process alive solely for this timer — process should
  // shut down cleanly on SIGTERM regardless.
  if (typeof timerHandle.unref === 'function') timerHandle.unref();
  console.log(`[urgent-scheduler] started, interval=${INTERVAL_MS / 1000}s`);
}

export function stopUrgentTicketScheduler() {
  if (timerHandle) {
    clearInterval(timerHandle);
    timerHandle = null;
  }
}
