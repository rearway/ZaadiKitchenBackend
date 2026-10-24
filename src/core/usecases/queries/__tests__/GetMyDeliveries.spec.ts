import { makeUC } from '../GetMyDeliveries'
import { buildDeps, makeUser } from '../../../../__tests__/helpers/mock-deps'

const RIDER_ID = 'rider-uuid-1'
const AREA_A = '11111111-1111-4111-8111-111111111111'
const AREA_B = '22222222-2222-4222-8222-222222222222'

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    deliveryDayId: 'dd-uuid-1',
    customerName: 'Ahmed Al-Rashidi',
    customerPhone: '+966501234567',
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

function riderDeps(
  options: {
    areaIds?: string[]
    rider?: Record<string, unknown> | null
    rows?: ReturnType<typeof makeRow>[]
  } = {}
) {
  const areaIds = options.areaIds ?? [AREA_A]
  const rider =
    options.rider === undefined
      ? makeUser({
          id: RIDER_ID,
          role: 'DRIVER',
          fullName: 'Khalid Al-Harbi',
          isActive: true,
        })
      : options.rider

  return buildDeps({
    userLoader: {
      ...buildDeps().userLoader,
      getUserById: jest.fn().mockResolvedValue(rider),
    },
    driverAdminLoader: {
      ...buildDeps().driverAdminLoader,
      getAssignedAreaIds: jest.fn().mockResolvedValue(areaIds),
    },
    deliveryDayLoader: {
      ...buildDeps().deliveryDayLoader,
      getRiderDeliveriesByDate: jest
        .fn()
        .mockResolvedValue(options.rows ?? [makeRow()]),
    },
  })
}

