import {
  getSkipCutoffTimestamp,
  isAfterSkipCutoff,
  getSaudiWorkWeekBounds,
  getNextSaudiWorkWeekBounds,
  getAdminPlannableWeeks,
  getAdminVisibleWeeks,
  isAdminWeekLocked,
  getAdminAheadWeekUnlockAt,
  getAnchorSaudiWorkWeek,
  riyadhDateString,
  isValidCivilDate,
  makeSlotId,
  parseSlotIndex,
  nextAvailableSlotIndex,
} from '../weekUtils.js'

describe('slot indexes', () => {
  const weekId = 'w2026-42'
  const sun = '2026-10-11'

  it('creates a 4th slot id and parses it', () => {
    expect(makeSlotId(weekId, sun, 'executive', 4)).toBe(
      'slot_w2026-42_sun_exec_4'
    )
    expect(makeSlotId(weekId, sun, 'salad', 4)).toBe(
      'slot_w2026-42_sun_salad_4'
    )
    expect(parseSlotIndex('slot_w2026-42_sun_exec_4')).toBe(4)
    expect(parseSlotIndex('slot_w2026-42_sun_salad_4')).toBe(4)
    expect(parseSlotIndex(makeSlotId(weekId, sun, 'executive', 1))).toBe(1)
  })

  it('offers index 4 when 1..3 are taken and rejects a 5th', () => {
    const taken = [1, 2, 3].map(index =>
      makeSlotId(weekId, sun, 'executive', index)
    )
    expect(nextAvailableSlotIndex(taken)).toBe(4)

    const full = [...taken, makeSlotId(weekId, sun, 'executive', 4)]
    expect(nextAvailableSlotIndex(full)).toBeNull()

    const saladTaken = [1, 2, 3].map(index =>
      makeSlotId(weekId, sun, 'salad', index)
    )
    expect(nextAvailableSlotIndex(saladTaken)).toBe(4)
    expect(
      nextAvailableSlotIndex([
        ...saladTaken,
        makeSlotId(weekId, sun, 'salad', 4),
      ])
    ).toBeNull()
  })
})

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

describe('riyadh civil date', () => {
  it('is the next calendar day at 21:30 UTC', () => {
    expect(riyadhDateString(new Date('2026-09-14T21:30:00.000Z'))).toBe('2026-09-15')
  })

  it('stays on the same calendar day at 02:00 UTC', () => {
    expect(riyadhDateString(new Date('2026-09-14T02:00:00.000Z'))).toBe('2026-09-14')
  })

  it('accepts real dates and rejects impossible ones', () => {
    expect(isValidCivilDate('2026-09-16')).toBe(true)
    expect(isValidCivilDate('2026-02-31')).toBe(false)
    expect(isValidCivilDate('2026-09-16T00:00:00Z')).toBe(false)
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

describe('admin week horizon (Thursday 18:00 Asia/Riyadh)', () => {
  const justBefore = new Date('2026-10-22T14:59:59.000Z') // Thu 17:59:59 KSA
  const atCutoff = new Date('2026-10-22T15:00:00.000Z') // Thu 18:00:00 KSA
  const justAfter = new Date('2026-10-22T15:00:01.000Z') // Thu 18:00:01 KSA
  const fridayOpen = new Date('2026-10-22T21:00:00.000Z') // Fri 00:00:00 KSA

  const currentFrom = '2026-10-18'
  const immediateNextFrom = '2026-10-25'
  const twoAheadFrom = '2026-11-01'

  it('keeps the current week and the immediate next week before Thursday 18:00 KSA', () => {
    const plannable = getAdminPlannableWeeks(justBefore).map(w => w.dateFrom)
    expect(plannable).toEqual([currentFrom, immediateNextFrom])
    expect(isAdminWeekLocked(twoAheadFrom, justBefore)).toBe(true)
    expect(isAdminWeekLocked(currentFrom, justBefore)).toBe(false)
    expect(isAdminWeekLocked(immediateNextFrom, justBefore)).toBe(false)
    expect(
      getAdminAheadWeekUnlockAt(
        getAnchorSaudiWorkWeek(justBefore)
      ).toISOString()
    ).toBe('2026-10-22T15:00:00.000Z')
  })

  it('unlocks the week two ahead at Thursday 18:00 Asia/Riyadh', () => {
    const plannable = getAdminPlannableWeeks(atCutoff).map(w => w.dateFrom)
    expect(plannable).toEqual([currentFrom, immediateNextFrom, twoAheadFrom])
    expect(isAdminWeekLocked(twoAheadFrom, atCutoff)).toBe(false)
    expect(isAdminWeekLocked(currentFrom, atCutoff)).toBe(false)
  })

  it('keeps two weeks ahead available after Thursday 18:00 Asia/Riyadh', () => {
    const plannable = getAdminPlannableWeeks(justAfter).map(w => w.dateFrom)
    expect(plannable).toEqual([currentFrom, immediateNextFrom, twoAheadFrom])
    expect(isAdminWeekLocked(twoAheadFrom, justAfter)).toBe(false)
  })

  it('shows the next two work weeks when Friday opens in Asia/Riyadh', () => {
    const visible = getAdminVisibleWeeks(fridayOpen).map(w => w.dateFrom)
    expect(visible).toEqual([immediateNextFrom, twoAheadFrom])
    expect(getSaudiWorkWeekBounds(fridayOpen).dateFrom).toBe(currentFrom)
  })
})
