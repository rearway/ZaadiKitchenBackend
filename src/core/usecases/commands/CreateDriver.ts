import type { Deps } from '../../entitygateway/index.js'
import {
  ResourceAlreadyExistsError,
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

export interface CreateDriverInput {
  fullName: string
  phone: string
  areaIds?: string[]
}

export interface CreateDriverOutput {
  message: string
  data: DriverView
}

export function makeUC(deps: Deps) {
  return async function createDriver(
    input: CreateDriverInput
  ): Promise<CreateDriverOutput> {
    const { logger, userLoader, deliveryAreaLoader, driverAdminPersistor } =
      deps

    try {
      const fullName = input.fullName?.trim() ?? ''
      if (!fullName) {
        throw new ValidationError('Driver name is required')
      }

      const phone = input.phone?.trim() ?? ''
      if (!isAllowedAuthPhone(phone)) {
        throw new ValidationError(authPhoneValidationMessage())
      }

      const existing = await userLoader.getUserByPhone(phone)
      if (existing) {
        throw new ResourceAlreadyExistsError('Driver', phone)
      }

      const areaIds = uniqueAreaIds(input.areaIds)
      await assertDeliveryAreasExist(deliveryAreaLoader, areaIds)

      const driver = await driverAdminPersistor.createDriver({
        fullName,
        phone,
        areaIds,
      })

      return {
        message: 'Driver created successfully',
        data: toDriverView(driver),
      }
    } catch (error) {
      logger.error(
        'Failed to create driver',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'CreateDriver'
