import { promoteSubscriptionInPlace } from '../PromoteSubscription'
import {
  buildDeps,
  makeSubscription,
  makePlan,
  makeDeliveryDay,
} from '../../../../__tests__/helpers/mock-deps'

describe('promoteSubscriptionInPlace', () => {
  it('adds delivery days up to new plan meal count from original start date', async () => {
    const subscription = makeSubscription({
      id: 'sub-1',
      startDate: '2025-10-07',
      endDate: '2025-10-07',
      mealType: 'executive',
      totalMealDays: 1,
      planId: 'plan-try',
    })
    const weekPlan = makePlan({
      id: 'plan-week',
      slug: 'week',
      mealCount: 5,
      skipDaysAllowed: 15,
      pauseDaysAllowed: 15,
    })

    const existingDay = makeDeliveryDay({
      subscriptionId: 'sub-1',
      date: '2025-10-07',
      status: 'delivered',
    })

    const deps = buildDeps({
      deliveryDayLoader: {
        ...buildDeps().deliveryDayLoader,
        getDeliveryDaysBySubscription: jest.fn().mockResolvedValue([existingDay]),
      },
      deliveryDayPersistor: {
        ...buildDeps().deliveryDayPersistor,
        bulkCreateDeliveryDays: jest.fn().mockImplementation(async days => days),
        deleteScheduledDeliveryDaysOutsideDates: jest.fn().mockResolvedValue(undefined),
      },
      subscriptionPersistor: {
        ...buildDeps().subscriptionPersistor,
        updateSubscription: jest.fn().mockImplementation(async (id, updates) => ({
          ...subscription,
          ...updates,
          id,
        })),
      },
    })

    const result = await promoteSubscriptionInPlace(deps, {
      userId: 'user-1',
      subscription,
      newPlan: weekPlan,
      mealType: 'executive',
    })

    expect(deps.deliveryDayPersistor.bulkCreateDeliveryDays).toHaveBeenCalled()
    const created = (deps.deliveryDayPersistor.bulkCreateDeliveryDays as jest.Mock).mock
      .calls[0][0]
    expect(created.length).toBe(4)
    expect(result.subscription.planId).toBe('plan-week')
    expect(result.subscription.totalMealDays).toBe(5)
    expect(result.subscription.startDate).toBe('2025-10-07')
  })
})
