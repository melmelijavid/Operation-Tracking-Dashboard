/**
 * Teams data foundation.
 *
 * Until now, tickets carried a free-text `assigned_group` value with no
 * referential integrity. This migration:
 *   1. Creates a `teams` table.
 *   2. Creates a `team_members` join (a user can belong to many teams).
 *   3. Adds `tickets.team_id` as a nullable FK to teams.
 *   4. Seeds the eight team names that already exist in the data, so
 *      the backfill below is an exact match — no fuzzy logic.
 *   5. Backfills `tickets.team_id` from `assigned_group` where the name
 *      matches a seeded team.
 *
 * `tickets.assigned_group` is intentionally kept for now as a safety net.
 * It will be dropped in a later cleanup migration once we're confident
 * everything reads from `team_id`.
 *
 * Tickets whose `assigned_group` doesn't match a seeded team are left with
 * `team_id = NULL`. The admin can fix those via the upcoming Team
 * Management UI by creating the missing team and re-linking.
 */

export const up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS teams (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      department TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS team_members (
      team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (team_id, user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);

    ALTER TABLE tickets
      ADD COLUMN IF NOT EXISTS team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL;

    CREATE INDEX IF NOT EXISTS idx_tickets_team ON tickets(team_id);

    -- Seed the known team names. ON CONFLICT keeps this idempotent in case
    -- the migration is replayed on a partially-set-up DB.
    INSERT INTO teams (name) VALUES
      ('Application Support'),
      ('Database Team'),
      ('Desktop Support'),
      ('Field Support'),
      ('Identity Team'),
      ('Messaging Support'),
      ('Network Team'),
      ('Service Desk')
    ON CONFLICT (name) DO NOTHING;

    -- Backfill team_id on existing tickets via exact name match.
    UPDATE tickets t
       SET team_id = teams.id
      FROM teams
     WHERE t.team_id IS NULL
       AND teams.name = t.assigned_group;
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    ALTER TABLE tickets DROP COLUMN IF EXISTS team_id;
    DROP TABLE IF EXISTS team_members;
    DROP TABLE IF EXISTS teams;
  `);
};
