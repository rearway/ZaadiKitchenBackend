import { QueryTypes } from 'sequelize'

import { AreaAlreadyAssignedError } from '../../../shared/errors/index.js'
import { DriverAdminPersistenceService } from '../driver-admin-persistence.service'
import { SubscriptionPersistenceService } from '../subscription-persistence.service'
import {
  DeliveryAreaModel,
  DeliveryDayModel,
  DriverAreaAssignmentModel,
  UserModel,
} from '../models/index.js'

const DRIVER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const OTHER_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const AREA_ID = '11111111-1111-4111-8111-111111111111'

function userRow() {
  return {
    id: DRIVER_ID,
    fullName: 'Ahmed Al-Rashid',
    phone: '+966500111001',
    isActive: true,
    createdAt: new Date('2026-10-01T00:00:00.000Z'),
    updatedAt: new Date('2026-10-01T00:00:00.000Z'),
    update: jest.fn(),
  }
}

describe('driver day deliveries and area exclusivity', () => {
  const query = jest.fn<
    Promise<unknown[]>,
    [string, { type?: unknown; replacements?: unknown }?]
  >()

  beforeEach(() => {
    query.mockReset()
    const sequelize = {
      transaction: (fn: (transaction: object) => Promise<unknown>) => fn({}),
      query,
    }
    Object.defineProperty(UserModel, 'sequelize', {
      configurable: true,
      get: () => sequelize,
    })
    Object.defineProperty(DeliveryDayModel, 'sequelize', {
      configurable: true,
      get: () => sequelize,
    })
  })

  afterEach(() => {
    delete (UserModel as { sequelize?: unknown }).sequelize
    delete (DeliveryDayModel as { sequelize?: unknown }).sequelize
    jest.restoreAllMocks()
  })

  it('returns no driver-day rows when the driver has no areas, without querying', async () => {
    const service = new SubscriptionPersistenceService()
    await expect(
      service.getAdminDriverDeliveriesByDate('2026-10-26', [])
    ).resolves.toEqual([])
    expect(query).not.toHaveBeenCalled()
  })

  it('loads every meal for the areas, including skipped days and the rating', async () => {
    query.mockResolvedValue([
      {
        delivery_day_id: 'dd-1',
        customer_name: 'Sara M.',
        customer_phone: '+966500000201',
        meal_name: 'Grilled Chicken Bowl',
        meal_type: 'executive',
        status: 'delivered',
        review_stars: '5',
        review_tags: '["Great portion"]',
      },
    ])
    const service = new SubscriptionPersistenceService()

    const rows = await service.getAdminDriverDeliveriesByDate('2026-10-26', [
      AREA_ID,
    ])

    const sql = query.mock.calls[0][0]
    expect(sql).toContain('COALESCE(em.name_en, dd.meal_name)')
    expect(sql).toContain('menu_slots')
    expect(sql).toContain('meal_ratings')
    expect(sql).toContain('da.deleted_at IS NULL')
    expect(sql).toContain('da.id IN (:areaIds)')
    expect(sql).toContain(
      "dd.status IN ('scheduled', 'past_cutoff', 'delivered', 'skipped', 'paused')"
    )
    expect(sql).not.toContain('DISTINCT ON')
    expect(query.mock.calls[0][1]).toMatchObject({
      type: QueryTypes.SELECT,
      replacements: { date: '2026-10-26', areaIds: [AREA_ID] },
    })
    expect(rows).toEqual([
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
    ])
  })

  it('lists only live areas that have no assignment', async () => {
    query.mockResolvedValue([{ id: AREA_ID, name: 'Exit 5', status: 'active' }])
    const service = new DriverAdminPersistenceService()

    const areas = await service.listUnassignedAreas()

    const sql = query.mock.calls[0][0]
    expect(sql).toContain('deleted_at IS NULL')
    expect(sql).toContain('driver_area_assignments')
    expect(sql).toContain('NOT EXISTS')
    expect(sql).not.toMatch(/da\.status\s*=/)
    expect(areas).toEqual([{ id: AREA_ID, name: 'Exit 5', status: 'active' }])
  })

  it('rejects assign when the locked area already belongs to another driver', async () => {
    query.mockImplementation((sql: string) => {
      if (sql.includes('FROM delivery_areas')) {
        return [{ id: AREA_ID, name: 'Olaya' }]
      }
      return [{ driver_id: OTHER_ID, full_name: 'Fahad Al-Otaibi' }]
    })
    jest.spyOn(UserModel, 'findOne').mockResolvedValue(userRow())
    const create = jest
      .spyOn(DriverAreaAssignmentModel, 'create')
      .mockResolvedValue({})
    const service = new DriverAdminPersistenceService()

    await expect(service.assignArea(DRIVER_ID, AREA_ID)).rejects.toMatchObject({
      statusCode: 409,
      errorCode: 'AREA_ALREADY_ASSIGNED',
      message:
        'Area "Olaya" is already assigned to Fahad Al-Otaibi. One area = one driver.',
      details: {
        area_id: AREA_ID,
        area_name: 'Olaya',
        driver_id: OTHER_ID,
        driver_name: 'Fahad Al-Otaibi',
      },
    })
    expect(query.mock.calls[0][0]).toContain('FOR UPDATE')
    expect(query.mock.calls[1][0]).toContain('FOR UPDATE OF a')
    expect(create).not.toHaveBeenCalled()
    await expect(service.assignArea(DRIVER_ID, AREA_ID)).rejects.toBeInstanceOf(
      AreaAlreadyAssignedError
    )
  })

  it('locks the area and skips insert when this driver already has it', async () => {
    query.mockImplementation((sql: string) => {
      if (sql.includes('FROM delivery_areas')) {
        return [{ id: AREA_ID, name: 'Olaya' }]
      }
      return []
    })
    jest.spyOn(UserModel, 'findOne').mockResolvedValue(userRow())
    jest.spyOn(DriverAreaAssignmentModel, 'findOne').mockResolvedValue({
      driverId: DRIVER_ID,
      areaId: AREA_ID,
    } as DriverAreaAssignmentModel)
    const create = jest
      .spyOn(DriverAreaAssignmentModel, 'create')
      .mockResolvedValue({})
    jest
      .spyOn(DriverAreaAssignmentModel, 'findAll')
      .mockResolvedValue([{ areaId: AREA_ID }] as DriverAreaAssignmentModel[])
    jest
      .spyOn(DeliveryAreaModel, 'findAll')
      .mockResolvedValue([
        { id: AREA_ID, name: 'Olaya' },
      ] as DeliveryAreaModel[])
    const service = new DriverAdminPersistenceService()

    const driver = await service.assignArea(DRIVER_ID, AREA_ID)

    expect(query.mock.calls[0][0]).toContain('FOR UPDATE')
    expect(create).not.toHaveBeenCalled()
    expect(driver.areas).toEqual([{ id: AREA_ID, name: 'Olaya' }])
  })

  it('does not replace assignments when update hits an area owned by someone else', async () => {
    query.mockImplementation((sql: string) => {
      if (sql.includes('FROM delivery_areas')) {
        return [{ id: AREA_ID, name: 'Olaya' }]
      }
      return [{ driver_id: OTHER_ID, full_name: 'Fahad Al-Otaibi' }]
    })
    jest.spyOn(UserModel, 'findOne').mockResolvedValue(userRow())
    const destroy = jest
      .spyOn(DriverAreaAssignmentModel, 'destroy')
      .mockResolvedValue(0)
    const service = new DriverAdminPersistenceService()

    await expect(
      service.updateDriver(DRIVER_ID, { areaIds: [AREA_ID] })
    ).rejects.toBeInstanceOf(AreaAlreadyAssignedError)
    expect(query.mock.calls[0][0]).toContain('FOR UPDATE')
    expect(destroy).not.toHaveBeenCalled()
  })

  it('does not create the driver when a requested area is already taken', async () => {
    query.mockImplementation((sql: string) => {
      if (sql.includes('FROM delivery_areas')) {
        return [{ id: AREA_ID, name: 'Olaya' }]
      }
      return [{ driver_id: OTHER_ID, full_name: 'Fahad Al-Otaibi' }]
    })
    const createUser = jest
      .spyOn(UserModel, 'create')
      .mockResolvedValue(userRow())
    const service = new DriverAdminPersistenceService()

    await expect(
      service.createDriver({
        fullName: 'Yousef Mansour',
        phone: '+966500111003',
        areaIds: [AREA_ID],
      })
    ).rejects.toBeInstanceOf(AreaAlreadyAssignedError)
    expect(query.mock.calls[0][0]).toContain('FOR UPDATE')
    expect(query.mock.calls[1][0]).not.toContain('driver_id <>')
    expect(createUser).not.toHaveBeenCalled()
  })
})
