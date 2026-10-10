import { Deps } from '../../entitygateway/index.js'
import { DeliveryArea } from '../../entities/index.js'

export interface UpdateDeliveryAreaInput {
  areaId: string
  name?: string
  coverage?: string
  status?: 'active' | 'coming_soon' | 'paused'
  confirmActivation?: boolean
}

export type UpdateDeliveryAreaOutput = {
  message: string
  data: DeliveryArea & { customer_visible_immediately?: boolean }
}

export function makeUC(deps: Deps) {
  return async function updateDeliveryArea(
    input: UpdateDeliveryAreaInput
  ): Promise<UpdateDeliveryAreaOutput> {
    const { logger, deliveryAreaLoader, deliveryAreaPersistor } = deps
    try {
      const { areaId, name, coverage, status, confirmActivation } = input

      const area = await deliveryAreaLoader.getAreaById(areaId)
      if (!area) {
        const { ResourceNotFoundError } =
          await import('../../../shared/errors/index.js')
        throw new ResourceNotFoundError('AREA_NOT_FOUND', areaId)
      }

      if (name && name.trim().toLowerCase() !== area.name.toLowerCase()) {
        const duplicate = await deliveryAreaLoader.getAreaByName(name.trim(), areaId)
        if (duplicate) {
          const { ResourceAlreadyExistsError } =
            await import('../../../shared/errors/index.js')
          throw new ResourceAlreadyExistsError('Delivery area', name.trim())
        }
      }

      if (status === 'active' && area.status !== 'active' && !confirmActivation) {
        const { ActivationRequiresConfirmationError } =
          await import('../../../shared/errors/index.js')
        throw new ActivationRequiresConfirmationError(area.name)
      }

      const updateData: Partial<DeliveryArea> = {}
      if (name !== undefined) updateData.name = name.trim()
      if (coverage !== undefined) updateData.description = coverage.trim()
      if (status !== undefined) updateData.status = status

      const updated = await deliveryAreaPersistor.updateDeliveryArea(
        areaId,
        updateData
      )

      return {
        message: 'Delivery area updated successfully',
        data: {
          ...updated,
          customer_visible_immediately: status === 'active',
        },
      }
    } catch (error) {
      logger.error(
        'Failed to update delivery area',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'UpdateDeliveryArea'
