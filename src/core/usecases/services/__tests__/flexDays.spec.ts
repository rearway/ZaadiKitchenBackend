import {
  countWorkingDaysInRange,
  flexUsedUpdate,
  getFlexDaysAllowed,
  getFlexDaysRemaining,
  getFlexDaysUsed,
  listWorkingDaysInRange,
} from '../flexDays.js'

describe('flexDays', () => {
  it('uses min allowed and max used as the shared pool', () => {
    const sub = {
      skipDaysAllowed: 66,
      pauseDaysAllowed: 66,
      skipDaysUsed: 3,
      pauseDaysUsed: 3,
    }
    expect(getFlexDaysAllowed(sub)).toBe(66)
    expect(getFlexDaysUsed(sub)).toBe(3)
    expect(getFlexDaysRemaining(sub)).toBe(63)
  })

  it('mirrors used on both columns', () => {
    expect(flexUsedUpdate(5)).toEqual({ skipDaysUsed: 5, pauseDaysUsed: 5 })
  })

  it('counts working days Sun–Thu in range', () => {
    // Sun 2026-10-11 through Thu 2026-10-15 = 5 working days
    expect(countWorkingDaysInRange('2026-10-11', '2026-10-15')).toBe(5)
    // Includes Fri–Sat → still 5
    expect(countWorkingDaysInRange('2026-10-11', '2026-10-17')).toBe(5)
  })

  it('excludes holidays from working day count', () => {
    expect(
      countWorkingDaysInRange(
        '2026-10-11',
        '2026-10-15',
        new Set(['2026-10-13'])
      )
    ).toBe(4)
  })

  it('lists working days in range', () => {
    expect(listWorkingDaysInRange('2026-10-12', '2026-10-14')).toEqual([
      '2026-10-12',
      '2026-10-13',
      '2026-10-14',
    ])
  })
})
