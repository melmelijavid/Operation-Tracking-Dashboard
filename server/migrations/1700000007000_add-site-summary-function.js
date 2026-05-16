/*
 * Adds PostgreSQL stored function for infrastructure site ticket summaries.
 */

export const up = (pgm) => {
  pgm.sql(`
    CREATE OR REPLACE FUNCTION get_sites_with_ticket_summary()
    RETURNS TABLE (
      site_id TEXT,
      country TEXT,
      country_code TEXT,
      city TEXT,
      city_code TEXT,
      latitude NUMERIC,
      longitude NUMERIC,
      infrastructure_type TEXT,
      vendor TEXT,
      status TEXT,
      description TEXT,
      created_at TIMESTAMPTZ,
      ticket_count INTEGER,
      active_ticket_count INTEGER,
      related_ticket_ids TEXT[],
      related_tickets JSONB,
      highest_sla_urgency TEXT
    )
    AS $$
    BEGIN
      RETURN QUERY
      SELECT
        s.site_id,
        s.country,
        s.country_code,
        s.city,
        s.city_code,
        s.latitude,
        s.longitude,
        s.infrastructure_type,
        s.vendor,
        s.status,
        s.description,
        s.created_at,

        COUNT(t.id)::INTEGER AS ticket_count,

        COUNT(t.id) FILTER (
          WHERE t.status NOT IN ('Resolved', 'Closed')
        )::INTEGER AS active_ticket_count,

        COALESCE(
          ARRAY_REMOVE(ARRAY_AGG(t.id ORDER BY t.id), NULL),
          ARRAY[]::TEXT[]
        ) AS related_ticket_ids,

        COALESCE(
          JSONB_AGG(
            JSONB_BUILD_OBJECT(
              'id', t.id,
              'status', t.status,
              'slaUrgency',
                CASE
                  WHEN t.status IN ('Resolved', 'Closed') THEN 'completed'
                  WHEN t.sla_deadline IS NULL THEN 'none'
                  WHEN t.sla_deadline < NOW() THEN 'overdue'
                  WHEN t.sla_deadline <= NOW() + INTERVAL '8 hours' THEN 'danger'
                  WHEN t.sla_deadline <= NOW() + INTERVAL '24 hours' THEN 'warning'
                  ELSE 'normal'
                END
            )
            ORDER BY t.id
          ) FILTER (WHERE t.id IS NOT NULL),
          '[]'::JSONB
        ) AS related_tickets,

        CASE
          WHEN COUNT(t.id) FILTER (
            WHERE t.status NOT IN ('Resolved', 'Closed')
              AND t.sla_deadline < NOW()
          ) > 0 THEN 'overdue'

          WHEN COUNT(t.id) FILTER (
            WHERE t.status NOT IN ('Resolved', 'Closed')
              AND t.sla_deadline <= NOW() + INTERVAL '8 hours'
          ) > 0 THEN 'danger'

          WHEN COUNT(t.id) FILTER (
            WHERE t.status NOT IN ('Resolved', 'Closed')
              AND t.sla_deadline <= NOW() + INTERVAL '24 hours'
          ) > 0 THEN 'warning'

          WHEN COUNT(t.id) FILTER (
            WHERE t.status NOT IN ('Resolved', 'Closed')
              AND t.sla_deadline IS NOT NULL
          ) > 0 THEN 'normal'

          ELSE 'none'
        END AS highest_sla_urgency

      FROM infrastructure_sites s
      LEFT JOIN tickets t ON t.site_id = s.site_id
      GROUP BY
        s.site_id,
        s.country,
        s.country_code,
        s.city,
        s.city_code,
        s.latitude,
        s.longitude,
        s.infrastructure_type,
        s.vendor,
        s.status,
        s.description,
        s.created_at
      ORDER BY s.country, s.city, s.site_id;
    END;
    $$ LANGUAGE plpgsql;
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    DROP FUNCTION IF EXISTS get_sites_with_ticket_summary();
  `);
};
