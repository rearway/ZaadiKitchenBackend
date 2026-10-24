import { makeUC } from '../DeleteDriver'
import { buildDeps } from '../../../../__tests__/helpers/mock-deps'
import { ResourceNotFoundError } from '../../../../shared/errors'

const DRIVER_ID = 'driver-uuid-1'

function existingDriver() {
  return {
    id: DRIVER_ID,
    fullName: 'Faisal Al-Harbi',
    phone: '+966512345678',
    isActive: true,
    areas: [{ id: '11111111-1111-4111-8111-111111111111', name: 'Al Nakheel' }],
    createdAt: new Date('2026-10-01T00:00:00.000Z'),
    updatedAt: new Date('2026-10-01T00:00:00.000Z'),
  }
}

describe('DeleteDriver', () => {
  it('soft-deletes the driver and revokes refresh tokens', async () => {
    const deletedAt = new Date('2026-10-24T12:00:00.000Z')
    const deps = buildDeps({
      driverAdminLoader: {
        ...buildDeps().driverAdminLoader,
        getDriverById: jest.fn().mockResolvedValue(existingDriver()),
      },
      driverAdminPersistor: {
        ...buildDeps().driverAdminPersistor,
        softDeleteDriver: jest.fn().mockResolvedValue(deletedAt),
      },
    })
    const deleteDriver = makeUC(deps)

    const result = await deleteDriver({ driverId: DRIVER_ID })

    expect(deps.driverAdminPersistor.softDeleteDriver).toHaveBeenCalledWith(
      DRIVER_ID
    )
    expect(deps.refreshTokenPersistor.revokeAllUserTokens).toHaveBeenCalledWith(
      DRIVER_ID
    )
    expect(result).toEqual({
      message: 'Driver deleted successfully',
      data: {
        id: DRIVER_ID,
        deleted: true,
        deletedAt: deletedAt.toISOString(),
      },
    })
  })

  it('returns not found and does not delete when the driver is missing', async () => {
    const deps = buildDeps({
      driverAdminLoader: {
        ...buildDeps().driverAdminLoader,
        getDriverById: jest.fn().mockResolvedValue(null),
      },
    })
    const deleteDriver = makeUC(deps)

    await expect(deleteDriver({ driverId: DRIVER_ID })).rejects.toBeInstanceOf(
      ResourceNotFoundError
    )
    expect(deps.driverAdminPersistor.softDeleteDriver).not.toHaveBeenCalled()
    expect(
      deps.refreshTokenPersistor.revokeAllUserTokens
    ).not.toHaveBeenCalled()
  })
})
