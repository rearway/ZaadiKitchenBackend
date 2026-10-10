export function toYYYYMMDD(date: Date): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function addDaysUtc(date: Date, n: number): Date {
  const d = new Date(date)
  d.setUTCDate(d.getUTCDate() + n)
  return d
}

export function isWorkingDayUtc(date: Date): boolean {
  const dow = date.getUTCDay()
  return dow >= 0 && dow <= 4
}

/** First N working days (Sun–Thu) from startDate, excluding holidays. */
export function generateWorkingDeliveryDates(
  startDate: string,
  mealCount: number,
  holidaySet: Set<string>
): string[] {
  const dates: string[] = []
  let cursor = new Date(startDate + 'T00:00:00Z')
  let maxIterations = 500

  while (dates.length < mealCount && maxIterations-- > 0) {
    const dateStr = toYYYYMMDD(cursor)
    if (isWorkingDayUtc(cursor) && !holidaySet.has(dateStr)) {
      dates.push(dateStr)
    }
    cursor = addDaysUtc(cursor, 1)
  }

  return dates
}

export type DeliveryDayInput = {
  subscriptionId: string
  userId: string
  date: string
  mealType: 'executive' | 'salad'
  mealName: null
  status: 'scheduled'
  deliveredAt: null
}

export function buildDeliveryDayInputs(
  dates: string[],
  mealType: 'executive' | 'salad',
  subscriptionId: string,
  userId: string
): DeliveryDayInput[] {
  return dates.map(date => ({
    subscriptionId,
    userId,
    date,
    mealType,
    mealName: null,
    status: 'scheduled',
    deliveredAt: null,
  }))
}
