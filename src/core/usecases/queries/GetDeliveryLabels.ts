import type { Deps } from '../../entitygateway/index.js'
import type { RiderDeliveryRow } from '../../entitygateway/DeliveryDay.js'

export type LabelMealTypeFilter = 'all' | 'executive' | 'salad'

export interface GetDeliveryLabelsInput {
  date?: string
  mealType?: LabelMealTypeFilter
  areaId?: string
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

function mealLabel(mealType: LabelMealTypeFilter): string {
  return mealType === 'all' ? 'All' : mealType === 'executive' ? 'Exec' : 'Salad'
}

export function makeUC(deps: Deps) {
  return async function getDeliveryLabels(input: GetDeliveryLabelsInput) {
    const { logger, deliveryDayLoader } = deps

    try {
      const date = input.date ?? todayIsoDate()
      const mealType = input.mealType ?? 'all'

      const allRows = await deliveryDayLoader.getRiderDeliveriesByDate(date, input.areaId)
      const filteredRows = mealType === 'all' ? allRows : allRows.filter(r => r.mealType === mealType)

      const withRef = filteredRows.map((r, i) => ({
        ...r,
        orderRef: `#ZK-${date}-${String(i + 1).padStart(4, '0')}`,
      }))

      const areaOrder: string[] = []
      const areaGroups = new Map<string, { areaId: string | null; areaName: string; rows: (RiderDeliveryRow & { orderRef: string })[] }>()
      for (const row of withRef) {
        const key = row.areaId ?? 'unassigned'
        if (!areaGroups.has(key)) {
          areaOrder.push(key)
          areaGroups.set(key, { areaId: row.areaId, areaName: row.areaName ?? 'Unassigned', rows: [] })
        }
        areaGroups.get(key)!.rows.push(row)
      }

      const label = mealLabel(mealType)
      const areas = areaOrder.map(key => {
        const group = areaGroups.get(key)!
        return {
          area_id: group.areaId,
          area_name: group.areaName,
          count: group.rows.length,
          area_download_label:
            mealType === 'all'
              ? `Download ${group.areaName} (${group.rows.length})`
              : `Download ${label} ${group.areaName} (${group.rows.length})`,
          labels: group.rows.map(row => ({
            label_id: row.deliveryDayId,
            order_ref: row.orderRef,
            customer_name: row.customerName,
            meal_type: row.mealType,
            building: row.buildingName,
            floor: row.floor,
            desk_area: row.deskArea,
            gate: row.gate,
            delivery_preference: row.deliveryPreference,
            delivery_date: date,
          })),
        }
      })

      return {
        date,
        total_count: allRows.length,
        filtered_count: filteredRows.length,
        bulk_download_label: `Download ${label} Labels (${filteredRows.length})`,
        areas,
      }
    } catch (error) {
      logger.error('GetDeliveryLabels failed', error instanceof Error ? error.message : String(error))
      throw error
    }
  }
}

export const name = 'GetDeliveryLabels'
