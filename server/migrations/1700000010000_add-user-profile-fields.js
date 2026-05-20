/**
 * Profile fields for the user-facing /profile page:
 *   - phone: optional contact number (E.164 or free-text; we don't validate
 *     format server-side, only that it's a string).
 *   - job_title: optional display string (e.g. "Senior Network Engineer").
 *   - avatar_url: relative path to the uploaded image file. The file lives
 *     under server/uploads/avatars/ and is served statically. Null = use
 *     initials/default avatar in the UI.
 *
 * All three default to NULL on existing rows.
 */

export const up = (pgm) => {
  pgm.sql(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS job_title TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    ALTER TABLE users DROP COLUMN IF EXISTS avatar_url;
    ALTER TABLE users DROP COLUMN IF EXISTS job_title;
    ALTER TABLE users DROP COLUMN IF EXISTS phone;
  `);
};
