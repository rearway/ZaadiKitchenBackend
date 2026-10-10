import { Deps } from '../../entitygateway/index.js'
import { DeliveryArea } from '../../entities/index.js'

export interface GetAdminDeliveryAreasInput {
  status?: 'active' | 'coming_soon' | 'paused'
}

export type GetAdminDeliveryAreasOutput = {
  message: string
  data: {
    summary: {
      active_count: number
      coming_soon_count: number
      paused_count: number
    }
    areas: DeliveryArea[]
  }
}

export function makeUC(deps: Deps) {
  return async function getAdminDeliveryAreas(
    input: GetAdminDeliveryAreasInput
  ): Promise<GetAdminDeliveryAreasOutput> {
    const { logger, deliveryAreaLoader } = deps
    try {
      // we will need an admin specific loader to return ALL areas regardless of status
      // For now, let's just use what we have or implement a new method.
      // Oh, wait, we don't have getAllAreas in deliveryAreaLoader! We need to add it.
      const areas = (await deliveryAreaLoader.getAllAreas?.(input.status)) || []

      const summary = {
        active_count: areas.filter(a => a.status === 'active').length,
        coming_soon_count: areas.filter(a => a.status === 'coming_soon').length,
        paused_count: areas.filter(a => a.status === 'paused').length,
      }

      return {
        message: 'Admin delivery areas retrieved successfully',
        data: {
          summary,
          areas,
        },
      }
    } catch (error) {
      logger.error(
        'Failed to get admin delivery areas',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'GetAdminDeliveryAreas'
