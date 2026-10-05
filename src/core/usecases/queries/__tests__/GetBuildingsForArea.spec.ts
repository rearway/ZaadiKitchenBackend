import { makeUC } from '../GetBuildingsForArea'
import {
  buildDeps,
  makeDeliveryArea,
  makeBuilding,
} from '../../../../__tests__/helpers/mock-deps'

describe('GetBuildingsForArea', () => {
  const areaId = 'd319e8de-2a1c-48ba-9d06-62131ed72e67'

  function makeDepsForArea(status: 'active' | 'coming_soon' | 'paused') {
    const building = makeBuilding({ areaId, name: 'Tower A' })
    return buildDeps({
      deliveryAreaLoader: {
        getAreaById: jest.fn().mockResolvedValue(
          makeDeliveryArea({ id: areaId, name: 'Test Area', status })
        ),
      },
      buildingLoader: {
        getBuildingsByArea: jest.fn().mockResolvedValue([building]),
        searchBuildingsByArea: jest.fn().mockResolvedValue([]),
      },
    })
  }

  it('returns buildings when the area is active', async () => {
    const deps = makeDepsForArea('active')
    const result = await makeUC(deps)({ areaId })

    expect(result.data.buildings).toHaveLength(1)
    expect(result.data.areaId).toBe(areaId)
  })

  it('returns buildings when the area is coming_soon', async () => {
    const deps = makeDepsForArea('coming_soon')
    const result = await makeUC(deps)({ areaId })

    expect(result.data.buildings).toHaveLength(1)
  })

  it('returns buildings when the area is paused', async () => {
    const deps = makeDepsForArea('paused')
    const result = await makeUC(deps)({ areaId })

    expect(result.data.buildings).toHaveLength(1)
  })

  it('throws when the area does not exist', async () => {
    const deps = buildDeps({
      deliveryAreaLoader: {
        getAreaById: jest.fn().mockResolvedValue(null),
      },
      buildingLoader: {
        getBuildingsByArea: jest.fn(),
        searchBuildingsByArea: jest.fn(),
      },
    })

    await expect(makeUC(deps)({ areaId })).rejects.toMatchObject({
      name: 'ResourceNotFoundError',
    })
  })
})
