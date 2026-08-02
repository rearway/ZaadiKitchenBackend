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

/**
 * Returns bounds for the next Saudi work week after the given reference date.
 */
export function getNextSaudiWorkWeekBounds(referenceDate: Date): SaudiWeekBounds {
  const nextSunday = new Date(referenceDate)
  const day = referenceDate.getDay()
  if (day === 0) {
    nextSunday.setDate(referenceDate.getDate() + 7)
  } else {
    nextSunday.setDate(referenceDate.getDate() + (7 - day))
  }
  return getSaudiWorkWeekBounds(nextSunday)
}

/** Returns slot ID for a given week, date and meal type. */
export function makeSlotId(weekId: string, deliveryDate: string, mealType: 'executive' | 'salad'): string {
  const d = new Date(deliveryDate)
  const dayAbbr = DAY_ABBR[d.getDay()]
  const typeAbbr = mealType === 'executive' ? 'exec' : 'salad'
  return `slot_${weekId}_${dayAbbr}_${typeAbbr}`
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
  const delivery = new Date(deliveryDate)
  const dayBefore = new Date(delivery)
  dayBefore.setDate(delivery.getDate() - 1)
  // 18:00 AST = 15:00 UTC
  return new Date(Date.UTC(dayBefore.getFullYear(), dayBefore.getMonth(), dayBefore.getDate(), 15, 0, 0))
}

/**
 * Determines if the skip cutoff has passed for a given delivery date.
 */
export function isAfterSkipCutoff(deliveryDate: string, now: Date = new Date()): boolean {
  return now.getTime() >= getSkipCutoffTimestamp(deliveryDate).getTime()
}
