ALTER TABLE tickets ADD COLUMN IF NOT EXISTS last_modified_date DATE;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS close_date DATE;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS company TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS product_categorization_tier1 TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS product_categorization_tier2 TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS product_categorization_tier3 TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS categorization_tier1 TEXT;
