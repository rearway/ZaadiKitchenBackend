import type { Deps } from '../../entitygateway/index.js'
import type { DeliveryDayStatus } from '../../entities/DeliveryDay.js'
import type { AdminDriverDeliveryRow } from '../../entitygateway/DeliveryDay.js'
import {
  ResourceNotFoundError,
  ValidationError,
} from '../../../shared/errors/index.js'
import { KSA_TIMEZONE, todayKSA } from '../services/revenueUtils.js'

export interface GetAdminDriverDeliveriesInput {
  driverId: string
  date?: string
}

export type AdminDeliveryStatus = 'pending' | 'delivered' | 'skipped' | 'paused'

export interface AdminDriverDeliveryReview {
  stars: number
  text: string | null
  tags: string[]
}

export interface AdminDriverDeliveryView {
  delivery_id: string
  customer_name: string
  phone: string | null
  meal_name: string | null
  meal_type: 'executive' | 'salad'
  status: AdminDeliveryStatus
  domain_status: DeliveryDayStatus
  review: AdminDriverDeliveryReview | null
}

export interface GetAdminDriverDeliveriesOutput {
  message: string
  data: {
    driver_id: string
    date: string
    timezone: typeof KSA_TIMEZONE
    deliveries: AdminDriverDeliveryView[]
  }
}

const UI_STATUS: Record<DeliveryDayStatus, AdminDeliveryStatus> = {
  scheduled: 'pending',
  past_cutoff: 'pending',
  delivered: 'delivered',
  skipped: 'skipped',
  paused: 'paused',
}

function assertOpsDate(date: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new ValidationError('date must be YYYY-MM-DD (Asia/Riyadh ops day)')
  }
  const [year, month, day] = date.split('-').map(Number)
  const utc = new Date(Date.UTC(year, month - 1, day))
  if (
    utc.getUTCFullYear() !== year ||
    utc.getUTCMonth() !== month - 1 ||
    utc.getUTCDate() !== day
  ) {
    throw new ValidationError('date must be a real calendar day')
  }
}

function reviewFor(
  row: AdminDriverDeliveryRow
): AdminDriverDeliveryReview | null {
  if (row.status !== 'delivered' || row.reviewStars == null) return null
  const tags = row.reviewTags ?? []
  return {
    stars: row.reviewStars,
    text: tags.length > 0 ? tags.join(', ') : null,
    tags,
  }
}

function toView(row: AdminDriverDeliveryRow): AdminDriverDeliveryView {
  return {
    delivery_id: row.deliveryDayId,
    customer_name: row.customerName,
    phone: row.customerPhone,
    meal_name: row.mealName,
    meal_type: row.mealType,
    status: UI_STATUS[row.status],
    domain_status: row.status,
    review: reviewFor(row),
  }
}

export function makeUC(deps: Deps) {
  return async function getAdminDriverDeliveries(
    input: GetAdminDriverDeliveriesInput
  ): Promise<GetAdminDriverDeliveriesOutput> {
    const { logger, driverAdminLoader, deliveryDayLoader } = deps

    try {
      const date = input.date?.trim() || todayKSA()
      assertOpsDate(date)

      const driver = await driverAdminLoader.getDriverById(input.driverId)
      if (!driver) {
        throw new ResourceNotFoundError('Driver', input.driverId)
      }

      const areaIds = driver.areas.map(area => area.id)
      const rows =
        areaIds.length === 0
          ? []
          : await deliveryDayLoader.getAdminDriverDeliveriesByDate(
              date,
              areaIds
            )

      return {
        message: 'Driver deliveries retrieved successfully',
        data: {
          driver_id: driver.id,
          date,
          timezone: KSA_TIMEZONE,
          deliveries: rows.map(toView),
        },
      }
    } catch (error) {
      logger.error(
        'Failed to list driver deliveries',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'GetAdminDriverDeliveries'
