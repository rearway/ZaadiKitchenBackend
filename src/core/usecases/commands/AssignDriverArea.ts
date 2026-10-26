import type { Deps } from '../../entitygateway/index.js'
import {
  assertDeliveryAreasExist,
  toDriverView,
  type DriverView,
} from '../services/driverView.js'
import { ResourceNotFoundError } from '../../../shared/errors/index.js'

export interface AssignDriverAreaInput {
  driverId: string
  areaId: string
}

export interface AssignDriverAreaOutput {
  message: string
  data: DriverView
}

export function makeUC(deps: Deps) {
  return async function assignDriverArea(
    input: AssignDriverAreaInput
  ): Promise<AssignDriverAreaOutput> {
    const {
      logger,
      driverAdminLoader,
      driverAdminPersistor,
      deliveryAreaLoader,
    } = deps

    try {
      const existing = await driverAdminLoader.getDriverById(input.driverId)
      if (!existing) {
        throw new ResourceNotFoundError('Driver', input.driverId)
      }

      await assertDeliveryAreasExist(deliveryAreaLoader, [input.areaId])

      const driver = await driverAdminPersistor.assignArea(
        input.driverId,
        input.areaId
      )

      return {
        message: 'Area assigned successfully',
        data: toDriverView(driver),
      }
    } catch (error) {
      logger.error(
        'Failed to assign driver area',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'AssignDriverArea'
