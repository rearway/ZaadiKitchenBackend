import { makeUC } from '../MarkDeliveryDelivered'
import { buildDeps, makeDeliveryDay } from '../../../../__tests__/helpers/mock-deps'

describe('MarkDeliveryDelivered', () => {
  it('marks a scheduled delivery as delivered', async () => {
    const day = makeDeliveryDay({ id: 'dd-uuid-1', status: 'scheduled' })
    const delivered = makeDeliveryDay({ id: 'dd-uuid-1', status: 'delivered', deliveredAt: new Date('2026-08-02T12:32:00Z') })
    const deps = buildDeps({
      deliveryDayLoader: {
        ...buildDeps().deliveryDayLoader,
        getDeliveryDayById: jest.fn().mockResolvedValue(day),
      },
      deliveryDayPersistor: {
        ...buildDeps().deliveryDayPersistor,
        markDeliveryDelivered: jest.fn().mockResolvedValue(delivered),
      },
    })
    const markDeliveryDelivered = makeUC(deps)

    const result = await markDeliveryDelivered({ deliveryId: 'dd-uuid-1' })

    expect(deps.deliveryDayPersistor.markDeliveryDelivered).toHaveBeenCalledWith('dd-uuid-1')
    expect(result.data).toMatchObject({
      delivery_id: 'dd-uuid-1',
      status: 'delivered',
    })
  })

  it('throws DELIVERY_NOT_FOUND when the delivery does not exist', async () => {
    const deps = buildDeps({
      deliveryDayLoader: {
        ...buildDeps().deliveryDayLoader,
        getDeliveryDayById: jest.fn().mockResolvedValue(null),
      },
    })
    const markDeliveryDelivered = makeUC(deps)

    await expect(markDeliveryDelivered({ deliveryId: 'missing-id' })).rejects.toMatchObject({
      errorCode: 'DELIVERY_NOT_FOUND',
      statusCode: 404,
    })
    expect(deps.deliveryDayPersistor.markDeliveryDelivered).not.toHaveBeenCalled()
  })

  it('throws ALREADY_DELIVERED when the delivery is already delivered', async () => {
    const day = makeDeliveryDay({ id: 'dd-uuid-1', status: 'delivered' })
    const deps = buildDeps({
      deliveryDayLoader: {
        ...buildDeps().deliveryDayLoader,
        getDeliveryDayById: jest.fn().mockResolvedValue(day),
      },
    })
    const markDeliveryDelivered = makeUC(deps)

    await expect(markDeliveryDelivered({ deliveryId: 'dd-uuid-1' })).rejects.toMatchObject({
      errorCode: 'ALREADY_DELIVERED',
      statusCode: 409,
    })
    expect(deps.deliveryDayPersistor.markDeliveryDelivered).not.toHaveBeenCalled()
  })
})
