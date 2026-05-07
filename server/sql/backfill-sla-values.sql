UPDATE tickets
SET
  sla_type = CASE
    WHEN priority IN ('Critical', 'High') THEN 'normal'
    ELSE 'business'
  END,
  sla_hours = CASE
    WHEN priority = 'Critical' THEN 4
    WHEN priority = 'High' THEN 8
    WHEN priority = 'Medium' THEN 24
    ELSE 72
  END,
  sla_deadline = CASE
    WHEN priority = 'Critical' THEN submit_date::timestamp + INTERVAL '4 hours'
    WHEN priority = 'High' THEN submit_date::timestamp + INTERVAL '8 hours'
    WHEN priority = 'Medium' THEN submit_date::timestamp + INTERVAL '3 days'
    ELSE submit_date::timestamp + INTERVAL '9 days'
  END,
  updated_at = NOW();
