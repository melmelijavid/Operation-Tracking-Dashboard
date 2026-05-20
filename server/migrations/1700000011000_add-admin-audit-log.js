/**
 * Admin audit log.
 *
 * Append-only record of who did what, when, and to whom across the admin
 * panel (user edits, team edits, password resets, membership changes).
 * No purge for now; revisit if it grows out of hand.
 *
 * Design notes:
 *   - actor_user_id is ON DELETE SET NULL so deleting a user doesn't break
 *     the history (the actor_label column preserves the name).
 *   - target_id is TEXT so we can store either numeric IDs (users, teams)
 *     or string IDs (tickets, sites) without separate columns.
 *   - There's intentionally no FK on target_id — we want to remember
 *     actions even after the target is gone.
 *   - target_label and actor_label are snapshots: the name/email at the
 *     moment of the action. Renames don't rewrite history.
 *   - details is JSONB for flexible per-action payloads (diffs, member
 *     ID lists, etc.).
 */

export const up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS admin_audit_log (
      id SERIAL PRIMARY KEY,
      actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      actor_label TEXT,
      action TEXT NOT NULL,
      target_type TEXT,
      target_id TEXT,
      target_label TEXT,
      details JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created
      ON admin_audit_log(created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target
      ON admin_audit_log(target_type, target_id);
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS idx_admin_audit_log_target;
    DROP INDEX IF EXISTS idx_admin_audit_log_created;
    DROP TABLE IF EXISTS admin_audit_log;
  `);
};
