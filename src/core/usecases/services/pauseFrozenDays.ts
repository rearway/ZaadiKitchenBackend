import { countWorkingDaysInRange } from './flexDays.js'
import { compareDateStrings } from './weekUtils.js'
import { todayKSA } from './revenueUtils.js'
import { isWorkingDayUtc, toYYYYMMDD } from './deliveryScheduleUtils.js'
import { addDaysUtc } from './deliveryScheduleUtils.js'
function nextCalendarDay(dateStr: string): string {
  return toYYYYMMDD(addDaysUtc(new Date(dateStr + 'T00:00:00Z'), 1))
}

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

function formatPausedFromLabel(pausedFrom: string): string {
  const [, m, d] = pausedFrom.split('-').map(Number)
  return `${d} ${MONTHS[m - 1]}`
}

/** Working days frozen in the pause window up to today (KSA). */
export function computePauseDaysFrozen(
  pausedFrom: string,
  pausedUntil: string,
  today: string = todayKSA(),
  holidaySet: Set<string> = new Set()
): number {
  if (compareDateStrings(today, pausedFrom) < 0) {
    return 0
  }
  const end =
    compareDateStrings(today, pausedUntil) > 0 ? pausedUntil : today
  return countWorkingDaysInRange(pausedFrom, end, holidaySet)
}

export function buildPauseHomeLabels(
  pausedFrom: string,
  pausedUntil: string,
  today: string = todayKSA(),
  holidaySet: Set<string> = new Set()
): { days_frozen: number; pause_label: string } {
  const daysFrozen = computePauseDaysFrozen(
    pausedFrom,
    pausedUntil,
    today,
    holidaySet
  )
  const pausedLabel = formatPausedFromLabel(pausedFrom)

  if (compareDateStrings(today, pausedFrom) < 0) {
    return {
      days_frozen: 0,
      pause_label: `Pause starts ${pausedLabel}`,
    }
  }

  return {
    days_frozen: daysFrozen,
    pause_label: `${daysFrozen} day${daysFrozen !== 1 ? 's' : ''} frozen · Paused ${pausedLabel}`,
  }
}

/** Default resume date for "resume tomorrow" UX: max(tomorrow, min) within [min,max], working day. */
export function computeSuggestedResumeDate(
  min: string,
  max: string,
  today: string = todayKSA(),
  holidaySet: Set<string> = new Set()
): string | null {
  let candidate = nextCalendarDay(today)
  if (compareDateStrings(candidate, min) < 0) {
    candidate = min
  }
  let guard = 0
  while (compareDateStrings(candidate, max) <= 0 && guard++ < 14) {
    const d = new Date(candidate + 'T00:00:00Z')
    if (isWorkingDayUtc(d) && !holidaySet.has(candidate)) {
      return candidate
    }
    candidate = toYYYYMMDD(addDaysUtc(d, 1))
  }
  return null
}

export function isWorkingDeliveryDate(
  dateStr: string,
  holidaySet: Set<string> = new Set()
): boolean {
  const d = new Date(dateStr + 'T00:00:00Z')
  return isWorkingDayUtc(d) && !holidaySet.has(dateStr)
}
