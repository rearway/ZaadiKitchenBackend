import { createHash, timingSafeEqual } from 'crypto'

/** Constant-time compare. Moyasar sends the shared secret as payload `secret_token`. */
export function webhookSecretsMatch(
  provided: string,
  expected: string
): boolean {
  if (!expected) return false
  const providedHash = createHash('sha256').update(provided).digest()
  const expectedHash = createHash('sha256').update(expected).digest()
  return timingSafeEqual(providedHash, expectedHash)
}
