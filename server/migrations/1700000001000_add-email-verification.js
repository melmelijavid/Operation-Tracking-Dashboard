/**
 * Email verification:
 *   - users.email_verified — accounts must be verified before login.
 *   - email_verification_codes — one row per code issued. Codes are stored
 *     hashed (SHA-256), with an expiry, an attempts counter (lock at 5),
 *     and a consumed_at timestamp once successfully used.
 *
 * Existing accounts at migration time are grandfathered in as verified so
 * we don't lock anyone out. New signups always start as unverified.
 */

export const up = (pgm) => {
  pgm.sql(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false;

    -- Grandfather any pre-existing accounts.
    UPDATE users SET email_verified = true WHERE email_verified = false;

    CREATE TABLE IF NOT EXISTS email_verification_codes (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      code_hash TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      consumed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_evc_user_active
      ON email_verification_codes (user_id, created_at DESC)
      WHERE consumed_at IS NULL;
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS idx_evc_user_active;
    DROP TABLE IF EXISTS email_verification_codes;
    ALTER TABLE users DROP COLUMN IF EXISTS email_verified;
  `);
};
