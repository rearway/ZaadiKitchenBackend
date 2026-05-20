import { Deps } from '../../entitygateway/index.js'
import { DeliveryArea } from '../../entities/index.js'

export interface SearchDeliveryAreasInput {
    query: string
}

export type SearchDeliveryAreasOutput = {
    message: string
    data: {
        areas: DeliveryArea[]
        query: string
        isOutOfZone: boolean
    }
}

export function makeUC(deps: Deps) {
    return async function searchDeliveryAreas(input: SearchDeliveryAreasInput): Promise<SearchDeliveryAreasOutput> {
        const { logger, deliveryAreaLoader } = deps
        try {
            const { query } = input
            
            if (!query || query.trim() === '') {
                const { ValidationError } = await import('../../../shared/errors/index.js')
                throw new ValidationError('Search query cannot be empty')
            }

            const areas = await deliveryAreaLoader.searchActiveAreas(query)
            const isOutOfZone = areas.length === 0

            return {
                message: 'Search completed',
                data: {
                    areas,
                    query,
                    isOutOfZone,
                },
            }
        } catch (error) {
            logger.error('Failed to search delivery areas', error instanceof Error ? error.message : String(error))
            throw error
        }
    }
}

export const name = 'SearchDeliveryAreas'
