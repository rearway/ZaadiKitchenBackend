import type { Subscription } from '../entities/Subscription.js'

export interface SubscriptionLoader {
  getActiveSubscriptionByUserId(userId: string): Promise<Subscription | null>
  getSubscriptionById(id: string): Promise<Subscription | null>
}

export interface SubscriptionPersistor {
  createSubscription(
    input: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Subscription>
  updateSubscription(
    id: string,
    updates: Partial<Subscription>
  ): Promise<Subscription>
  expireActiveSubscriptions(beforeDate: string): Promise<number>
}
