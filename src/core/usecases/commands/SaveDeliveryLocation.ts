import { Deps } from '../../entitygateway/index.js'
import { DeliveryLocation } from '../../entities/index.js'
import { ValidationError } from '../../../shared/errors/index.js'

export interface SaveDeliveryLocationInput {
  userId: string
  areaId: string
  buildingId?: string
  building?: string
  floor?: string
  deskArea?: string
  deliveryPreference?: 'hand_to_me' | 'reception'
  riderNotes?: string
}

export type SaveDeliveryLocationOutput = {
  message: string
  data: DeliveryLocation & { areaName: string; onboardingComplete: boolean }
}

export function makeUC(deps: Deps) {
  return async function saveDeliveryLocation(
    input: SaveDeliveryLocationInput
  ): Promise<SaveDeliveryLocationOutput> {
    const {
      logger,
      deliveryAreaLoader,
      buildingLoader,
      deliveryLocationPersistor,
    } = deps

    try {
      const {
        userId,
        areaId,
        buildingId,
        building,
        floor,
        deskArea,
        deliveryPreference,
        riderNotes,
      } = input

      if (!areaId) {
        throw new ValidationError('Area ID is required')
      }

      if (!buildingId && (!building || building.trim().length === 0)) {
        throw new ValidationError('Either a building ID or a building name is required')
      }

      const area = await deliveryAreaLoader.getAreaById(areaId)
      if (!area || area.status !== 'active') {
        throw new ValidationError('Must be a valid active area ID')
      }

      let resolvedBuildingId: string | undefined
      let resolvedBuildingName: string

      if (buildingId) {
        // Building selected from admin-curated list — fetch canonical name and validate area match
        const buildingRecord = await buildingLoader.getBuildingById(buildingId)

        if (!buildingRecord) {
          throw new ValidationError('Building not found')
        }

        if (buildingRecord.areaId !== areaId) {
          throw new ValidationError('Building does not belong to the selected area')
        }

        resolvedBuildingId = buildingId
        resolvedBuildingName = buildingRecord.name
      } else {
        // Free-text building name entered by the user
        resolvedBuildingId = undefined
        resolvedBuildingName = building!.trim()
      }

      const newLocation = await deliveryLocationPersistor.createLocation({
        userId,
        areaId,
        buildingId: resolvedBuildingId,
        buildingName: resolvedBuildingName,
        floor,
        deskArea,
        deliveryPreference: deliveryPreference || 'hand_to_me',
        riderNotes,
        isPrimary: true,
      })

      return {
        message: 'Delivery location saved successfully',
        data: {
          ...newLocation,
          areaName: area.name,
          onboardingComplete: true,
        },
      }
    } catch (error) {
      logger.error(
        'Failed to save delivery location',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'SaveDeliveryLocation'
