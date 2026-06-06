import { Deps } from '../../entitygateway/index.js'
import { DeliveryLocation } from '../../entities/index.js'
import { ResourceNotFoundError, UnauthorizedError, ValidationError } from '../../../shared/errors/index.js'

export interface UpdateDeliveryLocationInput {
  userId: string
  locationId: string
  floor?: string
  deskArea?: string
  deliveryPreference?: 'hand_to_me' | 'reception'
  riderNotes?: string
  building?: string
  buildingId?: string
  areaId?: string
}

export type UpdateDeliveryLocationOutput = {
  message: string
  data: DeliveryLocation
}

export function makeUC(deps: Deps) {
  return async function updateDeliveryLocation(
    input: UpdateDeliveryLocationInput
  ): Promise<UpdateDeliveryLocationOutput> {
    const { logger, deliveryLocationLoader, deliveryLocationPersistor, deliveryAreaLoader, buildingLoader } = deps

    try {
      const location = await deliveryLocationLoader.getLocationById(input.locationId)
      if (!location) throw new ResourceNotFoundError('DeliveryLocation', input.locationId)
      if (location.userId !== input.userId) throw new UnauthorizedError()

      const updates: Partial<DeliveryLocation> = {}

      if (input.floor !== undefined) updates.floor = input.floor
      if (input.deskArea !== undefined) updates.deskArea = input.deskArea
      if (input.deliveryPreference !== undefined) updates.deliveryPreference = input.deliveryPreference
      if (input.riderNotes !== undefined) updates.riderNotes = input.riderNotes

      if (input.areaId && input.areaId !== location.areaId) {
        const area = await deliveryAreaLoader.getAreaById(input.areaId)
        if (!area || area.status !== 'active') throw new ValidationError('Must be a valid active area ID')
        updates.areaId = input.areaId
        updates.buildingId = undefined
      }

      if (input.buildingId) {
        const building = await buildingLoader.getBuildingById(input.buildingId)
        if (!building) throw new ValidationError('Building not found')
        const targetAreaId = input.areaId ?? location.areaId
        if (building.areaId !== targetAreaId) throw new ValidationError('Building does not belong to the selected area')
        updates.buildingId = input.buildingId
        updates.buildingName = building.name
      } else if (input.building !== undefined) {
        updates.buildingId = undefined
        updates.buildingName = input.building.trim()
      }

      const updated = await deliveryLocationPersistor.updateLocation(input.locationId, updates)

      return { message: 'Delivery location updated successfully', data: updated }
    } catch (error) {
      logger.error('Failed to update delivery location', error instanceof Error ? error.message : String(error))
      throw error
    }
  }
}

export const name = 'UpdateDeliveryLocation'
