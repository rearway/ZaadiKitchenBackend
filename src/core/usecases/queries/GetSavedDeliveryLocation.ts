import { Deps } from '../../entitygateway/index.js'
import { DeliveryLocation } from '../../entities/index.js'

export interface GetSavedDeliveryLocationInput {
  userId: string
}

export type GetSavedDeliveryLocationOutput = {
  message: string
  data: DeliveryLocation
}

export function makeUC(deps: Deps) {
  return async function getSavedDeliveryLocation(
    input: GetSavedDeliveryLocationInput
  ): Promise<GetSavedDeliveryLocationOutput> {
    const { logger, deliveryLocationLoader } = deps
    try {
      const { userId } = input

      const location =
        await deliveryLocationLoader.getPrimaryLocationByUserId(userId)

      if (!location) {
        const { ResourceNotFoundError } =
          await import('../../../shared/errors/index.js')
        throw new ResourceNotFoundError(
          'LOCATION_NOT_SET',
          'No delivery    location saved yet'
        )
      }

      return {
        message: 'Delivery location retrieved successfully',
        data: location,
      }
    } catch (error) {
      logger.error(
        'Failed to get saved delivery location',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'GetSavedDeliveryLocation'
