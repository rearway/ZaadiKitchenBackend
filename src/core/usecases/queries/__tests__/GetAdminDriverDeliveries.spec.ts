import { makeUC } from '../GetAdminDriverDeliveries'
import { buildDeps } from '../../../../__tests__/helpers/mock-deps'
import {
  ResourceNotFoundError,
  ValidationError,
} from '../../../../shared/errors'
import { todayKSA } from '../../services/revenueUtils'

const DRIVER_ID = 'driver-uuid-1'
const AREA_A = '11111111-1111-4111-8111-111111111111'
const DATE = '2026-10-26'

function driver(overrides: Record<string, unknown> = {}) {
  return {
    id: DRIVER_ID,
    fullName: 'Ahmed Al-Rashid',
    phone: '+966500111001',
    isActive: true,
    areas: [{ id: AREA_A, name: 'Olaya' }],
    createdAt: new Date('2026-10-01T00:00:00.000Z'),
    updatedAt: new Date('2026-10-01T00:00:00.000Z'),
    ...overrides,
  }
}

function depsWith(
  existing: ReturnType<typeof driver> | null,
  rows: unknown[] = []
) {
  const base = buildDeps()
  const getAdminDriverDeliveriesByDate = jest.fn().mockResolvedValue(rows)
  return {
    deps: buildDeps({
      driverAdminLoader: {
        ...base.driverAdminLoader,
        getDriverById: jest.fn().mockResolvedValue(existing),
      },
      deliveryDayLoader: {
        ...base.deliveryDayLoader,
        getAdminDriverDeliveriesByDate,
      },
    }),
    getAdminDriverDeliveriesByDate,
  }
}

