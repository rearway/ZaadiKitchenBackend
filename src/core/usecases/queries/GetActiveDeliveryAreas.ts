import { Deps } from '../../entitygateway/index.js'
import { DeliveryArea } from '../../entities/index.js'

export type GetActiveDeliveryAreasOutput = {
  message: string
  data: {
    areas: DeliveryArea[]
  }
}

export function makeUC(deps: Deps) {
  return async function getActiveDeliveryAreas(): Promise<GetActiveDeliveryAreasOutput> {
    const { logger, deliveryAreaLoader } = deps
    try {
      const areas = await deliveryAreaLoader.getActiveAreas()

      return {
        message: 'Active delivery areas fetched successfully',
        data: {
          areas,
        },
      }
    } catch (error) {
      logger.error(
        'Failed to get active delivery areas',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'GetActiveDeliveryAreas'
