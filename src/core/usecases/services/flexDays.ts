import type { Subscription } from '../../entities/Subscription.js'
import {
  addDaysUtc,
  isWorkingDayUtc,
  toYYYYMMDD,
} from './deliveryScheduleUtils.js'
import { compareDateStrings } from './weekUtils.js'

/**
 * Shared skip+pause allowance. Plans seed equal skip/pause allowed;
 * runtime treats used as one pool mirrored on both columns.
 */
export function getFlexDaysAllowed(sub: Pick<Subscription, 'skipDaysAllowed' | 'pauseDaysAllowed'>): number {
  return Math.min(sub.skipDaysAllowed, sub.pauseDaysAllowed)
}

export function getFlexDaysUsed(sub: Pick<Subscription, 'skipDaysUsed' | 'pauseDaysUsed'>): number {
  return Math.max(sub.skipDaysUsed, sub.pauseDaysUsed)
}

export function getFlexDaysRemaining(
  sub: Pick<
    Subscription,
    'skipDaysAllowed' | 'pauseDaysAllowed' | 'skipDaysUsed' | 'pauseDaysUsed'
  >
): number {
  return Math.max(0, getFlexDaysAllowed(sub) - getFlexDaysUsed(sub))
}

/** Sync both used counters to the same flex total. */
export function flexUsedUpdate(newUsed: number): {
  skipDaysUsed: number
  pauseDaysUsed: number
} {
  const used = Math.max(0, newUsed)
  return { skipDaysUsed: used, pauseDaysUsed: used }
}

export function flexAllowanceFields(sub: Pick<
  Subscription,
  'skipDaysAllowed' | 'pauseDaysAllowed' | 'skipDaysUsed' | 'pauseDaysUsed'
>) {
  const allowed = getFlexDaysAllowed(sub)
  const used = getFlexDaysUsed(sub)
  const remaining = Math.max(0, allowed - used)
  return {
    skip_days_allowed: allowed,
    skip_days_used: used,
    skip_days_remaining: remaining,
    pause_days_allowed: allowed,
    pause_days_used: used,
    pause_days_remaining: remaining,
    skip_pause_days_allowed: allowed,
    skip_pause_days_used: used,
    skip_pause_days_remaining: remaining,
  }
}

/** Inclusive working days (Sun–Thu) in [from, to], excluding holidays. */
export function countWorkingDaysInRange(
  from: string,
  to: string,
  holidaySet: Set<string> = new Set()
): number {
  if (compareDateStrings(to, from) < 0) return 0
  let count = 0
  let cursor = new Date(from + 'T00:00:00Z')
  const end = new Date(to + 'T00:00:00Z')
  let maxIterations = 500
  while (cursor.getTime() <= end.getTime() && maxIterations-- > 0) {
    const dateStr = toYYYYMMDD(cursor)
    if (isWorkingDayUtc(cursor) && !holidaySet.has(dateStr)) {
      count += 1
    }
    cursor = addDaysUtc(cursor, 1)
  }
  return count
}

/** List working dates (Sun–Thu) in [from, to], excluding holidays. */
export function listWorkingDaysInRange(
  from: string,
  to: string,
  holidaySet: Set<string> = new Set()
): string[] {
  if (compareDateStrings(to, from) < 0) return []
  const dates: string[] = []
  let cursor = new Date(from + 'T00:00:00Z')
  const end = new Date(to + 'T00:00:00Z')
  let maxIterations = 500
  while (cursor.getTime() <= end.getTime() && maxIterations-- > 0) {
    const dateStr = toYYYYMMDD(cursor)
    if (isWorkingDayUtc(cursor) && !holidaySet.has(dateStr)) {
      dates.push(dateStr)
    }
    cursor = addDaysUtc(cursor, 1)
  }
  return dates
}
