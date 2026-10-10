export const KSA_TIMEZONE = 'Asia/Riyadh'

export const PLAN_LABELS: Record<string, string> = {
  month: 'Month',
  week: 'Weekly',
  quarterly: 'Quarterly',
  try_it: 'Try It',
}

export const PLAN_SLUGS = ['month', 'week', 'quarterly', 'try_it'] as const

export function normalizePlanSlug(slug: string): string {
  return slug === 'weekly' ? 'week' : slug
}

export function todayKSA(referenceDate: Date = new Date()): string {
  const ksa = new Date(referenceDate.toLocaleString('en-US', { timeZone: KSA_TIMEZONE }))
  const y = ksa.getFullYear()
  const m = String(ksa.getMonth() + 1).padStart(2, '0')
  const d = String(ksa.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function changeDirection(value: number): 'up' | 'down' | 'flat' {
  if (value > 0) return 'up'
  if (value < 0) return 'down'
  return 'flat'
}

export function formatMonthLabel(month: string): string {
  const [year, monthNum] = month.split('-').map(Number)
  const monthNames = [
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
  return `${monthNames[monthNum - 1]} ${year}`
}

function toDateStr(date: Date): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function parseDateOnly(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

function getMondayOfWeekContaining(date: Date): Date {
  const monday = new Date(date)
  const day = monday.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  monday.setUTCDate(monday.getUTCDate() + diff)
  return monday
}

function getFirstMondayOnOrAfter(date: Date): Date {
  const day = date.getUTCDay()
  if (day === 1) return new Date(date)
  const diff = day === 0 ? 1 : 8 - day
  const monday = new Date(date)
  monday.setUTCDate(date.getUTCDate() + diff)
  return monday
}

/**
 * Returns Mon–Sun date strings for the revenue daily chart.
 * Current month → week containing today (KSA). Other months → last Mon–Sun week
 * with a Monday inside the selected month.
 */
export function getMonSunWeekForMonth(month: string, todayKsa: string): string[] {
  const [year, monthNum] = month.split('-').map(Number)
  const monthStart = parseDateOnly(`${year}-${String(monthNum).padStart(2, '0')}-01`)
  const monthEnd = parseDateOnly(
    `${year}-${String(monthNum).padStart(2, '0')}-${String(
      new Date(Date.UTC(year, monthNum, 0)).getUTCDate()
    ).padStart(2, '0')}`
  )
  const [ty, tm] = todayKsa.split('-').map(Number)
  const isCurrentMonth = year === ty && monthNum === tm

  let monday: Date
  if (isCurrentMonth) {
    monday = getMondayOfWeekContaining(parseDateOnly(todayKsa))
  } else {
    monday = getMondayOfWeekContaining(monthEnd)
    if (monday < monthStart) {
      monday = getFirstMondayOnOrAfter(monthStart)
    }
  }

  const dates: string[] = []
  for (let i = 0; i < 7; i++) {
    const day = new Date(monday)
    day.setUTCDate(monday.getUTCDate() + i)
    dates.push(toDateStr(day))
  }
  return dates
}

export function getDayLabelShort(dateStr: string): string {
  const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return labels[parseDateOnly(dateStr).getUTCDay()]
}

export function lastDayOfPreviousMonth(referenceDateStr: string): string {
  const [y, m] = referenceDateStr.split('-').map(Number)
  const lastDay = new Date(Date.UTC(y, m - 1, 0))
  return toDateStr(lastDay)
}

export function pctChange(current: number, prior: number): number {
  if (prior === 0) return current === 0 ? 0 : 100
  return Math.round(((current - prior) / prior) * 1000) / 10
}

export function round1(value: number): number {
  return Math.round(value * 10) / 10
}
