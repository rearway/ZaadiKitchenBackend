import type { Deps } from '../../entitygateway/index.js'
import { ResourceNotFoundError } from '../../../shared/errors/index.js'

export interface DeleteDriverInput {
  driverId: string
}

export interface DeleteDriverOutput {
  message: string
  data: {
    id: string
    deleted: boolean
    deletedAt: string
  }
}

export function makeUC(deps: Deps) {
  return async function deleteDriver(
    input: DeleteDriverInput
  ): Promise<DeleteDriverOutput> {
    const {
      logger,
      driverAdminLoader,
      driverAdminPersistor,
      refreshTokenPersistor,
    } = deps

    try {
      const existing = await driverAdminLoader.getDriverById(input.driverId)
      if (!existing) {
        throw new ResourceNotFoundError('Driver', input.driverId)
      }

      const deletedAt = await driverAdminPersistor.softDeleteDriver(
        input.driverId
      )
      await refreshTokenPersistor.revokeAllUserTokens(input.driverId)

      return {
        message: 'Driver deleted successfully',
        data: {
          id: input.driverId,
          deleted: true,
          deletedAt: deletedAt.toISOString(),
        },
      }
    } catch (error) {
      logger.error(
        'Failed to delete driver',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'DeleteDriver'
