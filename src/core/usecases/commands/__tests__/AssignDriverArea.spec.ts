import { makeUC } from '../AssignDriverArea'
import {
  buildDeps,
  makeDeliveryArea,
} from '../../../../__tests__/helpers/mock-deps'
import {
  AreaAlreadyAssignedError,
  ResourceNotFoundError,
} from '../../../../shared/errors'

const DRIVER_ID = 'driver-uuid-1'
const AREA_ID = '11111111-1111-4111-8111-111111111111'

function driver(overrides: Record<string, unknown> = {}) {
  return {
    id: DRIVER_ID,
    fullName: 'Ahmed Al-Rashid',
    phone: '+966500111001',
    isActive: true,
    areas: [{ id: AREA_ID, name: 'Olaya' }],
    createdAt: new Date('2026-10-01T00:00:00.000Z'),
    updatedAt: new Date('2026-10-01T00:00:00.000Z'),
    ...overrides,
  }
}

function depsFor(options: {
  existing?: ReturnType<typeof driver> | null
  area?: ReturnType<typeof makeDeliveryArea> | null
  assign?: jest.Mock
}) {
  const base = buildDeps()
  const assignArea = options.assign ?? jest.fn().mockResolvedValue(driver())
  return {
    deps: buildDeps({
      driverAdminLoader: {
        ...base.driverAdminLoader,
        getDriverById: jest
          .fn()
          .mockResolvedValue(
            options.existing === undefined
              ? driver({ areas: [] })
              : options.existing
          ),
      },
      deliveryAreaLoader: {
        ...base.deliveryAreaLoader,
        getAreaById: jest
          .fn()
          .mockResolvedValue(
            options.area === undefined
              ? makeDeliveryArea({ id: AREA_ID, name: 'Olaya' })
              : options.area
          ),
      },
      driverAdminPersistor: {
        ...base.driverAdminPersistor,
        assignArea,
      },
    }),
    assignArea,
  }
}

describe('AssignDriverArea', () => {
  it('assigns a free area and returns the driver', async () => {
    const { deps, assignArea } = depsFor({})
    const result = await makeUC(deps)({
      driverId: DRIVER_ID,
      areaId: AREA_ID,
    })

    expect(assignArea).toHaveBeenCalledWith(DRIVER_ID, AREA_ID)
    expect(result.message).toBe('Area assigned successfully')
    expect(result.data).toMatchObject({
      id: DRIVER_ID,
      role: 'DRIVER',
      areas: [{ id: AREA_ID, name: 'Olaya' }],
    })
  })

  it('returns 404 when the driver does not exist', async () => {
    const { deps, assignArea } = depsFor({ existing: null })
    await expect(
      makeUC(deps)({ driverId: DRIVER_ID, areaId: AREA_ID })
    ).rejects.toBeInstanceOf(ResourceNotFoundError)
    expect(assignArea).not.toHaveBeenCalled()
  })

  it('returns 404 when the area does not exist', async () => {
    const { deps, assignArea } = depsFor({ area: null })
    await expect(
      makeUC(deps)({ driverId: DRIVER_ID, areaId: AREA_ID })
    ).rejects.toBeInstanceOf(ResourceNotFoundError)
    expect(assignArea).not.toHaveBeenCalled()
  })

  it('returns 409 naming the driver who already has the area', async () => {
    const conflict = new AreaAlreadyAssignedError(
      'Olaya',
      'Fahad Al-Otaibi',
      AREA_ID,
      'driver-uuid-2'
    )
    const { deps } = depsFor({
      assign: jest.fn().mockRejectedValue(conflict),
    })

    await expect(
      makeUC(deps)({ driverId: DRIVER_ID, areaId: AREA_ID })
    ).rejects.toMatchObject({
      statusCode: 409,
      errorCode: 'AREA_ALREADY_ASSIGNED',
      message:
        'Area "Olaya" is already assigned to Fahad Al-Otaibi. One area = one driver.',
      details: {
        area_id: AREA_ID,
        area_name: 'Olaya',
        driver_id: 'driver-uuid-2',
        driver_name: 'Fahad Al-Otaibi',
      },
    })
  })
})
