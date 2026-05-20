/**
 * Notification preferences for users.
 *
 * One column for now: a master switch for outbound emails. Every email-sending
 * controller (mention notifications, urgent SLA alerts, DM notifications)
 * checks this flag before calling sendEmail(). Default is `true` so existing
 * users keep getting emails until they opt out.
 *
 * If we need finer-grained controls later (e.g. mute mentions but keep SLA
 * alerts), extend this into a JSONB column or split into multiple booleans.
 */

export const up = (pgm) => {
  pgm.sql(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN NOT NULL DEFAULT true;
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    ALTER TABLE users DROP COLUMN IF EXISTS email_notifications_enabled;
  `);
};
