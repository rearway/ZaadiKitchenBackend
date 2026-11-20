const claims = new Map<string, number>()

function purgeExpired(now: number): void {
  for (const [key, expiresAt] of claims) {
    if (expiresAt <= now) claims.delete(key)
  }
}

/**
 * In-process dedup for SMS fallback (single task). Multi-instance deploys may send twice
 * unless a shared store (e.g. Redis) is added later.
 */
export function tryClaimOtpSmsFallback(
  key: string,
  ttlMs: number
): boolean {
  const now = Date.now()
  purgeExpired(now)
  const existing = claims.get(key)
  if (existing !== undefined && existing > now) {
    return false
  }
  claims.set(key, now + ttlMs)
  return true
}

/** Testing only */
export function resetOtpSmsFallbackClaims(): void {
  claims.clear()
}