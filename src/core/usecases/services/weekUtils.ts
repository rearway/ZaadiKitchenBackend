import { isDeliveryDateForceLocked } from './forcePipelineLock.js'
import { MAX_DISHES_PER_STREAM } from './menuWeekPublish.js'

const DAY_ABBR = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

/**
 * Returns the ISO week number (Mon=start) for any given date.
 * Used to build consistent week IDs in the format 'w{year}-{week}'.
 */
function getIsoWeek(date: Date): { week: number; year: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayOfWeek = d.getUTCDay() || 7  // Mon=1 … Sun=7
  d.setUTCDate(d.getUTCDate() + 4 - dayOfWeek)  // shift to nearest Thursday
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return { week, year: d.getUTCFullYear() }
}

function toDateStr(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export interface SaudiWeekBounds {
  weekId: string
  weekNumber: number
  year: number
  dateFrom: string    // YYYY-MM-DD (Sunday)
  dateTo: string      // YYYY-MM-DD (Thursday)
  deliveryDates: string[]  // [sun, mon, tue, wed, thu]
}

/**
 * Given any reference date, returns the Saudi work-week (Sun–Thu) bounds
 * that contains it. If the reference date is Fri or Sat, the *following*
 * Sunday is used (next work week).
 */
export function getSaudiWorkWeekBounds(referenceDate: Date): SaudiWeekBounds {
  const day = referenceDate.getDay()  // 0=Sun … 6=Sat

  // Compute Sunday of this work week
  const sunday = new Date(referenceDate)
  if (day === 5 || day === 6) {
    // Fri or Sat → jump to next Sunday
    sunday.setDate(referenceDate.getDate() + (7 - day))
  } else {
    sunday.setDate(referenceDate.getDate() - day)
  }
  sunday.setHours(0, 0, 0, 0)

  const thursday = new Date(sunday)
  thursday.setDate(sunday.getDate() + 4)

  const { week, year } = getIsoWeek(sunday)
  const weekId = `w${year}-${week}`

  const deliveryDates: string[] = []
  for (let i = 0; i < 5; i++) {
    const d = new Date(sunday)
    d.setDate(sunday.getDate() + i)
    deliveryDates.push(toDateStr(d))
  }

  return {
    weekId,
    weekNumber: week,
    year,
    dateFrom: toDateStr(sunday),
    dateTo: toDateStr(thursday),
    deliveryDates,
  }
}

function addDaysYmdUtc(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/**
 * Returns the Saudi work week immediately after {@link getSaudiWorkWeekBounds}
 * for the same reference date (always +7 days from that week's Sunday).
 */
export function getNextSaudiWorkWeekBounds(referenceDate: Date): SaudiWeekBounds {
  const thisWeek = getSaudiWorkWeekBounds(referenceDate)
  const nextSundayStr = addDaysYmdUtc(thisWeek.dateFrom, 7)
  // Midday UTC so local getDay() stays Sunday in all server timezones.
  return getSaudiWorkWeekBounds(new Date(nextSundayStr + 'T12:00:00Z'))
}

/** Returns slot ID for a given week, date and meal type. Index 1 has no suffix (legacy). */
export function makeSlotId(
  weekId: string,
  deliveryDate: string,
  mealType: 'executive' | 'salad',
  index: number = 1
): string {
  const d = new Date(deliveryDate)
  const dayAbbr = DAY_ABBR[d.getDay()]
  const typeAbbr = mealType === 'executive' ? 'exec' : 'salad'
  const base = `slot_${weekId}_${dayAbbr}_${typeAbbr}`
  return index <= 1 ? base : `${base}_${index}`
}

export function parseSlotIndex(slotId: string): number {
  const match = slotId.match(/_(?:exec|salad)_(\d+)$/)
  return match ? Number(match[1]) : 1
}

export function nextAvailableSlotIndex(existingSlotIds: string[]): number | null {
  const used = new Set(existingSlotIds.map(parseSlotIndex))
  for (let i = 1; i <= MAX_DISHES_PER_STREAM; i++) {
    if (!used.has(i)) return i
  }
  return null
}

/** Returns the day label (e.g. "Sun", "Mon") for a delivery date. */
export function getDayLabel(deliveryDate: string): string {
  const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return labels[new Date(deliveryDate).getDay()]
}

/** Formats "Sun 5 – Thu 9 May" style label for a week. */
export function formatWeekRangeLabel(dateFrom: string, dateTo: string): string {
  const from = new Date(dateFrom)
  const to = new Date(dateTo)
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  return `${dayNames[from.getDay()]} ${from.getDate()} – ${dayNames[to.getDay()]} ${to.getDate()} ${monthNames[to.getMonth()]}`
}

/**
 * Returns the skip cutoff timestamp for a given delivery date.
 * Cutoff = 18:00 AST (UTC+3) the day before delivery.
 */
export function getSkipCutoffTimestamp(deliveryDate: string): Date {
  const delivery = new Date(deliveryDate + 'T00:00:00Z')
  const dayBefore = new Date(delivery)
  dayBefore.setUTCDate(dayBefore.getUTCDate() - 1)
  dayBefore.setUTCHours(15, 0, 0, 0) // 18:00 KSA = 15:00 UTC
  return dayBefore
}

/** Compare YYYY-MM-DD strings lexicographically (valid for ISO dates). */
export function compareDateStrings(a: string, b: string): number {
  return a.localeCompare(b)
}

/**
 * Determines if the skip cutoff has passed for a given delivery date.
 * A staging force-lock uses this same check: the date is treated as past
 * 18:00 Asia/Riyadh the day before, and only while that gate is enabled.
 */
export function isAfterSkipCutoff(deliveryDate: string, now: Date = new Date()): boolean {
  if (isDeliveryDateForceLocked(deliveryDate)) return true
  return now.getTime() >= getSkipCutoffTimestamp(deliveryDate).getTime()
}

/** Asia/Riyadh is UTC+3 year-round. 18:00 KSA = 15:00 UTC, same as the skip cutoff. */
const RIYADH_OFFSET_MS = 3 * 60 * 60 * 1000

/** YYYY-MM-DD in Asia/Riyadh (UTC+3, no DST). */
export function riyadhDateString(now: Date = new Date()): string {
  const { year, month, day } = riyadhCivilDate(now)
  const monthText = String(month + 1).padStart(2, '0')
  const dayText = String(day).padStart(2, '0')
  return `${year}-${monthText}-${dayText}`
}

/** True for a real YYYY-MM-DD calendar date. Rejects 2026-02-31 and non-dates. */
export function isValidCivilDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

function riyadhCivilDate(now: Date): { year: number; month: number; day: number; dayOfWeek: number } {
  const shifted = new Date(now.getTime() + RIYADH_OFFSET_MS)
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    dayOfWeek: shifted.getUTCDay(),
  }
}

function utcNoonFromCivil(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day, 12, 0, 0, 0))
}