describe('GetMyDeliveries', () => {
  it("returns the rider's name and deliveries in the driver's assigned areas", async () => {
    const deps = riderDeps()
    const getMyDeliveries = makeUC(deps)

    const result = await getMyDeliveries({ riderId: RIDER_ID })

    expect(result.rider_name).toBe('Khalid Al-Harbi')
    expect(result.total_deliveries).toBe(1)
    expect(result.deliveries[0]).toMatchObject({
      delivery_id: 'dd-uuid-1',
      customer_name: 'Ahmed Al-Rashidi',
      customer_phone: '+966501234567',
      meal_name: 'Lamb Kabsa',
      status: 'pending',
    })
    expect(
      deps.deliveryDayLoader.getRiderDeliveriesByDate
    ).toHaveBeenCalledWith(
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      undefined,
      [AREA_A]
    )
  })

  it('maps status "delivered" through as-is and everything else to "pending"', async () => {
    const deps = riderDeps({
      rows: [
        makeRow({
          deliveryDayId: 'dd-1',
          status: 'delivered',
          deliveredAt: new Date('2026-08-02T12:00:00Z'),
        }),
        makeRow({ deliveryDayId: 'dd-2', status: 'scheduled' }),
        makeRow({ deliveryDayId: 'dd-3', status: 'past_cutoff' }),
      ],
    })
    const getMyDeliveries = makeUC(deps)

    const result = await getMyDeliveries({
      riderId: RIDER_ID,
      date: '2026-08-02',
    })

    expect(result.total_deliveries).toBe(3)
    expect(result.delivered_count).toBe(1)
    expect(result.pending_count).toBe(2)
    expect(result.deliveries.map(d => d.status)).toEqual([
      'delivered',
      'pending',
      'pending',
    ])
  })

  it('queries every assigned area when the client does not pass areaId', async () => {
    const deps = riderDeps({ areaIds: [AREA_A, AREA_B], rows: [] })
    const getMyDeliveries = makeUC(deps)

    await getMyDeliveries({ riderId: RIDER_ID, date: '2026-08-02' })

    expect(
      deps.deliveryDayLoader.getRiderDeliveriesByDate
    ).toHaveBeenCalledWith('2026-08-02', undefined, [AREA_A, AREA_B])
  })

  it('passes a requested areaId only when that area is assigned to the driver', async () => {
    const deps = riderDeps({ areaIds: [AREA_A, AREA_B], rows: [] })
    const getMyDeliveries = makeUC(deps)

    await getMyDeliveries({
      riderId: RIDER_ID,
      date: '2026-08-02',
      areaId: AREA_B,
    })

    expect(
      deps.deliveryDayLoader.getRiderDeliveriesByDate
    ).toHaveBeenCalledWith('2026-08-02', AREA_B, undefined)
  })

  it('returns an empty list and does not query deliveries when the requested area is not assigned', async () => {
    const deps = riderDeps({ areaIds: [AREA_A], rows: [makeRow()] })
    const getMyDeliveries = makeUC(deps)

    const result = await getMyDeliveries({
      riderId: RIDER_ID,
      date: '2026-08-02',
      areaId: AREA_B,
    })

    expect(result).toMatchObject({
      rider_name: 'Khalid Al-Harbi',
      total_deliveries: 0,
      delivered_count: 0,
      pending_count: 0,
      deliveries: [],
    })
    expect(
      deps.deliveryDayLoader.getRiderDeliveriesByDate
    ).not.toHaveBeenCalled()
  })

  it('returns an empty list and does not query deliveries when the driver has no assigned areas', async () => {
    const deps = riderDeps({ areaIds: [], rows: [makeRow()] })
    const getMyDeliveries = makeUC(deps)

    const result = await getMyDeliveries({
      riderId: RIDER_ID,
      date: '2026-08-02',
    })

    expect(result).toMatchObject({
      rider_name: 'Khalid Al-Harbi',
      total_deliveries: 0,
      delivered_count: 0,
      pending_count: 0,
      deliveries: [],
    })
    expect(
      deps.deliveryDayLoader.getRiderDeliveriesByDate
    ).not.toHaveBeenCalled()
  })

  it('returns an empty list for an inactive driver even when areas are assigned', async () => {
    const deps = riderDeps({
      rider: makeUser({
        id: RIDER_ID,
        role: 'DRIVER',
        fullName: 'Khalid Al-Harbi',
        isActive: false,
      }),
      rows: [makeRow()],
    })
    const getMyDeliveries = makeUC(deps)

    const result = await getMyDeliveries({
      riderId: RIDER_ID,
      date: '2026-08-02',
    })

    expect(result.total_deliveries).toBe(0)
    expect(result.deliveries).toEqual([])
    expect(
      deps.deliveryDayLoader.getRiderDeliveriesByDate
    ).not.toHaveBeenCalled()
  })

  it('returns an empty list for a soft-deleted driver', async () => {
    const deps = riderDeps({
      rider: makeUser({
        id: RIDER_ID,
        role: 'DRIVER',
        fullName: 'Khalid Al-Harbi',
        isActive: false,
        deletedAt: new Date('2026-10-24T00:00:00Z'),
      }),
      rows: [makeRow()],
    })
    const getMyDeliveries = makeUC(deps)

    const result = await getMyDeliveries({
      riderId: RIDER_ID,
      date: '2026-08-02',
    })

    expect(result.total_deliveries).toBe(0)
    expect(
      deps.deliveryDayLoader.getRiderDeliveriesByDate
    ).not.toHaveBeenCalled()
  })

  it('returns a zeroed-out shape (not an error) when the loader finds no deliveries in the assigned areas', async () => {
    const deps = riderDeps({ rows: [] })
    const getMyDeliveries = makeUC(deps)

    const result = await getMyDeliveries({
      riderId: RIDER_ID,
      date: '2026-08-02',
      areaId: AREA_A,
    })

    expect(result).toMatchObject({
      total_deliveries: 0,
      delivered_count: 0,
      pending_count: 0,
      deliveries: [],
    })
  })

  it('returns an empty list (does not throw) when the rider profile lookup returns null', async () => {
    const deps = riderDeps({ rider: null, rows: [makeRow()] })
    const getMyDeliveries = makeUC(deps)

    const result = await getMyDeliveries({
      riderId: RIDER_ID,
      date: '2026-08-02',
    })

    expect(result.rider_name).toBe('')
    expect(result.total_deliveries).toBe(0)
    expect(
      deps.deliveryDayLoader.getRiderDeliveriesByDate
    ).not.toHaveBeenCalled()
  })

  it('a row with no primary delivery location (null area/building) is passed through without throwing', async () => {
    const deps = riderDeps({
      rows: [
        makeRow({
          areaName: null,
          buildingName: null,
          floor: null,
          deskArea: null,
        }),
      ],
    })
    const getMyDeliveries = makeUC(deps)

    const result = await getMyDeliveries({
      riderId: RIDER_ID,
      date: '2026-08-02',
    })

    expect(result.deliveries[0]).toMatchObject({
      area: null,
      building: null,
      floor: null,
      desk_area: null,
    })
  })
})
