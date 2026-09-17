import { ValidationError } from '../../../shared/errors/index.js'
import { todayKSA } from './revenueUtils.js'

export type DeliveryDayFilter = 'today' | 'tomorrow'

export interface ResolveDeliveryDayInput {
  day?: DeliveryDayFilter
  delivery_date?: string
  /** Legacy alias — same as delivery_date */
  date?: string
}

export interface ResolvedDeliveryDay {
  date: string
  day: DeliveryDayFilter | null
  date_label: string
}

export interface ResolveDeliveryDayOptions {
  /** When true (default), only today and tomorrow (KSA) are allowed. */
  restrictToTodayTomorrow?: boolean
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export function addCalendarDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + days))
  return dt.toISOString().slice(0, 10)
}

export function tomorrowKSA(referenceDate: Date = new Date()): string {
  return addCalendarDays(todayKSA(referenceDate), 1)
}

function formatShortDateLabel(date: string): string {
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
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const [y, m, d] = date.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return `${dayNames[dt.getUTCDay()]}, ${monthNames[m - 1]} ${d}`
}

export function formatDeliveryDayLabel(
  date: string,
  today: string,
  tomorrow: string
): string {
  const short = formatShortDateLabel(date)
  if (date === today) return `Today · ${short}`
  if (date === tomorrow) return `Tomorrow · ${short}`
  return short
}

export function resolveDeliveryDayFilter(
  input: ResolveDeliveryDayInput,
  referenceDate: Date = new Date(),
  options: ResolveDeliveryDayOptions = {}
): ResolvedDeliveryDay {
  const restrict = options.restrictToTodayTomorrow !== false
  const today = todayKSA(referenceDate)
  const tomorrow = addCalendarDays(today, 1)
  const allowed = new Set([today, tomorrow])

  let date: string
  if (input.delivery_date) {
    date = input.delivery_date
  } else if (input.date) {
    date = input.date
  } else if (input.day === 'tomorrow') {
    date = tomorrow
  } else {
    date = today
  }

  if (!ISO_DATE.test(date)) {
    throw new ValidationError('delivery_date must be in YYYY-MM-DD format', {
      field: 'delivery_date',
    })
  }

  if (restrict && !allowed.has(date)) {
    throw new ValidationError(
      'Delivery date must be today or tomorrow in Asia/Riyadh',
      {
        error: 'DATE_OUT_OF_RANGE',
        allowed_dates: [today, tomorrow],
      }
    )
  }

  const day: DeliveryDayFilter | null =
    date === tomorrow ? 'tomorrow' : date === today ? 'today' : null

  return {
    date,
    day,
    date_label: formatDeliveryDayLabel(date, today, tomorrow),
  }
}
