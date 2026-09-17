import {
  addCalendarDays,
  DELIVERY_LABELS_MAX_DAYS_AHEAD,
  getDeliveryLabelDateWindow,
  resolveDeliveryDayFilter,
  tomorrowKSA,
} from '../deliveryDayFilterUtils'
import { ValidationError } from '../../../../shared/errors/index.js'

const REF = new Date('2026-09-17T10:00:00Z')

describe('deliveryDayFilterUtils', () => {
  it('defaults to today in KSA when no params', () => {
    const result = resolveDeliveryDayFilter({}, REF)
    expect(result).toEqual({
      date: '2026-09-17',
      day: 'today',
      date_label: 'Today · Thu, Sep 17',
    })
  })

  it('resolves day=tomorrow', () => {
    const result = resolveDeliveryDayFilter({ day: 'tomorrow' }, REF)
    expect(result.date).toBe('2026-09-18')
    expect(result.day).toBe('tomorrow')
    expect(result.date_label).toBe('Tomorrow · Fri, Sep 18')
  })

  it('delivery_date wins over day', () => {
    const result = resolveDeliveryDayFilter(
      { day: 'tomorrow', delivery_date: '2026-09-17' },
      REF
    )
    expect(result.date).toBe('2026-09-17')
    expect(result.day).toBe('today')
  })

  it('legacy date param works like delivery_date', () => {
    const result = resolveDeliveryDayFilter({ date: '2026-09-18' }, REF)
    expect(result.date).toBe('2026-09-18')
    expect(result.day).toBe('tomorrow')
  })

  it('allows delivery_date up to 7 days ahead', () => {
    const result = resolveDeliveryDayFilter({ delivery_date: '2026-09-20' }, REF)
    expect(result.date).toBe('2026-09-20')
    expect(result.day).toBeNull()
    expect(result.date_label).toBe('Sun, Sep 20')
  })

  it('allows delivery_date on the max window boundary', () => {
    const { max_date } = getDeliveryLabelDateWindow(REF)
    expect(max_date).toBe('2026-09-24')
    const result = resolveDeliveryDayFilter({ delivery_date: max_date }, REF)
    expect(result.date).toBe('2026-09-24')
    expect(result.day).toBeNull()
  })

  it('rejects dates before today or beyond the 7-day window', () => {
    expect(() =>
      resolveDeliveryDayFilter({ delivery_date: '2026-09-16' }, REF)
    ).toThrow(ValidationError)

    try {
      resolveDeliveryDayFilter({ delivery_date: '2026-09-25' }, REF)
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError)
      const err = error as ValidationError
      expect(err.details).toMatchObject({
        error: 'DATE_OUT_OF_RANGE',
        min_date: '2026-09-17',
        max_date: '2026-09-24',
        max_days_ahead: DELIVERY_LABELS_MAX_DAYS_AHEAD,
      })
    }
  })

  it('skips label window validation when restrictToLabelWindow is false', () => {
    const result = resolveDeliveryDayFilter(
      { delivery_date: '2026-10-01' },
      REF,
      { restrictToLabelWindow: false }
    )
    expect(result.date).toBe('2026-10-01')
    expect(result.day).toBeNull()
  })

  it('addCalendarDays and tomorrowKSA', () => {
    expect(addCalendarDays('2026-09-17', 1)).toBe('2026-09-18')
    expect(tomorrowKSA(REF)).toBe('2026-09-18')
  })
})
