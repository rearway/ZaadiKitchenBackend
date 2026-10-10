import { Deps } from '../../entitygateway/index.js'
import { DeliveryLocation } from '../../entities/index.js'

export interface GetSavedDeliveryLocationInput {
  userId: string
}

export type GetSavedDeliveryLocationOutput = {
  message: string
  data: DeliveryLocation[]
}

export function makeUC(deps: Deps) {
  return async function getSavedDeliveryLocation(
    input: GetSavedDeliveryLocationInput
  ): Promise<GetSavedDeliveryLocationOutput> {
    const { logger, deliveryLocationLoader } = deps
    try {
      const { userId } = input

      const locations = await deliveryLocationLoader.getLocationsByUserId(userId)

      return {
        message: 'Delivery locations retrieved successfully',
        data: locations,
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
