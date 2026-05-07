WITH excel_values AS (
  SELECT *
  FROM (VALUES
    (1, 'Random Co.', 'Software', 'Business Services', 'Default (IT)', 'Request'),
    (2, 'Random Co.', 'Access Transport', '4G', '3Plus', 'Access Management'),
    (3, 'Random Co.', 'Access Transport OSS', 'Access', '3Store', 'Alert'),
    (4, 'Random Co.', 'AMDOCS', 'Access Services & Software', '5GCAS', 'Amdocs'),
    (5, 'Random Co.', 'Amdocs CRM', 'Access-Router', 'AAA (Authentication, Authorization and Accounting)', 'Amdocs CRM'),
    (6, 'Random Co.', 'Amdocs Orders', 'Accounts and Access', 'AAT', 'Amdocs Orders'),
    (7, 'Random Co.', 'Application', 'Active Antenna Unit (AAU)', 'Access All Areas', 'Application'),
    (8, 'Random Co.', 'Billing', 'Antenna', 'Access Management', 'Billing'),
    (9, 'Random Co.', 'Business Operations', 'Application', 'Accessibility Services', 'Change'),
    (10, 'Random Co.', 'Cisco', 'Applications', 'Activation Error', 'Customer TT')
  ) AS sampled_values (
    row_number,
    company,
    product_categorization_tier1,
    product_categorization_tier2,
    product_categorization_tier3,
    categorization_tier1
  )
),
numbered_tickets AS (
  SELECT
    id,
    submit_date,
    status,
    ((ROW_NUMBER() OVER (ORDER BY id) - 1) % 10) + 1 AS sample_row
  FROM tickets
)
UPDATE tickets AS t
SET
  company = ev.company,
  product_categorization_tier1 = ev.product_categorization_tier1,
  product_categorization_tier2 = ev.product_categorization_tier2,
  product_categorization_tier3 = ev.product_categorization_tier3,
  categorization_tier1 = ev.categorization_tier1,
  last_modified_date = nt.submit_date + ((((nt.sample_row - 1) % 4) + 1)::integer),
  close_date = CASE
    WHEN nt.status IN ('Resolved', 'Closed')
      THEN nt.submit_date + ((((nt.sample_row - 1) % 5) + 2)::integer)
    ELSE NULL
  END,
  updated_at = NOW()
FROM numbered_tickets AS nt
JOIN excel_values AS ev ON ev.row_number = nt.sample_row
WHERE t.id = nt.id;
