import { Deps } from '../../entitygateway/index.js'
import { DeliveryLocation } from '../../entities/index.js'

export interface SaveDeliveryLocationInput {
    userId: string
    areaId: string
    building: string
    buildingId?: string
    floor?: string
    deskArea?: string
    deliveryPreference?: 'hand_to_me' | 'reception'
    riderNotes?: string
}

export type SaveDeliveryLocationOutput = {
    message: string
    data: DeliveryLocation & { areaName: string }
}

export function makeUC(deps: Deps) {
    return async function saveDeliveryLocation(input: SaveDeliveryLocationInput): Promise<SaveDeliveryLocationOutput> {
        const { logger, deliveryAreaLoader, deliveryLocationPersistor } = deps
        try {
            const { userId, areaId, building, buildingId, floor, deskArea, deliveryPreference, riderNotes } = input

            if (!areaId) {
                const { ValidationError } = await import('../../../shared/errors/index.js')
                throw new ValidationError('AREA_REQUIRED', { message: 'Area ID is required' })
            }

            if (!building || building.trim().length === 0) {
                const { ValidationError } = await import('../../../shared/errors/index.js')
                throw new ValidationError('BUILDING_REQUIRED', { message: 'Building name is required' })
            }

            const area = await deliveryAreaLoader.getAreaById(areaId)
            if (!area || area.status !== 'active') {
                const { ValidationError } = await import('../../../shared/errors/index.js')
                throw new ValidationError('AREA_INVALID', { message: 'Must be a valid active area ID' })
            }

            const newLocation = await deliveryLocationPersistor.createLocation({
                userId,
                areaId,
                buildingId,
                buildingName: building.trim(),
                floor,
                deskArea,
                deliveryPreference: deliveryPreference || 'hand_to_me',
                riderNotes,
                isPrimary: true, // Assuming first location is primary, or making this one primary
            })

            return {
                message: 'Delivery location saved successfully',
                data: {
                    ...newLocation,
                    areaName: area.name,
                }
            }
        } catch (error) {
            logger.error('Failed to save delivery location', error instanceof Error ? error.message : String(error))
            throw error
        }
    }
}

export const name = 'SaveDeliveryLocation'
