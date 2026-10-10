import { Deps } from '../../entitygateway/index.js'

export interface DeleteBuildingInput {
  areaId: string
  buildingId: string
}

export type DeleteBuildingOutput = {
  message: string
  data: {
    building_id: string
    deleted: boolean
    note: string
  }
}

export function makeUC(deps: Deps) {
  return async function deleteBuilding(
    input: DeleteBuildingInput
  ): Promise<DeleteBuildingOutput> {
    const { logger, deliveryAreaLoader, buildingLoader, buildingPersistor } =
      deps
    try {
      const { areaId, buildingId } = input

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

      await buildingPersistor.deleteBuilding(buildingId)

      return {
        message: 'Building removed successfully',
        data: {
          building_id: buildingId,
          deleted: true,
          note: 'Existing customer addresses referencing this building are not affected. The name continues to appear on historical delivery labels.',
        },
      }
    } catch (error) {
      logger.error(
        'Failed to delete building',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'DeleteBuilding'
