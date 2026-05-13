// Catches all unhandled errors thrown from route handlers — including
// rejected promises, thanks to `express-async-errors` being imported in app.js.
//
// The handler maps a few well-known error shapes (Postgres SQLSTATE codes,
// JSON body parser failures) to sensible HTTP statuses; everything else
// becomes a 500. Stack traces are returned in dev only.

const PG_ERROR_MAP = {
  // Unique violation
  '23505': { status: 409, message: 'This value already exists.' },
  // Foreign key violation
  '23503': { status: 400, message: 'Invalid reference: related record not found.' },
  // Not-null violation
  '23502': { status: 400, message: 'A required field is missing.' },
  // Check constraint violation
  '23514': { status: 400, message: 'A field has an invalid value.' },
  // Invalid text representation (e.g. bad UUID, bad number)
  '22P02': { status: 400, message: 'Invalid input format.' },
  // Datetime field overflow / invalid datetime
  '22007': { status: 400, message: 'Invalid date/time value.' },
  // Undefined column / undefined table — these are schema drift; surface
  // a 500 but log loudly so it's easy to spot in the server output.
  '42703': { status: 500, message: 'Database schema mismatch — see server logs.' },
  '42P01': { status: 500, message: 'Database schema mismatch — see server logs.' },
};

export function notFoundHandler(req, res, next) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.path}` });
}

// eslint-disable-next-line no-unused-vars -- Express requires the 4-arg signature
export function errorHandler(err, req, res, next) {
  // Always log the full error server-side so operators can debug.
  console.error(`[error] ${req.method} ${req.originalUrl}`);
  console.error(err);

  // 1. Body parser errors (malformed JSON) come pre-tagged with .status = 400.
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Request body is not valid JSON.' });
  }

  // 2. Postgres errors carry a SQLSTATE in `err.code`.
  if (err.code && PG_ERROR_MAP[err.code]) {
    const mapped = PG_ERROR_MAP[err.code];
    return res.status(mapped.status).json({ message: mapped.message });
  }

  // 3. Anything else with an explicit status (thrown from controllers).
  const status = err.status || err.statusCode || 500;
  const isProd = process.env.NODE_ENV === 'production';
  const isInternal = status >= 500;

  const body = {
    message: isInternal && isProd
      ? 'Internal server error.'
      : err.message || 'Internal server error.',
  };

  if (!isProd && err.stack) {
    body.stack = err.stack;
  }

  return res.status(status).json(body);
}
