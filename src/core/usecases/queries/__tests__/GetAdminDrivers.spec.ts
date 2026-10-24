import { makeUC as makeList } from '../GetAdminDrivers'
import { makeUC as makeGet } from '../GetAdminDriver'
import { buildDeps } from '../../../../__tests__/helpers/mock-deps'
import { ResourceNotFoundError } from '../../../../shared/errors'

const AREA_A = '11111111-1111-4111-8111-111111111111'

function driverRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'driver-uuid-1',
    fullName: 'Faisal Al-Harbi',
    phone: '+966512345678',
    isActive: true,
    areas: [{ id: AREA_A, name: 'Al Nakheel' }],
    createdAt: new Date('2026-10-01T00:00:00.000Z'),
    updatedAt: new Date('2026-10-02T00:00:00.000Z'),
    ...overrides,
  }
}

describe('GetAdminDrivers', () => {
  it('returns each active driver with assigned areas', async () => {
    const deps = buildDeps({
      driverAdminLoader: {
        ...buildDeps().driverAdminLoader,
        listDrivers: jest
          .fn()
          .mockResolvedValue([
            driverRecord(),
            driverRecord({ id: 'driver-uuid-2', areas: [] }),
          ]),
      },
    })

    const result = await makeList(deps)({})

    expect(result.message).toBe('Drivers retrieved successfully')
    expect(result.data.drivers).toHaveLength(2)
    expect(result.data.drivers[0]).toMatchObject({
      id: 'driver-uuid-1',
      fullName: 'Faisal Al-Harbi',
      phone: '+966512345678',
      role: 'DRIVER',
      isActive: true,
      areas: [{ id: AREA_A, name: 'Al Nakheel' }],
    })
    expect(result.data.drivers[1].areas).toEqual([])
  })
})

describe('GetAdminDriver', () => {
  it('returns one driver', async () => {
    const deps = buildDeps({
      driverAdminLoader: {
        ...buildDeps().driverAdminLoader,
        getDriverById: jest.fn().mockResolvedValue(driverRecord()),
      },
    })

    const result = await makeGet(deps)({ driverId: 'driver-uuid-1' })

    expect(result.data).toMatchObject({ id: 'driver-uuid-1', role: 'DRIVER' })
  })

  it('returns not found when the driver does not exist or is deleted', async () => {
    const deps = buildDeps({
      driverAdminLoader: {
        ...buildDeps().driverAdminLoader,
        getDriverById: jest.fn().mockResolvedValue(null),
      },
    })

    await expect(makeGet(deps)({ driverId: 'missing' })).rejects.toBeInstanceOf(
      ResourceNotFoundError
    )
  })
})
