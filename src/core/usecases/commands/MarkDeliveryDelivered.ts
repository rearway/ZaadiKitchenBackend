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
    const { logger, deliveryDayLoader, deliveryDayPersistor, userDeviceLoader, notificationGateway } = deps

    try {
      const deliveryDay = await deliveryDayLoader.getDeliveryDayById(input.deliveryId)
      if (!deliveryDay) throw new DeliveryNotFoundError()
      if (deliveryDay.status === 'delivered') throw new AlreadyDeliveredError()
      const updated = await deliveryDayPersistor.markDeliveryDelivered(input.deliveryId)

      // Send Push Notification (Rule 1: Delivery Confirmed ✅)
      try {
        const devices = await userDeviceLoader.getDevicesByUserId(updated.userId)
        const notificationPromises = devices.map(device => 
          notificationGateway.sendSingleNotification(
            device.endpointArn,
            'Delivery Confirmed ✅',
            'Your meal has arrived at your desk. Enjoy your lunch!',
            { type: 'delivery_confirmed', deliveryId: updated.id }
          )
        )
        await Promise.allSettled(notificationPromises)
      } catch (notifyError) {
        // Log but do not block the delivery confirmation response
        logger.error('Failed to send Delivery Confirmed push notification', String(notifyError))
      }

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
