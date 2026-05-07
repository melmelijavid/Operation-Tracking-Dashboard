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
