import type { Deps } from '../../entitygateway/index.js'
import { toDriverView, type DriverView } from '../services/driverView.js'

export interface GetAdminDriversInput {
  unused?: never
}

export interface GetAdminDriversOutput {
  message: string
  data: {
    drivers: DriverView[]
  }
}

export function makeUC(deps: Deps) {
  return async function getAdminDrivers(
    _input: GetAdminDriversInput
  ): Promise<GetAdminDriversOutput> {
    const { logger, driverAdminLoader } = deps

    try {
      const drivers = await driverAdminLoader.listDrivers()
      return {
        message: 'Drivers retrieved successfully',
        data: { drivers: drivers.map(toDriverView) },
      }
    } catch (error) {
      logger.error(
        'Failed to list drivers',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'GetAdminDrivers'
