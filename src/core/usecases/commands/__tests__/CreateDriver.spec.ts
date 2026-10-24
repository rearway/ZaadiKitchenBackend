import { makeUC } from '../CreateDriver'
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

const AREA_A = '11111111-1111-4111-8111-111111111111'
const AREA_B = '22222222-2222-4222-8222-222222222222'
const PHONE = '+966512345678'

function driverRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'driver-uuid-1',
    fullName: 'Faisal Al-Harbi',
    phone: PHONE,
    isActive: true,
    areas: [{ id: AREA_A, name: 'Al Nakheel' }],
    createdAt: new Date('2026-10-01T00:00:00.000Z'),
    updatedAt: new Date('2026-10-01T00:00:00.000Z'),
    ...overrides,
  }
}

function depsForCreate(
  options: {
    phoneOwner?: ReturnType<typeof makeUser> | null
    areas?: Record<string, ReturnType<typeof makeDeliveryArea> | null>
    created?: ReturnType<typeof driverRecord>
  } = {}
) {
  return buildDeps({
    userLoader: {
      ...buildDeps().userLoader,
      getUserByPhone: jest.fn().mockResolvedValue(options.phoneOwner ?? null),
    },
    deliveryAreaLoader: {
      ...buildDeps().deliveryAreaLoader,
      getAreaById: jest.fn().mockImplementation((id: string) => {
        if (options.areas && id in options.areas) return options.areas[id]
        if (id === AREA_A)
          return makeDeliveryArea({ id: AREA_A, name: 'Al Nakheel' })
        if (id === AREA_B)
          return makeDeliveryArea({ id: AREA_B, name: 'Al Olaya' })
        return null
      }),
    },
    driverAdminPersistor: {
      ...buildDeps().driverAdminPersistor,
      createDriver: jest.fn().mockImplementation(
        (request: {
          fullName: string
          phone: string
          areaIds: string[]
        }) =>
          options.created ??
          driverRecord({
            fullName: request.fullName,
            phone: request.phone,
            areas: request.areaIds.map(id => ({
              id,
              name: id === AREA_A ? 'Al Nakheel' : 'Al Olaya',
            })),
          })
      ),
    },
  })
}

describe('CreateDriver', () => {
  it('creates an active DRIVER and assigns each area once', async () => {
    const deps = depsForCreate()
    const createDriver = makeUC(deps)

    const result = await createDriver({
      fullName: '  Faisal Al-Harbi  ',
      phone: ` ${PHONE} `,
      areaIds: [AREA_A, AREA_A, AREA_B],
    })

    expect(deps.driverAdminPersistor.createDriver).toHaveBeenCalledWith({
      fullName: 'Faisal Al-Harbi',
      phone: PHONE,
      areaIds: [AREA_A, AREA_B],
    })
    expect(result.message).toBe('Driver created successfully')
    expect(result.data).toMatchObject({
      id: 'driver-uuid-1',
      fullName: 'Faisal Al-Harbi',
      phone: PHONE,
      role: 'DRIVER',
      isActive: true,
    })
    expect(result.data.areas.map(area => area.id)).toEqual([AREA_A, AREA_B])
  })

  it('creates a driver with no areas when areaIds is omitted', async () => {
    const deps = depsForCreate()
    const createDriver = makeUC(deps)

    const result = await createDriver({
      fullName: 'Faisal Al-Harbi',
      phone: PHONE,
    })

    expect(deps.driverAdminPersistor.createDriver).toHaveBeenCalledWith({
      fullName: 'Faisal Al-Harbi',
      phone: PHONE,
      areaIds: [],
    })
    expect(result.data.areas).toEqual([])
  })

  it('rejects a blank name and does not create a user', async () => {
    const deps = depsForCreate()
    const createDriver = makeUC(deps)

    await expect(
      createDriver({ fullName: '   ', phone: PHONE, areaIds: [AREA_A] })
    ).rejects.toBeInstanceOf(ValidationError)
    expect(deps.driverAdminPersistor.createDriver).not.toHaveBeenCalled()
  })

  it('rejects a phone that cannot sign in with OTP', async () => {
    const deps = depsForCreate()
    const createDriver = makeUC(deps)

    await expect(
      createDriver({ fullName: 'Faisal', phone: '0501234567' })
    ).rejects.toBeInstanceOf(ValidationError)
    expect(deps.driverAdminPersistor.createDriver).not.toHaveBeenCalled()
  })

  it('rejects a phone that already belongs to a user', async () => {
    const deps = depsForCreate({
      phoneOwner: makeUser({ phone: PHONE, role: 'CUSTOMER' }),
    })
    const createDriver = makeUC(deps)

    await expect(
      createDriver({ fullName: 'Faisal', phone: PHONE })
    ).rejects.toBeInstanceOf(ResourceAlreadyExistsError)
    expect(deps.driverAdminPersistor.createDriver).not.toHaveBeenCalled()
  })

  it('rejects an unknown area and does not create a user', async () => {
    const deps = depsForCreate({ areas: { [AREA_A]: null } })
    const createDriver = makeUC(deps)

    await expect(
      createDriver({ fullName: 'Faisal', phone: PHONE, areaIds: [AREA_A] })
    ).rejects.toBeInstanceOf(ResourceNotFoundError)
    expect(deps.driverAdminPersistor.createDriver).not.toHaveBeenCalled()
  })
})
