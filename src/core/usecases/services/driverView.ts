import type { DeliveryAreaLoader } from '../../entitygateway/Delivery.js'
import type { DriverSummary } from '../../entitygateway/DriverAdmin.js'
import { ResourceNotFoundError } from '../../../shared/errors/index.js'

export interface DriverView {
  id: string
  fullName: string
  phone: string | null
  role: 'DRIVER'
  isActive: boolean
  areas: Array<{ id: string; name: string }>
  createdAt: Date
  updatedAt: Date
}

export function toDriverView(driver: DriverSummary): DriverView {
  return {
    id: driver.id,
    fullName: driver.fullName,
    phone: driver.phone,
    role: 'DRIVER',
    isActive: driver.isActive,
    areas: driver.areas,
    createdAt: driver.createdAt,
    updatedAt: driver.updatedAt,
  }
}

export function uniqueAreaIds(areaIds: string[] | undefined): string[] {
  return [...new Set(areaIds ?? [])]
}

export async function assertDeliveryAreasExist(
  deliveryAreaLoader: DeliveryAreaLoader,
  areaIds: string[]
): Promise<void> {
  for (const areaId of areaIds) {
    const area = await deliveryAreaLoader.getAreaById(areaId)
    if (!area) {
      throw new ResourceNotFoundError('Delivery area', areaId)
    }
  }
}
