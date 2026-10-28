import type { H3Event } from 'h3'
import { RateLimiter } from './rate-limit'

let rsvpLimiter: RateLimiter | undefined
let createLimiter: RateLimiter | undefined

/**
 * Client IP used as the rate-limit key. Behind a reverse proxy (Traefik, nginx)
 * the proxy appends the real peer address to X-Forwarded-For, so the *last*
 * entry is the trustworthy one; earlier entries are client-controlled.
 */
function clientKey(event: H3Event): string {
  const forwarded = getRequestHeader(event, 'x-forwarded-for')
  const last = forwarded?.split(',').map((s) => s.trim()).filter(Boolean).pop()
  return last ?? getRequestIP(event) ?? 'unknown'
}

function enforce(limiter: RateLimiter, event: H3Event): void {
  const { allowed, retryAfter } = limiter.hit(clientKey(event))
  if (!allowed) {
    setResponseHeader(event, 'Retry-After', retryAfter)
    throw createError({ statusCode: 429, statusMessage: 'Too many requests, please try again in a few minutes' })
  }
}

/** Limits RSVP submissions per client IP (default 10 per 10 minutes). */
export function enforceRsvpRateLimit(event: H3Event): void {
  rsvpLimiter ??= new RateLimiter(Number(useRuntimeConfig().rsvpRateLimit) || 10, 10 * 60_000)
  enforce(rsvpLimiter, event)
}

/** Limits event creation per client IP (5 per 10 minutes). */
export function enforceCreateRateLimit(event: H3Event): void {
  createLimiter ??= new RateLimiter(5, 10 * 60_000)
  enforce(createLimiter, event)
}

/** True when the hidden honeypot field was filled in, i.e. a bot submitted the form. */
export function isHoneypotTripped(body: { website?: string | undefined }): boolean {
  return Boolean(body.website && body.website.trim())
}
