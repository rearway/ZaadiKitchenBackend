import type { Deps } from '../../entitygateway/index.js'
import { ResourceNotFoundError } from '../../../shared/errors/index.js'

export interface DeleteDeliveryAreaInput {
  areaId: string
}

export interface DeleteDeliveryAreaOutput {
  message: string
  data: {
    id: string
    deleted: boolean
    deletedAt: string
  }
}

export function makeUC(deps: Deps) {
  return async function deleteDeliveryArea(
    input: DeleteDeliveryAreaInput
  ): Promise<DeleteDeliveryAreaOutput> {
    const { logger, deliveryAreaLoader, deliveryAreaPersistor } = deps

    try {
      const existing = await deliveryAreaLoader.getAreaById(input.areaId)
      if (!existing) {
        throw new ResourceNotFoundError('Delivery area', input.areaId)
      }

      const deletedAt = await deliveryAreaPersistor.softDeleteDeliveryArea(
        input.areaId
      )

      return {
        message: 'Delivery area deleted successfully',
        data: {
          id: input.areaId,
          deleted: true,
          deletedAt: deletedAt.toISOString(),
        },
      }
    } catch (error) {
      logger.error(
        'Failed to delete delivery area',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'DeleteDeliveryArea'
