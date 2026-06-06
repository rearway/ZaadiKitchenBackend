import { Deps } from '../../entitygateway/index.js'
import { Building } from '../../entities/index.js'

export interface UpdateBuildingInput {
  areaId: string
  buildingId: string
  name: string
}

export type UpdateBuildingOutput = {
  message: string
  data: Building & { note: string }
}

export function makeUC(deps: Deps) {
  return async function updateBuilding(
    input: UpdateBuildingInput
  ): Promise<UpdateBuildingOutput> {
    const { logger, deliveryAreaLoader, buildingLoader, buildingPersistor } =
      deps
    try {
      const { areaId, buildingId, name } = input

      const area = await deliveryAreaLoader.getAreaById(areaId)
      if (!area) {
        const { ResourceNotFoundError } =
          await import('../../../shared/errors/index.js')
        throw new ResourceNotFoundError('AREA_NOT_FOUND', areaId)
      }

      const building = await buildingLoader.getBuildingById(buildingId)
      if (!building || building.areaId !== areaId) {
        const { ResourceNotFoundError } =
          await import('../../../shared/errors/index.js')
        throw new ResourceNotFoundError('BUILDING_NOT_FOUND', buildingId)
      }

      const updated = await buildingPersistor.updateBuilding(buildingId, {
        name: name.trim(),
      })

      return {
        message: 'Building updated successfully',
        data: {
          ...updated,
          note: 'Existing customer addresses are not updated retroactively.',
        },
      }
    } catch (error) {
      logger.error(
        'Failed to update building',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'UpdateBuilding'
