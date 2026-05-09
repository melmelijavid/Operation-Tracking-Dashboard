/**
 * Baseline schema. This consolidates everything that previously lived in
 * server/sql/schema.sql plus the ad-hoc add-*.sql migration files.
 *
 * Statements use IF NOT EXISTS so this migration is safe to run against
 * an existing local database that was created the old way (manually via
 * the seed script's CREATE TABLE block). On a fresh database it builds
 * the full schema from scratch.
 *
 * From this point forward, every schema change goes into its own
 * migration file. Don't edit this one — write a new migration instead.
 */

export const up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'operator', 'viewer')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS tickets (
      id TEXT PRIMARY KEY,
      description TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('Open', 'In Progress', 'Pending', 'Resolved', 'Closed')),
      priority TEXT NOT NULL CHECK (priority IN ('Critical', 'High', 'Medium', 'Low')),
      assigned_group TEXT NOT NULL,
      service_type TEXT NOT NULL,
      submit_date DATE NOT NULL,
      last_modified_date DATE,
      close_date DATE,
      company TEXT,
      product_categorization_tier1 TEXT,
      product_categorization_tier2 TEXT,
      product_categorization_tier3 TEXT,
      categorization_tier1 TEXT,
      sla_type TEXT NOT NULL DEFAULT 'normal' CHECK (sla_type IN ('business', 'normal')),
      sla_hours INTEGER NOT NULL DEFAULT 24,
      sla_deadline TIMESTAMPTZ,
      aging INTEGER NOT NULL DEFAULT 0,
      owner_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      assigned_person_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS ticket_history (
      id SERIAL PRIMARY KEY,
      ticket_id TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      field_name TEXT,
      old_value TEXT,
      new_value TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS ticket_comments (
      id SERIAL PRIMARY KEY,
      ticket_id TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      comment_text TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Defensive ALTERs for databases that pre-date specific column adds.
    -- These are no-ops on fresh databases (the columns already exist above)
    -- but they catch local DBs that were created from earlier schema versions.
    ALTER TABLE tickets ADD COLUMN IF NOT EXISTS last_modified_date DATE;
    ALTER TABLE tickets ADD COLUMN IF NOT EXISTS close_date DATE;
    ALTER TABLE tickets ADD COLUMN IF NOT EXISTS company TEXT;
    ALTER TABLE tickets ADD COLUMN IF NOT EXISTS product_categorization_tier1 TEXT;
    ALTER TABLE tickets ADD COLUMN IF NOT EXISTS product_categorization_tier2 TEXT;
    ALTER TABLE tickets ADD COLUMN IF NOT EXISTS product_categorization_tier3 TEXT;
    ALTER TABLE tickets ADD COLUMN IF NOT EXISTS categorization_tier1 TEXT;
    ALTER TABLE tickets ADD COLUMN IF NOT EXISTS sla_type TEXT NOT NULL DEFAULT 'normal';
    ALTER TABLE tickets ADD COLUMN IF NOT EXISTS sla_hours INTEGER NOT NULL DEFAULT 24;
    ALTER TABLE tickets ADD COLUMN IF NOT EXISTS sla_deadline TIMESTAMPTZ;
  `);
};

export const down = (pgm) => {
  // Reversing the baseline drops everything. Useful in tests; never run in prod.
  pgm.sql(`
    DROP TABLE IF EXISTS ticket_comments;
    DROP TABLE IF EXISTS ticket_history;
    DROP TABLE IF EXISTS tickets;
    DROP TABLE IF EXISTS users;
  `);
};
