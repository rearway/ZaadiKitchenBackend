import { makeUC } from '../SaveDeliveryLocation'
import {
  buildDeps,
  makeDeliveryArea,
  makeBuilding,
  makeDeliveryLocation,
} from '../../../../__tests__/helpers/mock-deps'

describe('SaveDeliveryLocation', () => {
  const validAreaId = 'area-uuid-1'
  const validBuildingId = 'building-uuid-1'

  const baseInput = {
    userId: 'user-uuid-1',
    areaId: validAreaId,
  }

  function makeDepsWithActiveArea(overrides: Parameters<typeof buildDeps>[0] = {}) {
    return buildDeps({
      deliveryAreaLoader: {
        getAreaById: jest.fn().mockResolvedValue(makeDeliveryArea({ id: validAreaId, status: 'active' })),
        getActiveAreas: jest.fn().mockResolvedValue([]),
        searchActiveAreas: jest.fn().mockResolvedValue([]),
        getAllAreas: jest.fn().mockResolvedValue([]),
      },
      buildingLoader: {
        getBuildingsByArea: jest.fn().mockResolvedValue([]),
        searchBuildingsByArea: jest.fn().mockResolvedValue([]),
        getBuildingById: jest.fn().mockResolvedValue(
          makeBuilding({ id: validBuildingId, areaId: validAreaId, name: 'Al Nakheel Tower' })
        ),
      },
      deliveryLocationPersistor: {
        createLocation: jest.fn().mockResolvedValue(makeDeliveryLocation()),
      },
      ...overrides,
    })
  }

  // ─── Happy paths ─────────────────────────────────────────────────────────────

  it('resolves the canonical building name from DB when buildingId is provided', async () => {
    const building = makeBuilding({ id: validBuildingId, areaId: validAreaId, name: 'Al Nakheel Tower' })
    const deps = makeDepsWithActiveArea({
      buildingLoader: {
        getBuildingsByArea: jest.fn().mockResolvedValue([]),
        searchBuildingsByArea: jest.fn().mockResolvedValue([]),
        getBuildingById: jest.fn().mockResolvedValue(building),
      },
    })
    const uc = makeUC(deps)

    await uc({ ...baseInput, buildingId: validBuildingId })

    expect(deps.deliveryLocationPersistor.createLocation).toHaveBeenCalledWith(
      expect.objectContaining({
        buildingId: validBuildingId,
        buildingName: 'Al Nakheel Tower',
      })
    )
  })

  it('ignores the client-sent building string and uses the DB canonical name when buildingId is provided', async () => {
    const building = makeBuilding({ id: validBuildingId, areaId: validAreaId, name: 'Canonical Name From DB' })
    const deps = makeDepsWithActiveArea({
      buildingLoader: {
        getBuildingsByArea: jest.fn().mockResolvedValue([]),
        searchBuildingsByArea: jest.fn().mockResolvedValue([]),
        getBuildingById: jest.fn().mockResolvedValue(building),
      },
    })
    const uc = makeUC(deps)

    await uc({ ...baseInput, buildingId: validBuildingId, building: 'Wrong Name From Client' })

    expect(deps.deliveryLocationPersistor.createLocation).toHaveBeenCalledWith(
      expect.objectContaining({ buildingName: 'Canonical Name From DB' })
    )
  })

  it('stores the trimmed free-text name and no buildingId when only building string is provided', async () => {
    const deps = makeDepsWithActiveArea()
    const uc = makeUC(deps)

    await uc({ ...baseInput, building: '  My Custom Building  ' })

    expect(deps.deliveryLocationPersistor.createLocation).toHaveBeenCalledWith(
      expect.objectContaining({
        buildingId: undefined,
        buildingName: 'My Custom Building',
      })
    )
  })

  it('returns onboardingComplete: true', async () => {
    const deps = makeDepsWithActiveArea()
    const uc = makeUC(deps)

    const result = await uc({ ...baseInput, building: 'Tower A' })

    expect(result.data.onboardingComplete).toBe(true)
  })

  it('includes areaName in the response', async () => {
    const deps = makeDepsWithActiveArea({
      deliveryAreaLoader: {
        getAreaById: jest.fn().mockResolvedValue(makeDeliveryArea({ id: validAreaId, name: 'Al Nakheel District' })),
        getActiveAreas: jest.fn().mockResolvedValue([]),
        searchActiveAreas: jest.fn().mockResolvedValue([]),
        getAllAreas: jest.fn().mockResolvedValue([]),
      },
    })
    const uc = makeUC(deps)

    const result = await uc({ ...baseInput, building: 'Tower A' })

    expect(result.data.areaName).toBe('Al Nakheel District')
  })

  it('always creates location with isPrimary: true so the persistor demotes the old primary', async () => {
    const deps = makeDepsWithActiveArea()
    const uc = makeUC(deps)

    await uc({ ...baseInput, building: 'Tower A' })

    expect(deps.deliveryLocationPersistor.createLocation).toHaveBeenCalledWith(
      expect.objectContaining({ isPrimary: true })
    )
  })

  it('passes all optional fields through to the persistor', async () => {
    const deps = makeDepsWithActiveArea()
    const uc = makeUC(deps)

    await uc({
      ...baseInput,
      building: 'Tower A',
      floor: 'Floor 5',
      deskArea: 'Desk B3',
      deliveryPreference: 'reception',
      riderNotes: 'Ring the bell',
    })

    expect(deps.deliveryLocationPersistor.createLocation).toHaveBeenCalledWith(
      expect.objectContaining({
        floor: 'Floor 5',
        deskArea: 'Desk B3',
        deliveryPreference: 'reception',
        riderNotes: 'Ring the bell',
      })
    )
  })

  it('defaults deliveryPreference to hand_to_me when not provided', async () => {
    const deps = makeDepsWithActiveArea()
    const uc = makeUC(deps)

    await uc({ ...baseInput, building: 'Tower A' })

    expect(deps.deliveryLocationPersistor.createLocation).toHaveBeenCalledWith(
      expect.objectContaining({ deliveryPreference: 'hand_to_me' })
    )
  })

  // ─── Validation errors ───────────────────────────────────────────────────────

  it('throws a validation error when areaId is empty', async () => {
    const deps = makeDepsWithActiveArea()
    const uc = makeUC(deps)

    await expect(uc({ ...baseInput, areaId: '', building: 'Tower A' })).rejects.toMatchObject({
      errorCode: 'VALIDATION_ERROR',
      statusCode: 400,
      message: 'Area ID is required',
    })
  })

  it('throws a validation error when neither buildingId nor building is provided', async () => {
    const deps = makeDepsWithActiveArea()
    const uc = makeUC(deps)

    await expect(uc(baseInput)).rejects.toMatchObject({
      errorCode: 'VALIDATION_ERROR',
      statusCode: 400,
      message: 'Either a building ID or a building name is required',
    })
  })

  it('throws a validation error when building is a whitespace-only string', async () => {
    const deps = makeDepsWithActiveArea()
    const uc = makeUC(deps)

    await expect(uc({ ...baseInput, building: '   ' })).rejects.toMatchObject({
      errorCode: 'VALIDATION_ERROR',
      statusCode: 400,
      message: 'Either a building ID or a building name is required',
    })
  })

  it('throws a validation error when the area does not exist', async () => {
    const deps = makeDepsWithActiveArea({
      deliveryAreaLoader: {
        getAreaById: jest.fn().mockResolvedValue(null),
        getActiveAreas: jest.fn().mockResolvedValue([]),
        searchActiveAreas: jest.fn().mockResolvedValue([]),
        getAllAreas: jest.fn().mockResolvedValue([]),
      },
    })
    const uc = makeUC(deps)

    await expect(uc({ ...baseInput, building: 'Tower A' })).rejects.toMatchObject({
      errorCode: 'VALIDATION_ERROR',
      message: 'Must be a valid active area ID',
    })
  })

  it('throws a validation error when the area is coming_soon', async () => {
    const deps = makeDepsWithActiveArea({
      deliveryAreaLoader: {
        getAreaById: jest.fn().mockResolvedValue(makeDeliveryArea({ status: 'coming_soon' })),
        getActiveAreas: jest.fn().mockResolvedValue([]),
        searchActiveAreas: jest.fn().mockResolvedValue([]),
        getAllAreas: jest.fn().mockResolvedValue([]),
      },
    })
    const uc = makeUC(deps)

    await expect(uc({ ...baseInput, building: 'Tower A' })).rejects.toMatchObject({
      errorCode: 'VALIDATION_ERROR',
      message: 'Must be a valid active area ID',
    })
  })

  it('throws a validation error when the area is paused', async () => {
    const deps = makeDepsWithActiveArea({
      deliveryAreaLoader: {
        getAreaById: jest.fn().mockResolvedValue(makeDeliveryArea({ status: 'paused' })),
        getActiveAreas: jest.fn().mockResolvedValue([]),
        searchActiveAreas: jest.fn().mockResolvedValue([]),
        getAllAreas: jest.fn().mockResolvedValue([]),
      },
    })
    const uc = makeUC(deps)

    await expect(uc({ ...baseInput, building: 'Tower A' })).rejects.toMatchObject({
      errorCode: 'VALIDATION_ERROR',
      message: 'Must be a valid active area ID',
    })
  })

  it('throws a validation error when buildingId does not exist in the DB', async () => {
    const deps = makeDepsWithActiveArea({
      buildingLoader: {
        getBuildingsByArea: jest.fn().mockResolvedValue([]),
        searchBuildingsByArea: jest.fn().mockResolvedValue([]),
        getBuildingById: jest.fn().mockResolvedValue(null),
      },
    })
    const uc = makeUC(deps)

    await expect(uc({ ...baseInput, buildingId: 'non-existent-uuid' })).rejects.toMatchObject({
      errorCode: 'VALIDATION_ERROR',
      message: 'Building not found',
    })
  })

  it('throws a validation error when the building belongs to a different area', async () => {
    const buildingFromDifferentArea = makeBuilding({ areaId: 'different-area-uuid' })
    const deps = makeDepsWithActiveArea({
      buildingLoader: {
        getBuildingsByArea: jest.fn().mockResolvedValue([]),
        searchBuildingsByArea: jest.fn().mockResolvedValue([]),
        getBuildingById: jest.fn().mockResolvedValue(buildingFromDifferentArea),
      },
    })
    const uc = makeUC(deps)

    await expect(uc({ ...baseInput, buildingId: validBuildingId })).rejects.toMatchObject({
      errorCode: 'VALIDATION_ERROR',
      message: 'Building does not belong to the selected area',
    })
  })
})
