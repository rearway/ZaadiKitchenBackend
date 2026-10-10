import { Deps } from '../../entitygateway/index.js'

export interface GetDeliveryStartDatesInput {
  userId: string
  from?: string
  limit?: number
}

export interface StartDate {
  date: string
  label: string
  is_next_working_day: boolean
  is_available: boolean
  unavailable_reason?: string
}

export interface GetDeliveryStartDatesOutput {
  start_dates: StartDate[]
}

const DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]
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

function formatDateLabel(date: Date): string {
  const day = DAYS[date.getDay()]
  const month = MONTHS[date.getMonth()]
  return `${day}, ${date.getDate()} ${month} ${date.getFullYear()}`
}

function toYYYYMMDD(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

// KSA working days: Sun(0), Mon(1), Tue(2), Wed(3), Thu(4)
function isWorkingDay(date: Date): boolean {
  const dow = date.getDay()
  return dow >= 0 && dow <= 4
}

export function makeUC(deps: Deps) {
  return async function getDeliveryStartDates(
    input: GetDeliveryStartDatesInput
  ): Promise<GetDeliveryStartDatesOutput> {
    const { logger, publicHolidayLoader } = deps
    try {
      const limit = Math.min(input.limit ?? 14, 30)

      const tomorrow = addDays(new Date(), 1)
      const startFrom = input.from ? new Date(input.from) : tomorrow
      if (startFrom < tomorrow) startFrom.setTime(tomorrow.getTime())

      // Fetch holidays for a ~2 month window to avoid too many years
      const fromStr = toYYYYMMDD(startFrom)
      const toDate = addDays(startFrom, 90)
      const toStr = toYYYYMMDD(toDate)
      const holidayDates = new Set(
        await publicHolidayLoader.getHolidayDates(fromStr, toStr)
      )

      const results: StartDate[] = []
      let firstWorkingDay: string | null = null
      let cursor = new Date(startFrom)
      let maxIterations = 200

      while (results.length < limit && maxIterations-- > 0) {
        const dateStr = toYYYYMMDD(cursor)
        const isHoliday = holidayDates.has(dateStr)

        if (isWorkingDay(cursor)) {
          if (firstWorkingDay === null) firstWorkingDay = dateStr

          results.push({
            date: dateStr,
            label: formatDateLabel(cursor),
            is_next_working_day: dateStr === firstWorkingDay,
            is_available: !isHoliday,
            ...(isHoliday ? { unavailable_reason: 'Public holiday' } : {}),
          })
        }

        cursor = addDays(cursor, 1)
      }

      return { start_dates: results }
    } catch (error) {
      logger.error(
        'Failed to get delivery start dates',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'GetDeliveryStartDates'
