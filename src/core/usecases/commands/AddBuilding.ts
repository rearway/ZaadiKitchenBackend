import { Deps } from '../../entitygateway/index.js'
import { Building } from '../../entities/index.js'

export interface AddBuildingInput {
  areaId: string
  name: string
}

export type AddBuildingOutput = {
  message: string
  data: Building
}

export function makeUC(deps: Deps) {
  return async function addBuilding(
    input: AddBuildingInput
  ): Promise<AddBuildingOutput> {
    const { logger, buildingPersistor, deliveryAreaLoader } = deps
    try {
      const { areaId, name } = input

      if (!name || name.trim().length === 0) {
        const { ValidationError } =
          await import('../../../shared/errors/index.js')
        throw new ValidationError('BUILDING_NAME_REQUIRED', {
          message: 'Building name is required',
        })
      }

      const area = await deliveryAreaLoader.getAreaById(areaId)
      if (!area) {
        const { ResourceNotFoundError } =
          await import('../../../shared/errors/index.js')
        throw new ResourceNotFoundError(
          'AREA_NOT_FOUND',
          'Area ID does not exist'
        )
      }

      const building = await buildingPersistor.createBuilding({
        areaId,
        name: name.trim(),
      })

      return {
        message: 'Building added successfully',
        data: building,
      }
    } catch (error) {
      logger.error(
        'Failed to add building',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'AddBuilding'
