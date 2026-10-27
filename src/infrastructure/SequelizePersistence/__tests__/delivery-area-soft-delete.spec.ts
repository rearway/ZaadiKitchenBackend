import { Op } from 'sequelize'
import { DeliveryAreaModel } from '../models/DeliveryAreaModel'
import { DriverAreaAssignmentModel } from '../models/DriverAreaAssignmentModel'
import { UserModel } from '../models/UserModel'
import { DeliveryPersistenceService } from '../delivery-persistence.service'
import { DriverAdminPersistenceService } from '../driver-admin-persistence.service'

describe('delivery area soft-delete filters', () => {
  const areas = new DeliveryPersistenceService()

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('hides soft-deleted areas from active, admin, and search lists', async () => {
    const findAll = jest
      .spyOn(DeliveryAreaModel, 'findAll')
      .mockResolvedValue([] as never)

    await areas.getActiveAreas()
    await areas.getAllAreas('paused')
    await areas.getAllAreas()
    await areas.searchActiveAreas('nakheel')

    expect(findAll).toHaveBeenNthCalledWith(1, {
      where: { status: 'active', deletedAt: null },
      order: [['name', 'ASC']],
    })
    expect(findAll).toHaveBeenNthCalledWith(2, {
      where: { status: 'paused', deletedAt: null },
      order: [['name', 'ASC']],
    })
    expect(findAll).toHaveBeenNthCalledWith(3, {
      where: { deletedAt: null },
      order: [['name', 'ASC']],
    })
    expect(findAll).toHaveBeenNthCalledWith(4, {
      where: {
        status: 'active',
        deletedAt: null,
        name: { [Op.iLike]: '%nakheel%' },
      },
      order: [['name', 'ASC']],
    })
  })

  it('looks up an area by id or name only when it is not soft-deleted', async () => {
    const findOne = jest
      .spyOn(DeliveryAreaModel, 'findOne')
      .mockResolvedValue(null)

    await expect(areas.getAreaById('area-1')).resolves.toBeNull()
    await areas.getAreaByName('Al Nakheel', 'area-keep')

    expect(findOne).toHaveBeenNthCalledWith(1, {
      where: { id: 'area-1', deletedAt: null },
    })
    expect(findOne).toHaveBeenNthCalledWith(2, {
      where: {
        name: { [Op.iLike]: 'Al Nakheel' },
        deletedAt: null,
        id: { [Op.ne]: 'area-keep' },
      },
    })
  })

  it('sets deletedAt, keeps status, and clears driver assignments', async () => {
    const transaction = { id: 'tx' }
    const update = jest
      .fn<Promise<void>, [Record<string, unknown>, unknown]>()
      .mockResolvedValue(undefined)
    jest.spyOn(DeliveryAreaModel, 'findOne').mockResolvedValue({
      status: 'paused',
      update,
    } as never)
    const sequelize = {
      transaction: jest.fn(async (fn: (tx: unknown) => Promise<Date>) =>
        fn(transaction)
      ),
    }
    Object.defineProperty(DeliveryAreaModel, 'sequelize', {
      configurable: true,
      get: () => sequelize,
    })
    const destroy = jest
      .spyOn(DriverAreaAssignmentModel, 'destroy')
      .mockResolvedValue(1)

    const deletedAt = await areas
      .softDeleteDeliveryArea('area-1')
      .finally(() => {
        delete (DeliveryAreaModel as { sequelize?: unknown }).sequelize
      })

    expect(deletedAt).toBeInstanceOf(Date)
    expect(update).toHaveBeenCalledWith({ deletedAt }, { transaction })
    expect(update.mock.calls[0][0]).not.toHaveProperty('status')
    expect(destroy).toHaveBeenCalledWith({
      where: { areaId: 'area-1' },
      transaction,
    })
  })

  it('does not show a soft-deleted area on a driver', async () => {
    jest.spyOn(UserModel, 'findAll').mockResolvedValue([
      {
        id: 'driver-1',
        fullName: 'Faisal',
        phone: '+966500000000',
        isActive: true,
        createdAt: new Date('2026-10-01T00:00:00.000Z'),
        updatedAt: new Date('2026-10-01T00:00:00.000Z'),
      },
    ] as never)
    jest
      .spyOn(DriverAreaAssignmentModel, 'findAll')
      .mockResolvedValue([{ driverId: 'driver-1', areaId: 'area-1' }] as never)
    const findAreas = jest
      .spyOn(DeliveryAreaModel, 'findAll')
      .mockResolvedValue([] as never)
    const drivers = new DriverAdminPersistenceService()

    await drivers.listDrivers()

    const where = findAreas.mock.calls[0][0].where as { deletedAt?: null }
    expect(where.deletedAt).toBeNull()
  })
})
