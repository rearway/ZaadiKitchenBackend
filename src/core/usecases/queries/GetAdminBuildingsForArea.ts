import { Deps } from '../../entitygateway/index.js'
import { Building } from '../../entities/index.js'

export interface GetAdminBuildingsForAreaInput {
  areaId: string
}

export type GetAdminBuildingsForAreaOutput = {
  message: string
  data: {
    area_id: string
    area_name: string
    buildings: Array<{ building_id: string; name: string }>
    total: number
  }
}

export function makeUC(deps: Deps) {
  return async function getAdminBuildingsForArea(
    input: GetAdminBuildingsForAreaInput
  ): Promise<GetAdminBuildingsForAreaOutput> {
    const { logger, deliveryAreaLoader, buildingLoader } = deps
    try {
      const { areaId } = input

      const area = await deliveryAreaLoader.getAreaById(areaId)
      if (!area) {
        const { ResourceNotFoundError } =
          await import('../../../shared/errors/index.js')
        throw new ResourceNotFoundError('AREA_NOT_FOUND', areaId)
      }

      const buildings: Building[] =
        await buildingLoader.getBuildingsByArea(areaId)

      return {
        message: 'Buildings retrieved successfully',
        data: {
          area_id: area.id,
          area_name: area.name,
          buildings: buildings.map(b => ({ building_id: b.id, name: b.name })),
          total: buildings.length,
        },
      }
    } catch (error) {
      logger.error(
        'Failed to get admin buildings for area',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'GetAdminBuildingsForArea'
