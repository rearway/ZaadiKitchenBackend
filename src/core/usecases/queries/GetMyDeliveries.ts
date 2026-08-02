import type { Deps } from '../../entitygateway/index.js'

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

export function makeUC(deps: Deps) {
  return async function getMyDeliveries(
    input: GetMyDeliveriesInput
  ): Promise<GetMyDeliveriesOutput> {
    const { logger, deliveryDayLoader, userLoader } = deps

    try {
      const date = input.date ?? todayIsoDate()

      const [rider, rows] = await Promise.all([
        userLoader.getUserById(input.riderId),
        deliveryDayLoader.getRiderDeliveriesByDate(date, input.areaId),
      ])

      const deliveries = rows.map(row => ({
        delivery_id: row.deliveryDayId,
        customer_name: row.customerName,
        building: row.buildingName,
        floor: row.floor,
        desk_area: row.deskArea,
        delivery_preference: row.deliveryPreference,
        rider_notes: row.riderNotes,
        area: row.areaName,
        meal_type: row.mealType,
        meal_name: row.mealName,
        status: (row.status === 'delivered' ? 'delivered' : 'pending') as 'pending' | 'delivered',
        delivered_at: row.deliveredAt,
      }))

      const deliveredCount = deliveries.filter(d => d.status === 'delivered').length

      return {
        date,
        rider_name: rider?.fullName ?? '',
        total_deliveries: deliveries.length,
        delivered_count: deliveredCount,
        pending_count: deliveries.length - deliveredCount,
        deliveries,
      }
    } catch (error) {
      logger.error('GetMyDeliveries failed', error instanceof Error ? error.message : String(error))
      throw error
    }
  }
}

export const name = 'GetMyDeliveries'
