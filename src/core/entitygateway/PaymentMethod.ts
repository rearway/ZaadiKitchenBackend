import type { PaymentMethod } from '../entities/PaymentMethod.js'

export interface PaymentMethodLoader {
  getMethodsByUserId(userId: string): Promise<PaymentMethod[]>
  getMethodById(id: string): Promise<PaymentMethod | null>
}

export interface PaymentMethodPersistor {
  createMethod(
    input: Omit<PaymentMethod, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<PaymentMethod>
  deleteMethod(id: string): Promise<void>
  markAsLastUsed(id: string, userId: string): Promise<void>
}
