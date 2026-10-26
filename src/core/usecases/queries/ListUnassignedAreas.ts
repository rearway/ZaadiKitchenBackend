import type { Deps } from '../../entitygateway/index.js'
import type { UnassignedArea } from '../../entitygateway/DriverAdmin.js'

export interface ListUnassignedAreasInput {
  unused?: never
}

export interface ListUnassignedAreasOutput {
  message: string
  data: {
    areas: UnassignedArea[]
  }
}

export function makeUC(deps: Deps) {
  return async function listUnassignedAreas(
    _input: ListUnassignedAreasInput
  ): Promise<ListUnassignedAreasOutput> {
    const { logger, driverAdminLoader } = deps

    try {
      const areas = await driverAdminLoader.listUnassignedAreas()
      return {
        message: 'Unassigned areas retrieved successfully',
        data: { areas },
      }
    } catch (error) {
      logger.error(
        'Failed to list unassigned areas',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'ListUnassignedAreas'
