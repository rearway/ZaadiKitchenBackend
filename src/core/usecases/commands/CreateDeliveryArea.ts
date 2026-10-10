import { Deps } from '../../entitygateway/index.js'
import { DeliveryArea } from '../../entities/index.js'

export interface CreateDeliveryAreaInput {
  name: string
  description?: string
  status?: 'active' | 'coming_soon' | 'paused'
}

export type CreateDeliveryAreaOutput = {
  message: string
  data: DeliveryArea
}

export function makeUC(deps: Deps) {
  return async function createDeliveryArea(
    input: CreateDeliveryAreaInput
  ): Promise<CreateDeliveryAreaOutput> {
    const { logger, deliveryAreaLoader, deliveryAreaPersistor } = deps
    try {
      const { name, description, status } = input

      if (!name || name.trim().length === 0) {
        const { ValidationError } =
          await import('../../../shared/errors/index.js')
        throw new ValidationError('AREA_NAME_REQUIRED', {
          message: 'Area name is required',
        })
      }

      const existing = await deliveryAreaLoader.getAreaByName(name.trim())
      if (existing) {
        const { ResourceAlreadyExistsError } =
          await import('../../../shared/errors/index.js')
        throw new ResourceAlreadyExistsError('Delivery area', name.trim())
      }

      const area = await deliveryAreaPersistor.createDeliveryArea({
        name: name.trim(),
        description: description?.trim(),
        status: status || 'coming_soon',
      })

      return {
        message: 'Delivery area created successfully',
        data: area,
      }
    } catch (error) {
      logger.error(
        'Failed to create delivery area',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'CreateDeliveryArea'
