import type { Deps } from '../../entitygateway/index.js'
import { DeliveryNotFoundError, AlreadyDeliveredError } from '../../../shared/errors/domain.errors.js'

export interface MarkDeliveryDeliveredInput {
  deliveryId: string
}

export interface MarkDeliveryDeliveredOutput {
  message: string
  data: {
    delivery_id: string
    status: 'delivered'
    delivered_at: Date
  }
}

export function makeUC(deps: Deps) {
  return async function markDeliveryDelivered(
    input: MarkDeliveryDeliveredInput
  ): Promise<MarkDeliveryDeliveredOutput> {
    const { logger, deliveryDayLoader, deliveryDayPersistor } = deps

    try {
      const deliveryDay = await deliveryDayLoader.getDeliveryDayById(input.deliveryId)
      if (!deliveryDay) throw new DeliveryNotFoundError()
      if (deliveryDay.status === 'delivered') throw new AlreadyDeliveredError()

      const updated = await deliveryDayPersistor.markDeliveryDelivered(input.deliveryId)

      return {
        message: 'Delivery marked as delivered',
        data: {
          delivery_id: updated.id,
          status: 'delivered',
          delivered_at: updated.deliveredAt!,
        },
      }
    } catch (error) {
      logger.error('MarkDeliveryDelivered failed', error instanceof Error ? error.message : String(error))
      throw error
    }
  }
}

export const name = 'MarkDeliveryDelivered'
