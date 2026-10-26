import { makeUC } from '../ListUnassignedAreas'
import { buildDeps } from '../../../../__tests__/helpers/mock-deps'

describe('ListUnassignedAreas', () => {
  it('returns areas that have no driver', async () => {
    const areas = [
      { id: 'area-1', name: 'Exit 5', status: 'active' as const },
      { id: 'area-2', name: 'Nakheel', status: 'coming_soon' as const },
    ]
    const deps = buildDeps({
      driverAdminLoader: {
        ...buildDeps().driverAdminLoader,
        listUnassignedAreas: jest.fn().mockResolvedValue(areas),
      },
    })

    const result = await makeUC(deps)({})

    expect(result).toEqual({
      message: 'Unassigned areas retrieved successfully',
      data: { areas },
    })
  })

  it('returns an empty list when every area is assigned', async () => {
    const deps = buildDeps({
      driverAdminLoader: {
        ...buildDeps().driverAdminLoader,
        listUnassignedAreas: jest.fn().mockResolvedValue([]),
      },
    })

    const result = await makeUC(deps)({})
    expect(result.data.areas).toEqual([])
  })
})
