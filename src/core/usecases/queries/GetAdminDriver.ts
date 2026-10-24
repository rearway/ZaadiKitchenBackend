import type { Deps } from '../../entitygateway/index.js'
import { ResourceNotFoundError } from '../../../shared/errors/index.js'
import { toDriverView, type DriverView } from '../services/driverView.js'

export interface GetAdminDriverInput {
  driverId: string
}

export interface GetAdminDriverOutput {
  message: string
  data: DriverView
}

export function makeUC(deps: Deps) {
  return async function getAdminDriver(
    input: GetAdminDriverInput
  ): Promise<GetAdminDriverOutput> {
    const { logger, driverAdminLoader } = deps

    try {
      const driver = await driverAdminLoader.getDriverById(input.driverId)
      if (!driver) {
        throw new ResourceNotFoundError('Driver', input.driverId)
      }

      return {
        message: 'Driver retrieved successfully',
        data: toDriverView(driver),
      }
    } catch (error) {
      logger.error(
        'Failed to get driver',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'GetAdminDriver'
