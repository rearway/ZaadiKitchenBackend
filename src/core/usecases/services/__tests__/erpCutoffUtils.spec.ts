import {
  getErpCutoffForDeliveryDate,
  isAfterErpCutoff,
  resolveDefaultDeliveryDate,
  resolveDailyOrdersDate,
} from '../erpCutoffUtils.js'

describe('erpCutoffUtils', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv, ERP_CUTOFF_TIME_KSA: '19:00' }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('treats delivery day as frozen after cutoff on previous day 19:00 KSA', () => {
    const deliveryDate = '2026-10-06' // Tuesday
    const cutoff = getErpCutoffForDeliveryDate(deliveryDate)
    const justBefore = new Date(cutoff.getTime() - 1000)
    const justAfter = new Date(cutoff.getTime() + 1000)
    expect(isAfterErpCutoff(deliveryDate, justBefore)).toBe(false)
    expect(isAfterErpCutoff(deliveryDate, justAfter)).toBe(true)
  })

  it('keeps explicit requested date in resolvedDeliveryDate', () => {
    const holidays = new Set<string>()
    const result = resolveDailyOrdersDate('2026-10-06', holidays, new Date('2026-10-05T14:00:00Z'))
    expect(result.resolvedDeliveryDate).toBe('2026-10-06')
    expect(result.requestedDate).toBe('2026-10-06')
    expect(result.frozen).toBe(false)
  })

  it('marks frozen when after cutoff for requested date', () => {
    const holidays = new Set<string>()
    const afterCutoff = getErpCutoffForDeliveryDate('2026-10-06')
    const result = resolveDailyOrdersDate(
      '2026-10-06',
      holidays,
      new Date(afterCutoff.getTime() + 60_000)
    )
    expect(result.frozen).toBe(true)
    expect(result.resolvedDeliveryDate).toBe('2026-10-06')
  })

  it('resolveDefaultDeliveryDate skips non-workdays', () => {
    const holidays = new Set<string>()
    const friday = new Date('2026-10-09T10:00:00Z')
    const date = resolveDefaultDeliveryDate(holidays, friday)
    expect(date).toBe('2026-10-11')
  })
})
