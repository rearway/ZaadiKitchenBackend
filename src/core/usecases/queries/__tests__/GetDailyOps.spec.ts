import { makeUC } from '../GetDailyOps'
import { buildDeps } from '../../../../__tests__/helpers/mock-deps'

// Cutoff is 15:00 UTC the day before delivery (= 6 PM KSA)
const FAR_FUTURE_DATE = '2099-12-31' // cutoff hasn't happened yet -> 'pending'
const PAST_DATE = '2020-01-06' // cutoff long passed -> 'locked' (no manual advance yet)

function makeIssueRow(overrides: Record<string, unknown> = {}) {
  return {
    issueId: 'iss-1',
    customerId: 'user-1',
    customerName: 'Sara Al-Mutairi',
    customerPhone: '+966502345678',
    deliveryAddress: 'Al Nakheel Tower · Floor 7',
    issueType: 'quality_issue',
    description: 'Meal was cold on arrival.',
    submittedAt: new Date(),
    deliveryDate: PAST_DATE,
    mealName: 'Lamb Kabsa',
    mealType: 'executive',
    planPricePerMealSar: 28,
    status: 'open' as const,
    creditedAmountSar: null,
    rejectionReason: null,
    rejectionNotes: null,
    resolvedAt: null,
    ...overrides,
  }
}

describe('GetDailyOps', () => {
  it("shows 'pending' before the cutoff with no manual advance", async () => {
    const deps = buildDeps({
      dailyOpsDayLoader: { getByDate: jest.fn().mockResolvedValue(null) } as unknown as ReturnType<typeof buildDeps>['dailyOpsDayLoader'],
    })
    const getDailyOps = makeUC(deps)

    const result = await getDailyOps({ date: FAR_FUTURE_DATE, role: 'admin' })

    expect(result.pipeline.stage).toBe('pending')
    expect(result.pipeline.can_advance).toBe(false)
    expect(result.pipeline.advance_label).toBeNull()
  })

  it("shows 'locked' after the cutoff and computes the meal breakdown", async () => {
    const deps = buildDeps({
      dailyOpsDayLoader: { getByDate: jest.fn().mockResolvedValue(null) } as unknown as ReturnType<typeof buildDeps>['dailyOpsDayLoader'],
      deliveryDayLoader: {
        ...buildDeps().deliveryDayLoader,
        getMealBreakdownByDate: jest.fn().mockResolvedValue([
          { mealType: 'executive', count: 3 },
          { mealType: 'salad', count: 2 },
        ]),
      },
    })
    const getDailyOps = makeUC(deps)

    const result = await getDailyOps({ date: PAST_DATE, role: 'admin' })

    expect(result.pipeline.stage).toBe('locked')
    expect(result.pipeline.can_advance).toBe(true)
    expect(result.pipeline.advance_label).toBe('Mark as Dispatched →')
    expect(result.meal_breakdown).toEqual({
      total: 5,
      rows: [
        { type: 'executive', label: 'Executive', count: 3, pct: 60 },
        { type: 'salad', label: 'Salad', count: 2, pct: 40 },
      ],
    })
  })

  it('reflects a manually-advanced stage from the persisted daily ops day', async () => {
    const deps = buildDeps({
      dailyOpsDayLoader: {
        getByDate: jest.fn().mockResolvedValue({
          date: PAST_DATE,
          dispatchedAt: new Date(),
          dispatchedById: 'admin-1',
          deliveredAt: null,
          deliveredById: null,
        }),
      } as unknown as ReturnType<typeof buildDeps>['dailyOpsDayLoader'],
    })
    const getDailyOps = makeUC(deps)

    const result = await getDailyOps({ date: PAST_DATE, role: 'admin' })

    expect(result.pipeline.stage).toBe('dispatch')
  })

  it('populates the issues queue for admin and nulls it for ops', async () => {
    const deps = buildDeps({
      deliveryIssueLoader: {
        ...buildDeps().deliveryIssueLoader,
        getOpenIssuesByDate: jest.fn().mockResolvedValue([makeIssueRow()]),
      },
    })
    const getDailyOps = makeUC(deps)

    const adminResult = await getDailyOps({ date: PAST_DATE, role: 'admin' })
    expect(adminResult.issues_queue).toEqual(
      expect.objectContaining({ open_count: 1 })
    )

    const opsResult = await getDailyOps({ date: PAST_DATE, role: 'ops' })
    expect(opsResult.issues_queue).toBeNull()
    expect(opsResult.pipeline.locked_at).toBeUndefined()
  })
})
