import { Deps } from '../../entitygateway/index.js'
import { Building } from '../../entities/index.js'

export interface GetBuildingsForAreaInput {
    areaId: string
    query?: string
}

export type GetBuildingsForAreaOutput = {
    message: string
    data: {
        areaId: string
        areaName: string
        buildings: Building[]
    }
}

export function makeUC(deps: Deps) {
    return async function getBuildingsForArea(input: GetBuildingsForAreaInput): Promise<GetBuildingsForAreaOutput> {
        const { logger, deliveryAreaLoader, buildingLoader } = deps
        try {
            const { areaId, query } = input

            const area = await deliveryAreaLoader.getAreaById(areaId)
            if (!area || area.status !== 'active') {
                const { ResourceNotFoundError } = await import('../../../shared/errors/index.js')
                throw new ResourceNotFoundError('Area', areaId)
            }

            let buildings: Building[] = []
            if (query && query.trim() !== '') {
                buildings = await buildingLoader.searchBuildingsByArea(areaId, query.trim())
            } else {
                buildings = await buildingLoader.getBuildingsByArea(areaId)
            }

            return {
                message: 'Buildings fetched successfully',
                data: {
                    areaId: area.id,
                    areaName: area.name,
                    buildings,
                },
            }
        } catch (error) {
            logger.error('Failed to get buildings for area', error instanceof Error ? error.message : String(error))
            throw error
        }
    }
}

export const name = 'GetBuildingsForArea'
