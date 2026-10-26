/**
 * SQL fragment (leading AND …) for delivery days that should appear on Daily Ops
 * delivery lists, label generation, meal breakdown, and rider dispatch.
 * Expects `delivery_days` aliased as `dd` and `subscriptions` as `s`.
 */
export function dailyOpsDeliverableDayWhereSql(): string {
  return `AND dd.status IN ('scheduled', 'past_cutoff', 'delivered')
AND NOT (
  s.paused_from IS NOT NULL
  AND s.paused_until IS NOT NULL
  AND dd.date >= s.paused_from
  AND dd.date <= s.paused_until
)`
}
