/**
 * Tracks whether we've already sent the "urgent SLA" email for a ticket.
 *
 * Without this we'd re-spam the assignee every time the scheduler ticked.
 * Once set, we don't re-notify even on reassignment — keeping email volume
 * low is more important than perfect per-assignee fidelity.
 *
 * Resetting this column (e.g. on reopen or manual override) can be done
 * later by a controller; for now it's write-once.
 */

export const up = (pgm) => {
  pgm.sql(`
    ALTER TABLE tickets
      ADD COLUMN IF NOT EXISTS urgent_notified_at TIMESTAMPTZ;
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    ALTER TABLE tickets DROP COLUMN IF EXISTS urgent_notified_at;
  `);
};
