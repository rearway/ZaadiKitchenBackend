import {
  getSkipCutoffTimestamp,
  isAfterSkipCutoff,
} from '../weekUtils.js'

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
