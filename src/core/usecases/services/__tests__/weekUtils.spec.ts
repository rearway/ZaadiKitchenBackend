import {
  getSkipCutoffTimestamp,
  isAfterSkipCutoff,
  getSaudiWorkWeekBounds,
  getNextSaudiWorkWeekBounds,
} from '../weekUtils.js'

describe('Saudi work week bounds', () => {
  function addDays(dateStr: string, days: number): string {
    const d = new Date(dateStr + 'T00:00:00Z')
    d.setUTCDate(d.getUTCDate() + days)
    return d.toISOString().slice(0, 10)
  }

  it('returns distinct this and next week on Friday (weekend)', () => {
    const friday = new Date('2026-10-09T12:00:00Z')
    const thisWeek = getSaudiWorkWeekBounds(friday)
    const nextWeek = getNextSaudiWorkWeekBounds(friday)
    expect(nextWeek.dateFrom).toBe(addDays(thisWeek.dateFrom, 7))
    expect(nextWeek.dateFrom).not.toBe(thisWeek.dateFrom)
    expect(thisWeek.dateTo).toBe(addDays(thisWeek.dateFrom, 4))
    expect(nextWeek.dateTo).toBe(addDays(nextWeek.dateFrom, 4))
  })

  it('returns distinct this and next week on Saturday', () => {
    const saturday = new Date('2026-10-10T12:00:00Z')
    const thisWeek = getSaudiWorkWeekBounds(saturday)
    const nextWeek = getNextSaudiWorkWeekBounds(saturday)
    expect(nextWeek.dateFrom).toBe(addDays(thisWeek.dateFrom, 7))
    expect(nextWeek.dateFrom).not.toBe(thisWeek.dateFrom)
  })

  it('advances by one work week on Wednesday', () => {
    const wednesday = new Date('2026-10-14T12:00:00Z')
    const thisWeek = getSaudiWorkWeekBounds(wednesday)
    const nextWeek = getNextSaudiWorkWeekBounds(wednesday)
    expect(nextWeek.dateFrom).toBe(addDays(thisWeek.dateFrom, 7))
  })
})

describe('weekUtils skip cutoff', () => {
  it('uses the last day of the prior month as cutoff day when delivery is on the 1st', () => {
    const cutoff = getSkipCutoffTimestamp('2025-03-01')
    expect(cutoff.toISOString()).toBe('2025-02-28T15:00:00.000Z')
  })

  it('uses the prior calendar day at 15:00 UTC for mid-month delivery', () => {
    const cutoff = getSkipCutoffTimestamp('2025-03-15')
    expect(cutoff.toISOString()).toBe('2025-03-14T15:00:00.000Z')
  })

  it('isAfterSkipCutoff is false before cutoff and true after', () => {
    const deliveryDate = '2025-06-10'
    const before = new Date('2025-06-09T14:59:59.000Z')
    const after = new Date('2025-06-09T15:00:01.000Z')
    expect(isAfterSkipCutoff(deliveryDate, before)).toBe(false)
    expect(isAfterSkipCutoff(deliveryDate, after)).toBe(true)
  })
})
