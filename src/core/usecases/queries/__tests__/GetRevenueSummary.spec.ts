import { makeUC } from '../GetRevenueSummary'
import { buildDeps } from '../../../../__tests__/helpers/mock-deps'

describe('GetRevenueSummary', () => {
  it('returns snake_case revenue summary envelope', async () => {
    const deps = buildDeps({
      revenueLoader: {
        getSummary: jest.fn().mockResolvedValue({
          mrrAmountSar: 54200,
          mrrPriorAmountSar: 48200,
          activeCount: 248,
          newTodayCount: 14,
          churnedCount: 3,
          subscribersByPlan: [
            { planSlug: 'month', count: 129 },
            { planSlug: 'week', count: 70 },
          ],
          avgSkipRate: 1.4,
          skipRateChange: 0.2,
          saladMealPct: 34.4,
        }),
        getDailyRevenue: jest.fn(),
        getAvailableRevenueMonths: jest.fn(),
      },
    })
    const getRevenueSummary = makeUC(deps)

    const result = await getRevenueSummary()

    expect(result.data.mrr.amount_sar).toBe(54200)
    expect(result.data.mrr.change_direction).toBe('up')
    expect(result.data.subscriber_counts.active).toBe(248)
    expect(result.data.subscribers_by_plan).toHaveLength(4)
    expect(result.data.subscribers_by_plan[0]).toEqual({
      plan_id: 'month',
      plan_label: 'Month',
      count: 129,
    })
    expect(result.data.subscribers_by_plan[1]).toEqual({
      plan_id: 'week',
      plan_label: 'Weekly',
      count: 70,
    })
    expect(result.data.key_metrics.avg_skip_rate.value).toBe(1.4)
    expect(result.data.key_metrics.avg_skip_rate.change).toBe(0.2)
    expect(result.data.key_metrics.salad_meal_pct.value).toBe(34)
  })
})
