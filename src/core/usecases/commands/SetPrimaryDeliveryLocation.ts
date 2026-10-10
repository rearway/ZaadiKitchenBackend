import { Deps } from '../../entitygateway/index.js'
import { ResourceNotFoundError, UnauthorizedError } from '../../../shared/errors/index.js'

export interface SetPrimaryDeliveryLocationInput {
  userId: string
  locationId: string
}

export interface SetPrimaryDeliveryLocationOutput {
  message: string
}

export function makeUC(deps: Deps) {
  return async function setPrimaryDeliveryLocation(
    input: SetPrimaryDeliveryLocationInput
  ): Promise<SetPrimaryDeliveryLocationOutput> {
    const { logger, deliveryLocationLoader, deliveryLocationPersistor } = deps

    try {
      const location = await deliveryLocationLoader.getLocationById(input.locationId)
      if (!location) throw new ResourceNotFoundError('DeliveryLocation', input.locationId)
      if (location.userId !== input.userId) throw new UnauthorizedError()

      await deliveryLocationPersistor.setPrimaryLocation(input.locationId, input.userId)

      return { message: 'Primary delivery location updated successfully' }
    } catch (error) {
      logger.error('Failed to set primary delivery location', error instanceof Error ? error.message : String(error))
      throw error
    }
  }
}

export const name = 'SetPrimaryDeliveryLocation'
