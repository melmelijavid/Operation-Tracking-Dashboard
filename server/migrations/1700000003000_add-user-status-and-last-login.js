/**
 * User account state for the admin panel:
 *
 *   - `status` (active | disabled). Disabled users can't log in and are
 *     kicked on their next authenticated request (handled in
 *     authMiddleware next step). "Pending" is NOT a real value here —
 *     it's derived from email_verified=false at the API layer, so we
 *     don't have two fields to keep in sync.
 *
 *   - `last_login_at` is bumped on every successful login. Used in the
 *     admin User Management view.
 *
 * Existing users default to 'active'. last_login_at starts NULL and
 * fills in naturally as people log in.
 */

export const up = (pgm) => {
  pgm.sql(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
      CHECK (status IN ('active', 'disabled'));

    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    ALTER TABLE users DROP COLUMN IF EXISTS last_login_at;
    ALTER TABLE users DROP COLUMN IF EXISTS status;
  `);
};
