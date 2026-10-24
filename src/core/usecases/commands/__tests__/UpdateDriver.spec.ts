import { makeUC } from '../UpdateDriver'
import {
  buildDeps,
  makeDeliveryArea,
  makeUser,
} from '../../../../__tests__/helpers/mock-deps'
import {
  ResourceAlreadyExistsError,
  ResourceNotFoundError,
  ValidationError,
} from '../../../../shared/errors'

const DRIVER_ID = 'driver-uuid-1'
const AREA_A = '11111111-1111-4111-8111-111111111111'
const AREA_B = '22222222-2222-4222-8222-222222222222'
const PHONE = '+966512345678'

function existingDriver(overrides: Record<string, unknown> = {}) {
  return {
    id: DRIVER_ID,
    fullName: 'Faisal Al-Harbi',
    phone: PHONE,
    isActive: true,
    areas: [{ id: AREA_A, name: 'Al Nakheel' }],
    createdAt: new Date('2026-10-01T00:00:00.000Z'),
    updatedAt: new Date('2026-10-01T00:00:00.000Z'),
    ...overrides,
  }
}

function depsForUpdate(
  options: {
    existing?: ReturnType<typeof existingDriver> | null
    phoneOwner?: ReturnType<typeof makeUser> | null
  } = {}
) {
  const existing =
    options.existing === undefined ? existingDriver() : options.existing
  return buildDeps({
    userLoader: {
      ...buildDeps().userLoader,
      getUserByPhone: jest.fn().mockResolvedValue(options.phoneOwner ?? null),
    },
    deliveryAreaLoader: {
      ...buildDeps().deliveryAreaLoader,
      getAreaById: jest.fn().mockImplementation((id: string) => {
        if (id === AREA_A)
          return makeDeliveryArea({ id: AREA_A, name: 'Al Nakheel' })
        if (id === AREA_B)
          return makeDeliveryArea({ id: AREA_B, name: 'Al Olaya' })
        return null
      }),
    },
    driverAdminLoader: {
      ...buildDeps().driverAdminLoader,
      getDriverById: jest.fn().mockResolvedValue(existing),
    },
    driverAdminPersistor: {
      ...buildDeps().driverAdminPersistor,
      updateDriver: jest
        .fn()
        .mockImplementation(
          (_id: string, updates: Record<string, unknown>) =>
            existingDriver({
              fullName: updates.fullName ?? existing?.fullName,
              phone: updates.phone ?? existing?.phone,
              isActive: updates.isActive ?? existing?.isActive,
              areas:
                updates.areaIds === undefined
                  ? existing?.areas
                  : (updates.areaIds as string[]).map(id => ({
                      id,
                      name: id === AREA_A ? 'Al Nakheel' : 'Al Olaya',
                    })),
            })
        ),
    },
  })
}

describe('UpdateDriver', () => {
  it('replaces assigned areas when areaIds is provided', async () => {
    const deps = depsForUpdate()
    const updateDriver = makeUC(deps)

    const result = await updateDriver({
      driverId: DRIVER_ID,
      areaIds: [AREA_B, AREA_B],
    })

    expect(deps.driverAdminPersistor.updateDriver).toHaveBeenCalledWith(
      DRIVER_ID,
      {
        areaIds: [AREA_B],
      }
    )
    expect(result.data.areas.map(area => area.id)).toEqual([AREA_B])
    expect(result.message).toBe('Driver updated successfully')
  })

  it('leaves area assignments unchanged when areaIds is omitted', async () => {
    const deps = depsForUpdate()
    const updateDriver = makeUC(deps)

    await updateDriver({ driverId: DRIVER_ID, fullName: 'Faisal Updated' })

    expect(deps.driverAdminPersistor.updateDriver).toHaveBeenCalledWith(
      DRIVER_ID,
      {
        fullName: 'Faisal Updated',
      }
    )
  })

  it('clears assignments when areaIds is an empty array', async () => {
    const deps = depsForUpdate()
    const updateDriver = makeUC(deps)

    const result = await updateDriver({ driverId: DRIVER_ID, areaIds: [] })

    expect(deps.driverAdminPersistor.updateDriver).toHaveBeenCalledWith(
      DRIVER_ID,
      { areaIds: [] }
    )
    expect(result.data.areas).toEqual([])
  })

  it('updates the active flag', async () => {
    const deps = depsForUpdate()
    const updateDriver = makeUC(deps)

    const result = await updateDriver({ driverId: DRIVER_ID, isActive: false })

    expect(deps.driverAdminPersistor.updateDriver).toHaveBeenCalledWith(
      DRIVER_ID,
      { isActive: false }
    )
    expect(result.data.isActive).toBe(false)
  })

  it('rejects a phone owned by a different user', async () => {
    const deps = depsForUpdate({
      phoneOwner: makeUser({ id: 'other-user', phone: '+966500000099' }),
    })
    const updateDriver = makeUC(deps)

    await expect(
      updateDriver({ driverId: DRIVER_ID, phone: '+966500000099' })
    ).rejects.toBeInstanceOf(ResourceAlreadyExistsError)
    expect(deps.driverAdminPersistor.updateDriver).not.toHaveBeenCalled()
  })

  it("allows keeping the driver's current phone", async () => {
    const deps = depsForUpdate({
      phoneOwner: makeUser({ id: DRIVER_ID, phone: PHONE, role: 'DRIVER' }),
    })
    const updateDriver = makeUC(deps)

    await updateDriver({ driverId: DRIVER_ID, phone: PHONE })

    expect(deps.driverAdminPersistor.updateDriver).toHaveBeenCalledWith(
      DRIVER_ID,
      { phone: PHONE }
    )
  })

  it('rejects an empty patch', async () => {
    const deps = depsForUpdate()
    const updateDriver = makeUC(deps)

    await expect(updateDriver({ driverId: DRIVER_ID })).rejects.toBeInstanceOf(
      ValidationError
    )
    expect(deps.driverAdminPersistor.updateDriver).not.toHaveBeenCalled()
  })

  it('returns not found when the driver does not exist', async () => {
    const deps = depsForUpdate({ existing: null })
    const updateDriver = makeUC(deps)

    await expect(
      updateDriver({ driverId: DRIVER_ID, fullName: 'Nope' })
    ).rejects.toBeInstanceOf(ResourceNotFoundError)
    expect(deps.driverAdminPersistor.updateDriver).not.toHaveBeenCalled()
  })

  it('rejects an unknown area', async () => {
    const deps = depsForUpdate()
    const updateDriver = makeUC(deps)

    await expect(
      updateDriver({
        driverId: DRIVER_ID,
        areaIds: ['33333333-3333-4333-8333-333333333333'],
      })
    ).rejects.toBeInstanceOf(ResourceNotFoundError)
    expect(deps.driverAdminPersistor.updateDriver).not.toHaveBeenCalled()
  })
})
