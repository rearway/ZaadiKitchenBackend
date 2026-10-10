import {
  changeDirection,
  formatMonthLabel,
  getMonSunWeekForMonth,
  getDayLabelShort,
  normalizePlanSlug,
  pctChange,
} from '../revenueUtils'

describe('revenueUtils', () => {
  it('normalizes weekly plan alias to week slug', () => {
    expect(normalizePlanSlug('weekly')).toBe('week')
    expect(normalizePlanSlug('month')).toBe('month')
  })

  it('computes change direction', () => {
    expect(changeDirection(1)).toBe('up')
    expect(changeDirection(-1)).toBe('down')
    expect(changeDirection(0)).toBe('flat')
  })

  it('formats month labels', () => {
    expect(formatMonthLabel('2026-09')).toBe('Sep 2026')
  })

  it('computes pct change', () => {
    expect(pctChange(110, 100)).toBe(10)
    expect(pctChange(0, 0)).toBe(0)
  })

  it('returns Mon-Sun week for current month', () => {
    const week = getMonSunWeekForMonth('2026-09', '2026-09-17')
    expect(week).toHaveLength(7)
    expect(getDayLabelShort(week[0])).toBe('Mon')
    expect(week).toContain('2026-09-17')
  })
})
