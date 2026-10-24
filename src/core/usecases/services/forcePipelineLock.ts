/**
 * Staging-only override for the delivery-date cutoff.
 *
 * Daily Ops `locked` is `isAfterSkipCutoff` (18:00 Asia/Riyadh the day before).
 * ERP `frozen` is `isAfterErpCutoff` (ERP_CUTOFF_TIME_KSA, default 19:00).
 * Neither transition is stored. This set makes those same predicates return
 * true for specific dates so QA can run locked → dispatch → delivered early.
 *
 * The set is process-local. Call the force-lock endpoint again after a restart.
 * Reads and writes are ignored unless ALLOW_FORCE_PIPELINE_LOCK is the exact
 * string "true" (surrounding whitespace is ignored) and NODE_ENV is not
 * "production". The flag is off when unset.
 */
const forcedDeliveryDates = new Set<string>()

export function isForcePipelineLockEnabled(): boolean {
  if (process.env.NODE_ENV === 'production') return false
  return process.env.ALLOW_FORCE_PIPELINE_LOCK?.trim() === 'true'
}

export function isDeliveryDateForceLocked(date: string): boolean {
  if (!isForcePipelineLockEnabled()) return false
  return forcedDeliveryDates.has(date)
}

/** Records a date. No-ops when the gate is off, including production. */
export function forceLockDeliveryDate(date: string): void {
  if (!isForcePipelineLockEnabled()) return
  forcedDeliveryDates.add(date)
}

export function resetForceLockedDeliveryDates(): void {
  forcedDeliveryDates.clear()
}
