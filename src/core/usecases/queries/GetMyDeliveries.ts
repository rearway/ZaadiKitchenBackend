import type { Deps } from '../../entitygateway/index.js'
import { UserRole } from '../../../codecs/enums.js'

export interface GetMyDeliveriesInput {
  riderId: string
  date?: string
  areaId?: string
}

export interface GetMyDeliveriesOutput {
  date: string
  rider_name: string
  total_deliveries: number
  delivered_count: number
  pending_count: number
  deliveries: Array<{
    delivery_id: string
    customer_name: string
    customer_phone: string | null
    building: string | null
    floor: string | null
    desk_area: string | null
    delivery_preference: 'hand_to_me' | 'reception' | null
    rider_notes: string | null
    area: string | null
    meal_type: 'executive' | 'salad'
    meal_name: string | null
    status: 'pending' | 'delivered'
    delivered_at: Date | null
  }>
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

function emptyResult(date: string, riderName: string): GetMyDeliveriesOutput {
  return {
    date,
    rider_name: riderName,
    total_deliveries: 0,
    delivered_count: 0,
    pending_count: 0,
    deliveries: [],
  }
}

export function makeUC(deps: Deps) {
  return async function getMyDeliveries(
    input: GetMyDeliveriesInput
  ): Promise<GetMyDeliveriesOutput> {
    const { logger, deliveryDayLoader, userLoader, driverAdminLoader } = deps

    try {
      const date = input.date ?? todayIsoDate()

      const [rider, assignedAreaIds] = await Promise.all([
        userLoader.getUserById(input.riderId),
        driverAdminLoader.getAssignedAreaIds(input.riderId),
      ])

      const riderName = rider?.role === UserRole.DRIVER ? rider.fullName : ''
      const canSeeDeliveries =
        !!rider &&
        rider.role === UserRole.DRIVER &&
        rider.isActive &&
        !rider.deletedAt &&
        assignedAreaIds.length > 0

      if (!canSeeDeliveries) {
        return emptyResult(date, riderName)
      }

      if (input.areaId && !assignedAreaIds.includes(input.areaId)) {
        return emptyResult(date, riderName)
      }

      const rows = await deliveryDayLoader.getRiderDeliveriesByDate(
        date,
        input.areaId,
        input.areaId ? undefined : assignedAreaIds
      )

      const deliveries = rows.map(row => {
        const status: 'pending' | 'delivered' =
          row.status === 'delivered' ? 'delivered' : 'pending'
        return {
          delivery_id: row.deliveryDayId,
          customer_name: row.customerName,
          customer_phone: row.customerPhone,
          building: row.buildingName,
          floor: row.floor,
          desk_area: row.deskArea,
          delivery_preference: row.deliveryPreference,
          rider_notes: row.riderNotes,
          area: row.areaName,
          meal_type: row.mealType,
          meal_name: row.mealName,
          status,
          delivered_at: row.deliveredAt,
        }
      })

      const deliveredCount = deliveries.filter(
        d => d.status === 'delivered'
      ).length

      return {
        date,
        rider_name: riderName,
        total_deliveries: deliveries.length,
        delivered_count: deliveredCount,
        pending_count: deliveries.length - deliveredCount,
        deliveries,
      }
    } catch (error) {
      logger.error(
        'GetMyDeliveries failed',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'GetMyDeliveries'
