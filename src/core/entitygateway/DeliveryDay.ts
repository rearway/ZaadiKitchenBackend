import type { DeliveryDay, DeliveryDayStatus } from '../entities/DeliveryDay.js'

export interface DeliveryDayLoader {
  getDeliveryDaysBySubscription(
    subscriptionId: string,
    filters?: { from?: string; to?: string }
  ): Promise<DeliveryDay[]>
  getDeliveryDayByDate(
    subscriptionId: string,
    date: string
  ): Promise<DeliveryDay | null>
  getDeliveryDayById(id: string): Promise<DeliveryDay | null>
  getDeliveryHistory(
    userId: string,
    page: number,
    perPage: number,
    period?: string
  ): Promise<{ days: DeliveryHistoryEntry[]; total: number }>
}

export interface DeliveryHistoryEntry {
  deliveryDayId: string
  date: string
  mealType: string
  mealName: string | null
  kcal: number | null
  status: string
  stars: number | null
  tags: string[]
}

export interface DeliveryDayPersistor {
  bulkCreateDeliveryDays(
    days: Omit<DeliveryDay, 'id' | 'createdAt' | 'updatedAt'>[]
  ): Promise<DeliveryDay[]>
  updateDeliveryDayStatus(
    id: string,
    status: DeliveryDayStatus
  ): Promise<DeliveryDay>
  bulkUpdateDeliveryDayStatus(
    subscriptionId: string,
    fromDate: string,
    toDate: string,
    fromStatus: DeliveryDayStatus,
    toStatus: DeliveryDayStatus
  ): Promise<number>
  updateMealTypeForSubscription(
    subscriptionId: string,
    mealType: 'executive' | 'salad',
    fromDate: string,
    specificDates?: string[]
  ): Promise<void>
}
