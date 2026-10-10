import { Deps } from '../../entitygateway/index.js'
import { ResourceNotFoundError, UnauthorizedError } from '../../../shared/errors/index.js'

export interface DeleteDeliveryLocationInput {
  userId: string
  locationId: string
}

export interface DeleteDeliveryLocationOutput {
  message: string
}

export function makeUC(deps: Deps) {
  return async function deleteDeliveryLocation(
    input: DeleteDeliveryLocationInput
  ): Promise<DeleteDeliveryLocationOutput> {
    const { logger, deliveryLocationLoader, deliveryLocationPersistor } = deps

    try {
      const location = await deliveryLocationLoader.getLocationById(input.locationId)
      if (!location) throw new ResourceNotFoundError('DeliveryLocation', input.locationId)
      if (location.userId !== input.userId) throw new UnauthorizedError()

      await deliveryLocationPersistor.deleteLocation(input.locationId)

      return { message: 'Delivery location deleted successfully' }
    } catch (error) {
      logger.error('Failed to delete delivery location', error instanceof Error ? error.message : String(error))
      throw error
    }
  }
}

export const name = 'DeleteDeliveryLocation'
