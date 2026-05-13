// Centralised environment validation. Run this on boot so we fail fast
// with a clear message instead of crashing later inside a request handler.

const PLACEHOLDER_SECRETS = new Set([
  'replace_this_with_a_long_random_secret',
  'changeme',
  'change_me',
  'secret',
  'jwt_secret',
  'your_jwt_secret_here',
]);

const MIN_SECRET_LENGTH = 32;

function check(name, value, rules) {
  const errors = [];
  if (rules.required && (value === undefined || value === null || value === '')) {
    errors.push(`${name} is required but is not set.`);
    return errors;
  }
  if (value === undefined || value === null || value === '') {
    return errors;
  }
  if (rules.notPlaceholder && PLACEHOLDER_SECRETS.has(String(value).toLowerCase())) {
    errors.push(
      `${name} is set to a known placeholder value. Generate a real secret with:\n` +
      `      node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
    );
  }
  if (rules.minLength && String(value).length < rules.minLength) {
    errors.push(`${name} must be at least ${rules.minLength} characters (currently ${String(value).length}).`);
  }
  return errors;
}

export function validateEnv() {
  const errors = [
    ...check('DATABASE_URL', process.env.DATABASE_URL, { required: true }),
    ...check('JWT_SECRET', process.env.JWT_SECRET, {
      required: true,
      notPlaceholder: true,
      minLength: MIN_SECRET_LENGTH,
    }),
  ];

  if (errors.length > 0) {
    console.error('\nServer configuration errors — refusing to start:\n');
    for (const message of errors) {
      console.error(`  • ${message}`);
    }
    console.error('');
    process.exit(1);
  }
}
