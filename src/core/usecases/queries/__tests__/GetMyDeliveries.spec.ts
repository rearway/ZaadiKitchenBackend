import { makeUC } from '../GetMyDeliveries'
import { buildDeps, makeUser } from '../../../../__tests__/helpers/mock-deps'

const RIDER_ID = 'rider-uuid-1'

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    deliveryDayId: 'dd-uuid-1',
    customerName: 'Ahmed Al-Rashidi',
    buildingName: 'Al Nakheel Tower',
    floor: 'Floor 7',
    deskArea: 'Desk B12',
    deliveryPreference: 'hand_to_me' as const,
    riderNotes: 'Call me on arrival',
    areaName: 'Al Nakheel',
    mealType: 'executive' as const,
    mealName: 'Lamb Kabsa',
    status: 'scheduled' as const,
    deliveredAt: null,
    ...overrides,
  }
}

describe('GetMyDeliveries', () => {
  it("returns the rider's name and today's deliveries when no date is given", async () => {
    const deps = buildDeps({
      userLoader: {
        ...buildDeps().userLoader,
        getUserById: jest.fn().mockResolvedValue(makeUser({ id: RIDER_ID, fullName: 'Khalid Al-Harbi' })),
      },
      deliveryDayLoader: {
        ...buildDeps().deliveryDayLoader,
        getRiderDeliveriesByDate: jest.fn().mockResolvedValue([makeRow()]),
      },
    })
    const getMyDeliveries = makeUC(deps)

    const result = await getMyDeliveries({ riderId: RIDER_ID })

    expect(result.rider_name).toBe('Khalid Al-Harbi')
    expect(result.total_deliveries).toBe(1)
    expect(result.deliveries[0]).toMatchObject({
      delivery_id: 'dd-uuid-1',
      customer_name: 'Ahmed Al-Rashidi',
      status: 'pending',
    })
  })

  it('maps status "delivered" through as-is and everything else to "pending"', async () => {
    const deps = buildDeps({
      userLoader: {
        ...buildDeps().userLoader,
        getUserById: jest.fn().mockResolvedValue(makeUser({ id: RIDER_ID })),
      },
      deliveryDayLoader: {
        ...buildDeps().deliveryDayLoader,
        getRiderDeliveriesByDate: jest.fn().mockResolvedValue([
          makeRow({ deliveryDayId: 'dd-1', status: 'delivered', deliveredAt: new Date('2026-08-02T12:00:00Z') }),
          makeRow({ deliveryDayId: 'dd-2', status: 'scheduled' }),
          makeRow({ deliveryDayId: 'dd-3', status: 'past_cutoff' }),
        ]),
      },
    })
    const getMyDeliveries = makeUC(deps)

    const result = await getMyDeliveries({ riderId: RIDER_ID, date: '2026-08-02' })

    expect(result.total_deliveries).toBe(3)
    expect(result.delivered_count).toBe(1)
    expect(result.pending_count).toBe(2)
    expect(result.deliveries.map(d => d.status)).toEqual(['delivered', 'pending', 'pending'])
  })

  it('passes the areaId filter through to the loader', async () => {
    const deps = buildDeps({
      userLoader: {
        ...buildDeps().userLoader,
        getUserById: jest.fn().mockResolvedValue(makeUser({ id: RIDER_ID })),
      },
    })
    const getMyDeliveries = makeUC(deps)

    await getMyDeliveries({ riderId: RIDER_ID, date: '2026-08-02', areaId: 'area-uuid-1' })

    expect(deps.deliveryDayLoader.getRiderDeliveriesByDate).toHaveBeenCalledWith('2026-08-02', 'area-uuid-1')
  })

  it('defaults to "all areas" (undefined) when no areaId is given', async () => {
    const deps = buildDeps({
      userLoader: {
        ...buildDeps().userLoader,
        getUserById: jest.fn().mockResolvedValue(makeUser({ id: RIDER_ID })),
      },
    })
    const getMyDeliveries = makeUC(deps)

    await getMyDeliveries({ riderId: RIDER_ID, date: '2026-08-02' })

    expect(deps.deliveryDayLoader.getRiderDeliveriesByDate).toHaveBeenCalledWith('2026-08-02', undefined)
  })

  it('returns a zeroed-out shape (not an error) when the loader finds no deliveries', async () => {
    const deps = buildDeps({
      userLoader: {
        ...buildDeps().userLoader,
        getUserById: jest.fn().mockResolvedValue(makeUser({ id: RIDER_ID })),
      },
      deliveryDayLoader: {
        ...buildDeps().deliveryDayLoader,
        getRiderDeliveriesByDate: jest.fn().mockResolvedValue([]),
      },
    })
    const getMyDeliveries = makeUC(deps)

    const result = await getMyDeliveries({ riderId: RIDER_ID, date: '2026-08-02', areaId: 'area-uuid-1' })

    expect(result).toMatchObject({
      total_deliveries: 0,
      delivered_count: 0,
      pending_count: 0,
      deliveries: [],
    })
  })

  it('falls back to an empty rider_name (does not throw) when the rider profile lookup returns null', async () => {
    const deps = buildDeps({
      userLoader: {
        ...buildDeps().userLoader,
        getUserById: jest.fn().mockResolvedValue(null),
      },
      deliveryDayLoader: {
        ...buildDeps().deliveryDayLoader,
        getRiderDeliveriesByDate: jest.fn().mockResolvedValue([makeRow()]),
      },
    })
    const getMyDeliveries = makeUC(deps)

    const result = await getMyDeliveries({ riderId: RIDER_ID, date: '2026-08-02' })

    expect(result.rider_name).toBe('')
    expect(result.total_deliveries).toBe(1)
  })

  it('a row with no primary delivery location (null area/building) is passed through without throwing', async () => {
    const deps = buildDeps({
      userLoader: {
        ...buildDeps().userLoader,
        getUserById: jest.fn().mockResolvedValue(makeUser({ id: RIDER_ID })),
      },
      deliveryDayLoader: {
        ...buildDeps().deliveryDayLoader,
        getRiderDeliveriesByDate: jest.fn().mockResolvedValue([
          makeRow({ areaName: null, buildingName: null, floor: null, deskArea: null }),
        ]),
      },
    })
    const getMyDeliveries = makeUC(deps)

    const result = await getMyDeliveries({ riderId: RIDER_ID, date: '2026-08-02' })

    expect(result.deliveries[0]).toMatchObject({ area: null, building: null, floor: null, desk_area: null })
  })
})
