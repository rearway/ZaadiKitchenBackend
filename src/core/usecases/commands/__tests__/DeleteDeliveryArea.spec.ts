import { makeUC } from '../DeleteDeliveryArea'
import {
  buildDeps,
  makeDeliveryArea,
} from '../../../../__tests__/helpers/mock-deps'
import { ResourceNotFoundError } from '../../../../shared/errors'

const AREA_ID = '11111111-1111-4111-8111-111111111111'

describe('DeleteDeliveryArea', () => {
  it('soft-deletes a paused area without changing pause semantics', async () => {
    const deletedAt = new Date('2026-10-25T12:00:00.000Z')
    const softDeleteDeliveryArea = jest.fn().mockResolvedValue(deletedAt)
    const deps = buildDeps({
      deliveryAreaLoader: {
        ...buildDeps().deliveryAreaLoader,
        getAreaById: jest
          .fn()
          .mockResolvedValue(
            makeDeliveryArea({ id: AREA_ID, status: 'paused' })
          ),
      },
      deliveryAreaPersistor: {
        ...buildDeps().deliveryAreaPersistor,
        softDeleteDeliveryArea,
      },
    })
    const deleteDeliveryArea = makeUC(deps)

    const result = await deleteDeliveryArea({ areaId: AREA_ID })

    expect(softDeleteDeliveryArea).toHaveBeenCalledWith(AREA_ID)
    expect(result).toEqual({
      message: 'Delivery area deleted successfully',
      data: {
        id: AREA_ID,
        deleted: true,
        deletedAt: deletedAt.toISOString(),
      },
    })
  })

  it('returns not found and does not delete when the area is missing', async () => {
    const softDeleteDeliveryArea = jest.fn()
    const deps = buildDeps({
      deliveryAreaLoader: {
        ...buildDeps().deliveryAreaLoader,
        getAreaById: jest.fn().mockResolvedValue(null),
      },
      deliveryAreaPersistor: {
        ...buildDeps().deliveryAreaPersistor,
        softDeleteDeliveryArea,
      },
    })
    const deleteDeliveryArea = makeUC(deps)

    await expect(
      deleteDeliveryArea({ areaId: AREA_ID })
    ).rejects.toBeInstanceOf(ResourceNotFoundError)
    expect(softDeleteDeliveryArea).not.toHaveBeenCalled()
  })
})