describe('GetAdminDriverDeliveries', () => {
  it('returns an empty list when the driver has no deliveries that day', async () => {
    const { deps, getAdminDriverDeliveriesByDate } = depsWith(driver(), [])
    const result = await makeUC(deps)({ driverId: DRIVER_ID, date: DATE })

    expect(getAdminDriverDeliveriesByDate).toHaveBeenCalledWith(DATE, [AREA_A])
    expect(result).toEqual({
      message: 'Driver deliveries retrieved successfully',
      data: {
        driver_id: DRIVER_ID,
        date: DATE,
        timezone: 'Asia/Riyadh',
        deliveries: [],
      },
    })
  })

  it('returns an empty list without querying when the driver has no areas', async () => {
    const { deps, getAdminDriverDeliveriesByDate } = depsWith(
      driver({ areas: [] })
    )
    const result = await makeUC(deps)({ driverId: DRIVER_ID, date: DATE })

    expect(getAdminDriverDeliveriesByDate).not.toHaveBeenCalled()
    expect(result.data.deliveries).toEqual([])
  })

  it('maps each meal and includes a review only when the day is delivered', async () => {
    const { deps } = depsWith(driver(), [
      {
        deliveryDayId: 'dd-1',
        customerName: 'Sara M.',
        customerPhone: '+966500000201',
        mealName: 'Grilled Chicken Bowl',
        mealType: 'executive',
        status: 'delivered',
        reviewStars: 5,
        reviewTags: ['Great portion'],
      },
      {
        deliveryDayId: 'dd-2',
        customerName: 'Omar K.',
        customerPhone: '+966500000202',
        mealName: 'Caesar Salad',
        mealType: 'salad',
        status: 'scheduled',
        reviewStars: 4,
        reviewTags: ['Too salty'],
      },
      {
        deliveryDayId: 'dd-3',
        customerName: 'Layla H.',
        customerPhone: null,
        mealName: null,
        mealType: 'executive',
        status: 'past_cutoff',
        reviewStars: null,
        reviewTags: null,
      },
      {
        deliveryDayId: 'dd-4',
        customerName: 'Nora A.',
        customerPhone: '+966500000204',
        mealName: 'Chicken Shawarma',
        mealType: 'executive',
        status: 'skipped',
        reviewStars: null,
        reviewTags: null,
      },
      {
        deliveryDayId: 'dd-5',
        customerName: 'Hana S.',
        customerPhone: '+966500000205',
        mealName: 'Greek Salad',
        mealType: 'salad',
        status: 'paused',
        reviewStars: null,
        reviewTags: null,
      },
      {
        deliveryDayId: 'dd-6',
        customerName: 'No Review',
        customerPhone: '+966500000206',
        mealName: 'Beef Steak Plate',
        mealType: 'executive',
        status: 'delivered',
        reviewStars: null,
        reviewTags: null,
      },
    ])

    const result = await makeUC(deps)({ driverId: DRIVER_ID, date: DATE })

    expect(result.data.deliveries).toEqual([
      {
        delivery_id: 'dd-1',
        customer_name: 'Sara M.',
        phone: '+966500000201',
        meal_name: 'Grilled Chicken Bowl',
        meal_type: 'executive',
        status: 'delivered',
        domain_status: 'delivered',
        review: { stars: 5, text: 'Great portion', tags: ['Great portion'] },
      },
      {
        delivery_id: 'dd-2',
        customer_name: 'Omar K.',
        phone: '+966500000202',
        meal_name: 'Caesar Salad',
        meal_type: 'salad',
        status: 'pending',
        domain_status: 'scheduled',
        review: null,
      },
      {
        delivery_id: 'dd-3',
        customer_name: 'Layla H.',
        phone: null,
        meal_name: null,
        meal_type: 'executive',
        status: 'pending',
        domain_status: 'past_cutoff',
        review: null,
      },
      {
        delivery_id: 'dd-4',
        customer_name: 'Nora A.',
        phone: '+966500000204',
        meal_name: 'Chicken Shawarma',
        meal_type: 'executive',
        status: 'skipped',
        domain_status: 'skipped',
        review: null,
      },
      {
        delivery_id: 'dd-5',
        customer_name: 'Hana S.',
        phone: '+966500000205',
        meal_name: 'Greek Salad',
        meal_type: 'salad',
        status: 'paused',
        domain_status: 'paused',
        review: null,
      },
      {
        delivery_id: 'dd-6',
        customer_name: 'No Review',
        phone: '+966500000206',
        meal_name: 'Beef Steak Plate',
        meal_type: 'executive',
        status: 'delivered',
        domain_status: 'delivered',
        review: null,
      },
    ])
  })

  it('joins multiple rating tags into review text', async () => {
    const { deps } = depsWith(driver(), [
      {
        deliveryDayId: 'dd-1',
        customerName: 'Sara M.',
        customerPhone: '+966500000201',
        mealName: 'Grilled Chicken Bowl',
        mealType: 'executive',
        status: 'delivered',
        reviewStars: 4,
        reviewTags: ['Too spicy', 'Small portion'],
      },
    ])

    const result = await makeUC(deps)({ driverId: DRIVER_ID, date: DATE })
    expect(result.data.deliveries[0].review).toEqual({
      stars: 4,
      text: 'Too spicy, Small portion',
      tags: ['Too spicy', 'Small portion'],
    })
  })

  it('defaults the date to the KSA ops day', async () => {
    const { deps, getAdminDriverDeliveriesByDate } = depsWith(driver())
    const result = await makeUC(deps)({ driverId: DRIVER_ID })

    expect(result.data.date).toBe(todayKSA())
    expect(getAdminDriverDeliveriesByDate).toHaveBeenCalledWith(todayKSA(), [
      AREA_A,
    ])
  })

  it('returns 404 when the driver does not exist', async () => {
    const { deps, getAdminDriverDeliveriesByDate } = depsWith(null)
    await expect(
      makeUC(deps)({ driverId: DRIVER_ID, date: DATE })
    ).rejects.toBeInstanceOf(ResourceNotFoundError)
    expect(getAdminDriverDeliveriesByDate).not.toHaveBeenCalled()
  })

  it('rejects a date that is not a real calendar day', async () => {
    const { deps } = depsWith(driver())
    await expect(
      makeUC(deps)({ driverId: DRIVER_ID, date: '2026-02-31' })
    ).rejects.toBeInstanceOf(ValidationError)
  })
})
