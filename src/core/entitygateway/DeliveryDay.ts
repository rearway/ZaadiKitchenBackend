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
}

export interface DeliveryDayPersistor {
  bulkCreateDeliveryDays(
    days: Omit<DeliveryDay, 'id' | 'createdAt' | 'updatedAt'>[]
  ): Promise<DeliveryDay[]>
  updateDeliveryDayStatus(
    id: string,
    status: DeliveryDayStatus
  ): Promise<DeliveryDay>
  updateMealTypeForSubscription(
    subscriptionId: string,
    mealType: 'executive' | 'salad',
    fromDate: string,
    specificDates?: string[]
  ): Promise<void>
}
