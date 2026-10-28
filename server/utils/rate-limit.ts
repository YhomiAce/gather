/**
 * In-memory fixed-window rate limiter. Good enough for a single instance; swap for
 * Redis if you run several replicas.
 */
export class RateLimiter {
  private readonly hits = new Map<string, { count: number; resetAt: number }>()

  /**
   * @param limit - allowed hits per window
   * @param windowMs - window length in milliseconds
   */
  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  /**
   * Records a hit for `key`.
   *
   * @returns whether the hit is allowed and, if not, seconds until the window resets
   */
  hit(key: string, now = Date.now()): { allowed: boolean; retryAfter: number } {
    if (this.hits.size > 10_000) this.sweep(now)
    const entry = this.hits.get(key)
    if (!entry || entry.resetAt <= now) {
      this.hits.set(key, { count: 1, resetAt: now + this.windowMs })
      return { allowed: true, retryAfter: 0 }
    }
    entry.count += 1
    if (entry.count > this.limit) {
      return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) }
    }
    return { allowed: true, retryAfter: 0 }
  }

  private sweep(now: number): void {
    for (const [key, entry] of this.hits) if (entry.resetAt <= now) this.hits.delete(key)
  }
}
