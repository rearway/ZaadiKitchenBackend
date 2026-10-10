import type { Order } from '../entities/Order.js'

export interface ConfirmedOrderBillingRow {
  orderId: string
  planName: string
  totalPaidSar: number
  planPriceSar: number
  paymentMethodLabel: string | null
  createdAt: Date
}

export interface OrderLoader {
  getOrderById(id: string): Promise<Order | null>
  getLastOrderByUserId(userId: string): Promise<Order | null>
  hasUserUsedPromoCode(userId: string, code: string): Promise<boolean>
  getConfirmedOrdersForBilling(
    userId: string,
    pagination: { page: number; perPage: number }
  ): Promise<{ orders: ConfirmedOrderBillingRow[]; total: number }>
}

export interface OrderPersistor {
  createOrder(
    input: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Order>
  updateOrder(id: string, updates: Partial<Order>): Promise<Order>
}
