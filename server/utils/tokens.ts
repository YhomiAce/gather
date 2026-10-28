import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

/** Shape of every token we hand out: 32 random bytes, base64url (43 chars). */
const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/

/**
 * Creates a new secret token for a guest or host link. Only its hash is stored.
 *
 * @returns the plaintext token (put it in the URL) and its SHA-256 hash (store it)
 */
export function createToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString('base64url')
  return { token, hash: hashToken(token) }
}

/**
 * SHA-256 hex digest of a token. Tokens are high-entropy, so a fast hash is enough
 * (no need for a slow password hash) and lets us look rows up by hash.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex')
}

/**
 * Cheap shape check so malformed tokens are rejected before touching the database.
 */
export function isWellFormedToken(token: unknown): token is string {
  return typeof token === 'string' && TOKEN_RE.test(token)
}

/**
 * Constant-time comparison of a plaintext token against a stored hash.
 */
export function verifyToken(token: string, storedHash: string): boolean {
  if (!isWellFormedToken(token)) return false
  const a = Buffer.from(hashToken(token), 'hex')
  const b = Buffer.from(storedHash, 'hex')
  return a.length === b.length && timingSafeEqual(a, b)
}
