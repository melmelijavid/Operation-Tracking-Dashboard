// Verification codes are 6-digit numeric strings, stored hashed (SHA-256)
// so the plaintext only ever exists in the email we send. Codes expire
// after 15 minutes and lock after 5 wrong attempts.

import crypto from 'node:crypto';

export const CODE_TTL_MINUTES = 15;
export const CODE_MAX_ATTEMPTS = 5;

export function generateCode() {
  // randomInt is uniform; 100000–999999 inclusive.
  return String(crypto.randomInt(100000, 1000000));
}

export function hashCode(code) {
  return crypto.createHash('sha256').update(String(code)).digest('hex');
}

export function codeMatches(code, storedHash) {
  const candidate = hashCode(code);
  // Constant-time compare to avoid timing attacks against the hash check.
  if (candidate.length !== storedHash.length) return false;
  return crypto.timingSafeEqual(
    Buffer.from(candidate, 'hex'),
    Buffer.from(storedHash, 'hex'),
  );
}
