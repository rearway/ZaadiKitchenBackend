import type { Deps } from '../../entitygateway/index.js'
import type { UpdateDriverRecord } from '../../entitygateway/DriverAdmin.js'
import {
  ResourceAlreadyExistsError,
  ResourceNotFoundError,
  ValidationError,
} from '../../../shared/errors/index.js'
import {
  authPhoneValidationMessage,
  isAllowedAuthPhone,
} from '../../../shared/phone/authPhone.js'
import {
  assertDeliveryAreasExist,
  toDriverView,
  uniqueAreaIds,
  type DriverView,
} from '../services/driverView.js'

export interface UpdateDriverInput {
  driverId: string
  fullName?: string
  phone?: string
  isActive?: boolean
  areaIds?: string[]
}

export interface UpdateDriverOutput {
  message: string
  data: DriverView
}

export function makeUC(deps: Deps) {
  return async function updateDriver(
    input: UpdateDriverInput
  ): Promise<UpdateDriverOutput> {
    const {
      logger,
      userLoader,
      deliveryAreaLoader,
      driverAdminLoader,
      driverAdminPersistor,
    } = deps

    try {
      const hasName = input.fullName !== undefined
      const hasPhone = input.phone !== undefined
      const hasActive = input.isActive !== undefined
      const hasAreas = input.areaIds !== undefined
      if (!hasName && !hasPhone && !hasActive && !hasAreas) {
        throw new ValidationError('At least one field is required')
      }

      const existing = await driverAdminLoader.getDriverById(input.driverId)
      if (!existing) {
        throw new ResourceNotFoundError('Driver', input.driverId)
      }

      const updates: UpdateDriverRecord = {}

      if (hasName) {
        const fullName = input.fullName!.trim()
        if (!fullName) {
          throw new ValidationError('Driver name is required')
        }
        updates.fullName = fullName
      }

      if (hasPhone) {
        const phone = input.phone!.trim()
        if (!isAllowedAuthPhone(phone)) {
          throw new ValidationError(authPhoneValidationMessage())
        }
        if (phone !== existing.phone) {
          const taken = await userLoader.getUserByPhone(phone)
          if (taken && taken.id !== input.driverId) {
            throw new ResourceAlreadyExistsError('Driver', phone)
          }
        }
        updates.phone = phone
      }

      if (hasActive) {
        updates.isActive = input.isActive
      }

      if (hasAreas) {
        const areaIds = uniqueAreaIds(input.areaIds)
        await assertDeliveryAreasExist(deliveryAreaLoader, areaIds)
        updates.areaIds = areaIds
      }

      const driver = await driverAdminPersistor.updateDriver(
        input.driverId,
        updates
      )

      return {
        message: 'Driver updated successfully',
        data: toDriverView(driver),
      }
    } catch (error) {
      logger.error(
        'Failed to update driver',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'UpdateDriver'