/**
 * Saudi work week for an Asia/Riyadh civil date.
 * Friday and Saturday roll forward to the upcoming Sunday, matching
 * {@link getSaudiWorkWeekBounds}, but the weekday is taken from KSA not the server zone.
 */
export function getKsaSaudiWorkWeekBounds(now: Date): SaudiWeekBounds {
  const { year, month, day } = riyadhCivilDate(now)
  return getSaudiWorkWeekBounds(utcNoonFromCivil(year, month, day))
}

/**
 * Sun–Thu week that owns the current KSA Thursday.
 * Friday and Saturday stay on the work week that just ended, so the
 * Thursday 18:00 unlock does not shift a day early.
 */
export function getAnchorSaudiWorkWeek(now: Date): SaudiWeekBounds {
  const civil = riyadhCivilDate(now)
  let day = civil.day
  if (civil.dayOfWeek === 5) day -= 1
  else if (civil.dayOfWeek === 6) day -= 2
  return getSaudiWorkWeekBounds(utcNoonFromCivil(civil.year, civil.month, day))
}

function weekAfter(week: SaudiWeekBounds): SaudiWeekBounds {
  return getNextSaudiWorkWeekBounds(new Date(week.dateFrom + 'T12:00:00Z'))
}

/** Thursday 18:00 Asia/Riyadh of the anchor work week (15:00 UTC). */
export function getAdminAheadWeekUnlockAt(anchor: SaudiWeekBounds): Date {
  return new Date(`${anchor.dateTo}T15:00:00.000Z`)
}

/** True from Thursday 18:00 Asia/Riyadh of the anchor week onward. */
export function isAdminTwoWeeksAheadUnlocked(now: Date = new Date()): boolean {
  const anchor = getAnchorSaudiWorkWeek(now)
  return now.getTime() >= getAdminAheadWeekUnlockAt(anchor).getTime()
}

/**
 * Weeks admin may create or publish.
 * Before Thursday 18:00 KSA: the in-progress week and the immediate next week.
 * At and after that cutoff: those two, plus the week two ahead.
 */
export function getAdminPlannableWeeks(now: Date = new Date()): SaudiWeekBounds[] {
  const anchor = getAnchorSaudiWorkWeek(now)
  const immediate = weekAfter(anchor)
  const weeks = [anchor, immediate]
  if (isAdminTwoWeeksAheadUnlocked(now)) {
    weeks.push(weekAfter(immediate))
  }
  return weeks
}

/**
 * Weeks the planner should show.
 * On Friday and Saturday (KSA) the ended anchor week drops off, leaving the next two work weeks.
 */
export function getAdminVisibleWeeks(now: Date = new Date()): SaudiWeekBounds[] {
  const service = getKsaSaudiWorkWeekBounds(now)
  return getAdminPlannableWeeks(now).filter(week => week.dateFrom >= service.dateFrom)
}

/** A week strictly after the unlocked horizon cannot be added or published. */
export function isAdminWeekLocked(dateFrom: string, now: Date = new Date()): boolean {
  const horizon = getAdminPlannableWeeks(now).at(-1)
  if (!horizon) return false
  return dateFrom > horizon.dateFrom
}
