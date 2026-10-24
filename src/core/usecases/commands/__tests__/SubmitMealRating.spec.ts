import { makeUC } from '../SubmitMealRating'
import {
  buildDeps,
  makeDeliveryDay,
  makeSubscription,
} from '../../../../__tests__/helpers/mock-deps'
import type { DailyOpsDay } from '../../../entities/DailyOpsDay'

const rating = {
  id: 'rating-1',
  userId: 'user-uuid-1',
  subscriptionId: 'sub-uuid-1',
  deliveryDayId: 'dd-uuid-1',
  mealId: 'meal-uuid-1',
  deliveryDate: '2026-10-27',
  stars: 4,
  tags: ['Great portion'],
  createdAt: new Date('2026-10-27T15:00:00Z'),
  updatedAt: new Date('2026-10-27T15:00:00Z'),
}

function opsDay(
  deliveredAt: Date | null,
  dispatchedAt: Date | null = null
): DailyOpsDay {
  return {
    date: '2026-10-27',
    dispatchedAt,
    dispatchedById: dispatchedAt ? 'admin-1' : null,
    deliveredAt,
    deliveredById: deliveredAt ? 'admin-1' : null,
    createdAt: new Date('2026-10-26T12:00:00Z'),
    updatedAt: new Date('2026-10-27T12:00:00Z'),
  }
}

function depsFor(
  day: ReturnType<typeof makeDeliveryDay>,
  ops: DailyOpsDay | null
) {
  const createRating = jest.fn().mockResolvedValue(rating)
  const getRatingByDeliveryDay = jest.fn().mockResolvedValue(null)
  const deps = buildDeps({
    subscriptionLoader: {
      ...buildDeps().subscriptionLoader,
      getActiveSubscriptionByUserId: jest
        .fn()
        .mockResolvedValue(makeSubscription()),
    },
    deliveryDayLoader: {
      ...buildDeps().deliveryDayLoader,
      getDeliveryDayById: jest.fn().mockResolvedValue(day),
    },
    dailyOpsDayLoader: {
      getByDate: jest.fn().mockResolvedValue(ops),
    } as unknown as ReturnType<typeof buildDeps>['dailyOpsDayLoader'],
    mealRatingPersistor: {
      createRating,
    } as unknown as ReturnType<typeof buildDeps>['mealRatingPersistor'],
    mealRatingLoader: {
      ...buildDeps().mealRatingLoader,
      getRatingByDeliveryDay,
    },
  })
  return { deps, createRating, getRatingByDeliveryDay }
}

describe('SubmitMealRating', () => {
  const input = {
    userId: 'user-uuid-1',
    mealId: 'meal-uuid-1',
    deliveryDayId: 'dd-uuid-1',
    stars: 4,
    tags: ['Great portion'],
  }

  it('accepts a rider-delivered meal after Daily Ops has closed the day', async () => {
    const day = makeDeliveryDay({
      status: 'delivered',
      date: '2026-10-27',
      deliveredAt: new Date('2026-10-27T09:00:00Z'),
    })
    const { deps, createRating } = depsFor(
      day,
      opsDay(new Date('2026-10-27T18:00:00Z'))
    )
    const submit = makeUC(deps)

    const result = await submit(input)

    expect(createRating).toHaveBeenCalledWith(
      expect.objectContaining({
        deliveryDayId: 'dd-uuid-1',
        deliveryDate: '2026-10-27',
        stars: 4,
      })
    )
    expect(result.data).toEqual(rating)
  })

  it('accepts an unrated stop once Daily Ops has closed the day, without a rider mark', async () => {
    const day = makeDeliveryDay({ status: 'scheduled', date: '2026-10-27' })
    const { deps, createRating } = depsFor(
      day,
      opsDay(new Date('2026-10-27T18:00:00Z'))
    )

    await makeUC(deps)(input)

    expect(createRating).toHaveBeenCalled()
  })

  it('accepts a past-cutoff stop on an ops-delivered day', async () => {
    const day = makeDeliveryDay({ status: 'past_cutoff', date: '2026-10-27' })
    const { deps, createRating } = depsFor(
      day,
      opsDay(new Date('2026-10-27T18:00:00Z'))
    )

    await makeUC(deps)(input)

    expect(createRating).toHaveBeenCalled()
  })

  it('rejects a stop that is not rider-delivered while the ops day is still open', async () => {
    const day = makeDeliveryDay({ status: 'scheduled', date: '2026-10-27' })
    const { deps, createRating } = depsFor(
      day,
      opsDay(null, new Date('2026-10-27T08:00:00Z'))
    )

    await expect(makeUC(deps)(input)).rejects.toMatchObject({
      errorCode: 'VALIDATION_ERROR',
      message: 'Only delivered meals can be rated',
    })
    expect(createRating).not.toHaveBeenCalled()
  })

  it('rejects skipped and paused stops even after the ops day is delivered', async () => {
    for (const status of ['skipped', 'paused'] as const) {
      const day = makeDeliveryDay({ status, date: '2026-10-27' })
      const { deps, createRating } = depsFor(
        day,
        opsDay(new Date('2026-10-27T18:00:00Z'))
      )

      await expect(makeUC(deps)(input)).rejects.toMatchObject({
        errorCode: 'VALIDATION_ERROR',
      })
      expect(createRating).not.toHaveBeenCalled()
    }
  })

  it('still rejects a second rating after the day has closed', async () => {
    const day = makeDeliveryDay({ status: 'delivered', date: '2026-10-27' })
    const { deps, createRating, getRatingByDeliveryDay } = depsFor(
      day,
      opsDay(new Date('2026-10-27T18:00:00Z'))
    )
    getRatingByDeliveryDay.mockResolvedValue(rating)

    await expect(makeUC(deps)(input)).rejects.toMatchObject({
      errorCode: 'RATING_ALREADY_SUBMITTED',
      statusCode: 409,
    })
    expect(createRating).not.toHaveBeenCalled()
  })
})
