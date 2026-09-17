import {
  addCalendarDays,
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

  it('rejects dates outside today and tomorrow window', () => {
    expect(() =>
      resolveDeliveryDayFilter({ delivery_date: '2026-09-20' }, REF)
    ).toThrow(ValidationError)
  })

  it('addCalendarDays and tomorrowKSA', () => {
    expect(addCalendarDays('2026-09-17', 1)).toBe('2026-09-18')
    expect(tomorrowKSA(REF)).toBe('2026-09-18')
  })
})
