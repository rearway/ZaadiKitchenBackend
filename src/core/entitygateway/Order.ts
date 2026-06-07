import type { Order } from '../entities/Order.js'

export interface OrderLoader {
  getOrderById(id: string): Promise<Order | null>
  getLastOrderByUserId(userId: string): Promise<Order | null>
  hasUserUsedPromoCode(userId: string, code: string): Promise<boolean>
}

export interface OrderPersistor {
  createOrder(
    input: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Order>
  updateOrder(id: string, updates: Partial<Order>): Promise<Order>
}
