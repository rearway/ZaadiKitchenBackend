import { todayKSA } from './revenueUtils.js'

export const ERP_TIMEZONE = process.env.ERP_TIMEZONE ?? 'Asia/Riyadh'

export function getErpCutoffTimeKsa(): { hours: number; minutes: number } {
  const raw = process.env.ERP_CUTOFF_TIME_KSA?.trim() || '19:00'
  const match = /^(\d{1,2}):(\d{2})$/.exec(raw)
  if (!match) return { hours: 19, minutes: 0 }
  const hours = Math.min(23, Math.max(0, parseInt(match[1], 10)))
  const minutes = Math.min(59, Math.max(0, parseInt(match[2], 10)))
  return { hours, minutes }
}

/** Cutoff instant: calendar day before delivery at ERP_CUTOFF_TIME_KSA in Asia/Riyadh. */
export function getErpCutoffForDeliveryDate(deliveryDate: string): Date {
  const [y, m, d] = deliveryDate.split('-').map(Number)
  const dayBefore = new Date(Date.UTC(y, m - 1, d - 1))
  const { hours, minutes } = getErpCutoffTimeKsa()
  // KSA is UTC+3 with no DST
  return new Date(
    Date.UTC(
      dayBefore.getUTCFullYear(),
      dayBefore.getUTCMonth(),
      dayBefore.getUTCDate(),
      hours - 3,
      minutes,
      0,
      0
    )
  )
}

export function formatCutoffAtIso(deliveryDate: string): string {
  const cutoff = getErpCutoffForDeliveryDate(deliveryDate)
  return cutoff.toISOString()
}

export function isAfterErpCutoff(deliveryDate: string, now: Date = new Date()): boolean {
  return now.getTime() >= getErpCutoffForDeliveryDate(deliveryDate).getTime()
}

function parseYmd(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

function formatYmd(date: Date): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function addCalendarDaysYmd(dateStr: string, days: number): string {
  const d = parseYmd(dateStr)
  d.setUTCDate(d.getUTCDate() + days)
  return formatYmd(d)
}

/** Sun(0)–Thu(4) delivery workdays. */
export function isDeliveryWorkday(dateStr: string): boolean {
  const dow = parseYmd(dateStr).getUTCDay()
  return dow >= 0 && dow <= 4
}

export function nextDeliveryWorkday(
  fromDateStr: string,
  holidayDates: Set<string>
): string {
  let cursor = fromDateStr
  for (let i = 0; i < 14; i++) {
    if (isDeliveryWorkday(cursor) && !holidayDates.has(cursor)) {
      return cursor
    }
    cursor = addCalendarDaysYmd(cursor, 1)
  }
  return cursor
}

/**
 * Default delivery date when ERP omits `date`: earliest upcoming workday from today (KSA),
 * advancing past cutoff for that day to the next workday.
 */
export function resolveDefaultDeliveryDate(
  holidayDates: Set<string>,
  now: Date = new Date()
): string {
  let candidate = todayKSA(now)
  if (!isDeliveryWorkday(candidate) || holidayDates.has(candidate)) {
    candidate = nextDeliveryWorkday(addCalendarDaysYmd(candidate, 1), holidayDates)
  }
  if (isAfterErpCutoff(candidate, now)) {
    candidate = nextDeliveryWorkday(addCalendarDaysYmd(candidate, 1), holidayDates)
  }
  return candidate
}

export interface ResolvedDailyOrdersDate {
  requestedDate: string | null
  resolvedDeliveryDate: string
  cutoffAt: string
  frozen: boolean
  cutoffApplied: boolean
  timezone: string
}

export function resolveDailyOrdersDate(
  requestedDate: string | null,
  holidayDates: Set<string>,
  now: Date = new Date()
): ResolvedDailyOrdersDate {
  const resolvedDeliveryDate =
    requestedDate ?? resolveDefaultDeliveryDate(holidayDates, now)
  const frozen = isAfterErpCutoff(resolvedDeliveryDate, now)
  return {
    requestedDate,
    resolvedDeliveryDate,
    cutoffAt: formatCutoffAtIso(resolvedDeliveryDate),
    frozen,
    cutoffApplied: frozen,
    timezone: ERP_TIMEZONE,
  }
}
