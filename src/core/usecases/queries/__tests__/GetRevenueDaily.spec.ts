import { makeUC } from '../GetRevenueDaily'
import { buildDeps } from '../../../../__tests__/helpers/mock-deps'

describe('GetRevenueDaily', () => {
  it('returns daily revenue for the requested month', async () => {
    const deps = buildDeps({
      revenueLoader: {
        getSummary: jest.fn(),
        getDailyRevenue: jest.fn().mockImplementation(async (dates: string[]) =>
          dates.map(date => ({
            date,
            revenueSar:
              date === '2026-09-15'
                ? 4200
                : date === '2026-09-16'
                  ? 5100
                  : date === '2026-09-17'
                    ? 6800
                    : 0,
          }))
        ),
        getAvailableRevenueMonths: jest
          .fn()
          .mockResolvedValue(['2026-09', '2026-08']),
      },
    })
    const getRevenueDaily = makeUC(deps)

    const result = await getRevenueDaily({ month: '2026-09' })

    expect(result.data.month).toBe('2026-09')
    expect(result.data.month_label).toBe('Sep 2026')
    expect(result.data.days).toHaveLength(7)
    expect(result.data.days.find(d => d.date === '2026-09-15')?.revenue_sar).toBe(4200)
    expect(result.data.available_months).toEqual([
      { value: '2026-09', label: 'Sep 2026' },
      { value: '2026-08', label: 'Aug 2026' },
    ])
  })
})
