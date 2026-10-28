import { describe, expect, it } from 'vitest'
import { createToken, hashToken, isWellFormedToken, verifyToken } from '../server/utils/tokens'

describe('tokens', () => {
  it('creates unique, URL-safe 43-char tokens', () => {
    const a = createToken()
    const b = createToken()
    expect(a.token).not.toBe(b.token)
    expect(a.token).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(isWellFormedToken(a.token)).toBe(true)
  })

  it('stores only the SHA-256 hash, never the token', () => {
    const { token, hash } = createToken()
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
    expect(hash).not.toContain(token)
    expect(hashToken(token)).toBe(hash)
  })

  it('verifies the right token and rejects others', () => {
    const { token, hash } = createToken()
    expect(verifyToken(token, hash)).toBe(true)
    expect(verifyToken(createToken().token, hash)).toBe(false)
  })

  it('rejects malformed input before hashing', () => {
    const { hash } = createToken()
    expect(isWellFormedToken('short')).toBe(false)
    expect(isWellFormedToken(42)).toBe(false)
    expect(verifyToken('../../etc/passwd', hash)).toBe(false)
  })
})
