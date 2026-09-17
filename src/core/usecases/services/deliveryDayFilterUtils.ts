import { ValidationError } from '../../../shared/errors/index.js'
import { todayKSA } from './revenueUtils.js'

export type DeliveryDayFilter = 'today' | 'tomorrow'

/** Inclusive window for Print Labels list, PDF download, and XLSX export. */
export const DELIVERY_LABELS_MAX_DAYS_AHEAD = 7

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
  /**
   * When true (default), date must fall within [today, today + DELIVERY_LABELS_MAX_DAYS_AHEAD]
   * in Asia/Riyadh. Set false for dashboard/historical views that accept any date.
   */
  restrictToLabelWindow?: boolean
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

export function getDeliveryLabelDateWindow(referenceDate: Date = new Date()): {
  min_date: string
  max_date: string
} {
  const min_date = todayKSA(referenceDate)
  const max_date = addCalendarDays(min_date, DELIVERY_LABELS_MAX_DAYS_AHEAD)
  return { min_date, max_date }
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

function isWithinLabelWindow(date: string, minDate: string, maxDate: string): boolean {
  return date >= minDate && date <= maxDate
}

export function resolveDeliveryDayFilter(
  input: ResolveDeliveryDayInput,
  referenceDate: Date = new Date(),
  options: ResolveDeliveryDayOptions = {}
): ResolvedDeliveryDay {
  const restrict = options.restrictToLabelWindow !== false
  const today = todayKSA(referenceDate)
  const tomorrow = addCalendarDays(today, 1)
  const { min_date, max_date } = getDeliveryLabelDateWindow(referenceDate)

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

  if (restrict && !isWithinLabelWindow(date, min_date, max_date)) {
    throw new ValidationError(
      `Delivery date must be between ${min_date} and ${max_date} (Asia/Riyadh, up to ${DELIVERY_LABELS_MAX_DAYS_AHEAD} days ahead)`,
      {
        error: 'DATE_OUT_OF_RANGE',
        min_date,
        max_date,
        max_days_ahead: DELIVERY_LABELS_MAX_DAYS_AHEAD,
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
